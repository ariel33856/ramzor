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
import CommunicationHub from '../case/CommunicationHub';
import personTabDefs from './personTabDefs';
import { SecureEntities } from '@/components/secureEntities';
import PersonPropertiesTab from './PersonPropertiesTab';


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

  const [activeTab, setActiveTab] = useState(() => window._sharedPersonTab || 'documentation');
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
  const [spouseObligationsDialogOpen, setSpouseObligationsDialogOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState('');
  const [education, setEducation] = useState('');
  const [documentationRecords, setDocumentationRecords] = useState([]);
  const obligationsTimeoutRef = React.useRef(null);
  const basicDataTimeoutRef = React.useRef(null);
  const customDataTimeoutRef = React.useRef(null);
  const latestCustomDataRef = React.useRef(null);



  const { data: person, isLoading } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => SecureEntities.Person.filter({ id: personId }).then(res => res[0]),
    enabled: !!personId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['all-accounts'],
    queryFn: () => SecureEntities.MortgageCase.list('-created_date'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: allProperties = [] } = useQuery({
    queryKey: ['all-properties'],
    queryFn: () => SecureEntities.PropertyAsset.list('-created_date'),
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
      return SecureEntities.Person.filter({ 
        is_archived: false,
        created_by: currentUser.email 
      });
    },
    enabled: spouseDialogOpen && !!currentUser,
    staleTime: 5 * 60 * 1000
  });

  const { data: linkedSpouse } = useQuery({
    queryKey: ['spouse', spouseId],
    queryFn: () => SecureEntities.Person.filter({ id: spouseId }).then(res => res[0]),
    enabled: !!spouseId
  });



  const accounts = allAccounts.filter(c => !c.is_archived && !c.module_id);
  const linkedAccountsData = allAccounts.filter(acc => 
    linkedAccounts.some(link => 
      typeof link === 'string' ? link === acc.id : link.case_id === acc.id
    )
  );



  const updatePersonMutation = useMutation({
    mutationFn: async (data) => {
      // Normalize linked_accounts if present in the update data
      if (data.linked_accounts && Array.isArray(data.linked_accounts)) {
        data.linked_accounts = data.linked_accounts.map(acc => 
          typeof acc === 'string' 
            ? { case_id: acc, relationship_type: 'לווה' }
            : acc
        );
      }
      
      return SecureEntities.Person.update(personId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['all-properties'] });
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
    saveCustomData(customData);
  };

  const handleBasicDataChange = (field, value) => {
    setBasicData(prev => ({ ...prev, [field]: value }));
    
    if (basicDataTimeoutRef.current) {
      clearTimeout(basicDataTimeoutRef.current);
    }
    basicDataTimeoutRef.current = setTimeout(() => {
      updatePersonMutation.mutate({ [field]: value });
    }, 800);
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



  // Helper to save custom_data with debounce - always reads fresh from server
  const saveCustomData = React.useCallback((customDataPatch) => {
    if (customDataTimeoutRef.current) {
      clearTimeout(customDataTimeoutRef.current);
    }
    // Merge patches
    latestCustomDataRef.current = {
      ...(latestCustomDataRef.current || {}),
      ...customDataPatch
    };
    const mergedPatch = latestCustomDataRef.current;
    
    customDataTimeoutRef.current = setTimeout(async () => {
      const freshPerson = await base44.entities.Person.filter({ id: personId }).then(res => res[0]);
      const freshCustomData = freshPerson?.custom_data || {};
      const mergedCustomData = { ...freshCustomData, ...mergedPatch };
      
      // Handle nested id_upload_data merge
      if (mergedPatch.id_upload_data && freshCustomData.id_upload_data) {
        mergedCustomData.id_upload_data = {
          ...freshCustomData.id_upload_data,
          ...mergedPatch.id_upload_data
        };
      }
      
      // Normalize linked_accounts to prevent validation errors
      const updateData = { custom_data: mergedCustomData };
      if (freshPerson?.linked_accounts && Array.isArray(freshPerson.linked_accounts)) {
        updateData.linked_accounts = freshPerson.linked_accounts.map(acc => 
          typeof acc === 'string' 
            ? { case_id: acc, relationship_type: 'לווה' }
            : acc
        );
      }
      
      await base44.entities.Person.update(personId, updateData);
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      latestCustomDataRef.current = null;
    }, 300);
  }, [personId, queryClient]);

  React.useEffect(() => {
    // Check if there's a tab parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (window._sharedPersonTab) {
      setActiveTab(window._sharedPersonTab);
    }
  }, []);

  React.useEffect(() => {
    window._sharedPersonTab = activeTab;
  }, [activeTab]);

  // Sync tab when this contact becomes visible (switching between contacts)
  React.useEffect(() => {
    const handler = () => {
      if (window._sharedPersonTab && window._sharedPersonTab !== activeTab) {
        setActiveTab(window._sharedPersonTab);
      }
    };
    window.addEventListener('syncPersonTab', handler);
    return () => window.removeEventListener('syncPersonTab', handler);
  }, [activeTab]);

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

        // Load health status and education from custom_data
        if (person.custom_data.health_status) {
          setHealthStatus(person.custom_data.health_status);
        }
        if (person.custom_data.education) {
          setEducation(person.custom_data.education);
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
            const tabDefs = personTabDefs;
            const activeTabDef = tabDefs.find(t => t.id === activeTab);
            const activeBottomBorder = activeTabDef?.bottomBorderColor || '';
            return tabDefs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 text-sm font-semibold rounded-t-lg border-2 ${
                  activeTab === tab.id
                    ? `${tab.activeText} ${tab.activeBg} ${tab.borderColor} border-b-0 relative z-10`
                    : `${tab.activeText} ${tab.activeBg} ${tab.borderColor} ${activeBottomBorder}`
                }`}
                style={activeTab === tab.id ? { marginBottom: '-2px', padding: '0.2rem 1rem' } : { marginBottom: '-2px', padding: '0.2rem 1rem' }}
              >
                {tab.label}
              </button>
            ));
          })()}
        </div>

        {/* Tab Content: General */}
        <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'general' ? 'block' : 'none' }}>
      <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">{personFields.phone}</Label>
          <Input
            value={basicData.phone}
            onChange={(e) => handleBasicDataChange('phone', e.target.value)}
            placeholder={personFields.phone}
            className="text-xl font-bold w-40"
          />
        </div>
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
      
      {additionalPhones.length > 0 && (
        <div className="flex gap-4 items-center flex-wrap mt-4">
          {additionalPhones.map((phone, index) => (
            <div key={index} className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">טלפון {index + 2}</Label>
              <Input
                value={phone}
                onChange={(e) => {
                  const newPhones = [...additionalPhones];
                  newPhones[index] = e.target.value;
                  setAdditionalPhones(newPhones);
                  saveCustomData({ additional_phones: newPhones });
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
                  saveCustomData({ additional_phones: newPhones });
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newPhones = [...additionalPhones, ''];
              setAdditionalPhones(newPhones);
              saveCustomData({ additional_phones: newPhones });
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      </div>

      <div className="bg-white border-2 border-blue-200 rounded-lg p-4 mt-6">
      <div className="flex items-start gap-2 flex-wrap">
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
                <div key={account.id} className="flex items-center gap-3 border-4 border-blue-600 rounded-lg p-3 shadow-xl bg-blue-50 ring-2 ring-blue-400">
                  <Button 
                    onClick={() => window.location.href = createPageUrl('CaseDetails') + `?id=${account.id}`}
                    className="whitespace-nowrap cursor-pointer bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold rounded-l-lg shadow-lg"
                  >
                    חשבון נוכחי: {account.client_name} {account.account_number}
                  </Button>
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
            ) : !isLoading && (
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
                onClick={() => {
                  // Get current case ID
                  const currentCaseId = new URLSearchParams(window.location.search).get('id');

                  // Check if spouse is linked to the current account
                  const isLinkedToCurrentAccount = linkedSpouse.linked_accounts?.some(link => 
                    typeof link === 'string' ? link === currentCaseId : link.case_id === currentCaseId
                  );

                  if (isLinkedToCurrentAccount && currentCaseId) {
                    // Navigate within CasePersonal - trigger contact change
                    if (window.changeCaseContact) {
                      window.changeCaseContact(spouseId);
                    }
                  } else {
                    // Navigate to PersonDetails (contacts module)
                    window.location.href = createPageUrl('PersonDetails') + `?id=${spouseId}`;
                  }
                }}
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
          </div>
          </div>
          </div>

          {/* Field 2 Panel */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-sm font-medium whitespace-nowrap">מצב בריאותי</Label>
          <Input
            value={basicData.field_2 || ''}
            onChange={(e) => handleBasicDataChange('field_2', e.target.value)}
            placeholder="שדה 2"
            className="text-xl font-bold w-40"
          />
          <Label className="text-sm font-medium whitespace-nowrap">דוח אשראי</Label>
          <Input
            value={basicData.credit_report || ''}
            onChange={(e) => handleBasicDataChange('credit_report', e.target.value)}
            placeholder="דוח אשראי"
            className="text-xl font-bold w-40"
          />
          <Label className="text-sm font-medium whitespace-nowrap">השכלה</Label>
          <Input
            value={basicData.additional_field || ''}
            onChange={(e) => handleBasicDataChange('additional_field', e.target.value)}
            placeholder="שדה נוסף"
            className="text-xl font-bold w-40"
          />
          <Label className="text-sm font-medium whitespace-nowrap">שדה נוסף 2</Label>
          <Input
            value={basicData.additional_field_2 || ''}
            onChange={(e) => handleBasicDataChange('additional_field_2', e.target.value)}
            placeholder="שדה נוסף 2"
            className="text-xl font-bold w-40"
          />
          </div>
          </div>
          </div>

          {/* Tab Content: Identity */}
          <div className="p-6 space-y-4 bg-amber-50 border-2 border-amber-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'identity' ? 'block' : 'none' }}>
            {/* Birth Info Section - Purple */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm whitespace-nowrap">שם פרטי</Label>
                <Input 
                  value={basicData.first_name}
                  onChange={(e) => handleBasicDataChange('first_name', e.target.value)}
                  placeholder="שם פרטי"
                  className="bg-white w-32 h-8"
                />
                <Label className="text-sm whitespace-nowrap">שם משפחה</Label>
                <Input 
                  value={basicData.last_name}
                  onChange={(e) => handleBasicDataChange('last_name', e.target.value)}
                  placeholder="שם משפחה"
                  className="bg-white w-32 h-8"
                />
                <Label className="text-sm whitespace-nowrap">תאריך לידה</Label>
                <Input 
                  value={person?.custom_data?.id_upload_data?.birth_date || person?.custom_data?.birth_date || ''} 
                  onChange={(e) => {
                    const value = e.target.value;
                    saveCustomData({ 
                      birth_date: value,
                      id_upload_data: {
                        ...(person?.custom_data?.id_upload_data || {}),
                        birth_date: value
                      }
                    });
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
                  // Save immediately without debounce
                  const freshPerson = await base44.entities.Person.filter({ id: personId }).then(res => res[0]);
                  const updateData = { 
                    custom_data: { ...(freshPerson?.custom_data || {}), gender: value }
                  };
                  // Normalize linked_accounts to prevent validation errors
                  if (freshPerson?.linked_accounts && Array.isArray(freshPerson.linked_accounts)) {
                    updateData.linked_accounts = freshPerson.linked_accounts.map(acc => 
                      typeof acc === 'string' 
                        ? { case_id: acc, relationship_type: 'לווה' }
                        : acc
                    );
                  }
                  await base44.entities.Person.update(personId, updateData);
                  queryClient.invalidateQueries({ queryKey: ['person', personId] });
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
                     saveCustomData({ num_siblings: value });
                   }
                 }}
                 className="w-12 text-center h-8 bg-white" 
                  />
                 </div>
                    </div>

                 {/* ID Details Section - Blue */}
                 <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                 <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm whitespace-nowrap">ת.ז</Label>
                  <Input 
                    value={basicData.id_number}
                    onChange={(e) => handleBasicDataChange('id_number', e.target.value)}
                    placeholder="מספר ת.ז"
                    className="bg-white w-28 h-8"
                  />
                  <Label className="text-sm whitespace-nowrap">תאריך הנפקה</Label>
                  <Input 
                    value={person?.custom_data?.id_upload_data?.id_issue_date || ''}
                    onChange={(e) => {
                      saveCustomData({ 
                        id_upload_data: {
                          ...(person?.custom_data?.id_upload_data || {}),
                          id_issue_date: e.target.value
                        }
                      });
                    }}
                    placeholder="DD-MM-YYYY"
                    className="bg-white w-28 h-8"
                  />
                  <Label className="text-sm whitespace-nowrap">תוקף</Label>
                  <Input 
                    value={person?.custom_data?.id_upload_data?.id_expiry_date || ''}
                    onChange={(e) => {
                      saveCustomData({ 
                        id_upload_data: {
                          ...(person?.custom_data?.id_upload_data || {}),
                          id_expiry_date: e.target.value
                        }
                      });
                    }}
                    placeholder="DD-MM-YYYY"
                    className="bg-white w-28 h-8"
                  />
                  <Label className="text-sm whitespace-nowrap">מעמד ישראלי</Label>
                  <Select 
                    value={person?.custom_data?.id_upload_data?.israeli_status || ''} 
                    onValueChange={(value) => {
                      saveCustomData({ 
                        id_upload_data: {
                          ...(person?.custom_data?.id_upload_data || {}),
                          israeli_status: value
                        }
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 bg-white w-auto min-w-32">
                      <SelectValue placeholder="בחר מעמד" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="אזרחות ישראלית">אזרחות ישראלית</SelectItem>
                      <SelectItem value="תושבות קבע">תושבות קבע</SelectItem>
                      <SelectItem value="תושבות ארעית">תושבות ארעית</SelectItem>
                      <SelectItem value="אשרת שהיה">אשרת שהיה</SelectItem>
                      <SelectItem value="ללא">ללא</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-sm whitespace-nowrap">אזרחות זרה</Label>
                  <Input 
                    value={person?.custom_data?.id_upload_data?.foreign_citizenship || ''}
                    onChange={(e) => {
                      saveCustomData({ 
                        id_upload_data: {
                          ...(person?.custom_data?.id_upload_data || {}),
                          foreign_citizenship: e.target.value
                        }
                      });
                    }}
                    placeholder=""
                    className="bg-white w-28 h-8"
                  />
                  <Label className="text-sm whitespace-nowrap">מס' דרכון</Label>
                  <Input 
                    value={person?.custom_data?.id_upload_data?.passport_number || ''}
                    onChange={(e) => {
                      saveCustomData({ 
                        id_upload_data: {
                          ...(person?.custom_data?.id_upload_data || {}),
                          passport_number: e.target.value
                        }
                      });
                    }}
                    placeholder=""
                    className="bg-white w-28 h-8"
                  />
                 </div>
                 </div>

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
                
                if (data.address) updates.address = data.address;
                if (data.building_number) updates.building_number = data.building_number;
                if (data.entrance) updates.entrance = data.entrance;
                if (data.apartment_number) updates.apartment_number = data.apartment_number;
                if (data.city) updates.residential_city = data.city;
                
                setBasicData(prev => ({ ...prev, ...updates }));
                if (data.gender) {
                  setGender(data.gender);
                  updates.custom_data = {
                    ...(person?.custom_data || {}),
                    gender: data.gender
                  };
                }
                
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
                 </div>

        {/* Tab Content: Income */}
        <div className="p-6 space-y-4 bg-lime-100 border-2 border-lime-800 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'income' ? 'block' : 'none' }}>
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

          {/* Tab Content: Obligations */}
          <div className="p-6 space-y-4 bg-rose-50 border-2 border-rose-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'obligations' ? 'block' : 'none' }}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">התחייבויות שלי</h2>
            {obligations.map((obligation, index) => (
             <div key={index} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50/30 space-y-3">
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

            <div className="flex items-center gap-2 border-2 border-red-300 bg-red-50 rounded-lg px-4 py-2">
              <Label className="text-sm font-bold whitespace-nowrap">סך התחייבויות חודשיות:</Label>
              <span className="text-lg font-bold text-red-700">
                {obligations.reduce((total, obligation) => {
                  return total + (parseFloat(obligation.monthly_payment) || 0);
                }, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪
              </span>
            </div>

            {spouseId && linkedSpouse && linkedSpouse?.custom_data?.obligations && linkedSpouse.custom_data.obligations.length > 0 && (
              <>
                <div className="border-t-2 border-rose-300 pt-6 mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    התחייבויות של {gender === 'male' ? 'בת הזוג' : 'בן הזוג'} {linkedSpouse.first_name} {linkedSpouse.last_name}
                  </h2>
                  <div className="space-y-4">
                    {linkedSpouse.custom_data.obligations.map((obligation, index) => (
                      <div key={index} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-900">
                            {obligation.type}
                          </h3>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">שם המוסד</Label>
                            <Input 
                              value={obligation.institution_name || ''}
                              readOnly
                              placeholder="שם הבנק/מוסד"
                              className="h-8 bg-gray-50"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">סכום יתרה</Label>
                            <Input 
                              value={obligation.balance ? parseFloat(obligation.balance).toLocaleString('he-IL') : ''}
                              readOnly
                              placeholder="0"
                              className="h-8 bg-gray-50"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">החזר חודשי</Label>
                            <Input 
                              value={obligation.monthly_payment ? parseFloat(obligation.monthly_payment).toLocaleString('he-IL') : ''}
                              readOnly
                              placeholder="0"
                              className="h-8 bg-gray-50"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">הערות</Label>
                            <Input 
                              value={obligation.notes || ''}
                              readOnly
                              placeholder="הערות"
                              className="h-8 bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 border-2 border-blue-300 bg-blue-50 rounded-lg px-4 py-2 mt-4">
                    <Label className="text-sm font-bold whitespace-nowrap">סך התחייבויות חודשיות של בן/בת הזוג:</Label>
                    <span className="text-lg font-bold text-blue-700">
                      {linkedSpouse.custom_data.obligations.reduce((total, obligation) => {
                        return total + (parseFloat(obligation.monthly_payment) || 0);
                      }, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪
                    </span>
                  </div>

                  <div className="flex items-center gap-2 border-2 border-purple-400 bg-purple-100 rounded-lg px-4 py-2 mt-4">
                    <Label className="text-sm font-bold whitespace-nowrap">סך התחייבויות חודשיות של שניכם יחד:</Label>
                    <span className="text-lg font-bold text-purple-800">
                      {(obligations.reduce((total, obligation) => {
                        return total + (parseFloat(obligation.monthly_payment) || 0);
                      }, 0) + linkedSpouse.custom_data.obligations.reduce((total, obligation) => {
                        return total + (parseFloat(obligation.monthly_payment) || 0);
                      }, 0)).toLocaleString('he-IL', { maximumFractionDigits: 0 })} ₪
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tab Content: Properties */}
          <div className="p-6 bg-purple-50 border-2 border-purple-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'properties' ? 'block' : 'none' }}>
            <PersonPropertiesTab 
              person={person} 
              personId={personId} 
              linkedProperties={linkedProperties} 
              setLinkedProperties={setLinkedProperties} 
              allProperties={allProperties} 
              updatePersonMutation={updatePersonMutation} 
            />
            </div>

            {/* Tab Content: Health & Education */}
          <div className="p-4 bg-cyan-50 border-2 border-cyan-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'health' ? 'block' : 'none' }}>
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
                
                if (data.address) updates.address = data.address;
                if (data.building_number) updates.building_number = data.building_number;
                if (data.entrance) updates.entrance = data.entrance;
                if (data.apartment_number) updates.apartment_number = data.apartment_number;
                if (data.city) updates.residential_city = data.city;
                
                setBasicData(prev => ({ ...prev, ...updates }));
                if (data.gender) {
                  setGender(data.gender);
                  updates.custom_data = {
                    ...(person?.custom_data || {}),
                    gender: data.gender
                  };
                }
                
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
          </div>

          {/* Tab Content: Documentation */}
          <div className="p-4 bg-green-100 border-2 border-green-400 rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'documentation' ? 'block' : 'none' }}>
            <CommunicationHub linkedContacts={person ? [person] : []} caseId={null} />
          </div>

          {/* Tab Content: Transactions */}
          <div className="p-6 bg-amber-50 border-2 border-black rounded-b-lg" style={{ minHeight: '80vh', marginTop: '-2px', display: activeTab === 'transactions' ? 'block' : 'none' }}>
            <div className="text-center py-12 text-gray-500">
              <p>עסקאות מוצגות בטאב נכסים</p>
            </div>
          </div>

           {/* Spouse Obligations Dialog */}
      <Dialog open={spouseObligationsDialogOpen} onOpenChange={setSpouseObligationsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>התחייבויות של {linkedSpouse?.first_name} {linkedSpouse?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {linkedSpouse?.custom_data?.obligations && linkedSpouse.custom_data.obligations.length > 0 ? (
              linkedSpouse.custom_data.obligations.map((obligation, index) => (
                <div key={index} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">
                      {obligation.type}
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">שם המוסד</Label>
                      <Input 
                        value={obligation.institution_name || ''}
                        readOnly
                        placeholder="שם הבנק/מוסד"
                        className="h-8 bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">סכום יתרה</Label>
                      <Input 
                        value={obligation.balance ? parseFloat(obligation.balance).toLocaleString('he-IL') : ''}
                        readOnly
                        placeholder="0"
                        className="h-8 bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">החזר חודשי</Label>
                      <Input 
                        value={obligation.monthly_payment ? parseFloat(obligation.monthly_payment).toLocaleString('he-IL') : ''}
                        readOnly
                        placeholder="0"
                        className="h-8 bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">הערות</Label>
                      <Input 
                        value={obligation.notes || ''}
                        readOnly
                        placeholder="הערות"
                        className="h-8 bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">אין התחייבויות</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}