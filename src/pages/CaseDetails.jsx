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
          <Link to={createPageUrl('Dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{caseData.client_name}</h1>
              <UrgencyBadge urgency={caseData.urgency} />
            </div>
            <p className="text-gray-500">ת.ז: {maskId(caseData.client_id)} • {statusLabels[caseData.status]}</p>
          </div>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="w-4 h-4 ml-2" />
            רענן
          </Button>
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

        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Banknote className="w-4 h-4" />
              <span className="text-sm">סכום הלוואה</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(caseData.loan_amount)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">שווי נכס</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(caseData.property_value)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">נפשות</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{caseData.family_size || '—'}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">בנק יעד</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{bankLabels[caseData.target_bank] || '—'}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="documents" className="w-full">
              <TabsList className="w-full justify-start bg-white rounded-xl p-1 border border-gray-100">
                <TabsTrigger value="documents" className="rounded-lg">מסמכים</TabsTrigger>
                <TabsTrigger value="analysis" className="rounded-lg">ניתוח פיננסי</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-lg">מעקב פעולות</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-4 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">העלאת מסמכים</h3>
                  <DocumentUploader 
                    caseId={caseId} 
                    onUploadComplete={() => queryClient.invalidateQueries(['documents', caseId])}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onVerify={() => verifyDocument(doc)}
                      onViewReasoning={() => setReasoningDialog(doc)}
                      isVerifying={verifyingDoc === doc.id}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="mt-4 space-y-6">
                <FinancialMetrics caseData={caseData} />
                <TransactionScanner 
                  bankStatement={bankStatement}
                  caseId={caseId}
                  onScanComplete={(results, flags) => {
                    if (flags.length > 0) {
                      const existingFlags = caseData.red_flags || [];
                      base44.entities.MortgageCase.update(caseId, {
                        red_flags: [...new Set([...existingFlags, ...flags])]
                      });
                      queryClient.invalidateQueries(['case', caseId]);
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="audit" className="mt-4">
                <AuditTrail logs={auditLogs} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            {/* Progress */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">התקדמות כללית</h3>
              <ProgressBattery
                progress={caseData.progress_percentage || 0}
                label={statusLabels[caseData.status]}
                status={caseData.status === 'rejected' ? 'blocked' : caseData.status === 'completed' ? 'completed' : 'in_progress'}
              />
            </div>

            {/* Milestones */}
            <MilestoneTracker milestones={milestones} />

            {/* Contact Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי קשר</h3>
              <div className="space-y-3">
                {caseData.client_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${caseData.client_phone}`} className="text-blue-600 hover:underline">
                      {caseData.client_phone}
                    </a>
                  </div>
                )}
                {caseData.client_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${caseData.client_email}`} className="text-blue-600 hover:underline">
                      {caseData.client_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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