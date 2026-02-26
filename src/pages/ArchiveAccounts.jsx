import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Search, Archive, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { SecureEntities } from '@/components/secureEntities';

export default function ArchiveAccounts() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('globalFilterUser') || 'all';
    }
    return 'all';
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  // Get users for admin filter
  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
    staleTime: 5 * 60 * 1000
  });

  const archiveMutation = useMutation({
    mutationFn: (personId) => SecureEntities.Person.update(personId, { is_archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const { data: allPeople = [], isLoading } = useQuery({
    queryKey: ['contacts', user?.email, filterUser],
    queryFn: async () => {
      if (!user) return [];
      
      let ownContacts = [];
      // If admin filtering by specific user, or non-admin user
      if (filterUser && filterUser !== 'all') {
        ownContacts = await SecureEntities.Person.filter({ created_by: filterUser }, '-created_date');
      } else if (user.role === 'admin') {
        ownContacts = await SecureEntities.Person.list('-created_date');
      } else {
        ownContacts = await SecureEntities.Person.filter({ created_by: user.email }, '-created_date');
      }
      
      // Also fetch persons from shared cases (for non-admin or admin viewing all)
      if (user.role !== 'admin' || filterUser === 'all') {
        try {
          const sharedRes = await base44.functions.invoke('getSharedCases', {});
          const sharedCases = sharedRes?.data?.shared_cases || [];
          const seenIds = new Set(ownContacts.map(c => c.id));
          
          for (const sc of sharedCases) {
            const personsRes = await base44.functions.invoke('getCaseRelatedData', {
              case_id: sc.id,
              entity_name: 'Person'
            });
            const persons = personsRes?.data?.data || [];
            for (const p of persons) {
              if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                ownContacts.push({ ...p, _fromSharedCase: true });
              }
            }
          }
        } catch (e) {
          console.warn('Failed to fetch shared case contacts:', e);
        }
      }
      
      return ownContacts;
    },
    enabled: !!user
  });

  const contacts = allPeople.filter(p => p.type === 'איש קשר' && !p.is_archived);

  // Extract all unique field names including custom fields
  const allFieldNames = React.useMemo(() => {
    const fieldNamesSet = new Set(['first_name', 'last_name', 'id_number', 'phone', 'email', 'notes']);
    contacts.forEach(contact => {
      if (contact.custom_data) {
        Object.keys(contact.custom_data).forEach(key => fieldNamesSet.add(key));
      }
    });
    return Array.from(fieldNamesSet);
  }, [contacts]);

  const getFieldLabel = (fieldName) => {
    const labels = {
      first_name: 'שם פרטי',
      last_name: 'שם משפחה',
      id_number: 'תעודת זהות',
      phone: 'טלפון',
      email: 'אימייל',
      notes: 'הערות'
    };
    return labels[fieldName] || fieldName;
  };

  const getFieldValue = (contact, fieldName) => {
    const value = contact[fieldName] || (contact.custom_data && contact.custom_data[fieldName]);
    
    // Don't render objects or arrays directly
    if (typeof value === 'object' && value !== null) {
      return '—';
    }
    
    return value || '—';
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchTerm || 
      c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Expose searchTerm to window for Layout to access
  React.useEffect(() => {
    window.archiveAccountsSearchTerm = searchTerm;
    window.setArchiveAccountsSearchTerm = setSearchTerm;
  }, [searchTerm]);

  React.useEffect(() => {
    const handleGlobalFilterChange = (e) => {
      setFilterUser(e.detail.filterUser);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    };
    window.addEventListener('globalFilterUserChanged', handleGlobalFilterChange);
    return () => window.removeEventListener('globalFilterUserChanged', handleGlobalFilterChange);
  }, [queryClient]);

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden p-1">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <th key={i} className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b border-gray-100">
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין אנשי קשר</h3>
            <p className="text-gray-400 mb-6">התחל ביצירת איש קשר חדש</p>
            <Link to={createPageUrl('NewContact')}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <UserPlus className="w-5 h-5 ml-2" />
                צור איש קשר חדש
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    {allFieldNames.map(fieldName => (
                      <th key={fieldName} className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                        {getFieldLabel(fieldName)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, index) => (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = createPageUrl(`PersonDetails?id=${contact.id}`)}
                    >
                      {allFieldNames.map(fieldName => (
                        <td key={fieldName} className="px-6 py-4">
                          <span className={fieldName === 'first_name' ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                            {getFieldValue(contact, fieldName)}
                          </span>
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}