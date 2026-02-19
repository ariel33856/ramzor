import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import { User, Phone, Mail } from 'lucide-react';

export default function LinkedContactsList({ caseId }) {
  const { data: linkedContacts = [], isLoading } = useQuery({
    queryKey: ['linked-contacts', caseId],
    queryFn: async () => {
      const allPersons = await SecureEntities.Person.list();
      return allPersons.filter(person => {
        if (!person.linked_accounts || person.linked_accounts.length === 0) return false;
        return person.linked_accounts.some(acc =>
          typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
        );
      });
    },
    enabled: !!caseId,
    staleTime: 30000
  });

  if (isLoading) return <div className="text-center py-4 text-gray-400 text-sm">טוען...</div>;

  if (linkedContacts.length === 0) {
    return <div className="text-center py-4 text-gray-400 text-sm">אין אנשי קשר משויכים</div>;
  }

  const getRelationship = (person) => {
    const link = person.linked_accounts?.find(acc =>
      typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
    );
    if (typeof link === 'object' && link.relationship_type) return link.relationship_type;
    return person.type || '';
  };

  return (
    <div className="space-y-2">
      {linkedContacts.map(person => (
        <div key={person.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm truncate">{person.first_name} {person.last_name}</span>
              {getRelationship(person) && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{getRelationship(person)}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {person.phone && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="w-3 h-3" /> {person.phone}
                </span>
              )}
              {person.email && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Mail className="w-3 h-3" /> {person.email}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}