import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import LinkedBorrowerCard from '@/components/case/LinkedBorrowerCard';
import PersonDetailsView from '@/components/person/PersonDetailsView';
import ContactButtons from '@/components/case/ContactButtons';
import AddContactButton from '@/components/case/AddContactButton';
import ContactsSummaryView from '@/components/case/ContactsSummaryView';

export default function CasePersonal() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const isFullPage = window.location.pathname.includes('CasePersonal');
  const queryClient = useQueryClient();
  const [sortedContacts, setSortedContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: linkedBorrowers = [] } = useQuery({
    queryKey: ['linked-borrowers', caseData?.linked_borrowers],
    queryFn: async () => {
      if (!caseData?.linked_borrowers || caseData.linked_borrowers.length === 0) return [];
      // הסרת כפילויות מהמערך
      const uniqueIds = [...new Set(caseData.linked_borrowers)];
      const promises = uniqueIds.map(async id => {
        const borrower = await base44.entities.MortgageCase.filter({ id }).then(res => res[0]);
        if (!borrower) return null;
        
        // אם ללווה יש person_id, נשלוף את הנתונים מה-Person
        if (borrower.person_id) {
          const person = await base44.entities.Person.filter({ id: borrower.person_id }).then(res => res[0]);
          if (person) {
            return {
              ...borrower,
              _person: person,
              client_name: person.first_name,
              last_name: person.last_name,
              client_id: person.id_number,
              client_phone: person.phone,
              client_email: person.email
            };
          }
        }
        
        return borrower;
      });
      const results = await Promise.all(promises);
      // סינון של תוצאות null או undefined
      return results.filter(borrower => borrower != null);
    },
    enabled: !!caseData?.linked_borrowers
  });

  const { data: linkedContacts = [] } = useQuery({
    queryKey: ['linked-contacts', caseId],
    queryFn: async () => {
      const allPersons = await base44.entities.Person.list();
      return allPersons.filter(person => {
        if (!person.linked_accounts || person.linked_accounts.length === 0) return false;
        
        // תמיכה במבנה ישן (מערך של מחרוזות) וחדש (מערך של אובייקטים)
        return person.linked_accounts.some(acc => 
          typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
        );
      });
    },
    enabled: !!caseId,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  React.useEffect(() => {
    if (linkedContacts.length > 0) {
      // עדכן רק אם השתנה מספר אנשי הקשר או ה-IDs שלהם
      const currentIds = sortedContacts.map(c => c.id).sort().join(',');
      const newIds = linkedContacts.map(c => c.id).sort().join(',');
      if (currentIds !== newIds) {
        setSortedContacts(linkedContacts);
      }
      if (!activeContactId || !linkedContacts.find(c => c.id === activeContactId)) {
        setActiveContactId(linkedContacts[0].id);
      }
    }
  }, [linkedContacts]);

  const moveContactToTop = (contactId) => {
    const currentScroll = window.scrollY;
    setActiveContactId(contactId);
    setShowSummary(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: currentScroll, behavior: 'instant' });
    });
  };

  React.useEffect(() => {
    window.changeCaseContact = (contactId) => {
      moveContactToTop(contactId);
    };
    return () => {
      window.changeCaseContact = null;
    };
  }, []);

  const unlinkBorrowerMutation = useMutation({
    mutationFn: (borrowerId) => {
      const currentBorrowers = caseData.linked_borrowers || [];
      const updatedBorrowers = currentBorrowers.filter(id => id !== borrowerId);
      return base44.entities.MortgageCase.update(caseId, { 
        linked_borrowers: updatedBorrowers 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
    }
  });

  const [formData, setFormData] = useState({
    client_name: '',
    client_id: '',
    client_phone: '',
    client_email: ''
  });

  const [borrowerName, setBorrowerName] = useState('');

  React.useEffect(() => {
    if (caseData) {
      setFormData({
        client_name: caseData.client_name || '',
        client_id: caseData.client_id || '',
        client_phone: caseData.client_phone || '',
        client_email: caseData.client_email || ''
      });
    }
  }, [caseData]);

  React.useEffect(() => {
    if (linkedBorrowers.length > 0 && linkedBorrowers[0]) {
      setBorrowerName(linkedBorrowers[0].client_name || '');
    }
  }, [linkedBorrowers]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const updateBorrowerMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(linkedBorrowers[0].id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  React.useEffect(() => {
    if (!caseId) {
      window.location.href = createPageUrl('Dashboard');
    }
  }, [caseId]);

  React.useEffect(() => {
    if (!isLoading && !caseData && caseId) {
      window.location.href = createPageUrl('Dashboard');
    }
  }, [isLoading, caseData, caseId]);

  if (!caseId || isLoading || !caseData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="relative">
      {isFullPage && (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-2 flex items-center gap-2 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">
            אנשי קשר משויכים לחשבון <span className="text-gray-600 text-lg font-normal">({linkedContacts.length})</span>
          </h2>
          <span className="text-gray-400">|</span>
          {linkedContacts.length > 0 && (
            <ContactButtons
              linkedContacts={linkedContacts}
              caseId={caseId}
              activeContactId={activeContactId}
              onContactClick={(contactId) => moveContactToTop(contactId)}
            />
          )}
          <button
            onClick={() => { setShowSummary(true); setActiveContactId(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 ${showSummary ? 'ring-4 ring-white outline outline-4 outline-blue-500 shadow-lg' : ''}`}
          >
            סיכום
          </button>
          <AddContactButton caseId={caseId} linkedContacts={linkedContacts} />
        </div>
      )}

      <div className="space-y-4 p-1">
        {showSummary && (
          <ContactsSummaryView linkedContacts={linkedContacts} caseId={caseId} />
        )}
        {sortedContacts.map((contact) => (
          <div 
            key={contact.id} 
            id={`contact-${contact.id}`}
            style={{ display: !showSummary && contact.id === activeContactId ? 'block' : 'none' }}
          >
            <PersonDetailsView personId={contact.id} />
          </div>
        ))}

        {linkedBorrowers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">לווים משויכים ({linkedBorrowers.length})</h3>
          {linkedBorrowers.map((borrower, index) => (
            <LinkedBorrowerCard
              key={`${borrower.id}-${index}`}
              borrower={borrower}
              caseId={caseId}
              onUnlink={(borrowerId) => unlinkBorrowerMutation.mutate(borrowerId)}
            />
          ))}
        </div>
        )}
      </div>
    </div>
  );
}