import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, FileText, AlertTriangle, Clock } from 'lucide-react';
import ProgressBattery from '../dashboard/ProgressBattery';

const requiredDocuments = [
  { type: 'id_card', label: 'תעודת זהות' },
  { type: 'salary_slip', label: 'תלושי משכורת (3 אחרונים)' },
  { type: 'bank_statement', label: 'דפי חשבון (3 חודשים)' },
  { type: 'employment_letter', label: 'אישור העסקה' },
  { type: 'property_appraisal', label: 'שמאות נכס' },
  { type: 'purchase_agreement', label: 'חוזה רכישה' }
];

export default function ClientProgress({ caseData, documents = [] }) {
  const getDocumentStatus = (type) => {
    const doc = documents.find(d => d.document_type === type);
    if (!doc) return 'missing';
    return doc.status;
  };

  const completedDocs = requiredDocuments.filter(
    doc => getDocumentStatus(doc.type) === 'verified'
  ).length;
  
  const progress = Math.round((completedDocs / requiredDocuments.length) * 100);

  return (
    <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 text-white">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">שלום {caseData?.client_name?.split(' ')[0]}</h2>
        <p className="text-blue-100">הנה סטטוס הבקשה שלך למשכנתא</p>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-medium">התקדמות כללית</span>
          <span className="text-3xl font-bold">{caseData?.progress_percentage || progress}%</span>
        </div>
        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${caseData?.progress_percentage || progress}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold mb-4">מסמכים נדרשים</h3>
        {requiredDocuments.map((doc, index) => {
          const status = getDocumentStatus(doc.type);
          
          return (
            <motion.div
              key={doc.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-xl ${
                status === 'verified' ? 'bg-emerald-500/20' :
                status === 'needs_clarification' ? 'bg-orange-500/20' :
                status === 'rejected' ? 'bg-red-500/20' :
                status === 'pending' ? 'bg-blue-500/20' :
                'bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <span>{doc.label}</span>
              </div>
              
              {status === 'verified' ? (
                <CheckCircle className="w-5 h-5 text-emerald-300" />
              ) : status === 'pending' ? (
                <Clock className="w-5 h-5 text-blue-300" />
              ) : status === 'needs_clarification' ? (
                <AlertTriangle className="w-5 h-5 text-orange-300" />
              ) : (
                <Circle className="w-5 h-5 text-white/50" />
              )}
            </motion.div>
          );
        })}
      </div>

      {documents.some(d => d.status === 'needs_clarification') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-orange-500/20 rounded-xl border border-orange-400/30"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-300 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">נדרשת תשומת לב</h4>
              <p className="text-sm text-white/80">
                יש מסמכים שדורשים הבהרה או תיקון. אנא בדוק את הפרטים וצור קשר עם היועץ שלך.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}