import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function CaseData() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const [incomeOpen, setIncomeOpen] = useState(false);

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
    <div className="min-h-screen bg-gray-50/50 p-2 md:p-3">
      <div className="mx-auto space-y-3">
        <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen} className="border rounded-lg bg-white">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-12 hover:bg-gray-50 rounded-none rounded-t-lg">
              <span className="text-base font-semibold">הכנסות</span>
              {incomeOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            <p className="text-gray-500 text-center py-4">תוכן הכנסות יתווסף בהמשך</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}