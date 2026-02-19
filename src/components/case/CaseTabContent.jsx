import React, { useState } from 'react';
import { ExternalLink, Save, Loader2, Link as LinkIcon, X, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function CaseTabContent({ tabId, caseId, caseData }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  
  const [formData, setFormData] = useState({
    client_name: caseData?.client_name || '',
    client_id: caseData?.client_id || '',
    client_phone: caseData?.client_phone || '',
    client_email: caseData?.client_email || ''
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ['borrowers'],
    queryFn: () => SecureEntities.MortgageCase.filter({ is_archived: true, module_id: null })
  });

  const { data: linkedBorrowers = [] } = useQuery({
    queryKey: ['linked-borrowers', caseData?.linked_borrowers],
    queryFn: async () => {
      if (!caseData?.linked_borrowers || caseData.linked_borrowers.length === 0) return [];
      const promises = caseData.linked_borrowers.map(id => 
        SecureEntities.MortgageCase.filter({ id }).then(res => res[0])
      );
      return Promise.all(promises);
    },
    enabled: !!caseData?.linked_borrowers
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

  React.useEffect(() => {
    if (linkedBorrowers.length > 0 && linkedBorrowers[0]) {
      setBorrowerName(linkedBorrowers[0].client_name || '');
    }
  }, [linkedBorrowers]);

  const updateMutation = useMutation({
    mutationFn: (data) => SecureEntities.MortgageCase.update(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const updateBorrowerMutation = useMutation({
    mutationFn: (data) => SecureEntities.MortgageCase.update(linkedBorrowers[0].id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const linkMutation = useMutation({
    mutationFn: (borrowerId) => {
      const currentBorrowers = caseData.linked_borrowers || [];
      return SecureEntities.MortgageCase.update(caseId, { 
        linked_borrowers: [...currentBorrowers, borrowerId] 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setDialogOpen(false);
      setSearchTerm('');
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: (borrowerId) => {
      const currentBorrowers = caseData.linked_borrowers || [];
      return SecureEntities.MortgageCase.update(caseId, { 
        linked_borrowers: currentBorrowers.filter(id => id !== borrowerId) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const filteredBorrowers = borrowers.filter(b => 
    b.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.client_id?.includes(searchTerm)
  );

  const renderContent = () => {
    switch (tabId) {
      case 'personal':
        return (
          <div className="space-y-4">
            {linkedBorrowers.length > 0 && linkedBorrowers[0] && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
                <Label>לווה א'</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="שם הלווה"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => updateBorrowerMutation.mutate({ client_name: borrowerName })}
                    disabled={updateBorrowerMutation.isPending}
                  >
                    {updateBorrowerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
            
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
                <p className="text-xl font-semibold text-gray-900">
                  {linkedBorrowers.length > 0 && linkedBorrowers[0] ? linkedBorrowers[0].client_name : caseData.client_name}
                </p>
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

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-600">שיוך ללווים</label>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <LinkIcon className="w-4 h-4 ml-2" />
                      שייך ללווה
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>בחר לווה לשיוך</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="חיפוש לפי שם או ת.ז..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredBorrowers.filter(b => !(caseData.linked_borrowers || []).includes(b.id)).map(borrower => (
                          <div
                            key={borrower.id}
                            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => linkMutation.mutate(borrower.id)}
                          >
                            <p className="font-semibold text-gray-900">{borrower.client_name}</p>
                            {borrower.client_id && (
                              <p className="text-sm text-gray-500">ת.ז: {borrower.client_id}</p>
                            )}
                          </div>
                        ))}
                        {filteredBorrowers.filter(b => !(caseData.linked_borrowers || []).includes(b.id)).length === 0 && (
                          <p className="text-center text-gray-500 py-8">לא נמצאו לווים</p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {linkedBorrowers.length > 0 ? (
                <div className="space-y-3">
                  {linkedBorrowers.map(borrower => borrower && (
                    <div key={borrower.id} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                      <div>
                        <p className="font-semibold text-gray-900">{borrower.client_name}</p>
                        {borrower.client_id && (
                          <p className="text-sm text-gray-500">ת.ז: {borrower.client_id}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => unlinkMutation.mutate(borrower.id)}
                        disabled={unlinkMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">אין לווים משויכים</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div>{renderContent()}</div>;
}