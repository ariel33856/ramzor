import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Banknote, Calendar, ChevronLeft, Flag, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UrgencyBadge from './UrgencyBadge';
import ProgressBattery from './ProgressBattery';

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

const bankLabels = {
  hapoalim: 'בנק הפועלים',
  leumi: 'בנק לאומי',
  mizrahi: 'מזרחי טפחות',
  discount: 'בנק דיסקונט',
  fibi: 'הבינלאומי',
  other: 'אחר'
};

export default function CaseCard({ caseData }) {
  const maskId = (id) => {
    if (!id || id.length < 4) return '***';
    return `${id.slice(0, 2)}****${id.slice(-2)}`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {caseData.client_name?.charAt(0) || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{caseData.client_name}</h3>
            <p className="text-sm text-gray-500">ת.ז: {maskId(caseData.client_id)}</p>
          </div>
        </div>
        <UrgencyBadge urgency={caseData.urgency} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Banknote className="w-4 h-4 text-gray-400" />
          <span>{formatCurrency(caseData.loan_amount)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span>{bankLabels[caseData.target_bank] || 'לא נבחר'}</span>
        </div>
      </div>

      {caseData.red_flags && caseData.red_flags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-red-50 rounded-lg border border-red-100">
          <Flag className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{caseData.red_flags.length} דגלים אדומים</span>
        </div>
      )}

      <ProgressBattery 
        progress={caseData.progress_percentage || 0} 
        label={statusLabels[caseData.status] || caseData.status}
        status={caseData.status === 'rejected' ? 'blocked' : caseData.status === 'completed' ? 'completed' : 'in_progress'}
      />

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>{caseData.assigned_consultant || 'לא הוקצה'}</span>
        </div>
        <Link
          to={createPageUrl(`CaseDetails?id=${caseData.id}`)}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          צפה בתיק
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}