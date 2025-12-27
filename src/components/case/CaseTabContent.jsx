import React, { useState } from 'react';
import { ExternalLink, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function CaseTabContent({ tabId, caseId, caseData }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    client_name: caseData?.client_name || '',
    client_id: caseData?.client_id || '',
    client_phone: caseData?.client_phone || '',
    client_email: caseData?.client_email || ''
  });

  React.useEffect(() => {
    if (caseData) {
      setFormData({
        client_name: caseData.client_name || '',
        client_id: caseData.client_id || '',
        client_phone: caseData.client_phone || '',
        client_email: caseData.client_email || ''
      });
    }
  }, [caseData]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };
  const renderContent = () => {
    switch (tabId) {
      case 'personal':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>שם מלא</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                placeholder="הכנס שם מלא"
              />
            </div>
            <div>
              <Label>תעודת זהות</Label>
              <Input
                value={formData.client_id}
                onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                placeholder="הכנס תעודת זהות"
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input
                value={formData.client_phone}
                onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                placeholder="הכנס טלפון"
              />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                placeholder="הכנס אימייל"
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
              שמור שינויים
            </Button>
          </form>
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