import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, CheckCircle, XCircle, AlertTriangle, Clock, Eye, Brain, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const documentTypeLabels = {
  id_card: 'תעודת זהות',
  salary_slip: 'תלוש משכורת',
  bank_statement: 'דף חשבון בנק',
  employment_letter: 'אישור העסקה',
  property_appraisal: 'שמאות נכס',
  purchase_agreement: 'חוזה רכישה',
  tax_return: 'דוח שנתי / 106',
  other: 'אחר'
};

const statusConfig = {
  pending: {
    label: 'ממתין לבדיקה',
    icon: Clock,
    classes: 'bg-gray-100 text-gray-600'
  },
  verified: {
    label: 'אומת',
    icon: CheckCircle,
    classes: 'bg-emerald-100 text-emerald-700'
  },
  rejected: {
    label: 'נדחה',
    icon: XCircle,
    classes: 'bg-red-100 text-red-700'
  },
  needs_clarification: {
    label: 'דורש הבהרה',
    icon: AlertTriangle,
    classes: 'bg-orange-100 text-orange-700'
  }
};

export default function DocumentCard({ document, onVerify, onViewReasoning }) {
  const status = statusConfig[document.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isImage = document.file_url?.match(/\.(jpg|jpeg|png|gif)$/i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${document.status === 'verified' ? 'bg-emerald-100' : document.status === 'rejected' ? 'bg-red-100' : 'bg-blue-100'}`}>
              {isImage ? (
                <Image className={`w-5 h-5 ${document.status === 'verified' ? 'text-emerald-600' : document.status === 'rejected' ? 'text-red-600' : 'text-blue-600'}`} />
              ) : (
                <FileText className={`w-5 h-5 ${document.status === 'verified' ? 'text-emerald-600' : document.status === 'rejected' ? 'text-red-600' : 'text-blue-600'}`} />
              )}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">
                {documentTypeLabels[document.document_type] || document.document_type}
              </h4>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">{document.file_name}</p>
            </div>
          </div>
          <Badge className={status.classes}>
            <StatusIcon className="w-3.5 h-3.5 ml-1" />
            {status.label}
          </Badge>
        </div>

        {document.expiry_warning && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg mb-3 border border-orange-100">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">מסמך ישן מ-3 חודשים</span>
          </div>
        )}

        {document.red_flags && document.red_flags.length > 0 && (
          <div className="space-y-1 mb-3 p-2 bg-red-50 rounded-lg border border-red-100">
            {document.red_flags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-700">
                <span className="text-red-500">🚩</span>
                {flag}
              </div>
            ))}
          </div>
        )}

        {document.verified_at && (
          <p className="text-xs text-gray-400 mb-3">
            אומת בתאריך: {format(new Date(document.verified_at), 'dd/MM/yyyy HH:mm', { locale: he })}
            {document.verified_by && ` על ידי ${document.verified_by}`}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.open(document.file_url, '_blank')}
          >
            <Eye className="w-4 h-4 ml-1" />
            צפייה
          </Button>
          
          {document.ai_reasoning && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onViewReasoning?.(document)}
            >
              <Brain className="w-4 h-4 ml-1" />
              נתיב חשיבה
            </Button>
          )}
          
          {document.status === 'pending' && (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => onVerify?.(document)}
            >
              <Brain className="w-4 h-4 ml-1" />
              אמת עם AI
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}