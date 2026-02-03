import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, User, Save, Link as LinkIcon, Heart } from 'lucide-react';
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
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactData, setNewContactData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: ''
  });
  const [sortedContacts, setSortedContacts] = useState([]);

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
      return allPersons.filter(person => {
        if (!person.linked_accounts || person.linked_accounts.length === 0) return false;
        
        // תמיכה במבנה ישן (מערך של מחרוזות) וחדש (מערך של אובייקטים)
        return person.linked_accounts.some(acc => 
          typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
        );
      });
    },
    enabled: !!caseId,
    refetchInterval: 2000
  });

  React.useEffect(() => {
    if (linkedContacts.length > 0) {
      setSortedContacts(linkedContacts);
    }
  }, [linkedContacts]);

  const moveContactToTop = (contactId) => {
    setSortedContacts(prev => {
      const contact = prev.find(c => c.id === contactId);
      const others = prev.filter(c => c.id !== contactId);
      return contact ? [contact, ...others] : prev;
    });
    
    // גלילה לאיש הקשר לאחר שהוא עבר לראש הרשימה
    setTimeout(() => {
      const element = document.getElementById(`contact-${contactId}`);
      if (element) {
        const container = element.closest('main');
        if (container) {
          container.scrollTop = element.offsetTop - 10;
        }
      }
    }, 100);
  };

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
      
      // יצירת אובייקט זיקה חדש
      const newLink = {
        case_id: caseId,
        relationship_type: 'לווה'
      };
      
      await base44.entities.Person.update(contactId, {
        linked_accounts: [...currentAccounts, newLink]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
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
        linked_accounts: [caseId]
      });
      return newContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['all-contacts'] });
      setContactDialogOpen(false);
      setShowNewContactForm(false);
      setContactSearchTerm('');
      setNewContactData({
        first_name: '',
        last_name: '',
        id_number: '',
        phone: '',
        email: ''
      });
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
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-6 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-base font-semibold text-gray-700">אנשי קשר משויכים לחשבון ({linkedContacts.length})</div>
          {linkedContacts.length > 0 && (() => {
            const couples = [];
            const displayedIds = new Set();

            // פונקציה לשליפת סוג הזיקה הספציפי לחשבון הנוכחי
            const getRelationshipType = (contact) => {
              if (!contact.linked_accounts) return 'לווה';
              const currentLink = contact.linked_accounts.find(acc => 
                typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
              );
              if (currentLink && typeof currentLink === 'object') {
                return currentLink.relationship_type || 'לווה';
              }
              return 'לווה';
            };

            // זיהוי זוגות
            linkedContacts.forEach((contact, idx) => {
              if (displayedIds.has(contact.id)) return;
              const relType = getRelationshipType(contact);
              if (relType === 'בן זוג' || relType === 'בת זוג' || relType === 'בן/בת זוג') {
                const partner = linkedContacts.find(c => {
                  if (c.id === contact.id || displayedIds.has(c.id)) return false;
                  const pRelType = getRelationshipType(c);
                  return pRelType === 'בן זוג' || pRelType === 'בת זוג' || pRelType === 'בן/בת זוג';
                });
                if (partner) {
                  couples.push({ contact, partner });
                  displayedIds.add(contact.id);
                  displayedIds.add(partner.id);
                }
              }
            });

            // פונקציה להצגת סוג הזיקה עם התאמה למין
            const getDisplayRelationshipType = (contact) => {
              const relType = getRelationshipType(contact);
              const gender = contact.custom_data?.gender || 'male';
              
              if (relType === 'ערב' || relType === 'ערבה') {
                return gender === 'female' ? 'ערבה' : 'ערב';
              } else if (relType === 'ערב ממשכן' || relType === 'ערבה ממשכנת') {
                return gender === 'female' ? 'ערבה ממשכנת' : 'ערב ממשכן';
              } else if (relType === 'בן זוג' || relType === 'בת זוג' || relType === 'בן/בת זוג') {
                return gender === 'female' ? 'בת זוג' : 'בן זוג';
              }
              return relType;
            };

            const otherContacts = linkedContacts.filter(c => !displayedIds.has(c.id))
              .sort((a, b) => {
                const aType = getRelationshipType(a);
                const bType = getRelationshipType(b);
                const typeOrder = { 'לווה': 0, 'ערב': 1, 'ערבה': 1, 'ערב ממשכן': 2, 'ערבה ממשכנת': 2 };
                return (typeOrder[bType] || 3) - (typeOrder[aType] || 3);
              });

            return (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-500">|</span>
                {couples.map(({ contact, partner }, coupleIdx) => {
                  const getButtonClass = (rel) => {
                    let buttonClass = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white flex flex-col items-center ';
                    const relationshipType = getRelationshipType(rel);
                    if (relationshipType === 'בן זוג' || relationshipType === 'בת זוג' || relationshipType === 'בן/בת זוג') {
                      buttonClass += 'bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-500 hover:to-sky-500';
                    }
                    return buttonClass;
                  };

                  return (
                    <React.Fragment key={`couple-${contact.id}-${partner.id}`}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveContactToTop(contact.id)} className={getButtonClass(contact)}>
                          <span className="font-semibold">{contact.first_name} {contact.last_name}</span>
                        </button>
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <button onClick={() => moveContactToTop(partner.id)} className={getButtonClass(partner)}>
                          <span className="font-semibold">{partner.first_name} {partner.last_name}</span>
                        </button>
                      </div>
                      {coupleIdx < couples.length - 1 || otherContacts.length > 0 && <span className="text-gray-400">•</span>}
                    </React.Fragment>
                  );
                })}
                {otherContacts.map((contact, idx) => {
                  const relationshipType = getRelationshipType(contact);
                  const displayRelType = getDisplayRelationshipType(contact);
                  let buttonClass = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white flex flex-col items-center ';
                  if (relationshipType === 'לווה') {
                    buttonClass += 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600';
                  } else if (relationshipType === 'ערב' || relationshipType === 'ערבה') {
                    buttonClass += 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600';
                  } else if (relationshipType === 'ערב ממשכן' || relationshipType === 'ערבה ממשכנת') {
                    buttonClass += 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
                  } else {
                    buttonClass += 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700';
                  }

                  return (
                    <React.Fragment key={contact.id}>
                      <button onClick={() => moveContactToTop(contact.id)} className={buttonClass}>
                        <span className="font-semibold">{contact.first_name} {contact.last_name}</span>
                        {displayRelType && <span className="text-xs opacity-90 mt-0.5">{displayRelType}</span>}
                      </button>
                      {idx < otherContacts.length - 1 && <span className="text-gray-400">•</span>}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
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
                          <button
                            key={contact.id}
                            className="w-full text-right p-4 border rounded-lg hover:bg-green-50 hover:border-green-400 cursor-pointer transition-colors"
                            onClick={() => {
                              linkContactToAccountMutation.mutate(contact.id);
                            }}
                          >
                            <p className="font-semibold text-gray-900">
                              {contact.first_name} {contact.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{contact.phone}</p>
                          </button>
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
        </div>
      </div>
      <div className="space-y-4 p-6">
        {sortedContacts.map((contact) => (
          <div key={contact.id} id={`contact-${contact.id}`}>
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