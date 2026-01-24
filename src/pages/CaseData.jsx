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

  const { data: allPersons = [] } = useQuery({
    queryKey: ['all-persons'],
    queryFn: () => base44.entities.Person.list(),
    enabled: !!caseId
  });

  const linkedPerson = React.useMemo(() => {
    if (!caseId || !allPersons.length) return null;
    return allPersons.find(person => 
      person.linked_accounts && person.linked_accounts.includes(caseId)
    );
  }, [caseId, allPersons]);

  const { data: personById } = useQuery({
    queryKey: ['person', caseData?.person_id],
    queryFn: () => base44.entities.Person.filter({ id: caseData.person_id }).then(res => res[0]),
    enabled: !!caseData?.person_id
  });

  const person = linkedPerson || personById;

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
            <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
              <div>Debug: caseId = {caseId}</div>
              <div>Debug: person = {person ? 'קיים' : 'לא קיים'}</div>
              <div>Debug: person.id = {person?.id}</div>
              <div>Debug: person.first_name = {person?.first_name}</div>
              <div>Debug: income_sources = {person?.custom_data?.income_sources ? JSON.stringify(person.custom_data.income_sources) : 'לא קיים'}</div>
            </div>
            {!person ? (
              <p className="text-gray-500 text-center py-4">לא נמצא איש קשר מקושר לתיק</p>
            ) : !person.custom_data?.income_sources || person.custom_data.income_sources.length === 0 ? (
              <p className="text-gray-500 text-center py-4">אין מקורות הכנסה רשומים</p>
            ) : (
              <div className="space-y-4">
                {person.custom_data.income_sources.map((income, index) => (
                  <div key={index} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">
                      {income.type === 'תלוש משכורת-שכיר' ? 'הכנסה בתלוש שכר' : `הכנסה מ-${income.type}`}
                    </h3>
                    {income.type === 'תלוש משכורת-שכיר' ? (
                      <div className="space-y-3">
                        {income.employer_name && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">מעסיק:</span>
                            <span className="text-sm">{income.employer_name}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-4 gap-3">
                          {income.month_1_salary && (
                            <div>
                              <div className="text-xs text-gray-500">חודש 1</div>
                              <div className="text-sm font-semibold">{parseFloat(income.month_1_salary).toLocaleString('he-IL')} ₪</div>
                            </div>
                          )}
                          {income.month_2_salary && (
                            <div>
                              <div className="text-xs text-gray-500">חודש 2</div>
                              <div className="text-sm font-semibold">{parseFloat(income.month_2_salary).toLocaleString('he-IL')} ₪</div>
                            </div>
                          )}
                          {income.month_3_salary && (
                            <div>
                              <div className="text-xs text-gray-500">חודש 3</div>
                              <div className="text-sm font-semibold">{parseFloat(income.month_3_salary).toLocaleString('he-IL')} ₪</div>
                            </div>
                          )}
                          {(income.month_1_salary || income.month_2_salary || income.month_3_salary) && (
                            <div>
                              <div className="text-xs text-gray-500">ממוצע</div>
                              <div className="text-sm font-bold text-blue-700">
                                {Math.round(((parseFloat(income.month_1_salary) || 0) + (parseFloat(income.month_2_salary) || 0) + (parseFloat(income.month_3_salary) || 0)) / 3).toLocaleString('he-IL')} ₪
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {income.monthly_amount && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">הכנסה חודשית:</span>
                            <span className="text-sm font-semibold">{parseFloat(income.monthly_amount).toLocaleString('he-IL')} ₪</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 border-2 border-green-300 bg-green-50 rounded-lg px-4 py-2">
                  <span className="text-sm font-bold whitespace-nowrap">סך ההכנסות המשוקלל:</span>
                  <span className="text-lg font-bold text-green-700">
                    {person.custom_data.income_sources.reduce((total, income) => {
                      if (income.type === 'תלוש משכורת-שכיר') {
                        const month1 = parseFloat(income.month_1_salary) || 0;
                        const month2 = parseFloat(income.month_2_salary) || 0;
                        const month3 = parseFloat(income.month_3_salary) || 0;
                        const avg = (month1 + month2 + month3) / 3;
                        return total + avg;
                      } else {
                        return total + (parseFloat(income.monthly_amount) || 0);
                      }
                    }, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪
                  </span>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}