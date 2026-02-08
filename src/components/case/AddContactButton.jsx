import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AddContactButton({ caseId, linkedContacts = [] }) {
  const queryClient = useQueryClient();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactData, setNewContactData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: ''
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['all-contacts'],
    queryFn: () => base44.entities.Person.filter({ is_archived: false })
  });

  useEffect(() => {
    if (contactDialogOpen) {
      setShowNewContactForm(false);
      setContactSearchTerm('');
    }
  }, [contactDialogOpen]);

  const linkContactToAccountMutation = useMutation({
    mutationFn: async (contactId) => {
      const contact = await base44.entities.Person.filter({ id: contactId }).then(res => res[0]);
      const currentAccounts = contact.linked_accounts || [];
      const normalizedAccounts = currentAccounts.map(acc =>
        typeof acc === 'string'
          ? { case_id: acc, relationship_type: 'לווה' }
          : acc
      );
      const newLink = { case_id: caseId, relationship_type: 'לווה' };
      return base44.entities.Person.update(contactId, {
        linked_accounts: [...normalizedAccounts, newLink]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['all-contacts'] });
      setContactDialogOpen(false);
      setContactSearchTerm('');
    }
  });

  const createNewContactAndLinkMutation = useMutation({
    mutationFn: async (contactData) => {
      const newContact = await base44.entities.Person.create({
        ...contactData,
        type: 'איש קשר',
        is_archived: false,
        linked_accounts: [{ case_id: caseId, relationship_type: 'לווה' }]
      });
      return newContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['all-contacts'] });
      setContactDialogOpen(false);
      setShowNewContactForm(false);
      setContactSearchTerm('');
      setNewContactData({ first_name: '', last_name: '', id_number: '', phone: '', email: '' });
    }
  });

  return (
    <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-gradient-to-r from-green-400 to-purple-600 hover:from-green-500 hover:to-purple-700 border-green-500 text-white font-medium">
          <LinkIcon className="w-4 h-4 ml-1" />
          {linkedContacts.length > 0 ? 'הוסף איש קשר' : 'שייך איש קשר'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>בחר איש קשר לשיוך</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!showNewContactForm ? (
            <>
              <Button
                onClick={() => setShowNewContactForm(true)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <LinkIcon className="w-4 h-4 ml-2" />
                צור איש קשר חדש
              </Button>
              <Input
                placeholder="חיפוש לפי שם או מספר טלפון..."
                value={contactSearchTerm}
                onChange={(e) => setContactSearchTerm(e.target.value)}
              />
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allContacts
                  .filter(contact =>
                    !linkedContacts.some(lc => lc.id === contact.id) &&
                    (contact.first_name?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                    contact.last_name?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                    contact.phone?.includes(contactSearchTerm))
                  )
                  .map(contact => (
                    <div
                      key={contact.id}
                      className="w-full text-right p-4 border rounded-lg hover:bg-green-50 hover:border-green-400 cursor-pointer transition-colors"
                      onClick={async () => {
                        await linkContactToAccountMutation.mutateAsync(contact.id);
                      }}
                    >
                      <p className="font-semibold text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{contact.phone}</p>
                    </div>
                  ))}
                {allContacts.filter(contact =>
                  !linkedContacts.some(lc => lc.id === contact.id) &&
                  (contact.first_name?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                  contact.last_name?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                  contact.phone?.includes(contactSearchTerm))
                ).length === 0 && (
                  <p className="text-center text-gray-500 py-8">לא נמצאו אנשי קשר</p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={() => setShowNewContactForm(false)}
                variant="outline"
                className="mb-4"
              >
                חזרה לרשימה
              </Button>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שם פרטי</Label>
                  <Input
                    value={newContactData.first_name}
                    onChange={(e) => setNewContactData({...newContactData, first_name: e.target.value})}
                    placeholder="שם פרטי"
                  />
                </div>
                <div>
                  <Label>שם משפחה</Label>
                  <Input
                    value={newContactData.last_name}
                    onChange={(e) => setNewContactData({...newContactData, last_name: e.target.value})}
                    placeholder="שם משפחה"
                  />
                </div>
                <div>
                  <Label>תעודת זהות</Label>
                  <Input
                    value={newContactData.id_number}
                    onChange={(e) => setNewContactData({...newContactData, id_number: e.target.value})}
                    placeholder="תעודת זהות"
                  />
                </div>
                <div>
                  <Label>טלפון</Label>
                  <Input
                    value={newContactData.phone}
                    onChange={(e) => setNewContactData({...newContactData, phone: e.target.value})}
                    placeholder="טלפון"
                  />
                </div>
                <div className="col-span-2">
                  <Label>אימייל</Label>
                  <Input
                    type="email"
                    value={newContactData.email}
                    onChange={(e) => setNewContactData({...newContactData, email: e.target.value})}
                    placeholder="אימייל"
                  />
                </div>
              </div>
              <Button
                onClick={() => createNewContactAndLinkMutation.mutate(newContactData)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={!newContactData.first_name || !newContactData.last_name}
              >
                צור ושייך איש קשר
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}