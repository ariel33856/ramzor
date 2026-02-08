import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Loader2, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { tabComponents } from '@/components/dashboard/FieldsHierarchy';
import IDUploader from './IDUploader';
import { Upload } from 'lucide-react';


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
  const [linkedProperties, setLinkedProperties] = useState([]);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const tabsRef = React.useRef(null);
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
    address: '',
    building_number: '',
    entrance: '',
    apartment_number: ''
  });
  const [numChildren, setNumChildren] = useState(0);
  const [childrenDates, setChildrenDates] = useState(['']);
  const [childrenNames, setChildrenNames] = useState(['']);
  const [dateError, setDateError] = useState('');
  const [numSiblings, setNumSiblings] = useState('');
  const [manualNumChildren, setManualNumChildren] = useState('');
  const [manualNumChildrenUnder18, setManualNumChildrenUnder18] = useState('');
  const [showChildrenWarning, setShowChildrenWarning] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState('married');
  const [idError, setIdError] = useState('');
  const [additionalPhones, setAdditionalPhones] = useState([]);
  const [incomeSources, setIncomeSources] = useState([]);
  const [uploadingPayslip, setUploadingPayslip] = useState(null);
  const [obligations, setObligations] = useState([]);
  const obligationsTimeoutRef = React.useRef(null);
  const [createPropertyDialogOpen, setCreatePropertyDialogOpen] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState({
    address: '',
    city: '',
    property_type: 'דירה',
    size_sqm: '',
    rooms: '',
    floor: '',
    price: '',
    status: 'פנוי',
    notes: ''
  });


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

  const { data: allProperties = [] } = useQuery({
    queryKey: ['all-properties'],
    queryFn: () => base44.entities.PropertyAsset.list('-created_date'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-for-contacts'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['all-contacts-spouse', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.Person.filter({ 
        is_archived: false,
        created_by: currentUser.email 
      });
    },
    enabled: spouseDialogOpen && !!currentUser,
    staleTime: 5 * 60 * 1000
  });

  const { data: linkedSpouse } = useQuery({
    queryKey: ['spouse', spouseId],
    queryFn: () => base44.entities.Person.filter({ id: spouseId }).then(res => res[0]),
    enabled: !!spouseId
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: () => base44.entities.Transaction.list('-transaction_date'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-transactions']);
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-transactions']);
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['all-transactions'])
  });

  const accounts = allAccounts.filter(c => !c.is_archived && !c.module_id);
  const properties = allProperties;

  const linkedAccountsData = allAccounts.filter(acc => 
    linkedAccounts.some(link => 
      typeof link === 'string' ? link === acc.id : link.case_id === acc.id
    )
  );

  const linkedPropertiesData = allProperties.filter(prop => 
    linkedProperties.includes(prop.id)
  );

  const updatePersonMutation = useMutation({
    mutationFn: async (data) => {
      // If updating custom_data, fetch fresh person data first to avoid overwriting
      if (data.custom_data) {
        const freshPerson = await base44.entities.Person.filter({ id: personId }).then(res => res[0]);
        data = {
          ...data,
          custom_data: {
            ...(freshPerson?.custom_data || {}),
            ...data.custom_data
          }
        };
      }
      return base44.entities.Person.update(personId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['all-properties'] });
    }
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data) => {
      const newProperty = await base44.entities.PropertyAsset.create(data);
      const updatedProperties = [...linkedProperties, newProperty.id];
      await base44.entities.Person.update(personId, { linked_properties: updatedProperties });
      return newProperty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['all-properties'] });
      setCreatePropertyDialogOpen(false);
      setPropertyFormData({
        address: '',
        city: '',
        property_type: 'דירה',
        size_sqm: '',
        rooms: '',
        floor: '',
        price: '',
        status: 'פנוי',
        notes: ''
      });
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
    const isAlreadyLinked = linkedAccounts.some(link => 
      typeof link === 'string' ? link === accountId : link.case_id === accountId
    );
    if (!isAlreadyLinked) {
      const updatedAccounts = [...linkedAccounts, { case_id: accountId, relationship_type: 'לווה' }];
      setLinkedAccounts(updatedAccounts);
      updatePersonMutation.mutate({ linked_accounts: updatedAccounts });
      setDialogOpen(false);
      setSearchTerm('');
    }
  };

  const handleUnlinkAccount = (accountId) => {
    const updatedAccounts = linkedAccounts.filter(link => 
      typeof link === 'string' ? link !== accountId : link.case_id !== accountId
    );
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
    !linkedAccounts.some(link => 
      typeof link === 'string' ? link === acc.id : link.case_id === acc.id
    ) &&
    (acc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_number?.toString().includes(searchTerm))
  );

  const filteredProperties = allProperties.filter(prop =>
    !linkedProperties.includes(prop.id) &&
    (prop.address?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
    prop.city?.toLowerCase().includes(propertySearchTerm.toLowerCase()))
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
        address: person.address || '',
        building_number: person.building_number || '',
        entrance: person.entrance || '',
        apartment_number: person.apartment_number || ''
      });
      
      if (person.linked_accounts) {
        // Convert old format (array of IDs) to new format (array of objects)
        if (Array.isArray(person.linked_accounts) && person.linked_accounts.length > 0) {
          if (typeof person.linked_accounts[0] === 'string') {
            // Old format - convert to new format
            setLinkedAccounts(person.linked_accounts);
          } else {
            // New format - just set it
            setLinkedAccounts(person.linked_accounts);
          }
        } else {
          setLinkedAccounts(person.linked_accounts || []);
        }
      }

      if (person.linked_properties) {
        setLinkedProperties(person.linked_properties);
      }
      
      if (person.custom_data) {
        // Filter out known object fields and array fields from custom_data
        const excludedFields = ['id_upload_data', 'spouse_id', 'num_siblings', 'children_birth_dates', 'children_names', 'num_children', 'additional_phones', 'income_source', 'birth_date'];
        const fields = Object.entries(person.custom_data)
          .filter(([name]) => !excludedFields.includes(name))
          .filter(([_, value]) => typeof value !== 'object' || value === null)
          .map(([name, value], index) => ({
            id: `custom_${index}`,
            name,
            value
          }));
        setCustomFields(fields);

        // Load spouse_id from custom_data
        if (person.custom_data.spouse_id) {
          setSpouseId(person.custom_data.spouse_id);
        }

        // Load gender from custom_data or id_upload_data
        const savedGender = person.custom_data?.gender || person.custom_data?.id_upload_data?.gender;
        if (savedGender) {
          setGender(savedGender);
        }

        // Load num_siblings from custom_data
        if (person.custom_data.num_siblings) {
          setNumSiblings(person.custom_data.num_siblings);
        }

        // Load children data from id_upload_data first, then fallback to custom_data
        const idUploadData = person.custom_data.id_upload_data;
        if (idUploadData?.children_birth_dates && Array.isArray(idUploadData.children_birth_dates)) {
          setChildrenDates([...idUploadData.children_birth_dates, '']);
        } else if (person.custom_data.children_birth_dates && Array.isArray(person.custom_data.children_birth_dates)) {
          setChildrenDates([...person.custom_data.children_birth_dates, '']);
        }

        if (idUploadData?.children_names && Array.isArray(idUploadData.children_names)) {
          setChildrenNames([...idUploadData.children_names, '']);
        } else if (person.custom_data.children_names && Array.isArray(person.custom_data.children_names)) {
          setChildrenNames([...person.custom_data.children_names, '']);
        }

        if (idUploadData?.num_children) {
          setManualNumChildren(String(idUploadData.num_children));
        } else if (person.custom_data.num_children) {
          setManualNumChildren(String(person.custom_data.num_children));
        }

        // Load additional phones from custom_data
        if (person.custom_data.additional_phones && Array.isArray(person.custom_data.additional_phones)) {
          setAdditionalPhones(person.custom_data.additional_phones);
        }

        // Load income sources from custom_data
        if (person.custom_data.income_sources && Array.isArray(person.custom_data.income_sources)) {
          setIncomeSources(person.custom_data.income_sources);
        }

        // Load obligations from custom_data
        if (person.custom_data.obligations && Array.isArray(person.custom_data.obligations)) {
          setObligations(person.custom_data.obligations);
        }

        // Load relationship_type from linked_accounts based on current case
        const currentCaseId = new URLSearchParams(window.location.search).get('id');
        if (currentCaseId && person.linked_accounts) {
          const currentLink = person.linked_accounts.find(acc => 
            typeof acc === 'string' ? acc === currentCaseId : acc.case_id === currentCaseId
          );
          if (currentLink && typeof currentLink === 'object' && currentLink.relationship_type) {
            let relType = currentLink.relationship_type;
            // התאם את סוג הזיקה למין
            const savedGender = person.custom_data?.gender || person.custom_data?.id_upload_data?.gender || gender;
            if (relType === 'ערב' || relType === 'ערבה') {
              relType = savedGender === 'male' ? 'ערב' : 'ערבה';
            } else if (relType === 'ערב ממשכן' || relType === 'ערבה ממשכנת') {
              relType = savedGender === 'male' ? 'ערב ממשכן' : 'ערבה ממשכנת';
            } else if (relType === 'בן זוג' || relType === 'בת זוג' || relType === 'בן/בת זוג') {
              relType = savedGender === 'male' ? 'בן זוג' : 'בת זוג';
            }
            setRelationshipType(relType);
          }
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
    <>
      <div>
        {/* Tab Headers */}
        <div className="flex" ref={tabsRef}>
          {(() => {
            const tabDefs = [
              { id: 'general', label: 'כללי', activeBg: 'bg-blue-50', activeText: 'text-blue-700', borderColor: 'border-blue-400', bottomBorderColor: 'border-b-blue-400' },
              { id: 'identity', label: 'תעודת זהות', activeBg: 'bg-amber-50', activeText: 'text-amber-700', borderColor: 'border-amber-400', bottomBorderColor: 'border-b-amber-400' },
              { id: 'income', label: 'הכנסות', activeBg: 'bg-green-50', activeText: 'text-green-700', borderColor: 'border-green-400', bottomBorderColor: 'border-b-green-400' },
              { id: 'obligations', label: 'התחייבויות', activeBg: 'bg-rose-50', activeText: 'text-rose-700', borderColor: 'border-rose-400', bottomBorderColor: 'border-b-rose-400' },
              { id: 'properties', label: 'נכסים', activeBg: 'bg-purple-50', activeText: 'text-purple-700', borderColor: 'border-purple-400', bottomBorderColor: 'border-b-purple-400' },
            ];
            const activeTabDef = tabDefs.find(t => t.id === activeTab);
            const activeBottomBorder = activeTabDef?.bottomBorderColor || '';
            return tabDefs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 text-sm font-semibold rounded-t-lg border-2 ${
                  activeTab === tab.id
                    ? `${tab.activeText} ${tab.activeBg} ${tab.borderColor} border-b-0 relative z-10`
                    : `${tab.activeText} ${tab.activeBg} ${tab.borderColor} ${activeBottomBorder}`
                }`}
                style={activeTab === tab.id ? { marginBottom: '-2px', paddingBottom: 'calc(0.75rem + 2px)' } : { marginBottom: '-2px', paddingBottom: 'calc(0.75rem + 2px)' }}
              >
                {tab.label}
              </button>
            ));
          })()}
        </div>

        {/* Tab Content: General */}
        {activeTab === 'general' && (
          <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px' }}>
      <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex flex-col gap-4">
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
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">{personFields.phone}</Label>
              <Input
                value={basicData.phone}
                onChange={(e) => handleBasicDataChange('phone', e.target.value)}
                placeholder={personFields.phone}
                className="text-xl font-bold w-40"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newPhones = [...additionalPhones, ''];
                  setAdditionalPhones(newPhones);
                  updatePersonMutation.mutate({
                    custom_data: { ...(person?.custom_data || {}), additional_phones: newPhones }
                  });
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {additionalPhones.map((phone, index) => (
              <div key={index} className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">טלפון {index + 2}</Label>
                <Input
                  value={phone}
                  onChange={(e) => {
                    const newPhones = [...additionalPhones];
                    newPhones[index] = e.target.value;
                    setAdditionalPhones(newPhones);
                    updatePersonMutation.mutate({
                      custom_data: { ...(person?.custom_data || {}), additional_phones: newPhones }
                    });
                  }}
                  placeholder="טלפון נוסף"
                  className="text-xl font-bold w-40"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-600"
                  onClick={() => {
                    const newPhones = additionalPhones.filter((_, i) => i !== index);
                    setAdditionalPhones(newPhones);
                    updatePersonMutation.mutate({
                      custom_data: { ...(person?.custom_data || {}), additional_phones: newPhones }
                    });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">{personFields.email}</Label>
              <Input
                value={basicData.email}
                onChange={(e) => handleBasicDataChange('email', e.target.value)}
                placeholder={personFields.email}
                className="text-xl font-bold w-40"
              />
            </div>
          </div>
        </div>
        <div className="mr-auto flex items-center gap-2 flex-wrap">
          {linkedAccountsData.length > 0 ? (
            <>
              {linkedAccountsData.filter(account => {
                const currentCaseId = new URLSearchParams(window.location.search).get('id');
                return account.id === currentCaseId;
              }).map(account => {
                const currentCaseId = new URLSearchParams(window.location.search).get('id');
                const currentLink = linkedAccounts.find(acc => 
                  typeof acc === 'string' ? acc === currentCaseId : acc.case_id === currentCaseId
                );
                let currentRelationshipType = currentLink && typeof currentLink === 'object' ? currentLink.relationship_type : relationshipType;
                
                // התאם את סוג הזיקה המוצג למין
                if (currentRelationshipType === 'ערב' || currentRelationshipType === 'ערבה') {
                  currentRelationshipType = gender === 'male' ? 'ערב' : 'ערבה';
                } else if (currentRelationshipType === 'ערב ממשכן' || currentRelationshipType === 'ערבה ממשכנת') {
                  currentRelationshipType = gender === 'male' ? 'ערב ממשכן' : 'ערבה ממשכנת';
                } else if (currentRelationshipType === 'בן זוג' || currentRelationshipType === 'בת זוג' || currentRelationshipType === 'בן/בת זוג') {
                  currentRelationshipType = gender === 'male' ? 'בן זוג' : 'בת זוג';
                }

                return (
                <div key={account.id} className="flex items-center gap-3 border-4 border-blue-500 rounded-lg p-3 shadow-lg bg-white">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className={`whitespace-nowrap rounded-l-lg ${
                        currentRelationshipType === 'לווה' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' :
                        (currentRelationshipType === 'ערב' || currentRelationshipType === 'ערבה') ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600' :
                        (currentRelationshipType === 'ערב ממשכן' || currentRelationshipType === 'ערבה ממשכנת') ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' :
                        (currentRelationshipType === 'בן/בת זוג' || currentRelationshipType === 'בן זוג' || currentRelationshipType === 'בת זוג') ? 'bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-500 hover:to-sky-500' :
                        'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                      }`}>
                        {currentRelationshipType ? `זיקה לחשבון: ${currentRelationshipType}` : 'זיקה לחשבון'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-center" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
                      <DropdownMenuItem onClick={() => {
                        const newType = 'לווה';
                        const updatedLinkedAccounts = linkedAccounts.map(acc => 
                          typeof acc === 'string' 
                            ? { case_id: acc, relationship_type: newType }
                            : acc.case_id === currentCaseId 
                              ? { ...acc, relationship_type: newType }
                              : acc
                        );
                        setLinkedAccounts(updatedLinkedAccounts);
                        setRelationshipType(newType);
                        updatePersonMutation.mutate({ linked_accounts: updatedLinkedAccounts });
                      }} className="justify-center bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 mb-1">לווה</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const newType = gender === 'male' ? 'ערב' : 'ערבה';
                        const updatedLinkedAccounts = linkedAccounts.map(acc => 
                          typeof acc === 'string' 
                            ? { case_id: acc, relationship_type: newType }
                            : acc.case_id === currentCaseId 
                              ? { ...acc, relationship_type: newType }
                              : acc
                        );
                        setLinkedAccounts(updatedLinkedAccounts);
                        setRelationshipType(newType);
                        updatePersonMutation.mutate({ linked_accounts: updatedLinkedAccounts });
                      }} className="justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 mb-1">{gender === 'male' ? 'ערב' : 'ערבה'}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const newType = gender === 'male' ? 'ערב ממשכן' : 'ערבה ממשכנת';
                        const updatedLinkedAccounts = linkedAccounts.map(acc => 
                          typeof acc === 'string' 
                            ? { case_id: acc, relationship_type: newType }
                            : acc.case_id === currentCaseId 
                              ? { ...acc, relationship_type: newType }
                              : acc
                        );
                        setLinkedAccounts(updatedLinkedAccounts);
                        setRelationshipType(newType);
                        updatePersonMutation.mutate({ linked_accounts: updatedLinkedAccounts });
                      }} className="justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 mb-1">{gender === 'male' ? 'ערב ממשכן' : 'ערבה ממשכנת'}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const newType = gender === 'male' ? 'בן זוג' : 'בת זוג';
                        const updatedLinkedAccounts = linkedAccounts.map(acc => 
                          typeof acc === 'string' 
                            ? { case_id: acc, relationship_type: newType }
                            : acc.case_id === currentCaseId 
                              ? { ...acc, relationship_type: newType }
                              : acc
                        );
                        setLinkedAccounts(updatedLinkedAccounts);
                        setRelationshipType(newType);
                        updatePersonMutation.mutate({ linked_accounts: updatedLinkedAccounts });
                      }} className="justify-center bg-gradient-to-r from-cyan-400 to-sky-400 text-white hover:from-cyan-500 hover:to-sky-500">{gender === 'male' ? 'בן זוג' : 'בת זוג'}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    onClick={() => window.location.href = createPageUrl('CaseDetails') + `?id=${account.id}`}
                    className="whitespace-nowrap cursor-pointer bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-l-lg"
                  >
                    חשבון משויך: {account.client_name} {account.account_number}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 border-2 border-green-500 rounded-r-lg"
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
                );
              })}
              {linkedAccountsData.filter(account => {
                const currentCaseId = new URLSearchParams(window.location.search).get('id');
                return account.id !== currentCaseId;
              }).map(account => {
                const currentLink = linkedAccounts.find(acc => 
                  typeof acc === 'string' ? acc === account.id : acc.case_id === account.id
                );
                const accountRelationshipType = currentLink && typeof currentLink === 'object' ? currentLink.relationship_type : 'לווה';

                return (
                <div key={account.id} className="flex items-center gap-3 border-4 border-blue-300 rounded-lg p-3 shadow-lg bg-white">
                  <div className="text-sm font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded-l-lg">
                    זיקה: {accountRelationshipType}
                  </div>
                  <Button 
                    onClick={() => window.location.href = createPageUrl('CaseDetails') + `?id=${account.id}`}
                    className="whitespace-nowrap cursor-pointer bg-gradient-to-r from-green-200 to-emerald-200 hover:from-green-300 hover:to-emerald-300 text-gray-700 rounded-l-lg"
                  >
                    חשבון משויך: {account.client_name} {account.account_number}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 border-2 border-green-500 rounded-r-lg"
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
                );
              })}
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
          {linkedPropertiesData.map(property => (
            <Button 
              key={property.id}
              onClick={() => window.location.href = createPageUrl('PropertyDetails') + `?id=${property.id}`}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 whitespace-nowrap cursor-pointer"
            >
              נכס משויך: {property.address}, {property.city}
            </Button>
          ))}
          {linkedPropertiesData.length === 0 && (
            <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 whitespace-nowrap">
                  <LinkIcon className="w-4 h-4 ml-2" />
                  שייך נכס
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>בחר נכס לשיוך</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="חיפוש לפי כתובת או עיר..."
                    value={propertySearchTerm}
                    onChange={(e) => setPropertySearchTerm(e.target.value)}
                  />
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredProperties.map(property => (
                      <div
                        key={property.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          const updatedProperties = [...linkedProperties, property.id];
                          setLinkedProperties(updatedProperties);
                          updatePersonMutation.mutate({ linked_properties: updatedProperties });
                          setPropertyDialogOpen(false);
                          setPropertySearchTerm('');
                        }}
                      >
                        <p className="font-semibold text-gray-900">{property.address}</p>
                        <p className="text-sm text-gray-500">{property.city} • {property.property_type}</p>
                      </div>
                    ))}
                    {filteredProperties.length === 0 && (
                      <p className="text-center text-gray-500 py-8">לא נמצאו נכסים</p>
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
      </div>
      </div>
        )}

        {/* Tab Content: Identity */}
        {activeTab === 'identity' && (
          <div className="p-6 space-y-6 bg-amber-50 border-2 border-amber-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px' }}>
            <IDUploader 
              initialData={person?.custom_data?.id_upload_data}
              gender={gender}
              setGender={setGender}
              onDataExtracted={(data) => {
                if (!data) {
                  const customData = { ...(person?.custom_data || {}) };
                  delete customData.id_upload_data;
                  delete customData.children_birth_dates;
                  delete customData.children_names;
                  delete customData.num_children;
                  setChildrenDates(['']);
                  setChildrenNames(['']);
                  setManualNumChildren('');
                  setManualNumChildrenUnder18('');
                  setBasicData(prev => ({
                    ...prev,
                    address: '',
                    building_number: '',
                    entrance: '',
                    apartment_number: '',
                    residential_city: ''
                  }));
                  updatePersonMutation.mutate({ 
                    custom_data: customData,
                    address: '',
                    building_number: '',
                    entrance: '',
                    apartment_number: '',
                    residential_city: ''
                  });
                  return;
                }
                
                const updates = {};
                if (data.first_name) updates.first_name = data.first_name;
                if (data.last_name) updates.last_name = data.last_name;
                if (data.id_number) updates.id_number = String(data.id_number).replace(/\D/g, '').padStart(9, '0').slice(0, 9);
                
                // Extract address fields from document
                if (data.address) updates.address = data.address;
                if (data.building_number) updates.building_number = data.building_number;
                if (data.entrance) updates.entrance = data.entrance;
                if (data.apartment_number) updates.apartment_number = data.apartment_number;
                if (data.city) updates.residential_city = data.city;
                
                setBasicData(prev => ({ ...prev, ...updates }));
                if (data.gender) {
                  setGender(data.gender);
                  // Save gender to custom_data
                  updates.custom_data = {
                    ...(person?.custom_data || {}),
                    gender: data.gender
                  };
                }
                
                // Update children data
                if (data.children_birth_dates && Array.isArray(data.children_birth_dates)) {
                  setChildrenDates([...data.children_birth_dates, '']);
                }
                if (data.children_names && Array.isArray(data.children_names)) {
                  setChildrenNames([...data.children_names, '']);
                }
                if (data.num_children) {
                  setManualNumChildren(String(data.num_children));
                }
                
                const customData = { 
                  ...(person?.custom_data || {}),
                  ...(updates.custom_data || {}),
                  id_upload_data: data,
                  birth_date: data.birth_date || person?.custom_data?.birth_date
                };
                delete updates.custom_data;
                updatePersonMutation.mutate({ ...updates, custom_data: customData });
              }}
            />

            {/* Birth Info Section - Yellow */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm whitespace-nowrap">תאריך לידה</Label>
                <Input 
                  value={person?.custom_data?.id_upload_data?.birth_date || person?.custom_data?.birth_date || ''} 
                  onChange={(e) => {
                    const value = e.target.value;
                    const customData = { 
                      ...(person?.custom_data || {}), 
                      birth_date: value,
                      id_upload_data: {
                        ...(person?.custom_data?.id_upload_data || {}),
                        birth_date: value
                      }
                    };
                    updatePersonMutation.mutate({ custom_data: customData });
                  }}
                  placeholder="DD-MM-YYYY"
                  className="bg-white w-32 h-8"
                />
                <Label className="text-sm whitespace-nowrap">גיל</Label>
                <Input 
                  value={(() => {
                    const birthDate = person?.custom_data?.id_upload_data?.birth_date || person?.custom_data?.birth_date;
                    if (!birthDate) return '';
                    
                    const parts = birthDate.split('-');
                    if (parts.length !== 3) return '';
                    
                    const [day, month, year] = parts.map(num => parseInt(num, 10));
                    if (!day || !month || !year) return '';
                    
                    const birth = new Date(year, month - 1, day);
                    const today = new Date();

                    let years = today.getFullYear() - birth.getFullYear();
                    let months = today.getMonth() - birth.getMonth();
                    let days = today.getDate() - birth.getDate();

                    if (days < 0) {
                      months--;
                      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                      days += prevMonth.getDate();
                    }

                    if (months < 0) {
                      years--;
                      months += 12;
                    }

                    const decimalPart = ((months * 30 + days) / 365).toFixed(1).split('.')[1];

                    return `${years}.${decimalPart}`;
                  })()}
                  readOnly
                  className="bg-white w-16 h-8 text-center"
                />

                <Label className="text-sm whitespace-nowrap">מין</Label>
                <Select value={gender} onValueChange={async (value) => {
                  setGender(value);
                  // Fetch fresh person data to avoid overwriting other custom_data
                  const freshPerson = await base44.entities.Person.filter({ id: personId }).then(res => res[0]);
                  await updatePersonMutation.mutateAsync({
                    custom_data: { ...(freshPerson?.custom_data || {}), gender: value }
                  });
                }}>
                  <SelectTrigger className="h-8 bg-white w-auto min-w-20">
                    <SelectValue placeholder="בחר"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Children Data Section - Green */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm whitespace-nowrap">ישוב מגורים</Label>
                <Input
                  value={basicData.residential_city}
                  onChange={(e) => handleBasicDataChange('residential_city', e.target.value)}
                  placeholder=""
                  className="text-sm w-48 h-8 bg-white"
                />
                <Label className="text-sm whitespace-nowrap">רחוב</Label>
                <Input
                  value={basicData.address}
                  onChange={(e) => handleBasicDataChange('address', e.target.value)}
                  placeholder="כתובת"
                  className="text-sm w-48 h-8 bg-white"
                />
                <Label className="text-sm whitespace-nowrap">בנין</Label>
                <Input
                  value={basicData.building_number}
                  onChange={(e) => handleBasicDataChange('building_number', e.target.value)}
                  placeholder=""
                  className="text-sm w-20 h-8 bg-white"
                />
                <Label className="text-sm whitespace-nowrap">כניסה</Label>
                <Input
                  value={basicData.entrance}
                  onChange={(e) => handleBasicDataChange('entrance', e.target.value)}
                  placeholder=""
                  className="text-sm w-20 h-8 bg-white"
                />
                <Label className="text-sm whitespace-nowrap">דירה</Label>
                <Input
                  value={basicData.apartment_number}
                  onChange={(e) => handleBasicDataChange('apartment_number', e.target.value)}
                  placeholder=""
                  className="text-sm w-20 h-8 bg-white"
                />
              </div>
              {showChildrenWarning && (
                <div className="text-red-600 text-sm font-medium text-center mt-2">
                  נא למלא תאריכי לידה של הילדים
                </div>
              )}
              </div>

              {/* Children & Family Info Section */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
               <Label className="text-sm whitespace-nowrap">{personFields.marital_status}</Label>
               <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                 <SelectTrigger className="h-8 w-auto min-w-32 bg-white">
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

               <Label className="text-sm whitespace-nowrap">{personFields.children_birth_dates}</Label>
               {childrenDates.map((date, index) => (
                 <Popover key={index}>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       className={`w-10 h-8 justify-center text-center font-normal text-xs ${
                         !date ? 'text-gray-400' : ''
                       }`}
                     >
                       {date ? (() => {
                         if (date.length !== 10) return date;
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
                           <span>
                             <span className="text-sm">{years}</span>
                             <span className="text-xs">.{decimal}</span>
                           </span>
                         );
                       })() : 'גיל'}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-48 p-3">
                     <div className="flex flex-col gap-2">
                       <Label className="text-xs text-center">שם הילד</Label>
                       <Input
                         value={childrenNames[index] || ''}
                         onChange={(e) => {
                           const value = e.target.value;
                           const newNames = [...childrenNames];
                           newNames[index] = value;

                           if (value && !newNames.find((n, i) => i > index && n === '')) {
                             newNames.push('');
                           }

                           setChildrenNames(newNames);

                           const validNames = newNames.filter(n => n);
                           const validDates = childrenDates.filter(d => d.length === 10);
                           const updatedIdData = {
                             ...(person?.custom_data?.id_upload_data || {}),
                             children_names: validNames,
                             children_birth_dates: validDates
                           };
                           updatePersonMutation.mutate({ 
                             custom_data: { 
                               ...(person?.custom_data || {}),
                               id_upload_data: updatedIdData,
                               children_names: validNames
                             }
                           });
                         }}
                         placeholder="שם הילד"
                         className="text-sm h-8"
                       />
                       <Label className="text-xs">תאריך לידה (DD-MM-YYYY)</Label>
                       <Input
                         value={date}
                         onChange={(e) => {
                           const value = e.target.value;
                           const newDates = [...childrenDates];
                           newDates[index] = value;

                           if (value.length === 10 && !newDates.find((d, i) => i > index && d === '')) {
                             newDates.push('');
                           }

                           setChildrenDates(newDates);

                           if (value.length === 10) {
                             const validDates = newDates.filter(d => d.length === 10);
                             const updatedIdData = {
                               ...(person?.custom_data?.id_upload_data || {}),
                               children_birth_dates: validDates,
                               num_children: validDates.length
                             };
                             updatePersonMutation.mutate({ 
                               custom_data: { 
                                 ...(person?.custom_data || {}),
                                 id_upload_data: updatedIdData,
                                 children_birth_dates: validDates,
                                 num_children: validDates.length
                               }
                             });
                             setManualNumChildren(String(validDates.length));
                           }
                         }}
                         placeholder="01-01-2010"
                         className="text-sm h-8"
                       />
                       {date && (
                         <Button
                           variant="ghost"
                           size="sm"
                           className="text-red-500 hover:text-red-600 h-6 text-xs"
                           onClick={() => {
                             const newDates = childrenDates.filter((_, i) => i !== index);
                             const newNames = childrenNames.filter((_, i) => i !== index);
                             if (newDates.length === 0 || newDates[newDates.length - 1] !== '') {
                               newDates.push('');
                             }
                             if (newNames.length === 0 || newNames[newNames.length - 1] !== '') {
                               newNames.push('');
                             }
                             setChildrenDates(newDates);
                             setChildrenNames(newNames);

                             const validDates = newDates.filter(d => d.length === 10);
                             const validNames = newNames.filter(n => n);
                             const updatedIdData = {
                               ...(person?.custom_data?.id_upload_data || {}),
                               children_birth_dates: validDates,
                               children_names: validNames,
                               num_children: validDates.length
                             };
                             updatePersonMutation.mutate({ 
                               custom_data: { 
                                 ...(person?.custom_data || {}),
                                 id_upload_data: updatedIdData,
                                 children_birth_dates: validDates,
                                 children_names: validNames,
                                 num_children: validDates.length
                               }
                             });
                             setManualNumChildren(String(validDates.length));
                           }}
                         >
                           מחק
                         </Button>
                       )}
                     </div>
                   </PopoverContent>
                 </Popover>
               ))}

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
                   const validDates = childrenDates.filter(d => d.length === 10);
                   const updatedIdData = {
                     ...(person?.custom_data?.id_upload_data || {}),
                     num_children: parseInt(e.target.value) || 0,
                     children_birth_dates: validDates
                   };
                   updatePersonMutation.mutate({ 
                     custom_data: { 
                       ...(person?.custom_data || {}),
                       id_upload_data: updatedIdData,
                       num_children: parseInt(e.target.value) || 0,
                       children_birth_dates: validDates
                     }
                   });
                 }}
                 placeholder={childrenDates.filter(d => d.length === 10).length.toString()}
                 className={`w-12 text-center h-8 bg-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
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
                 className={`w-12 text-center h-8 bg-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
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
                 type="text" 
                 value={numSiblings}
                 onChange={(e) => {
                   const value = e.target.value;
                   if (value === '' || (/^\d{1,2}$/.test(value))) {
                     setNumSiblings(value);
                     updatePersonMutation.mutate({ 
                       custom_data: { ...(person?.custom_data || {}), num_siblings: value }
                     });
                   }
                 }}
                 className="w-12 text-center h-8 bg-white" 
                  />
                 </div>
                 </div>
                 </div>
                 )}

        {/* Tab Content: Income */}
        {activeTab === 'income' && (
          <div className="p-6 space-y-4 bg-green-50 border-2 border-green-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px' }}>
            {incomeSources.map((income, index) => (
              <div key={index} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    {income.type === 'תלוש משכורת-שכיר' ? 'הכנסה בתלוש שכר' : `הכנסה מ-${income.type}`}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => {
                      const newSources = incomeSources.filter((_, i) => i !== index);
                      setIncomeSources(newSources);
                      updatePersonMutation.mutate({
                        custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                      });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {income.type === 'תלוש משכורת-שכיר' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((payslipNum) => (
                        <div key={payslipNum} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-3">
                          <Label className="text-xs font-semibold mb-2 block">תלוש {payslipNum}</Label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              setUploadingPayslip(`${index}-${payslipNum}`);
                              try {
                                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                
                                const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
                                  file_url,
                                  json_schema: {
                                    type: "object",
                                    properties: {
                                      employer_name: { type: "string", description: "שם המעסיק או החברה" },
                                      start_date: { type: "string", description: "תאריך תחילת עבודה" },
                                      gross_salary: { type: "number", description: "משכורת ברוטו" },
                                      net_salary: { type: "number", description: "משכורת נטו" },
                                      month_1_salary: { type: "number", description: "משכורת חודש ראשון אם קיים" },
                                      month_2_salary: { type: "number", description: "משכורת חודש שני אם קיים" },
                                      month_3_salary: { type: "number", description: "משכורת חודש שלישי אם קיים" }
                                    }
                                  }
                                });
                                
                                if (extractedData.status === 'success' && extractedData.output) {
                                  const newSources = [...incomeSources];
                                  newSources[index] = { 
                                    ...newSources[index], 
                                    ...extractedData.output,
                                    [`payslip_${payslipNum}_url`]: file_url
                                  };
                                  setIncomeSources(newSources);
                                  updatePersonMutation.mutate({
                                    custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                                  });
                                }
                              } catch (error) {
                                console.error('Error uploading payslip:', error);
                              } finally {
                                setUploadingPayslip(null);
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                          />
                          {uploadingPayslip === `${index}-${payslipNum}` && (
                            <div className="flex items-center gap-2 mt-2 text-blue-600">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-xs">מעבד...</span>
                            </div>
                          )}
                          {income[`payslip_${payslipNum}_url`] && (
                            <div className="mt-2 border-2 border-blue-300 rounded-lg overflow-hidden bg-white">
                              <img
                                src={income[`payslip_${payslipNum}_url`]}
                                alt={`תלוש ${payslipNum}`}
                                className="w-full h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(income[`payslip_${payslipNum}_url`], '_blank')}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      <div>
                        <Label className="text-xs">שם מעסיק</Label>
                        <Input 
                          value={income.employer_name || ''}
                          onChange={(e) => {
                            const newSources = [...incomeSources];
                            newSources[index] = { ...newSources[index], employer_name: e.target.value };
                            setIncomeSources(newSources);
                            updatePersonMutation.mutate({
                              custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                            });
                          }}
                          placeholder="שם החברה"
                          className="h-8 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">תאריך תחילת עבודה</Label>
                        <Input 
                          value={income.field_1 || ''}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                            if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                            const newSources = [...incomeSources];
                            newSources[index] = { ...newSources[index], field_1: value };
                            setIncomeSources(newSources);
                            updatePersonMutation.mutate({
                              custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                            });
                          }}
                          placeholder="DD/MM/YYYY"
                          className="h-8 bg-white"
                          maxLength={10}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">ותק בעבודה</Label>
                        <Input 
                          value={(() => {
                            if (!income.field_1) return '';
                            const startDate = new Date(income.field_1.split('/').reverse().join('-'));
                            const now = new Date();
                            const years = now.getFullYear() - startDate.getFullYear();
                            const months = now.getMonth() - startDate.getMonth();
                            const totalMonths = years * 12 + months;
                            const displayYears = Math.floor(totalMonths / 12);
                            const displayMonths = totalMonths % 12;
                            return displayYears > 0 ? `${displayYears} שנים ${displayMonths} חודשים` : `${displayMonths} חודשים`;
                          })()}
                          readOnly
                          placeholder=""
                          className="h-8 bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">תפקיד</Label>
                        <Input 
                          value={income.field_3 || ''}
                          onChange={(e) => {
                            const newSources = [...incomeSources];
                            newSources[index] = { ...newSources[index], field_3: e.target.value };
                            setIncomeSources(newSources);
                            updatePersonMutation.mutate({
                              custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                            });
                          }}
                          placeholder=""
                          className="h-8 bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">שדה 4</Label>
                        <Input 
                          value={income.field_4 || ''}
                          onChange={(e) => {
                            const newSources = [...incomeSources];
                            newSources[index] = { ...newSources[index], field_4: e.target.value };
                            setIncomeSources(newSources);
                            updatePersonMutation.mutate({
                              custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                            });
                          }}
                          placeholder=""
                          className="h-8 bg-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">משכורת חודש ראשון</Label>
                        <Input 
                          value={income.month_1_salary ? parseFloat(income.month_1_salary).toLocaleString('he-IL') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '');
                            const newSources = [...incomeSources];
                            newSources[index] = { ...newSources[index], month_1_salary: value };
                            setIncomeSources(newSources);
                            updatePersonMutation.mutate({
                              custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                            });
                          }}
                          placeholder="0"
                          className="h-8 bg-white"
                          />
                          </div>
                          <div>
                          <Label className="text-xs">משכורת חודש שני</Label>
                        <Input 
                          value={income.month_2_salary ? parseFloat(income.month_2_salary).toLocaleString('he-IL') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '');
                            const newSources = [...incomeSources];
                            newSources[index] = { ...newSources[index], month_2_salary: value };
                            setIncomeSources(newSources);
                            updatePersonMutation.mutate({
                              custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                            });
                          }}
                          placeholder="0"
                          className="h-8 bg-white"
                          />
                          </div>
                          <div>
                          <Label className="text-xs">משכורת חודש שלישי</Label>
                        <Input 
                          value={income.month_3_salary ? parseFloat(income.month_3_salary).toLocaleString('he-IL') : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '');
                            const newSources = [...incomeSources];
                            newSources[index] = { ...newSources[index], month_3_salary: value };
                            setIncomeSources(newSources);
                            updatePersonMutation.mutate({
                              custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                            });
                          }}
                          placeholder="0"
                          className="h-8 bg-white"
                          />
                          </div>
                          <div>
                          <Label className="text-xs">ממוצע 3 חודשים</Label>
                        <Input 
                          value={(() => {
                            const month1 = parseFloat(income.month_1_salary) || 0;
                            const month2 = parseFloat(income.month_2_salary) || 0;
                            const month3 = parseFloat(income.month_3_salary) || 0;
                            if (month1 === 0 && month2 === 0 && month3 === 0) return '';
                            const avg = Math.round((month1 + month2 + month3) / 3);
                            return avg.toLocaleString('he-IL');
                          })()}
                          readOnly
                          placeholder="0"
                          className="h-8 bg-blue-50 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">סכום הכנסה חודשית</Label>
                      <Input 
                        value={income.monthly_amount ? parseFloat(income.monthly_amount).toLocaleString('he-IL') : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, '');
                          const newSources = [...incomeSources];
                          newSources[index] = { ...newSources[index], monthly_amount: value };
                          setIncomeSources(newSources);
                          updatePersonMutation.mutate({
                            custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                          });
                        }}
                        placeholder="0"
                        className="h-8 bg-white"
                        />
                        </div>
                        </div>
                        )}
                        </div>
                        ))}

                        <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-2 border-green-300 bg-green-50 rounded-lg px-4 py-2">
                <Label className="text-sm font-bold whitespace-nowrap">סך ההכנסות המשוקלל:</Label>
                <span className="text-lg font-bold text-green-700">
                  {incomeSources.reduce((total, income) => {
                    if (income.type === 'תלוש משכורת-שכיר') {
                      const month1 = parseFloat(income.month_1_salary) || 0;
                      const month2 = parseFloat(income.month_2_salary) || 0;
                      const month3 = parseFloat(income.month_3_salary) || 0;
                      const avg = (month1 + month2 + month3) / 3;
                      return total + avg;
                    } else {
                      return total + (parseFloat(income.monthly_amount) || 0);
                    }
                  }, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪
                </span>
              </div>
              <Label className="text-sm font-medium whitespace-nowrap">הוסף מקור הכנסה</Label>
              <Select onValueChange={(value) => {
                const newSource = { type: value };
                const newSources = [...incomeSources, newSource];
                setIncomeSources(newSources);
                updatePersonMutation.mutate({
                  custom_data: { ...(person?.custom_data || {}), income_sources: newSources }
                });
              }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="בחר מקור הכנסה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="תלוש משכורת-שכיר">תלוש משכורת-שכיר</SelectItem>
                  <SelectItem value="עצמאי-עוסק מורשה">עצמאי-עוסק מורשה</SelectItem>
                  <SelectItem value="עצמאי-עוסק פטור">עצמאי-עוסק פטור</SelectItem>
                  <SelectItem value="שכיר בעל שליטה">שכיר בעל שליטה</SelectItem>
                  <SelectItem value="מלגת כולל">מלגת כולל</SelectItem>
                  <SelectItem value="קצבה">קצבה</SelectItem>
                  <SelectItem value="פנסיה">פנסיה</SelectItem>
                  <SelectItem value="השכרת נכס">השכרת נכס</SelectItem>
                  <SelectItem value="דיבידנדים">דיבידנדים</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Tab Content: Obligations */}
        {activeTab === 'obligations' && (
          <div className="p-6 space-y-4 bg-rose-50 border-2 border-rose-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px' }}>
            {obligations.map((obligation, index) => (
              <div key={index} className="border-2 border-red-200 rounded-lg p-4 bg-red-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    {obligation.type}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => {
                      const newObligations = obligations.filter((_, i) => i !== index);
                      setObligations(newObligations);
                      updatePersonMutation.mutate({
                        custom_data: { ...(person?.custom_data || {}), obligations: newObligations }
                      });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">שם המוסד</Label>
                    <Input 
                      value={obligation.institution_name || ''}
                      onChange={(e) => {
                        const newObligations = [...obligations];
                        newObligations[index] = { ...newObligations[index], institution_name: e.target.value };
                        setObligations(newObligations);
                        
                        if (obligationsTimeoutRef.current) {
                          clearTimeout(obligationsTimeoutRef.current);
                        }
                        obligationsTimeoutRef.current = setTimeout(() => {
                          updatePersonMutation.mutate({
                            custom_data: { ...(person?.custom_data || {}), obligations: newObligations }
                          });
                        }, 1000);
                      }}
                      placeholder="שם הבנק/מוסד"
                      className="h-8 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">סכום יתרה</Label>
                    <Input 
                      value={obligation.balance ? parseFloat(obligation.balance).toLocaleString('he-IL') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        const newObligations = [...obligations];
                        newObligations[index] = { ...newObligations[index], balance: value };
                        setObligations(newObligations);
                        
                        if (obligationsTimeoutRef.current) {
                          clearTimeout(obligationsTimeoutRef.current);
                        }
                        obligationsTimeoutRef.current = setTimeout(() => {
                          updatePersonMutation.mutate({
                            custom_data: { ...(person?.custom_data || {}), obligations: newObligations }
                          });
                        }, 1000);
                      }}
                      placeholder="0"
                      className="h-8 bg-white"
                      />
                      </div>
                      <div>
                      <Label className="text-xs">החזר חודשי</Label>
                    <Input 
                      value={obligation.monthly_payment ? parseFloat(obligation.monthly_payment).toLocaleString('he-IL') : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        const newObligations = [...obligations];
                        newObligations[index] = { ...newObligations[index], monthly_payment: value };
                        setObligations(newObligations);
                        
                        if (obligationsTimeoutRef.current) {
                          clearTimeout(obligationsTimeoutRef.current);
                        }
                        obligationsTimeoutRef.current = setTimeout(() => {
                          updatePersonMutation.mutate({
                            custom_data: { ...(person?.custom_data || {}), obligations: newObligations }
                          });
                        }, 1000);
                      }}
                      placeholder="0"
                      className="h-8 bg-white"
                      />
                      </div>
                      <div>
                      <Label className="text-xs">הערות</Label>
                    <Input 
                      value={obligation.notes || ''}
                      onChange={(e) => {
                        const newObligations = [...obligations];
                        newObligations[index] = { ...newObligations[index], notes: e.target.value };
                        setObligations(newObligations);
                        
                        if (obligationsTimeoutRef.current) {
                          clearTimeout(obligationsTimeoutRef.current);
                        }
                        obligationsTimeoutRef.current = setTimeout(() => {
                          updatePersonMutation.mutate({
                            custom_data: { ...(person?.custom_data || {}), obligations: newObligations }
                          });
                        }, 1000);
                      }}
                      placeholder="הערות"
                      className="h-8 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border-2 border-red-300 bg-red-50 rounded-lg px-4 py-2">
                <Label className="text-sm font-bold whitespace-nowrap">סך התחייבויות חודשיות:</Label>
                <span className="text-lg font-bold text-red-700">
                  {obligations.reduce((total, obligation) => {
                    return total + (parseFloat(obligation.monthly_payment) || 0);
                  }, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪
                </span>
              </div>
              <Label className="text-sm font-medium whitespace-nowrap">הוסף התחייבות</Label>
              <Select onValueChange={(value) => {
                const newObligation = { type: value };
                const newObligations = [...obligations, newObligation];
                setObligations(newObligations);
                updatePersonMutation.mutate({
                  custom_data: { ...(person?.custom_data || {}), obligations: newObligations }
                });
              }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="בחר סוג התחייבות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הלוואה בנקאית">הלוואה בנקאית</SelectItem>
                  <SelectItem value="משכנתא">משכנתא</SelectItem>
                  <SelectItem value="הלוואה מגוף פיננסי">הלוואה מגוף פיננסי</SelectItem>
                  <SelectItem value="כרטיס אשראי">כרטיס אשראי</SelectItem>
                  <SelectItem value="חוב פרטי">חוב פרטי</SelectItem>
                  <SelectItem value="מזונות">מזונות</SelectItem>
                  <SelectItem value="ליסינג">ליסינג</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Tab Content: Properties */}
        {activeTab === 'properties' && (
          <div className="p-6 bg-purple-50 border-2 border-purple-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">נכסים</h2>
          <div className="flex gap-2">
            <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-teal-200 hover:border-teal-400">
                  <LinkIcon className="w-4 h-4 ml-2" />
                  שייך נכס קיים
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>בחר נכס לשיוך</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="חיפוש לפי כתובת או עיר..."
                    value={propertySearchTerm}
                    onChange={(e) => setPropertySearchTerm(e.target.value)}
                  />
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredProperties.map(property => (
                      <div
                        key={property.id}
                        className="p-4 border rounded-lg hover:bg-teal-50 cursor-pointer transition-colors"
                        onClick={() => {
                          const updatedProperties = [...linkedProperties, property.id];
                          setLinkedProperties(updatedProperties);
                          updatePersonMutation.mutate({ linked_properties: updatedProperties });
                          setPropertyDialogOpen(false);
                          setPropertySearchTerm('');
                        }}
                      >
                        <p className="font-semibold text-gray-900">{property.address}</p>
                        <p className="text-sm text-gray-500">{property.city} • {property.property_type}</p>
                      </div>
                    ))}
                    {filteredProperties.length === 0 && (
                      <p className="text-center text-gray-500 py-8">לא נמצאו נכסים</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={() => setCreatePropertyDialogOpen(true)} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              נכס חדש
            </Button>
          </div>
        </div>
        
        {linkedPropertiesData.length === 0 ? (
          <p className="text-center text-gray-500 py-8">אין נכסים משויכים</p>
        ) : (
          <div className="space-y-4">
            {linkedPropertiesData.map((property, index) => {
              const updateField = (fieldName, value) => {
                const data = { [fieldName]: value };
                if (['size_sqm', 'rooms', 'floor', 'price'].includes(fieldName)) {
                  data[fieldName] = value ? Number(value) : undefined;
                }
                base44.entities.PropertyAsset.update(property.id, data).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['all-properties'] });
                });
              };

              return (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>כתובת</Label>
                      <Input
                        value={property.address || ''}
                        onChange={(e) => updateField('address', e.target.value)}
                        className="font-semibold"
                      />
                    </div>
                    <div>
                      <Label>עיר</Label>
                      <Input
                        value={property.city || ''}
                        onChange={(e) => updateField('city', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>סוג נכס</Label>
                      <select
                        value={property.property_type || 'דירה'}
                        onChange={(e) => updateField('property_type', e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="דירה">דירה</option>
                        <option value="בית">בית</option>
                        <option value="דירת גן">דירת גן</option>
                        <option value="פנטהאוז">פנטהאוז</option>
                        <option value="משרד">משרד</option>
                        <option value="חנות">חנות</option>
                        <option value="מחסן">מחסן</option>
                        <option value="קרקע">קרקע</option>
                        <option value="אחר">אחר</option>
                      </select>
                    </div>
                    <div>
                      <Label>סטטוס</Label>
                      <select
                        value={property.status || 'פנוי'}
                        onChange={(e) => updateField('status', e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="פנוי">פנוי</option>
                        <option value="תפוס">תפוס</option>
                        <option value="להשכרה">להשכרה</option>
                        <option value="למכירה">למכירה</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label>שטח (מ"ר)</Label>
                      <Input
                        type="number"
                        value={property.size_sqm || ''}
                        onChange={(e) => updateField('size_sqm', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>מספר חדרים</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={property.rooms || ''}
                        onChange={(e) => updateField('rooms', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>קומה</Label>
                      <Input
                        type="number"
                        value={property.floor || ''}
                        onChange={(e) => updateField('floor', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>מחיר (₪)</Label>
                    <Input
                      type="number"
                      value={property.price || ''}
                      onChange={(e) => updateField('price', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label>שם בעלים</Label>
                      <Input
                        value={property.owner_name || ''}
                        onChange={(e) => updateField('owner_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>טלפון בעלים</Label>
                      <Input
                        value={property.owner_phone || ''}
                        onChange={(e) => updateField('owner_phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label>הערות</Label>
                    <Textarea
                      value={property.notes || ''}
                      onChange={(e) => updateField('notes', e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Transactions for this property */}
                  {(() => {
                    const propertyTransactions = allTransactions.filter(t => t.property_id === property.id);
                    const typeLabels = {
                      purchase: 'רכישה',
                      sale: 'מכירה',
                      rent: 'השכרה',
                      lease: 'חכירה',
                      other: 'אחר'
                    };
                    const statusLabels = {
                      pending: 'בתהליך',
                      completed: 'הושלם',
                      cancelled: 'בוטל'
                    };

                    return (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-900">עסקאות</h4>
                          <Button
                            size="sm"
                            onClick={() => {
                              createTransactionMutation.mutate({
                                property_id: property.id,
                                transaction_type: 'purchase',
                                transaction_date: new Date().toISOString().split('T')[0],
                                amount: null,
                                buyer_name: '',
                                seller_name: '',
                                status: 'pending',
                                commission: null,
                                notes: ''
                              });
                            }}
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="w-3 h-3 ml-1" />
                            עסקה חדשה
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {propertyTransactions.map((transaction, index) => (
                            <div key={transaction.id} className="p-3 bg-gradient-to-br from-blue-50/50 to-white border-2 border-blue-200 rounded-xl">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-xs font-semibold text-gray-700">עסקה #{index + 1} - {typeLabels[transaction.transaction_type]}</h5>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm('האם למחוק עסקה זו?')) {
                                      deleteTransactionMutation.mutate(transaction.id);
                                    }
                                  }}
                                  className="h-6 w-6 text-red-600 hover:text-red-800 hover:bg-red-100"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">סוג עסקה</Label>
                                  <Select 
                                    value={transaction.transaction_type} 
                                    onValueChange={(val) => {
                                      updateTransactionMutation.mutate({ 
                                        id: transaction.id, 
                                        data: { ...transaction, transaction_type: val }
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(typeLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">תאריך</Label>
                                  <Input
                                    type="date"
                                    className="h-8"
                                    value={transaction.transaction_date || ''}
                                    onChange={(e) => {
                                      updateTransactionMutation.mutate({ 
                                        id: transaction.id, 
                                        data: { ...transaction, transaction_date: e.target.value }
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">סטטוס</Label>
                                  <Select 
                                    value={transaction.status} 
                                    onValueChange={(val) => {
                                      updateTransactionMutation.mutate({ 
                                        id: transaction.id, 
                                        data: { ...transaction, status: val }
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(statusLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <Label className="text-xs">קונה</Label>
                                  <Input
                                    className="h-8"
                                    value={transaction.buyer_name || ''}
                                    onChange={(e) => {
                                      updateTransactionMutation.mutate({ 
                                        id: transaction.id, 
                                        data: { ...transaction, buyer_name: e.target.value }
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">מוכר</Label>
                                  <Input
                                    className="h-8"
                                    value={transaction.seller_name || ''}
                                    onChange={(e) => {
                                      updateTransactionMutation.mutate({ 
                                        id: transaction.id, 
                                        data: { ...transaction, seller_name: e.target.value }
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <Label className="text-xs">סכום</Label>
                                  <Input
                                    className="h-8"
                                    type="number"
                                    value={transaction.amount || ''}
                                    onChange={(e) => {
                                      updateTransactionMutation.mutate({ 
                                        id: transaction.id, 
                                        data: { ...transaction, amount: e.target.value ? parseFloat(e.target.value) : null }
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">עמלה</Label>
                                  <Input
                                    className="h-8"
                                    type="number"
                                    value={transaction.commission || ''}
                                    onChange={(e) => {
                                      updateTransactionMutation.mutate({ 
                                        id: transaction.id, 
                                        data: { ...transaction, commission: e.target.value ? parseFloat(e.target.value) : null }
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="mt-3">
                                <Label className="text-xs">הערות</Label>
                                <Textarea
                                  className="text-sm"
                                  value={transaction.notes || ''}
                                  onChange={(e) => {
                                    updateTransactionMutation.mutate({ 
                                      id: transaction.id, 
                                      data: { ...transaction, notes: e.target.value }
                                    });
                                  }}
                                  rows={2}
                                />
                              </div>
                            </div>
                          ))}
                          {propertyTransactions.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm">
                              אין עסקאות - לחץ על "עסקה חדשה" כדי להתחיל
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              );
            })}
          </div>
        )}
          </div>
        )}
      </div>

      {/* Create Property Dialog */}
      <Dialog open={createPropertyDialogOpen} onOpenChange={setCreatePropertyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>נכס חדש</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const data = {
              ...propertyFormData,
              size_sqm: propertyFormData.size_sqm ? Number(propertyFormData.size_sqm) : undefined,
              rooms: propertyFormData.rooms ? Number(propertyFormData.rooms) : undefined,
              floor: propertyFormData.floor ? Number(propertyFormData.floor) : undefined,
              price: propertyFormData.price ? Number(propertyFormData.price) : undefined
            };
            createPropertyMutation.mutate(data);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>כתובת *</Label>
                <Input
                  value={propertyFormData.address}
                  onChange={(e) => setPropertyFormData({...propertyFormData, address: e.target.value})}
                  required
                  placeholder="רחוב ומספר בית"
                />
              </div>
              <div>
                <Label>עיר *</Label>
                <Input
                  value={propertyFormData.city}
                  onChange={(e) => setPropertyFormData({...propertyFormData, city: e.target.value})}
                  required
                  placeholder="שם העיר"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג נכס *</Label>
                <select
                  value={propertyFormData.property_type}
                  onChange={(e) => setPropertyFormData({...propertyFormData, property_type: e.target.value})}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background"
                  required
                >
                  <option value="דירה">דירה</option>
                  <option value="בית">בית</option>
                  <option value="דירת גן">דירת גן</option>
                  <option value="פנטהאוז">פנטהאוז</option>
                  <option value="משרד">משרד</option>
                  <option value="חנות">חנות</option>
                  <option value="מחסן">מחסן</option>
                  <option value="קרקע">קרקע</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>
              <div>
                <Label>סטטוס</Label>
                <select
                  value={propertyFormData.status}
                  onChange={(e) => setPropertyFormData({...propertyFormData, status: e.target.value})}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background"
                >
                  <option value="פנוי">פנוי</option>
                  <option value="תפוס">תפוס</option>
                  <option value="להשכרה">להשכרה</option>
                  <option value="למכירה">למכירה</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>שטח (מ"ר)</Label>
                <Input
                  type="number"
                  value={propertyFormData.size_sqm}
                  onChange={(e) => setPropertyFormData({...propertyFormData, size_sqm: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>מספר חדרים</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={propertyFormData.rooms}
                  onChange={(e) => setPropertyFormData({...propertyFormData, rooms: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>קומה</Label>
                <Input
                  type="number"
                  value={propertyFormData.floor}
                  onChange={(e) => setPropertyFormData({...propertyFormData, floor: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label>מחיר (₪)</Label>
              <Input
                type="number"
                value={propertyFormData.price}
                onChange={(e) => setPropertyFormData({...propertyFormData, price: e.target.value})}
                placeholder="0"
              />
            </div>

            <div>
              <Label>הערות</Label>
              <Input
                value={propertyFormData.notes}
                onChange={(e) => setPropertyFormData({...propertyFormData, notes: e.target.value})}
                placeholder="הערות נוספות על הנכס..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreatePropertyDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={createPropertyMutation.isPending}>
                צור ושייך
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}