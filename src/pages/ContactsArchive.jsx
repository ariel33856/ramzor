import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Search, ArchiveX, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ContactsArchive() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const unarchiveMutation = useMutation({
    mutationFn: (personId) => base44.entities.Person.update(personId, { is_archived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts-archive'] });
    }
  });

  const { data: allPeople = [], isLoading } = useQuery({
    queryKey: ['contacts-archive'],
    queryFn: () => base44.entities.Person.list('-updated_date')
  });

  const archivedContacts = allPeople.filter(p => p.type === 'איש קשר' && p.is_archived);

  const filteredContacts = archivedContacts.filter(c => {
    const matchesSearch = !searchTerm || 
      c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Expose searchTerm to window for Layout to access
  React.useEffect(() => {
    window.contactsArchiveSearchTerm = searchTerm;
    window.setContactsArchiveSearchTerm = setSearchTerm;
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto p-1">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    <th className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    <th className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
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
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין אנשי קשר בארכיון</h3>
            <p className="text-gray-400">אנשי קשר שתעביר לארכיון יופיעו כאן</p>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שם פרטי</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שם משפחה</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">תעודת זהות</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">טלפון</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">אימייל</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">הערות</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, index) => (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{contact.first_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">{contact.last_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">{contact.id_number || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">{contact.phone || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 truncate max-w-[200px] inline-block">{contact.email || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-500 text-sm line-clamp-1">{contact.notes || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            unarchiveMutation.mutate(contact.id);
                          }}
                          className="text-gray-500 hover:text-green-600 hover:bg-green-50"
                        >
                          <ArchiveX className="w-4 h-4 ml-2" />
                          שחזר
                        </Button>
                      </td>
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