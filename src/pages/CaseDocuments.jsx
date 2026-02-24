import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import { Loader2, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import IDUploader from '@/components/person/IDUploader';

export default function CaseDocuments() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: allPersons = [] } = useQuery({
    queryKey: ['all-persons-for-case', caseId],
    queryFn: () => SecureEntities.Person.listForCasePersons(caseId),
    enabled: !!caseId
  });

  const linkedPerson = React.useMemo(() => {
    if (!caseId || !allPersons.length) return null;
    return allPersons.find(person => 
      person.linked_accounts && person.linked_accounts.some(acc =>
        typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
      )
    );
  }, [caseId, allPersons]);

  const { data: personById } = useQuery({
    queryKey: ['person', caseData?.person_id],
    queryFn: () => SecureEntities.Person.filter({ id: caseData.person_id }).then(res => res[0]),
    enabled: !!caseData?.person_id
  });

  const person = linkedPerson || personById;
  const queryClient = useQueryClient();
  const [gender, setGender] = useState('male');

  const updatePersonMutation = useMutation({
    mutationFn: (data) => SecureEntities.Person.update(person?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', person?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-persons'] });
    }
  });

  React.useEffect(() => {
    if (person?.custom_data?.id_upload_data?.gender) {
      setGender(person.custom_data.id_upload_data.gender);
    }
  }, [person]);

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
        {person && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">תעודת זהות</h2>
            </div>
            <div className="p-6">
              <IDUploader 
                initialData={person?.custom_data?.id_upload_data}
                gender={gender}
                setGender={setGender}
                compactMode={true}
                onDataExtracted={(data) => {
                  if (!data) {
                    const customData = { ...(person?.custom_data || {}) };
                    delete customData.id_upload_data;
                    updatePersonMutation.mutate({ custom_data: customData });
                    return;
                  }
                  
                  const customData = { 
                    ...(person?.custom_data || {}), 
                    id_upload_data: data,
                    birth_date: data.birth_date || person?.custom_data?.birth_date
                  };
                  updatePersonMutation.mutate({ custom_data: customData });
                }}
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