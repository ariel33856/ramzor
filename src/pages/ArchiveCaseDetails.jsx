import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, Save, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ArchiveCaseDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['archive-case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: allCases = [] } = useQuery({
    queryKey: ['all-cases'],
    queryFn: () => base44.entities.MortgageCase.list('-created_date')
  });

  const accounts = allCases.filter(c => !c.is_archived && !c.module_id);

  // Find the account that this borrower is linked to
  const linkedAccount = accounts.find(acc => 
    acc.linked_borrowers && acc.linked_borrowers.includes(caseId)
  );

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (caseData) {
      setFormData(caseData);
    }
  }, [caseData]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['archive-cases'] });
    }
  });

  const linkToAccountMutation = useMutation({
    mutationFn: (accountId) => {
      return base44.entities.MortgageCase.filter({ id: accountId }).then(async (result) => {
        const account = result[0];
        const currentBorrowers = account.linked_borrowers || [];
        return base44.entities.MortgageCase.update(accountId, { 
          linked_borrowers: [...currentBorrowers, caseId] 
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      setSearchTerm('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_number?.toString().includes(searchTerm)
  );

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

  const urgencyLabels = {
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
    critical: 'קריטית'
  };

  const bankLabels = {
    hapoalim: 'בנק הפועלים',
    leumi: 'בנק לאומי',
    mizrahi: 'בנק מזרחי',
    discount: 'בנק דיסקונט',
    fibi: 'בנק פאגי',
    other: 'אחר'
  };

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
          <h2 className="text-xl font-semibold text-gray-900">חשבון לא נמצא</h2>
          <Link to={createPageUrl('ArchiveAccounts')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה ללווים
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto p-6">
        <div className="mb-6">
          <Link to={createPageUrl('ArchiveAccounts')}>
            <Button variant="outline" className="mb-4">
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה ללווים
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{caseData.client_name}</h1>
              <p className="text-gray-500 mt-1">חשבון מס׳ {caseData.account_number}</p>
            </div>
            <div className="flex gap-2">
              {linkedAccount && (
                <Link to={createPageUrl('CaseDetails') + `?id=${linkedAccount.id}`}>
                  <Button variant="outline" className="border-blue-200 bg-blue-50">
                    חשבון משויך: {linkedAccount.client_name}
                  </Button>
                </Link>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    <LinkIcon className="w-4 h-4 ml-2" />
                    שייך לחשבון
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>בחר חשבון לשיוך</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="חיפוש לפי שם או מספר חשבון..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredAccounts.map(account => (
                        <div
                          key={account.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => linkToAccountMutation.mutate(account.id)}
                        >
                          <p className="font-semibold text-gray-900">{account.client_name}</p>
                          <p className="text-sm text-gray-500">חשבון מס׳ {account.account_number}</p>
                        </div>
                      ))}
                      {filteredAccounts.length === 0 && (
                        <p className="text-center text-gray-500 py-8">לא נמצאו חשבונות</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* פרטים אישיים */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">פרטים אישיים</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>שם לקוח</Label>
                  <Input
                    value={formData.client_name || ''}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>תעודת זהות</Label>
                  <Input
                    value={formData.client_id || ''}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>טלפון</Label>
                  <Input
                    value={formData.client_phone || ''}
                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>אימייל</Label>
                  <Input
                    type="email"
                    value={formData.client_email || ''}
                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* נתונים פיננסיים */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">נתונים פיננסיים</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>סכום הלוואה</Label>
                  <Input
                    type="number"
                    value={formData.loan_amount || ''}
                    onChange={(e) => setFormData({...formData, loan_amount: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>שווי נכס</Label>
                  <Input
                    type="number"
                    value={formData.property_value || ''}
                    onChange={(e) => setFormData({...formData, property_value: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>הכנסה חודשית</Label>
                  <Input
                    type="number"
                    value={formData.monthly_income || ''}
                    onChange={(e) => setFormData({...formData, monthly_income: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>הוצאות חודשיות</Label>
                  <Input
                    type="number"
                    value={formData.monthly_expenses || ''}
                    onChange={(e) => setFormData({...formData, monthly_expenses: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>גודל משפחה</Label>
                  <Input
                    type="number"
                    value={formData.family_size || ''}
                    onChange={(e) => setFormData({...formData, family_size: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* סטטוס וניהול */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">סטטוס וניהול</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>סטטוס</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>דחיפות</Label>
                  <Select value={formData.urgency} onValueChange={(value) => setFormData({...formData, urgency: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(urgencyLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>יועץ אחראי</Label>
                  <Input
                    value={formData.assigned_consultant || ''}
                    onChange={(e) => setFormData({...formData, assigned_consultant: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>בנק יעד</Label>
                  <Select value={formData.target_bank} onValueChange={(value) => setFormData({...formData, target_bank: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="בחר בנק" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(bankLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* הערות */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">הערות</h2>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={6}
                placeholder="הערות נוספות..."
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    שמור שינויים
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}