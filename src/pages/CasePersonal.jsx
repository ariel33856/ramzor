import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, User, Save, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import LinkedBorrowerCard from '@/components/case/LinkedBorrowerCard';
import PersonDetailsView from '@/components/person/PersonDetailsView';

export default function CasePersonal() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogStep, setDialogStep] = useState('choose'); // 'choose', 'contacts', 'new_contact'
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [newContactData, setNewContactData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: ''
  });

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

  const { data: allBorrowers = [] } = useQuery({
    queryKey: ['all-borrowers'],
    queryFn: () => base44.entities.MortgageCase.filter({ is_archived: true, module_id: null })
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['all-contacts'],
    queryFn: () => base44.entities.Person.filter({ is_archived: false })
  });

  const { data: linkedContacts = [] } = useQuery({
    queryKey: ['linked-contacts', caseId],
    queryFn: async () => {
      const allPersons = await base44.entities.Person.list();
      return allPersons.filter(person => 
        person.linked_accounts && person.linked_accounts.includes(caseId)
      );
    },
    enabled: !!caseId
  });

  const filteredBorrowers = allBorrowers.filter(borrower => 
    borrower.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    borrower.client_id?.includes(searchTerm) ||
    borrower.client_phone?.includes(searchTerm)
  );

  const filteredContacts = allContacts.filter(contact => 
    contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.id_number?.includes(searchTerm) ||
    contact.phone?.includes(searchTerm)
  );

  const linkBorrowerMutation = useMutation({
    mutationFn: (borrowerId) => {
      const currentBorrowers = caseData.linked_borrowers || [];
      return base44.entities.MortgageCase.update(caseId, { 
        linked_borrowers: [...currentBorrowers, borrowerId] 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['all-borrowers'] });
      setDialogOpen(false);
      setSearchTerm('');
    }
  });

  const linkContactAsBorrowerMutation = useMutation({
    mutationFn: async (contact) => {
      // יצירת לווה חדש עם קישור לאיש הקשר המקורי
      const newBorrower = await base44.entities.MortgageCase.create({
        person_id: contact.id,
        is_archived: true,
        module_id: null,
        status: 'new',
        urgency: 'medium'
      });
      
      // שיוך הלווה החדש לחשבון הנוכחי
      const currentBorrowers = caseData.linked_borrowers || [];
      await base44.entities.MortgageCase.update(caseId, { 
        linked_borrowers: [...currentBorrowers, newBorrower.id] 
      });
      
      return newBorrower;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['all-borrowers'] });
      setDialogOpen(false);
      setSearchTerm('');
    }
  });

  const createContactAndLinkMutation = useMutation({
    mutationFn: async (contactData) => {
      // יצירת איש קשר חדש
      const newContact = await base44.entities.Person.create({
        ...contactData,
        type: 'איש קשר',
        is_archived: false
      });
      
      // יצירת לווה חדש עם קישור לאיש הקשר
      const newBorrower = await base44.entities.MortgageCase.create({
        person_id: newContact.id,
        is_archived: true,
        module_id: null,
        status: 'new',
        urgency: 'medium'
      });
      
      // שיוך הלווה החדש לחשבון הנוכחי
      const currentBorrowers = caseData.linked_borrowers || [];
      await base44.entities.MortgageCase.update(caseId, { 
        linked_borrowers: [...currentBorrowers, newBorrower.id] 
      });
      
      return newBorrower;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['all-contacts'] });
      setDialogOpen(false);
      setDialogStep('choose');
      setNewContactData({
        first_name: '',
        last_name: '',
        id_number: '',
        phone: '',
        email: ''
      });
    }
  });

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

  const linkContactToAccountMutation = useMutation({
    mutationFn: async (contactId) => {
      const contact = await base44.entities.Person.filter({ id: contactId }).then(res => res[0]);
      const currentAccounts = contact.linked_accounts || [];
      await base44.entities.Person.update(contactId, {
        linked_accounts: [...currentAccounts, caseId]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
      setContactDialogOpen(false);
      setContactSearchTerm('');
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
    <div className="space-y-6 p-6">
      {linkedContacts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold text-gray-700">אנשי קשר משויכים לחשבון ({linkedContacts.length})</div>
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-yellow-400 hover:bg-yellow-500 border-yellow-500">
                  <LinkIcon className="w-4 h-4 ml-1" />
                  הוסף איש קשר
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>בחר איש קשר לשיוך</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => linkContactToAccountMutation.mutate(contact.id)}
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
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {linkedContacts.map((contact) => (
            <PersonDetailsView key={contact.id} personId={contact.id} />
          ))}
        </div>
      )}

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
        );
        }