import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, Building2, Calendar, DollarSign, Clock } from 'lucide-react';

const bankLabels = {
  hapoalim: 'הפועלים',
  leumi: 'לאומי',
  mizrahi: 'מזרחי טפחות',
  discount: 'דיסקונט',
  fibi: 'הבינלאומי',
  yahav: 'יהב',
  mercantile: 'מרכנתיל',
  other: 'אחר'
};

const statusConfig = {
  draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'הוגש', color: 'bg-blue-100 text-blue-700' },
  in_review: { label: 'בבדיקה', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'אושר', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'נדחה', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'בוטל', color: 'bg-gray-200 text-gray-500' }
};

const loanTypeLabels = {
  purchase: 'רכישה',
  renovation: 'שיפוץ',
  refinance: 'מחזור',
  equity_release: 'משכנתא הפוכה',
  other: 'אחר'
};

const formatCurrency = (amount) => {
  if (!amount) return '—';
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
};

export default function SubmissionCard({ submission, onEdit, onDelete }) {
  const status = statusConfig[submission.status] || statusConfig.draft;
  const tracks = submission.tracks || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{bankLabels[submission.bank] || submission.bank}</h3>
              {submission.bank_branch && <p className="text-xs text-gray-500">סניף {submission.bank_branch}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>{status.label}</Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(submission)}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => onDelete(submission.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {submission.loan_amount && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-600" />
              <span className="text-gray-500">סכום:</span>
              <span className="font-medium">{formatCurrency(submission.loan_amount)}</span>
            </div>
          )}
          {submission.loan_type && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">סוג:</span>
              <span className="font-medium">{loanTypeLabels[submission.loan_type] || submission.loan_type}</span>
            </div>
          )}
          {submission.loan_period_years && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-gray-500">תקופה:</span>
              <span className="font-medium">{submission.loan_period_years} שנים</span>
            </div>
          )}
          {submission.submission_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-gray-500">תאריך:</span>
              <span className="font-medium">{submission.submission_date}</span>
            </div>
          )}
          {submission.interest_rate && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">ריבית:</span>
              <span className="font-medium">{submission.interest_rate}%</span>
            </div>
          )}
          {submission.monthly_payment && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">החזר חודשי:</span>
              <span className="font-medium">{formatCurrency(submission.monthly_payment)}</span>
            </div>
          )}
          {submission.contact_person && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">איש קשר:</span>
              <span className="font-medium">{submission.contact_person}</span>
            </div>
          )}
        </div>

        {/* Tracks */}
        {tracks.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <p className="text-xs font-semibold text-gray-600 mb-1">מסלולים ({tracks.length})</p>
            <div className="grid gap-1">
              {tracks.map((track, i) => (
                <div key={i} className="flex items-center gap-3 text-xs bg-gray-50 rounded px-2 py-1">
                  <span className="font-medium text-gray-800">{track.track_type || '—'}</span>
                  {track.amount && <span className="text-gray-500">{formatCurrency(track.amount)}</span>}
                  {track.period_years && <span className="text-gray-500">{track.period_years} שנים</span>}
                  {track.interest_rate && <span className="text-gray-500">{track.interest_rate}%</span>}
                  {track.monthly_payment && <span className="text-gray-500">החזר: {formatCurrency(track.monthly_payment)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {submission.notes && (
          <div className="mt-2 text-xs text-gray-500 bg-yellow-50 rounded p-2">{submission.notes}</div>
        )}
      </div>
    </div>
  );
}