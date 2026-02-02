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
  const [obligationsOpen, setObligationsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

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

  const { data: linkedBorrowers = [] } = useQuery({
    queryKey: ['linked-borrowers', caseData?.linked_borrowers],
    queryFn: async () => {
      if (!caseData?.linked_borrowers || caseData.linked_borrowers.length === 0) return [];
      const promises = caseData.linked_borrowers.map(async id => {
        try {
          const borrower = await base44.entities.MortgageCase.filter({ id }).then(res => res[0]);
          if (borrower?.person_id) {
            const person = await base44.entities.Person.filter({ id: borrower.person_id }).then(res => res[0]);
            if (person) {
              return { ...borrower, _person: person };
            }
          }
          return null;
        } catch (e) {
          return null;
        }
      });
      return (await Promise.all(promises)).filter(b => b !== null);
    },
    enabled: !!caseData?.linked_borrowers,
    retry: 1
  });

  const person = linkedPerson || personById;

  const allLinkedPersons = React.useMemo(() => {
    const persons = [];

    // הוסף את האיש קשר הראשי
    if (person) persons.push(person);

    // הוסף אנשי קשר מ-linked_borrowers
    linkedBorrowers.forEach(borrower => {
      if (borrower._person && !persons.find(p => p.id === borrower._person.id)) {
        persons.push(borrower._person);
      }
    });

    // הוסף כל אנשי קשר שמשויכים לחשבון הזה דרך linked_accounts
    allPersons.forEach(p => {
      if (p.linked_accounts && p.linked_accounts.includes(caseId) && !persons.find(existing => existing.id === p.id)) {
        persons.push(p);
      }
    });

    // מיון כך שלווים יהיו בתחילת הרשימה
    return persons.sort((a, b) => {
      const aType = a.custom_data?.relationship_type || '';
      const bType = b.custom_data?.relationship_type || '';
      if (aType === 'לווה' && bType !== 'לווה') return -1;
      if (aType !== 'לווה' && bType === 'לווה') return 1;
      return 0;
    });
  }, [person, linkedBorrowers, allPersons, caseId]);

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
        {person?.custom_data?.id_upload_data?.file_url && (
          <div className="border rounded-lg bg-white p-4">
            <h3 className="text-base font-semibold mb-3">תעודת זהות</h3>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white max-w-md">
              <img
                src={person.custom_data.id_upload_data.file_url}
                alt="תעודת זהות"
                className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(person.custom_data.id_upload_data.file_url, '_blank')}
              />
            </div>
          </div>
        )}
        
        <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen} className="border rounded-lg bg-white">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-12 hover:bg-gray-50 rounded-none rounded-t-lg">
              <span className="text-base font-semibold">הכנסות</span>
              {incomeOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            {allLinkedPersons.length === 0 ? (
              <p className="text-gray-500 text-center py-4">לא נמצאו אנשי קשר מקושרים לתיק</p>
            ) : (
              <>
                <div className="bg-gray-100 p-2 mb-4 text-xs rounded">
                  <strong>DEBUG:</strong> נמצאו {allLinkedPersons.length} אנשי קשר | 
                  Linked Borrowers: {linkedBorrowers.length} | 
                  Person: {person ? '✓' : '✗'}
                </div>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-blue-100 border-b-2 border-blue-300">
                         <th className="text-right p-3 text-sm font-semibold border border-gray-300">שם</th>
                         <th className="text-right p-3 text-sm font-semibold border border-gray-300">סוג הכנסה</th>
                         <th className="text-center p-3 text-sm font-semibold border border-gray-300">הכנסה חודשית ממוצעת</th>
                         <th className="text-center p-3 text-sm font-semibold border border-gray-300">סה"כ הכנסות משוקללות</th>
                         <th className="text-center p-3 text-sm font-semibold border border-gray-300">סכום בפועל</th>
                       </tr>
                    </thead>
                    <tbody>
                      {allLinkedPersons.map((linkedPerson, personIndex) => {
                        const incomeSources = linkedPerson.custom_data?.income_sources || [];
                        const totalIncome = incomeSources.reduce((total, income) => {
                          if (income.type === 'תלוש משכורת-שכיר') {
                            const month1 = parseFloat(income.month_1_salary) || 0;
                            const month2 = parseFloat(income.month_2_salary) || 0;
                            const month3 = parseFloat(income.month_3_salary) || 0;
                            return total + ((month1 + month2 + month3) / 3);
                          } else {
                            return total + (parseFloat(income.monthly_amount) || 0);
                          }
                        }, 0);

                        if (incomeSources.length === 0) {
                          return (
                            <tr key={personIndex} className="border-b hover:bg-gray-50">
                              <td className="p-3 text-sm font-medium border border-gray-300">
                                <span className={`px-3 py-1.5 rounded-lg text-white font-semibold ${
                                  linkedPerson.custom_data?.relationship_type === 'לווה' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  linkedPerson.custom_data?.relationship_type === 'ערב' || linkedPerson.custom_data?.relationship_type === 'ערבה' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                                  linkedPerson.custom_data?.relationship_type === 'ערב ממשכן' || linkedPerson.custom_data?.relationship_type === 'ערבה ממשכנת' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                  'bg-gradient-to-r from-gray-500 to-gray-600'
                                }`}>
                                  {linkedPerson.first_name} {linkedPerson.last_name}
                                </span>
                              </td>
                              <td colSpan={2} className="p-3 text-sm text-gray-500 text-center border border-gray-300">אין מקורות הכנסה</td>
                              <td className="p-3 text-center text-sm font-bold border border-gray-300">0 ₪</td>
                              <td className="p-3 text-center text-sm font-bold border border-gray-300">0 ₪</td>
                            </tr>
                          );
                        }

                        return incomeSources.map((income, incomeIndex) => {
                          let avgIncome = 0;
                          if (income.type === 'תלוש משכורת-שכיר') {
                            const month1 = parseFloat(income.month_1_salary) || 0;
                            const month2 = parseFloat(income.month_2_salary) || 0;
                            const month3 = parseFloat(income.month_3_salary) || 0;
                            avgIncome = (month1 + month2 + month3) / 3;
                          } else {
                            avgIncome = parseFloat(income.monthly_amount) || 0;
                          }

                          return (
                            <tr key={`${personIndex}-${incomeIndex}`} className="border-b hover:bg-gray-50">
                              {incomeIndex === 0 && (
                                <td rowSpan={incomeSources.length} className="p-3 text-sm font-medium border border-gray-300">
                                  <span className={`px-3 py-1.5 rounded-lg text-white font-semibold ${
                                    linkedPerson.custom_data?.relationship_type === 'לווה' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                    linkedPerson.custom_data?.relationship_type === 'ערב' || linkedPerson.custom_data?.relationship_type === 'ערבה' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                                    linkedPerson.custom_data?.relationship_type === 'ערב ממשכן' || linkedPerson.custom_data?.relationship_type === 'ערבה ממשכנת' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                    'bg-gradient-to-r from-gray-500 to-gray-600'
                                  }`}>
                                    {linkedPerson.first_name} {linkedPerson.last_name}
                                  </span>
                                </td>
                              )}
                              <td className="p-3 text-sm border border-gray-300">
                                {income.type === 'תלוש משכורת-שכיר' ? 'משכורת' : income.type}
                                {income.employer_name && <span className="text-xs text-gray-500 block">{income.employer_name}</span>}
                              </td>
                              <td className="p-3 text-center text-sm font-semibold text-blue-700 border border-gray-300">
                                {Math.round(avgIncome).toLocaleString('he-IL')} ₪
                              </td>
                              {incomeIndex === 0 && (
                                <>
                                  <td rowSpan={incomeSources.length} className="p-3 text-center text-sm font-bold text-green-700 border border-gray-300 bg-green-50">
                                    {Math.round(totalIncome).toLocaleString('he-IL')} ₪
                                  </td>
                                  <td rowSpan={incomeSources.length} className="p-3 text-center text-sm font-bold border border-gray-300 bg-blue-50">
                                    {Math.round(linkedPerson.custom_data?.relationship_type === 'לווה' ? totalIncome : totalIncome * 0.5).toLocaleString('he-IL')} ₪
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        });
                      })}
                      <tr className="bg-green-100 border-t-2 border-green-300">
                         <td colSpan={2} className="p-3 text-sm font-bold text-right border border-gray-300">סך הכל הכנסות משוקללות:</td>
                         <td className="p-3 text-center text-lg font-bold text-green-700 border border-gray-300">
                           {Math.round(allLinkedPersons.reduce((total, linkedPerson) => {
                             return total + (linkedPerson.custom_data?.income_sources || []).reduce((sum, income) => {
                               if (income.type === 'תלוש משכורת-שכיר') {
                                 const month1 = parseFloat(income.month_1_salary) || 0;
                                 const month2 = parseFloat(income.month_2_salary) || 0;
                                 const month3 = parseFloat(income.month_3_salary) || 0;
                                 return sum + ((month1 + month2 + month3) / 3);
                               } else {
                                 return sum + (parseFloat(income.monthly_amount) || 0);
                               }
                             }, 0);
                           }, 0)).toLocaleString('he-IL')} ₪
                         </td>
                         <td className="p-3 text-center text-lg font-bold border border-gray-300 bg-blue-50">
                           {Math.round(allLinkedPersons.reduce((total, linkedPerson) => {
                             const incomeSources = linkedPerson.custom_data?.income_sources || [];
                             const personTotal = incomeSources.reduce((sum, income) => {
                               if (income.type === 'תלוש משכורת-שכיר') {
                                 const month1 = parseFloat(income.month_1_salary) || 0;
                                 const month2 = parseFloat(income.month_2_salary) || 0;
                                 const month3 = parseFloat(income.month_3_salary) || 0;
                                 return sum + ((month1 + month2 + month3) / 3);
                               } else {
                                 return sum + (parseFloat(income.monthly_amount) || 0);
                               }
                             }, 0);
                             const weight = linkedPerson.custom_data?.relationship_type === 'לווה' ? 1 : 0.5;
                             return total + (personTotal * weight);
                           }, 0)).toLocaleString('he-IL')} ₪
                         </td>
                       </tr>
                    </tbody>
                  </table>
                </div>
                </>
                )}
                </CollapsibleContent>
        </Collapsible>

        <Collapsible open={obligationsOpen} onOpenChange={setObligationsOpen} className="border rounded-lg bg-white">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-12 hover:bg-gray-50 rounded-none rounded-t-lg">
              <span className="text-base font-semibold">התחייבויות</span>
              {obligationsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            {allLinkedPersons.length === 0 ? (
              <p className="text-gray-500 text-center py-4">לא נמצאו אנשי קשר מקושרים לתיק</p>
            ) : (
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-red-100 border-b-2 border-red-300">
                     <th className="text-right p-3 text-sm font-semibold border border-gray-300">שם</th>
                     <th className="text-right p-3 text-sm font-semibold border border-gray-300">סוג התחייבות</th>
                     <th className="text-center p-3 text-sm font-semibold border border-gray-300">תשלום חודשי</th>
                     <th className="text-center p-3 text-sm font-semibold border border-gray-300">סה"כ התחייבויות משוקללות</th>
                     <th className="text-center p-3 text-sm font-semibold border border-gray-300">סכום בפועל</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLinkedPersons.map((linkedPerson, personIndex) => {
                      const obligations = linkedPerson.custom_data?.obligations || [];
                      const totalObligations = obligations.reduce((total, obligation) => {
                        return total + (parseFloat(obligation.monthly_payment) || 0);
                      }, 0);

                      if (obligations.length === 0) {
                        return (
                           <tr key={personIndex} className="border-b hover:bg-gray-50">
                             <td className="p-3 text-sm font-medium border border-gray-300">
                               <span className={`px-3 py-1.5 rounded-lg text-white font-semibold ${
                                 linkedPerson.custom_data?.relationship_type === 'לווה' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                 linkedPerson.custom_data?.relationship_type === 'ערב' || linkedPerson.custom_data?.relationship_type === 'ערבה' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                                 linkedPerson.custom_data?.relationship_type === 'ערב ממשכן' || linkedPerson.custom_data?.relationship_type === 'ערבה ממשכנת' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                 'bg-gradient-to-r from-gray-500 to-gray-600'
                               }`}>
                                 {linkedPerson.first_name} {linkedPerson.last_name}
                               </span>
                             </td>
                             <td colSpan={2} className="p-3 text-sm text-gray-500 text-center border border-gray-300">אין התחייבויות רשומות</td>
                             <td className="p-3 text-center text-sm font-bold border border-gray-300">0 ₪</td>
                             <td className="p-3 text-center text-sm font-bold border border-gray-300">0 ₪</td>
                           </tr>
                         );
                      }

                      return obligations.map((obligation, obligationIndex) => {
                        const monthlyPayment = parseFloat(obligation.monthly_payment) || 0;

                        return (
                          <tr key={`${personIndex}-${obligationIndex}`} className="border-b hover:bg-gray-50">
                            {obligationIndex === 0 && (
                              <td rowSpan={obligations.length} className="p-3 text-sm font-medium border border-gray-300">
                                <span className={`px-3 py-1.5 rounded-lg text-white font-semibold ${
                                  linkedPerson.custom_data?.relationship_type === 'לווה' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  linkedPerson.custom_data?.relationship_type === 'ערב' || linkedPerson.custom_data?.relationship_type === 'ערבה' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                                  linkedPerson.custom_data?.relationship_type === 'ערב ממשכן' || linkedPerson.custom_data?.relationship_type === 'ערבה ממשכנת' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                  'bg-gradient-to-r from-gray-500 to-gray-600'
                                }`}>
                                  {linkedPerson.first_name} {linkedPerson.last_name}
                                </span>
                              </td>
                            )}
                            <td className="p-3 text-sm border border-gray-300">
                              {obligation.type || 'התחייבות'}
                              {obligation.lender && <span className="text-xs text-gray-500 block">{obligation.lender}</span>}
                            </td>
                            <td className="p-3 text-center text-sm font-semibold text-red-700 border border-gray-300">
                              {Math.round(monthlyPayment).toLocaleString('he-IL')} ₪
                            </td>
                            {obligationIndex === 0 && (
                              <>
                                <td rowSpan={obligations.length} className="p-3 text-center text-sm font-bold text-red-700 border border-gray-300 bg-red-50">
                                  {Math.round(totalObligations).toLocaleString('he-IL')} ₪
                                </td>
                                <td rowSpan={obligations.length} className="p-3 text-center text-sm font-bold border border-gray-300 bg-orange-50">
                                  {Math.round(linkedPerson.custom_data?.relationship_type === 'לווה' ? totalObligations : totalObligations * 0.5).toLocaleString('he-IL')} ₪
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      });
                    })}
                    <tr className="bg-red-100 border-t-2 border-red-300">
                      <td colSpan={2} className="p-3 text-sm font-bold text-right border border-gray-300">סך הכל התחייבויות משוקללות:</td>
                      <td className="p-3 text-center text-lg font-bold text-red-700 border border-gray-300">
                        {Math.round(allLinkedPersons.reduce((total, linkedPerson) => {
                          return total + (linkedPerson.custom_data?.obligations || []).reduce((sum, obligation) => {
                            return sum + (parseFloat(obligation.monthly_payment) || 0);
                          }, 0);
                        }, 0)).toLocaleString('he-IL')} ₪
                      </td>
                      <td className="p-3 text-center text-lg font-bold border border-gray-300 bg-orange-50">
                        {Math.round(allLinkedPersons.reduce((total, linkedPerson) => {
                          const obligations = linkedPerson.custom_data?.obligations || [];
                          const personTotal = obligations.reduce((sum, obligation) => {
                            return sum + (parseFloat(obligation.monthly_payment) || 0);
                          }, 0);
                          const weight = linkedPerson.custom_data?.relationship_type === 'לווה' ? 1 : 0.5;
                          return total + (personTotal * weight);
                        }, 0)).toLocaleString('he-IL')} ₪
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleContent>
          </Collapsible>

          <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen} className="border rounded-lg bg-white">
          <CollapsibleTrigger asChild>
           <Button variant="ghost" className="w-full justify-between h-12 hover:bg-gray-50 rounded-none rounded-t-lg">
             <span className="text-base font-semibold">סיכום כלכלי</span>
             {summaryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
           </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t p-4">
            {(() => {
              // Calculate total income using same logic as income table
              const totalIncome = allLinkedPersons.reduce((grandTotal, linkedPerson) => {
                const incomeSources = linkedPerson.custom_data?.income_sources || [];
                const personTotal = incomeSources.reduce((total, income) => {
                  if (income.type === 'תלוש משכורת-שכיר') {
                    const month1 = parseFloat(income.month_1_salary) || 0;
                    const month2 = parseFloat(income.month_2_salary) || 0;
                    const month3 = parseFloat(income.month_3_salary) || 0;
                    return total + ((month1 + month2 + month3) / 3);
                  } else {
                    return total + (parseFloat(income.monthly_amount) || 0);
                  }
                }, 0);
                return grandTotal + personTotal;
              }, 0);

              // Calculate total income actual (weighted by relationship type)
              const totalIncomeActual = allLinkedPersons.reduce((grandTotal, linkedPerson) => {
                const incomeSources = linkedPerson.custom_data?.income_sources || [];
                const personTotal = incomeSources.reduce((total, income) => {
                  if (income.type === 'תלוש משכורת-שכיר') {
                    const month1 = parseFloat(income.month_1_salary) || 0;
                    const month2 = parseFloat(income.month_2_salary) || 0;
                    const month3 = parseFloat(income.month_3_salary) || 0;
                    return total + ((month1 + month2 + month3) / 3);
                  } else {
                    return total + (parseFloat(income.monthly_amount) || 0);
                  }
                }, 0);
                const weight = linkedPerson.custom_data?.relationship_type === 'לווה' ? 1 : 0.5;
                return grandTotal + (personTotal * weight);
              }, 0);

              // Calculate total obligations using same logic as obligations table
              const totalObligations = allLinkedPersons.reduce((grandTotal, linkedPerson) => {
                const obligations = linkedPerson.custom_data?.obligations || [];
                const personTotal = obligations.reduce((total, obligation) => {
                  return total + (parseFloat(obligation.monthly_payment) || 0);
                }, 0);
                return grandTotal + personTotal;
              }, 0);

              // Calculate total obligations actual (weighted by relationship type)
              const totalObligationsActual = allLinkedPersons.reduce((grandTotal, linkedPerson) => {
                const obligations = linkedPerson.custom_data?.obligations || [];
                const personTotal = obligations.reduce((total, obligation) => {
                  return total + (parseFloat(obligation.monthly_payment) || 0);
                }, 0);
                const weight = linkedPerson.custom_data?.relationship_type === 'לווה' ? 1 : 0.5;
                return grandTotal + (personTotal * weight);
              }, 0);

              const netIncome = totalIncome - totalObligations;
              const netIncomeActual = totalIncomeActual - totalObligationsActual;
              const obligationsPercentage = totalIncome > 0 ? (totalObligations / totalIncome) * 100 : 0;
              const obligationsPercentageActual = totalIncomeActual > 0 ? (totalObligationsActual / totalIncomeActual) * 100 : 0;

              return (
               <div className="overflow-x-auto">
                 <table className="w-full border-collapse border border-gray-300">
                   <tbody>
                     <tr className="bg-green-50 border-b">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">סך הכל הכנסות משוקללות:</td>
                       <td className="p-4 text-center text-lg font-bold text-green-700 border border-gray-300">
                         {Math.round(totalIncome).toLocaleString('he-IL')} ₪
                       </td>
                     </tr>
                     <tr className="bg-blue-50 border-b">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">הכנסות בפועל:</td>
                       <td className="p-4 text-center text-lg font-bold text-blue-700 border border-gray-300">
                         {Math.round(totalIncomeActual).toLocaleString('he-IL')} ₪
                       </td>
                     </tr>
                     <tr className="bg-red-50 border-b">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">סך הכל התחייבויות משוקללות:</td>
                       <td className="p-4 text-center text-lg font-bold text-red-700 border border-gray-300">
                         {Math.round(totalObligations).toLocaleString('he-IL')} ₪
                       </td>
                     </tr>
                     <tr className="bg-orange-50 border-b">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">התחייבויות בפועל:</td>
                       <td className="p-4 text-center text-lg font-bold text-orange-700 border border-gray-300">
                         {Math.round(totalObligationsActual).toLocaleString('he-IL')} ₪
                       </td>
                     </tr>
                     <tr className="bg-blue-50 border-b">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">הכנסה נטו (לאחר התחייבויות):</td>
                       <td className={`p-4 text-center text-lg font-bold border border-gray-300 ${netIncome >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                         {Math.round(netIncome).toLocaleString('he-IL')} ₪
                       </td>
                     </tr>
                     <tr className="bg-cyan-50 border-b">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">הכנסה נטו בפועל:</td>
                       <td className={`p-4 text-center text-lg font-bold border border-gray-300 ${netIncomeActual >= 0 ? 'text-cyan-700' : 'text-red-700'}`}>
                         {Math.round(netIncomeActual).toLocaleString('he-IL')} ₪
                       </td>
                     </tr>
                     <tr className="bg-purple-50">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">אחוז התחייבויות מההכנסה:</td>
                       <td className={`p-4 text-center text-lg font-bold border border-gray-300 ${obligationsPercentage <= 40 ? 'text-green-700' : obligationsPercentage <= 50 ? 'text-orange-600' : 'text-red-700'}`}>
                         {obligationsPercentage.toFixed(1)}%
                       </td>
                     </tr>
                     <tr className="bg-purple-100">
                       <td className="p-4 text-sm font-bold text-right border border-gray-300">אחוז התחייבויות בפועל:</td>
                       <td className={`p-4 text-center text-lg font-bold border border-gray-300 ${obligationsPercentageActual <= 40 ? 'text-green-700' : obligationsPercentageActual <= 50 ? 'text-orange-600' : 'text-red-700'}`}>
                         {obligationsPercentageActual.toFixed(1)}%
                       </td>
                     </tr>
                   </tbody>
                 </table>
               </div>
              );
           })()}
          </CollapsibleContent>
          </Collapsible>
          </div>
          </div>
          );
          }