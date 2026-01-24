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
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        <p className="text-gray-500 text-center py-8">
          תוכן הכרטיסייה "מסמכים" יתווסף בהמשך
        </p>
      </div>
    </div>
  );
}