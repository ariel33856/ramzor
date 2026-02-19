import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, Save, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SecureEntities } from '@/components/secureEntities';

export default function ModuleCaseDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const moduleId = urlParams.get('moduleId');
  const queryClient = useQueryClient();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['module-case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: module } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => SecureEntities.Module.filter({ id: moduleId }).then(res => res[0]),
    enabled: !!moduleId
  });

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (caseData) {
      setFormData(caseData);
    }
  }, [caseData]);

  const updateMutation = useMutation({
    mutationFn: (data) => SecureEntities.MortgageCase.update(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['module-cases', moduleId] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

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

  if (isLoading || !module) {
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
          <h2 className="text-xl font-semibold text-gray-900">רשומה לא נמצאה</h2>
          <Link to={createPageUrl('ModuleView') + `?moduleId=${moduleId}`} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה למודול
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto p-6">
        <div className="mb-6">
          <Link to={createPageUrl('ModuleView') + `?moduleId=${moduleId}`}>
            <Button variant="outline" className="mb-4">
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה ל{module.name}
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{caseData.client_name}</h1>
            <p className="text-gray-500 mt-1">חשבון מס׳ {caseData.account_number}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">פרטים אישיים</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>עיר</Label>
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
              </div>
            </div>

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
              </div>
            </div>

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