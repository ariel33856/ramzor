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

        {/* Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full justify-start bg-white rounded-xl p-1 border border-gray-100 flex-wrap h-auto">
            <TabsTrigger value="personal" className="rounded-lg">פרטים אישיים ופרטי התקשרות</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-lg">צור קשר</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg">תקציר התיק</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-lg">הערות מיוחדות</TabsTrigger>
            <TabsTrigger value="beneficiaries" className="rounded-lg">נהנים</TabsTrigger>
            <TabsTrigger value="workflow" className="rounded-lg">תהליך עבודה</TabsTrigger>
            <TabsTrigger value="status" className="rounded-lg">סטטוס</TabsTrigger>
            <TabsTrigger value="profiles" className="rounded-lg">פרופילים</TabsTrigger>
            <TabsTrigger value="metrics" className="rounded-lg">מדדים</TabsTrigger>
            <TabsTrigger value="dashboards" className="rounded-lg">דשבורדים</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg">מסמכים</TabsTrigger>
            <TabsTrigger value="tracking" className="rounded-lg">תיעוד והקשרות</TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-lg">אנשי קשר</TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-lg">משבצון</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg">תשלומים</TabsTrigger>
            <TabsTrigger value="insurance" className="rounded-lg">ביטוחים</TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg">מוצרי משכנתא</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטים אישיים</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">שם מלא</label>
                  <p className="font-medium">{caseData.client_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">תעודת זהות</label>
                  <p className="font-medium">{maskId(caseData.client_id)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">טלפון</label>
                  <p className="font-medium">{caseData.client_phone || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">אימייל</label>
                  <p className="font-medium">{caseData.client_email || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">גודל משפחה</label>
                  <p className="font-medium">{caseData.family_size || '—'} נפשות</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">יועץ אחראי</label>
                  <p className="font-medium">{caseData.assigned_consultant || '—'}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">צור קשר</h3>
              <div className="space-y-4">
                {caseData.client_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a href={`tel:${caseData.client_phone}`} className="text-blue-600 hover:underline">
                      {caseData.client_phone}
                    </a>
                  </div>
                )}
                {caseData.client_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a href={`mailto:${caseData.client_email}`} className="text-blue-600 hover:underline">
                      {caseData.client_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">תקציר התיק</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">סכום הלוואה</label>
                  <p className="text-xl font-bold">{formatCurrency(caseData.loan_amount)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">שווי נכס</label>
                  <p className="text-xl font-bold">{formatCurrency(caseData.property_value)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">הכנסה חודשית</label>
                  <p className="text-xl font-bold">{formatCurrency(caseData.monthly_income)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">הוצאות חודשיות</label>
                  <p className="text-xl font-bold">{formatCurrency(caseData.monthly_expenses)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">בנק יעד</label>
                  <p className="font-medium">{bankLabels[caseData.target_bank] || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">סטטוס</label>
                  <p className="font-medium">{statusLabels[caseData.status]}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">הערות מיוחדות</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{caseData.notes || 'אין הערות'}</p>
            </div>
          </TabsContent>

          <TabsContent value="beneficiaries" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">נהנים</h3>
              <p className="text-gray-500">אין מידע על נהנים</p>
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">תהליך עבודה</h3>
              <MilestoneTracker milestones={milestones} />
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">סטטוס התיק</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">סטטוס נוכחי</label>
                  <p className="text-xl font-bold">{statusLabels[caseData.status]}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">התקדמות</label>
                  <ProgressBattery
                    progress={caseData.progress_percentage || 0}
                    label={`${caseData.progress_percentage || 0}%`}
                    status={caseData.status === 'rejected' ? 'blocked' : caseData.status === 'completed' ? 'completed' : 'in_progress'}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">רמת דחיפות</label>
                  <div className="mt-2">
                    <UrgencyBadge urgency={caseData.urgency} showLabel />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profiles" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">פרופילים</h3>
              <p className="text-gray-500">אין פרופילים זמינים</p>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">מדדים פיננסיים</h3>
              <FinancialMetrics caseData={caseData} />
            </div>
          </TabsContent>

          <TabsContent value="dashboards" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">דשבורדים</h3>
              <p className="text-gray-500">אין דשבורדים זמינים</p>
            </div>
          </TabsContent>

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

          <TabsContent value="tracking" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">תיעוד והקשרות</h3>
              <AuditTrail logs={auditLogs} />
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">אנשי קשר</h3>
              <p className="text-gray-500">אין אנשי קשר נוספים</p>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">משבצון</h3>
              <p className="text-gray-500">אין פגישות מתוכננות</p>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">תשלומים</h3>
              <p className="text-gray-500">אין מידע על תשלומים</p>
            </div>
          </TabsContent>

          <TabsContent value="insurance" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ביטוחים</h3>
              <p className="text-gray-500">אין מידע על ביטוחים</p>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">מוצרי משכנתא</h3>
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
            </div>
          </TabsContent>
        </Tabs>
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