import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import { Loader2, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const subStatusOptions = {
  'ליד חדש': ['יצירת קשר ראשוני', 'המתנה לתגובה', 'קבע פגישה', 'לא הגיב'],
  'בתהליך מכירה': ['איסוף מסמכים', 'בדיקת כדאיות', 'הכנת הצעה', 'משא ומתן', 'סגירת עסקה'],
  'לקוח פעיל': ['בטיפול שוטף', 'הוגש לבנק', 'אושר', 'ממתין לחתימה', 'הושלם'],
  'נטש': ['לא רלוונטי', 'לא מעוניין', 'לא עונה', 'עבר למתחרה'],
  'ארכיון': ['הושלם', 'בוטל', 'לא רלוונטי יותר']
};

export default function CaseStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const updateStatusMutation = useMutation({
    mutationFn: (mainStatus) => 
      SecureEntities.MortgageCase.update(caseId, { 
        main_status: mainStatus 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const updateSubStatusMutation = useMutation({
    mutationFn: (subStatus) => 
      SecureEntities.MortgageCase.update(caseId, { 
        sub_status: subStatus 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
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
    <div className="min-h-screen bg-gray-50/50 p-2">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            <div>
              <Label className="text-base font-semibold">סטטוס ראשי</Label>
              <Select 
                value={caseData.main_status || 'ליד חדש'} 
                onValueChange={(value) => updateStatusMutation.mutate(value)}
              >
                <SelectTrigger className="mt-2 h-11">
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ליד חדש">ליד חדש</SelectItem>
                  <SelectItem value="בתהליך מכירה">בתהליך מכירה</SelectItem>
                  <SelectItem value="לקוח פעיל">לקוח פעיל</SelectItem>
                  <SelectItem value="נטש">נטש</SelectItem>
                  <SelectItem value="ארכיון">ארכיון</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-base font-semibold">תת סטטוס</Label>
              <Select 
                value={caseData.sub_status || ''} 
                onValueChange={(value) => updateSubStatusMutation.mutate(value)}
              >
                <SelectTrigger className="mt-2 h-11">
                  <SelectValue placeholder="בחר תת סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  {subStatusOptions[caseData.main_status || 'ליד חדש']?.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}