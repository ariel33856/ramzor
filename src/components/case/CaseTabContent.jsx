import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function CaseTabContent({ tabId, caseId, caseData }) {
  const renderContent = () => {
    switch (tabId) {
      case 'personal':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">שם מלא</label>
              <p className="text-lg text-gray-900 mt-1">{caseData.client_name || 'לא צוין'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">תעודת זהות</label>
              <p className="text-lg text-gray-900 mt-1">{caseData.client_id || 'לא צוין'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">טלפון</label>
              <p className="text-lg text-gray-900 mt-1">{caseData.client_phone || 'לא צוין'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">אימייל</label>
              <p className="text-lg text-gray-900 mt-1">{caseData.client_email || 'לא צוין'}</p>
            </div>
          </div>
        );
      
      case 'contact':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "צור קשר" יתווסף בהמשך
          </p>
        );

      case 'summary':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "תקציר התיק" יתווסף בהמשך
          </p>
        );

      case 'notes':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "הערות מיוחדות" יתווסף בהמשך
          </p>
        );

      case 'data':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "נתונים" יתווסף בהמשך
          </p>
        );

      case 'workflow':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "תהליך עבודה" יתווסף בהמשך
          </p>
        );

      case 'status':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "סטטוס" יתווסף בהמשך
          </p>
        );

      case 'profiles':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "פרופילים" יתווסף בהמשך
          </p>
        );

      case 'metrics':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "מדדים" יתווסף בהמשך
          </p>
        );

      case 'dashboards':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "דשבורדים" יתווסף בהמשך
          </p>
        );

      case 'documents':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "מסמכים" יתווסף בהמשך
          </p>
        );

      case 'tracking':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "תיעוד התקשרות" יתווסף בהמשך
          </p>
        );

      case 'contacts':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "אנשי קשר" יתווסף בהמשך
          </p>
        );

      case 'calculator':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "מחשבון" יתווסף בהמשך
          </p>
        );

      case 'payments':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "תשלומים" יתווסף בהמשך
          </p>
        );

      case 'insurance':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "ביטוחים" יתווסף בהמשך
          </p>
        );

      case 'products':
        return (
          <p className="text-gray-500 text-center py-8">
            תוכן הכרטיסייה "מוצרי מעטפת" יתווסף בהמשך
          </p>
        );

      case 'account':
        return (
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
                <p className="text-xl font-semibold text-gray-900">{caseData.client_id || 'לא צוין'}</p>
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
        );

      default:
        return null;
    }
  };

  return <div>{renderContent()}</div>;
}