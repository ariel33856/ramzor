import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Search, Archive, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ArchiveAccounts() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const archiveMutation = useMutation({
    mutationFn: (personId) => base44.entities.Person.update(personId, { is_archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const { data: allPeople = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Person.list('-created_date')
  });

  const contacts = allPeople.filter(p => p.type === 'איש קשר' && !p.is_archived);

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchTerm || 
      c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="h-screen bg-gray-50/50 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white p-3 shadow-sm border-b border-gray-100">
        <div className="mx-auto px-2">
          <div className="flex flex-col md:flex-row gap-3">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <UserPlus className="w-4 h-4 ml-2" />
              איש קשר חדש
            </Button>

            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם, טלפון או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין אנשי קשר</h3>
            <p className="text-gray-400">התחל ביצירת איש קשר חדש</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-lg transition-all hover:border-blue-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </h3>
                    {contact.id_number && (
                      <p className="text-sm text-gray-500">ת.ז: {contact.id_number}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => archiveMutation.mutate(contact.id)}
                    className="text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">טלפון:</span>
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">אימייל:</span>
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-100">
                      <p className="line-clamp-2">{contact.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}