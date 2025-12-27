import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CaseAccount() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">פרטי חשבון</h2>
              <p className="text-gray-500">מידע כללי על החשבון</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <label className="text-sm font-medium text-gray-600 block mb-2">מספר חשבון</label>
              <p className="text-4xl font-bold text-blue-600">
                {caseData.account_number || 'לא הוקצה'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <label className="text-sm font-medium text-gray-600 block mb-2">שם לקוח</label>
                <p className="text-xl font-semibold text-gray-900">{caseData.client_name}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <label className="text-sm font-medium text-gray-600 block mb-2">תעודת זהות</label>
                <p className="text-xl font-semibold text-gray-900">{caseData.client_id}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <label className="text-sm font-medium text-gray-600 block mb-2">סכום הלוואה</label>
                <p className="text-xl font-semibold text-gray-900">
                  ₪{caseData.loan_amount?.toLocaleString() || '0'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <label className="text-sm font-medium text-gray-600 block mb-2">סטטוס</label>
                <p className="text-xl font-semibold text-gray-900">
                  {caseData.status === 'new' && 'חדש'}
                  {caseData.status === 'documents_pending' && 'ממתין למסמכים'}
                  {caseData.status === 'documents_review' && 'בבדיקה'}
                  {caseData.status === 'financial_analysis' && 'ניתוח פיננסי'}
                  {caseData.status === 'bank_submission' && 'הוגש לבנק'}
                  {caseData.status === 'approved' && 'אושר'}
                  {caseData.status === 'rejected' && 'נדחה'}
                  {caseData.status === 'completed' && 'הושלם'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}