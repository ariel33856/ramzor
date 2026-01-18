import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { tabComponents } from '@/components/dashboard/FieldsHierarchy';
import IDUploader from './IDUploader';


const validateIsraeliID = (id) => {
  // הוסף 0 בהתחלה אם יש 8 ספרות
  id = String(id).padStart(9, '0');
  
  // בדוק שיש בדיוק 9 ספרות
  if (!/^\d{9}$/.test(id)) return false;
  
  // חשב ספרת ביקורת
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = Number(id[i]);
    let step = digit * ((i % 2) + 1);
    sum += step > 9 ? step - 9 : step;
  }
  
  return sum % 10 === 0;
};

export default function PersonDetailsView({ personId }) {
  const queryClient = useQueryClient();
  
  // קבל את השדות מההיררכיה
  const personFields = tabComponents.personal[0].fields.reduce((acc, field) => {
    acc[field.id] = field.label;
    return acc;
  }, {});
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCollapsed1_5, setIsCollapsed1_5] = useState(false);
  const [isCollapsed2, setIsCollapsed2] = useState(false);
  const [relationshipType, setRelationshipType] = useState('לווה');
  const [gender, setGender] = useState('male');
  const [spouseDialogOpen, setSpouseDialogOpen] = useState(false);
  const [spouseSearchTerm, setSpouseSearchTerm] = useState('');
  const [showNewSpouseForm, setShowNewSpouseForm] = useState(false);
  const [spouseId, setSpouseId] = useState(null);
  const [newSpouseData, setNewSpouseData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: ''
  });
  const [basicData, setBasicData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: '',
    notes: '',
    residential_city: '',
    address: ''
  });
  const [numChildren, setNumChildren] = useState(0);
  const [childrenDates, setChildrenDates] = useState(['']);
  const [dateError, setDateError] = useState('');
  const [numSiblings, setNumSiblings] = useState('');
  const [manualNumChildren, setManualNumChildren] = useState('');
  const [manualNumChildrenUnder18, setManualNumChildrenUnder18] = useState('');
  const [showChildrenWarning, setShowChildrenWarning] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState('married');
  const [idError, setIdError] = useState('');


  const { data: person, isLoading } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => base44.entities.Person.filter({ id: personId }).then(res => res[0]),
    enabled: !!personId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['all-accounts'],
    queryFn: () => base44.entities.MortgageCase.list('-created_date'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['all-contacts-spouse'],
    queryFn: () => base44.entities.Person.filter({ is_archived: false }),
    enabled: spouseDialogOpen,
    staleTime: 5 * 60 * 1000
  });

  const { data: linkedSpouse } = useQuery({
    queryKey: ['spouse', spouseId],
    queryFn: () => base44.entities.Person.filter({ id: spouseId }).then(res => res[0]),
    enabled: !!spouseId
  });

  const accounts = allAccounts.filter(c => !c.is_archived && !c.module_id);

  const linkedAccountsData = allAccounts.filter(acc => 
    linkedAccounts.includes(acc.id)
  );

  const updatePersonMutation = useMutation({
    mutationFn: (data) => base44.entities.Person.update(personId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
    }
  });

  const createSpouseMutation = useMutation({
    mutationFn: async (spouseData) => {
      const newSpouse = await base44.entities.Person.create({
        ...spouseData,
        type: 'איש קשר',
        is_archived: false,
        custom_data: { spouse_id: personId }
      });
      // Update current person with spouse_id
      await base44.entities.Person.update(personId, { 
        custom_data: { ...(person?.custom_data || {}), spouse_id: newSpouse.id }
      });
      return newSpouse;
    },
    onSuccess: (newSpouse) => {
      queryClient.invalidateQueries({ queryKey: ['all-contacts-spouse'] });
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      setSpouseId(newSpouse.id);
      setShowNewSpouseForm(false);
      setNewSpouseData({
        first_name: '',
        last_name: '',
        id_number: '',
        phone: '',
        email: ''
      });
      setSpouseDialogOpen(false);
    }
  });

  const createNewAccountMutation = useMutation({
    mutationFn: async () => {
      // Get max account number
      const maxAccountNumber = allAccounts.length > 0 
        ? Math.max(...allAccounts.map(acc => acc.account_number || 0))
        : 0;
      
      // Create new account with person's name
      const newAccount = await base44.entities.MortgageCase.create({
        client_name: person.first_name,
        last_name: person.last_name,
        account_number: maxAccountNumber + 1,
        status: 'new',
        urgency: 'medium',
        is_archived: false
      });

      // Link person to account
      const updatedAccounts = [...linkedAccounts, newAccount.id];
      await base44.entities.Person.update(personId, {
        linked_accounts: updatedAccounts
      });

      return newAccount;
    },
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: ['all-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      setDialogOpen(false);
      window.location.href = createPageUrl('CaseDetails') + `?id=${newAccount.id}&new=true&accountNumber=${newAccount.account_number}`;
    }
  });

  const handleAddField = () => {
    if (newFieldName.trim()) {
      const fieldId = `custom_${Date.now()}`;
      setCustomFields([...customFields, { id: fieldId, name: newFieldName, value: '' }]);
      setNewFieldName('');
    }
  };

  const handleRemoveField = (fieldId) => {
    setCustomFields(customFields.filter(f => f.id !== fieldId));
  };

  const handleFieldValueChange = (fieldId, value) => {
    const updatedFields = customFields.map(f => 
      f.id === fieldId ? { ...f, value } : f
    );
    setCustomFields(updatedFields);
    
    const customData = {};
    updatedFields.forEach(field => {
      customData[field.name] = field.value;
    });
    updatePersonMutation.mutate({ custom_data: customData });
  };

  const handleBasicDataChange = (field, value) => {
    const updatedData = { ...basicData, [field]: value };
    setBasicData(updatedData);
    updatePersonMutation.mutate(updatedData);
  };

  const handleLinkToAccount = (accountId) => {
    if (!linkedAccounts.includes(accountId)) {
      const updatedAccounts = [...linkedAccounts, accountId];
      setLinkedAccounts(updatedAccounts);
      updatePersonMutation.mutate({ linked_accounts: updatedAccounts });
      setDialogOpen(false);
      setSearchTerm('');
    }
  };

  const handleUnlinkAccount = (accountId) => {
    const updatedAccounts = linkedAccounts.filter(id => id !== accountId);
    setLinkedAccounts(updatedAccounts);
    updatePersonMutation.mutate({ linked_accounts: updatedAccounts });
  };

  const handleUnlinkSpouse = async () => {
    if (spouseId) {
      // Remove spouse_id from current person
      const currentCustomData = { ...(person?.custom_data || {}) };
      delete currentCustomData.spouse_id;
      await updatePersonMutation.mutateAsync({ custom_data: currentCustomData });
      
      // Remove spouse_id from the spouse
      const spouse = await base44.entities.Person.filter({ id: spouseId }).then(res => res[0]);
      if (spouse) {
        const spouseCustomData = { ...(spouse.custom_data || {}) };
        delete spouseCustomData.spouse_id;
        await base44.entities.Person.update(spouseId, { custom_data: spouseCustomData });
      }
      
      setSpouseId(null);
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['spouse', spouseId] });
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    !linkedAccounts.includes(acc.id) &&
    (acc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_number?.toString().includes(searchTerm))
  );

  React.useEffect(() => {
    if (person) {
      setBasicData({
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        id_number: person.id_number || '',
        phone: person.phone || '',
        email: person.email || '',
        notes: person.notes || '',
        residential_city: person.residential_city || '',
        address: person.address || ''
      });
      
      if (person.linked_accounts) {
        setLinkedAccounts(person.linked_accounts);
      }
      
      if (person.custom_data) {
        const fields = Object.entries(person.custom_data).map(([name, value], index) => ({
          id: `custom_${index}`,
          name,
          value
        }));
        setCustomFields(fields);
        
        // Load spouse_id from custom_data
        if (person.custom_data.spouse_id) {
          setSpouseId(person.custom_data.spouse_id);
        }
        
        // Load num_siblings from custom_data
        if (person.custom_data.num_siblings) {
          setNumSiblings(person.custom_data.num_siblings);
        }
      }
    }
  }, [person]);

  React.useEffect(() => {
    if (relationshipType === 'ערב' || relationshipType === 'ערבה') {
      setRelationshipType(gender === 'male' ? 'ערב' : 'ערבה');
    } else if (relationshipType === 'ערב ממשכן' || relationshipType === 'ערבה ממשכנת') {
      setRelationshipType(gender === 'male' ? 'ערב ממשכן' : 'ערבה ממשכנת');
    } else if (relationshipType === 'בן זוג' || relationshipType === 'בת זוג' || relationshipType === 'בן/בת זוג') {
      setRelationshipType(gender === 'male' ? 'בן זוג' : 'בת זוג');
    }
  }, [gender]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">איש קשר לא נמצא</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-2 border-blue-200 rounded-2xl px-10 py-6 bg-gradient-to-br from-blue-50/30 to-purple-50/30 shadow-lg">
      {/* Action Buttons */}
      <div className="flex items-start gap-2 flex-wrap border-2 border-gray-200 rounded-xl p-4 bg-white shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">{personFields.first_name}</Label>
            <Input
              value={basicData.first_name}
              onChange={(e) => handleBasicDataChange('first_name', e.target.value)}
              placeholder={personFields.first_name}
              className="text-xl font-bold w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">{personFields.last_name}</Label>
            <Input
              value={basicData.last_name}
              onChange={(e) => handleBasicDataChange('last_name', e.target.value)}
              placeholder={personFields.last_name}
              className="text-xl font-bold w-40"
            />
          </div>
        </div>
        <div className="mr-auto flex items-center gap-2">
          {linkedAccountsData.length > 0 ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className={`whitespace-nowrap ${
                    relationshipType === 'לווה' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' :
                    (relationshipType === 'ערב' || relationshipType === 'ערבה') ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600' :
                    (relationshipType === 'ערב ממשכן' || relationshipType === 'ערבה ממשכנת') ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' :
                    (relationshipType === 'בן/בת זוג' || relationshipType === 'בן זוג' || relationshipType === 'בת זוג') ? 'bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-500 hover:to-sky-500' :
                    'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                  }`}>
                    {relationshipType ? `זיקה לחשבון: ${relationshipType}` : 'זיקה לחשבון'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-center" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
                  <DropdownMenuItem onClick={() => setRelationshipType('לווה')} className="justify-center bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 mb-1">לווה</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRelationshipType(gender === 'male' ? 'ערב' : 'ערבה')} className="justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 mb-1">{gender === 'male' ? 'ערב' : 'ערבה'}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRelationshipType(gender === 'male' ? 'ערב ממשכן' : 'ערבה ממשכנת')} className="justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 mb-1">{gender === 'male' ? 'ערב ממשכן' : 'ערבה ממשכנת'}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRelationshipType(gender === 'male' ? 'בן זוג' : 'בת זוג')} className="justify-center bg-gradient-to-r from-cyan-400 to-sky-400 text-white hover:from-cyan-500 hover:to-sky-500">{gender === 'male' ? 'בן זוג' : 'בת זוג'}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {linkedAccountsData.map(account => (
                <div key={account.id} className="flex items-center gap-0">
                  <Link to={createPageUrl('CaseDetails') + `?id=${account.id}`}>
                    <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 whitespace-nowrap rounded-l-none">
                      חשבון משויך: {account.client_name} {account.account_number}
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 border-2 border-green-500 rounded-r-none"
                        title="בטל שיוך"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-center flex items-center justify-center gap-1">
                          <span>?</span>
                          <span>האם לבטל את שיוך החשבון</span>
                        </AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex justify-center gap-4">
                        <AlertDialogCancel className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg flex-1 max-w-xs">לא!!! תשאיר את החשבון משויך</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleUnlinkAccount(account.id)}
                          className="bg-red-500 hover:bg-red-600 px-8 py-3 text-lg flex-1 max-w-xs"
                        >
                          כן, לבטל
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </>
          ) : (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 whitespace-nowrap">
                  <LinkIcon className="w-4 h-4 ml-2" />
                  שייך חשבון
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>בחר חשבון לשיוך</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Button 
                    onClick={() => createNewAccountMutation.mutate()}
                    disabled={createNewAccountMutation.isPending}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {createNewAccountMutation.isPending ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 ml-2" />
                    )}
                    צור חשבון חדש
                  </Button>
                  <Input
                    placeholder="חיפוש לפי שם או מספר חשבון..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredAccounts.map(account => (
                      <div
                        key={account.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleLinkToAccount(account.id)}
                      >
                        <p className="font-semibold text-gray-900">{account.client_name}</p>
                        <p className="text-sm text-gray-500">חשבון מס׳ {account.account_number}</p>
                      </div>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <p className="text-center text-gray-500 py-8">לא נמצאו חשבונות</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {spouseId && linkedSpouse ? (
            <div className="flex items-center gap-0">
              <Button 
                onClick={() => window.location.href = createPageUrl('PersonDetails') + `?id=${spouseId}`}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 whitespace-nowrap cursor-pointer rounded-l-none"
              >
                {gender === 'male' ? 'בת זוג: ' : 'בן זוג: '}{linkedSpouse.first_name} {linkedSpouse.last_name}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 border-2 border-purple-500 rounded-r-none"
                    title="בטל שיוך"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center flex items-center justify-center gap-1">
                      <span>?</span>
                      <span>האם לבטל את שיוך בן/בת הזוג</span>
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex justify-center gap-4">
                    <AlertDialogCancel className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg flex-1 max-w-xs">לא!!! תשאיר משויך</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleUnlinkSpouse}
                      className="bg-red-500 hover:bg-red-600 px-8 py-3 text-lg flex-1 max-w-xs"
                    >
                      כן, לבטל
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (maritalStatus === 'married' || maritalStatus === 'separated' || maritalStatus === 'common_law') ? (
            <Dialog open={spouseDialogOpen} onOpenChange={setSpouseDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 whitespace-nowrap">
                  {gender === 'male' ? 'שדך בת זוג' : 'שדך בן זוג'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>בחר בן/בת זוג</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!showNewSpouseForm ? (
                    <>
                      <Button 
                        onClick={() => setShowNewSpouseForm(true)}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף איש קשר חדש
                      </Button>
                      <Input
                        placeholder="חיפוש איש קשר..."
                        value={spouseSearchTerm}
                        onChange={(e) => setSpouseSearchTerm(e.target.value)}
                      />
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {allContacts
                          .filter(contact => 
                            contact.id !== personId &&
                            (contact.first_name?.toLowerCase().includes(spouseSearchTerm.toLowerCase()) ||
                            contact.last_name?.toLowerCase().includes(spouseSearchTerm.toLowerCase()) ||
                            contact.phone?.includes(spouseSearchTerm))
                          )
                          .map(contact => {
                            const isAlreadyLinked = contact.custom_data?.spouse_id;
                            return (
                              <div
                                key={contact.id}
                                className={`p-4 border rounded-lg transition-colors ${
                                  isAlreadyLinked 
                                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
                                    : 'hover:bg-gray-50 cursor-pointer'
                                }`}
                                onClick={async () => {
                                  if (isAlreadyLinked) return;
                                  // Update both persons with spouse_id
                                  await updatePersonMutation.mutateAsync({ 
                                    custom_data: { ...(person?.custom_data || {}), spouse_id: contact.id }
                                  });
                                  await base44.entities.Person.update(contact.id, {
                                    custom_data: { ...(contact.custom_data || {}), spouse_id: personId }
                                  });
                                  setSpouseId(contact.id);
                                  setSpouseDialogOpen(false);
                                  setSpouseSearchTerm('');
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {contact.first_name} {contact.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500">{contact.phone}</p>
                                  </div>
                                  {isAlreadyLinked && (
                                    <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                                      משויך כבר
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <Button 
                        onClick={() => setShowNewSpouseForm(false)}
                        variant="outline"
                        className="mb-4"
                      >
                        חזרה לרשימה
                      </Button>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{personFields.first_name}</Label>
                          <Input
                            value={newSpouseData.first_name}
                            onChange={(e) => setNewSpouseData({...newSpouseData, first_name: e.target.value})}
                            placeholder={personFields.first_name}
                          />
                        </div>
                        <div>
                          <Label>{personFields.last_name}</Label>
                          <Input
                            value={newSpouseData.last_name}
                            onChange={(e) => setNewSpouseData({...newSpouseData, last_name: e.target.value})}
                            placeholder={personFields.last_name}
                          />
                        </div>
                        <div>
                          <Label>{personFields.id_number}</Label>
                          <Input
                            value={newSpouseData.id_number}
                            onChange={(e) => setNewSpouseData({...newSpouseData, id_number: e.target.value})}
                            placeholder={personFields.id_number}
                          />
                        </div>
                        <div>
                          <Label>{personFields.phone}</Label>
                          <Input
                            value={newSpouseData.phone}
                            onChange={(e) => setNewSpouseData({...newSpouseData, phone: e.target.value})}
                            placeholder={personFields.phone}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>{personFields.email}</Label>
                          <Input
                            type="email"
                            value={newSpouseData.email}
                            onChange={(e) => setNewSpouseData({...newSpouseData, email: e.target.value})}
                            placeholder={personFields.email}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={() => createSpouseMutation.mutate(newSpouseData)}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        disabled={!newSpouseData.first_name || !newSpouseData.last_name}
                      >
                        צור איש קשר
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          <Button 
            onClick={() => window.location.href = createPageUrl('PersonDetails') + `?id=${personId}`}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 whitespace-nowrap w-full"
          >
            להצגה במודול אנשי קשר
          </Button>
        </div>
      </div>

      {/* First Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 transition-colors border-b"
        >
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
          <h2 className="text-lg font-bold text-gray-900">תעודת זהות</h2>
        </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pb-6">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">{personFields.birth_date}</Label>
          <Input
            placeholder="DDMMYY או DDMMYYYY"
            maxLength={10}
            value={basicData.phone}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, '');
              const currentLength = basicData.phone.replace(/\D/g, '').length;

              // אם הוזנו 6 ספרות בדיוק והמשתמש לא מוחק - השלם את השנה
              if (value.length === 6 && value.length >= currentLength) {
                const yearPart = parseInt(value.slice(4, 6));
                const fullYear = yearPart >= 27 ? '19' + value.slice(4, 6) : '20' + value.slice(4, 6);
                value = value.slice(0, 4) + fullYear;
              }

              if (value.length >= 2) value = value.slice(0, 2) + '-' + value.slice(2);
              if (value.length >= 5) value = value.slice(0, 5) + '-' + value.slice(5);
              const formattedValue = value.slice(0, 10);
              handleBasicDataChange('phone', formattedValue);
            }}
            className="text-center"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">{personFields.id_number}</Label>
          <div className="flex flex-col gap-1 flex-1">
            <Input
              value={basicData.id_number}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 9) {
                  handleBasicDataChange('id_number', value);
                  if (value.length === 9 || value.length === 8) {
                    if (!validateIsraeliID(value)) {
                      setIdError('מספר תעודת זהות לא תקין');
                    } else {
                      setIdError('');
                    }
                  } else {
                    setIdError('');
                  }
                }
              }}
              maxLength={9}
              placeholder="9 ספרות"
              className={idError ? 'border-red-500' : ''}
            />
            {idError && <span className="text-xs text-red-600">{idError}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">{personFields.id_issue_date}</Label>
          <Input
            placeholder="DDMMYY או DDMMYYYY"
            maxLength={10}
            value={basicData.email}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, '');
              const currentLength = basicData.email.replace(/\D/g, '').length;

              // אם הוזנו 6 ספרות בדיוק והמשתמש לא מוחק - השלם את השנה
              if (value.length === 6 && value.length >= currentLength) {
                const yearPart = parseInt(value.slice(4, 6));
                const fullYear = yearPart >= 27 ? '19' + value.slice(4, 6) : '20' + value.slice(4, 6);
                value = value.slice(0, 4) + fullYear;
              }

              if (value.length >= 2) value = value.slice(0, 2) + '-' + value.slice(2);
              if (value.length >= 5) value = value.slice(0, 5) + '-' + value.slice(5);
              const formattedValue = value.slice(0, 10);
              handleBasicDataChange('email', formattedValue);
            }}
            className="text-center"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">{personFields.id_expiry_date}</Label>
          <Input
            placeholder="DDMMYY או DDMMYYYY"
            maxLength={10}
            value={basicData.notes}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, '');
              const currentLength = basicData.notes.replace(/\D/g, '').length;

              // אם הוזנו 6 ספרות בדיוק והמשתמש לא מוחק - השלם את השנה
              if (value.length === 6 && value.length >= currentLength) {
                const yearPart = parseInt(value.slice(4, 6));
                const fullYear = yearPart >= 27 ? '19' + value.slice(4, 6) : '20' + value.slice(4, 6);
                value = value.slice(0, 4) + fullYear;
              }

              if (value.length >= 2) value = value.slice(0, 2) + '-' + value.slice(2);
              if (value.length >= 5) value = value.slice(0, 5) + '-' + value.slice(5);
              const formattedValue = value.slice(0, 10);
              handleBasicDataChange('notes', formattedValue);
            }}
            className="text-center"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">{personFields.residential_city}</Label>
          <Input
            value={basicData.residential_city || ''}
            onChange={(e) => handleBasicDataChange('residential_city', e.target.value)}
            placeholder={personFields.residential_city}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">{personFields.address}</Label>
          <Input
            value={basicData.address || ''}
            onChange={(e) => handleBasicDataChange('address', e.target.value)}
            placeholder="כתובת מלאה"
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{personFields.gender}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-[70px] [&>span]:pr-4">
                <SelectValue placeholder="בחר"/>
              </SelectTrigger>
              <SelectContent className="min-w-0" style={{ width: 'var(--radix-select-trigger-width)' }}>
                <SelectItem value="male">זכר</SelectItem>
                <SelectItem value="female">נקבה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{personFields.marital_status}</Label>
            <Select value={maritalStatus} onValueChange={setMaritalStatus}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder="בחר"/>
              </SelectTrigger>
              <SelectContent className="min-w-[5rem]">
                {gender === 'female' ? (
                  <>
                    <SelectItem value="married" className="justify-center text-center">נשואה</SelectItem>
                    <SelectItem value="single" className="justify-center text-center">רווקה</SelectItem>
                    <SelectItem value="divorced" className="justify-center text-center">גרושה</SelectItem>
                    <SelectItem value="widowed" className="justify-center text-center">אלמנה</SelectItem>
                    <SelectItem value="separated" className="justify-center text-center">פרודה</SelectItem>
                    <SelectItem value="common_law" className="justify-center">
                      <div className="flex flex-col items-center leading-tight text-center">
                        <span>ידועה</span>
                        <span>בציבור</span>
                      </div>
                    </SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="married" className="justify-center text-center">נשוי</SelectItem>
                    <SelectItem value="single" className="justify-center text-center">רווק</SelectItem>
                    <SelectItem value="divorced" className="justify-center text-center">גרוש</SelectItem>
                    <SelectItem value="widowed" className="justify-center text-center">אלמן</SelectItem>
                    <SelectItem value="separated" className="justify-center text-center">פרוד</SelectItem>
                    <SelectItem value="common_law" className="justify-center">
                      <div className="flex flex-col items-center leading-tight text-center">
                        <span>ידוע</span>
                        <span>בציבור</span>
                      </div>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-sm whitespace-nowrap">{personFields.children_birth_dates}:</Label>
          {[...childrenDates]
            .sort((a, b) => {
              if (a.length !== 10 || b.length !== 10) return 0;
              const [dayA, monthA, yearA] = a.split('-').map(Number);
              const [dayB, monthB, yearB] = b.split('-').map(Number);
              const dateA = new Date(yearA, monthA - 1, dayA);
              const dateB = new Date(yearB, monthB - 1, dayB);
              return dateB - dateA; // תאריך חדש יותר = גיל צעיר יותר = יופיע ראשון
            })
            .map((date, index) => (
            <Popover key={index}>
              <PopoverTrigger asChild>
                <div className="w-auto min-w-[24px] h-8 cursor-pointer flex items-center justify-center border rounded-md bg-white hover:bg-gray-50">
                  {(() => {
                    if (date.length !== 10) return '';
                    const [day, month, year] = date.split('-').map(Number);
                    const birthDate = new Date(year, month - 1, day);
                    const today = new Date();

                    let years = today.getFullYear() - birthDate.getFullYear();
                    let months = today.getMonth() - birthDate.getMonth();
                    let days = today.getDate() - birthDate.getDate();

                    if (days < 0) {
                      months--;
                      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                      days += prevMonth.getDate();
                    }

                    if (months < 0) {
                      years--;
                      months += 12;
                    }

                    const decimal = (months / 12 + days / 365).toFixed(1).split('.')[1];

                    return (
                      <span className="px-1">
                        <span className="text-base font-semibold">{years}</span>
                        <span className="text-xs text-gray-600">.{decimal}</span>
                      </span>
                    );
                  })()}
                </div>
              </PopoverTrigger>
              <PopoverContent align="center" style={{ width: '161px' }}>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-center block">הזן תאריך לידה</Label>
                  <Input 
                    placeholder="DDMMYY או DDMMYYYY"
                    className="w-full"
                    maxLength={10}
                    value={date}
                    onChange={(e) => {
                      setDateError('');
                      let value = e.target.value.replace(/\D/g, '');
                      const currentLength = date.replace(/\D/g, '').length;

                      // אם הוזנו 6 ספרות בדיוק והמשתמש לא מוחק - השלם את השנה
                      if (value.length === 6 && value.length >= currentLength) {
                        const yearPart = parseInt(value.slice(4, 6));
                        const fullYear = yearPart >= 27 ? '19' + value.slice(4, 6) : '20' + value.slice(4, 6);
                        value = value.slice(0, 4) + fullYear;
                      }

                      if (value.length >= 2) value = value.slice(0, 2) + '-' + value.slice(2);
                      if (value.length >= 5) value = value.slice(0, 5) + '-' + value.slice(5);
                      const formattedValue = value.slice(0, 10);

                      // Validate date if complete
                      if (formattedValue.length === 10) {
                        const [day, month, year] = formattedValue.split('-').map(Number);
                        if (month < 1 || month > 12) {
                          setDateError('נא להזין תאריך חוקי');
                          return;
                        }
                        const daysInMonth = new Date(year, month, 0).getDate();
                        if (day < 1 || day > daysInMonth) {
                          setDateError('נא להזין תאריך חוקי');
                          return;
                        }
                      }

                      const newDates = [...childrenDates];
                      newDates[index] = formattedValue;
                      setChildrenDates(newDates);

                      if (formattedValue.length === 10 && index === childrenDates.length - 1) {
                        setChildrenDates([...newDates, '']);
                      }
                    }}
                  />
                  {dateError && (
                    <p className="text-sm text-red-600">{dateError}</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">{personFields.num_children}</Label>
          <Input 
            type="number"
            value={manualNumChildren}
            onChange={(e) => {
              setManualNumChildren(e.target.value);
              const actualCount = childrenDates.filter(d => d.length === 10).length;
              if (e.target.value && parseInt(e.target.value) !== actualCount) {
                setShowChildrenWarning(true);
                setTimeout(() => setShowChildrenWarning(false), 3000);
              }
            }}
            placeholder={childrenDates.filter(d => d.length === 10).length.toString()}
            className={`w-12 text-center h-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
              manualNumChildren && parseInt(manualNumChildren) !== childrenDates.filter(d => d.length === 10).length
                ? 'border-red-500 bg-red-50'
                : ''
            }`}
            style={{ MozAppearance: 'textfield' }}
          />
          <Label className="text-sm whitespace-nowrap">{personFields.num_children_under_18}</Label>
          <Input 
            type="number"
            value={manualNumChildrenUnder18}
            onChange={(e) => {
              setManualNumChildrenUnder18(e.target.value);
              const actualCount = childrenDates.filter(d => {
                if (d.length !== 10) return false;
                const [day, month, year] = d.split('-').map(Number);
                const birthDate = new Date(year, month - 1, day);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return age < 18;
              }).length;
              if (e.target.value && parseInt(e.target.value) !== actualCount) {
                setShowChildrenWarning(true);
                setTimeout(() => setShowChildrenWarning(false), 3000);
              }
            }}
            placeholder={childrenDates.filter(d => {
              if (d.length !== 10) return false;
              const [day, month, year] = d.split('-').map(Number);
              const birthDate = new Date(year, month - 1, day);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              return age < 18;
            }).length.toString()}
            className={`w-12 text-center h-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
              manualNumChildrenUnder18 && parseInt(manualNumChildrenUnder18) !== childrenDates.filter(d => {
                if (d.length !== 10) return false;
                const [day, month, year] = d.split('-').map(Number);
                const birthDate = new Date(year, month - 1, day);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return age < 18;
              }).length
                ? 'border-red-500 bg-red-50'
                : ''
            }`}
            style={{ MozAppearance: 'textfield' }}
          />
          <Label className="text-sm whitespace-nowrap">{personFields.num_siblings}</Label>
          <Input 
            type="number" 
            value={numSiblings}
            onChange={(e) => {
              const value = e.target.value;
              setNumSiblings(value);
              updatePersonMutation.mutate({ 
                custom_data: { ...(person?.custom_data || {}), num_siblings: value }
              });
            }}
            className="w-12 text-center h-8" 
          />
        </div>
        <div></div>
        <div></div>

        <div></div>
        <div></div>
      </div>

      {showChildrenWarning && (
        <div className="text-red-600 text-sm font-medium text-center" style={{ marginTop: '-70px', marginLeft: '30px' }}>
          נא למלא תאריכי לידה של הילדים
        </div>
      )}

        </div>
      )}
      </div>



      {/* Second Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => setIsCollapsed2(!isCollapsed2)}
          className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 transition-colors border-b"
        >
          {isCollapsed2 ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
          <h2 className="text-lg font-bold text-gray-900">תעודת זהות</h2>
        </button>

        {/* Content */}
        {!isCollapsed2 && (
          <div className="p-6">
            <IDUploader 
              initialData={person?.custom_data?.id_upload_data}
              onDataExtracted={(data) => {
                if (!data) {
                  const customData = { ...(person?.custom_data || {}) };
                  delete customData.id_upload_data;
                  updatePersonMutation.mutate({ custom_data: customData });
                  return;
                }
                
                const updates = {};
                if (data.first_name) updates.first_name = data.first_name;
                if (data.last_name) updates.last_name = data.last_name;
                if (data.id_number) updates.id_number = String(data.id_number).replace(/\D/g, '').padStart(9, '0').slice(0, 9);
                if (data.address) updates.address = data.address;
                if (data.birth_date) updates.phone = data.birth_date;
                if (data.id_issue_date) updates.email = data.id_issue_date;
                if (data.id_expiry_date) updates.notes = data.id_expiry_date;
                
                setBasicData(prev => ({ ...prev, ...updates }));
                if (data.gender) setGender(data.gender);
                
                const customData = { ...(person?.custom_data || {}), id_upload_data: data };
                updatePersonMutation.mutate({ ...updates, custom_data: customData });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}