import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, DollarSign, Link as LinkIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function CaseAccount() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ['borrowers'],
    queryFn: () => base44.entities.MortgageCase.filter({ is_archived: true, module_id: null })
  });

  const { data: linkedBorrower } = useQuery({
    queryKey: ['linked-borrower', caseData?.linked_borrower_id],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseData.linked_borrower_id }).then(res => res[0]),
    enabled: !!caseData?.linked_borrower_id
  });

  const linkMutation = useMutation({
    mutationFn: (borrowerId) => base44.entities.MortgageCase.update(caseId, { linked_borrower_id: borrowerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setDialogOpen(false);
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: () => base44.entities.MortgageCase.update(caseId, { linked_borrower_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const filteredBorrowers = borrowers.filter(b => 
    b.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.client_id?.includes(searchTerm)
  );

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
    <div className="min-h-screen bg-gray-50/50 p-2 md:p-3">
      <div className="mx-auto">
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

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <label className="text-sm font-medium text-gray-600 block mb-2">שיוך ללווה</label>
              {linkedBorrower ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-semibold text-gray-900">{linkedBorrower.client_name}</p>
                    {linkedBorrower.client_id && (
                      <p className="text-sm text-gray-500">ת.ז: {linkedBorrower.client_id}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unlinkMutation.mutate()}
                    disabled={unlinkMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
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
                        {filteredBorrowers.map(borrower => (
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
                        {filteredBorrowers.length === 0 && (
                          <p className="text-center text-gray-500 py-8">לא נמצאו לווים</p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}