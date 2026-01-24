import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CaseDocuments() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

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
    <div className="min-h-screen bg-gray-50/50 p-2">
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

        {person?.custom_data?.income_sources && person.custom_data.income_sources.length > 0 && (
          <div className="border rounded-lg bg-white p-4">
            <h3 className="text-base font-semibold mb-3">תלושי שכר</h3>
            <div className="space-y-4">
              {person.custom_data.income_sources.map((income, index) => (
                income.type === 'תלוש משכורת-שכיר' && (
                  <div key={index} className="space-y-3">
                    {income.employer_name && (
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        מעסיק: {income.employer_name}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((payslipNum) => (
                        income[`payslip_${payslipNum}_url`] && (
                          <div key={payslipNum} className="border-2 border-blue-300 rounded-lg overflow-hidden bg-white">
                            <div className="text-xs font-semibold bg-blue-100 px-2 py-1 text-center">תלוש {payslipNum}</div>
                            <img
                              src={income[`payslip_${payslipNum}_url`]}
                              alt={`תלוש ${payslipNum}`}
                              className="w-full h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(income[`payslip_${payslipNum}_url`], '_blank')}
                            />
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}