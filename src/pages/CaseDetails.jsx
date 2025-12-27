import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Phone, Mail, Building2, Banknote, 
  Users, Brain, Loader2, RefreshCw, MessageCircle, Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UrgencyBadge from '../components/dashboard/UrgencyBadge';
import ProgressBattery from '../components/dashboard/ProgressBattery';
import FinancialMetrics from '../components/analysis/FinancialMetrics';
import TransactionScanner from '../components/analysis/TransactionScanner';
import DocumentUploader from '../components/documents/DocumentUploader';
import DocumentCard from '../components/documents/DocumentCard';
import MilestoneTracker from '../components/milestones/MilestoneTracker';
import AuditTrail from '../components/audit/AuditTrail';

const bankLabels = {
  hapoalim: 'בנק הפועלים',
  leumi: 'בנק לאומי',
  mizrahi: 'מזרחי טפחות',
  discount: 'בנק דיסקונט',
  fibi: 'הבינלאומי',
  other: 'אחר'
};

const statusLabels = {
  new: 'חדש',
  documents_pending: 'ממתין למסמכים',
  documents_review: 'בבדיקה',
  financial_analysis: 'ניתוח פיננסי',
  bank_submission: 'הוגש לבנק',
  approved: 'אושר',
  rejected: 'נדחה',
  completed: 'הושלם'
};

export default function CaseDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  const [reasoningDialog, setReasoningDialog] = useState(null);
  const [generatingMessage, setGeneratingMessage] = useState(false);

  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: () => base44.entities.Document.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', caseId],
    queryFn: () => base44.entities.Milestone.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs', caseId],
    queryFn: () => base44.entities.AuditLog.filter({ case_id: caseId }, '-created_date'),
    enabled: !!caseId
  });

  const verifyDocument = async (doc) => {
    setVerifyingDoc(doc.id);

    const verificationResult = await base44.integrations.Core.InvokeLLM({
      prompt: `אנא אמת את המסמך הבא עבור בקשת משכנתא:
סוג מסמך: ${doc.document_type}
שם הלקוח הצפוי: ${caseData.client_name}
תעודת זהות צפויה: ${caseData.client_id}

בדוק:
1. האם השם במסמך תואם לשם הלקוח?
2. האם תעודת הזהות תואמת?
3. האם המסמך עדכני (לא יותר מ-3 חודשים)?
4. האם יש פרטים חשודים או חריגים?

דרג את המסמך: verified (מאושר), rejected (נדחה), או needs_clarification (דורש הבהרה).`,
      file_urls: [doc.file_url],
      response_json_schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["verified", "rejected", "needs_clarification"] },
          name_match: { type: "boolean" },
          id_match: { type: "boolean" },
          is_recent: { type: "boolean" },
          document_date: { type: "string" },
          reasoning: { type: "string" },
          red_flags: { type: "array", items: { type: "string" } },
          clarification_message: { type: "string" }
        }
      }
    });

    await base44.entities.Document.update(doc.id, {
      status: verificationResult.status,
      ai_verification_result: verificationResult,
      ai_reasoning: verificationResult.reasoning,
      red_flags: verificationResult.red_flags || [],
      verified_by: 'AI',
      verified_at: new Date().toISOString(),
      expiry_warning: !verificationResult.is_recent
    });

    await base44.entities.AuditLog.create({
      case_id: caseId,
      action_type: verificationResult.status === 'verified' ? 'document_verified' : 
                   verificationResult.status === 'rejected' ? 'document_rejected' : 'red_flag_detected',
      actor: 'AI',
      description: `מסמך ${doc.document_type} ${verificationResult.status === 'verified' ? 'אומת' : 'נבדק'}`,
      ai_reasoning: verificationResult.reasoning,
      severity: verificationResult.red_flags?.length > 0 ? 'warning' : 'info'
    });

    // Update case red flags if needed
    if (verificationResult.red_flags?.length > 0) {
      const existingFlags = caseData.red_flags || [];
      await base44.entities.MortgageCase.update(caseId, {
        red_flags: [...new Set([...existingFlags, ...verificationResult.red_flags])]
      });
    }

    queryClient.invalidateQueries(['documents', caseId]);
    queryClient.invalidateQueries(['auditLogs', caseId]);
    queryClient.invalidateQueries(['case', caseId]);
    setVerifyingDoc(null);
  };

  const generateWhatsAppMessage = async (doc) => {
    setGeneratingMessage(true);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `צור הודעת WhatsApp קצרה ומנומסת ללקוח ${caseData.client_name} בנוגע למסמך שדורש הבהרה.
סוג המסמך: ${doc.document_type}
הבעיות שזוהו: ${doc.red_flags?.join(', ') || 'לא צוין'}
נתיב החשיבה: ${doc.ai_reasoning || 'לא צוין'}

ההודעה צריכה להיות:
1. קצרה ותכליתית
2. מנומסת ומקצועית
3. מסבירה מה נדרש מהלקוח
4. בעברית`,
      response_json_schema: {
        type: "object",
        properties: {
          message: { type: "string" }
        }
      }
    });

    const phone = caseData.client_phone?.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/972${phone?.substring(1)}?text=${encodeURIComponent(result.message)}`;
    window.open(whatsappUrl, '_blank');
    
    setGeneratingMessage(false);
  };

  const maskId = (id) => {
    if (!id || id.length < 4) return '***';
    return `${id.slice(0, 2)}****${id.slice(-2)}`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
  };

  if (loadingCase) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  const bankStatement = documents.find(d => d.document_type === 'bank_statement');

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <UrgencyBadge urgency={caseData.urgency} />
            </div>
            <p className="text-gray-500">ת.ז: {maskId(caseData.client_id)} • {statusLabels[caseData.status]}</p>
          </div>
        </div>

        {/* Red Flags Banner */}
        {caseData.red_flags && caseData.red_flags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-start gap-3">
              <Flag className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 mb-1">דגלים אדומים ({caseData.red_flags.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {caseData.red_flags.map((flag, i) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm">
                      🚩 {flag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Milestones */}
        <MilestoneTracker milestones={milestones} />
      </div>

      {/* Reasoning Dialog */}
      <Dialog open={!!reasoningDialog} onOpenChange={() => setReasoningDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              נתיב חשיבה AI
            </DialogTitle>
          </DialogHeader>
          {reasoningDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-gray-700 leading-relaxed">{reasoningDialog.ai_reasoning}</p>
              </div>
              
              {reasoningDialog.red_flags?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <h4 className="font-medium text-red-900 mb-2">דגלים אדומים</h4>
                  <ul className="space-y-1">
                    {reasoningDialog.red_flags.map((flag, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                        <span>🚩</span>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reasoningDialog.status === 'needs_clarification' && (
                <Button
                  onClick={() => generateWhatsAppMessage(reasoningDialog)}
                  disabled={generatingMessage}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {generatingMessage ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 ml-2" />
                  )}
                  שלח הודעת WhatsApp ללקוח
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}