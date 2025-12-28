import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function PersonDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [basicData, setBasicData] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    phone: '',
    email: '',
    notes: ''
  });

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => base44.entities.Person.filter({ id: personId }).then(res => res[0]),
    enabled: !!personId
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['all-accounts'],
    queryFn: () => base44.entities.MortgageCase.list('-created_date')
  });

  const accounts = allAccounts.filter(c => !c.is_archived && !c.module_id);

  const linkedAccountsData = allAccounts.filter(acc => 
    linkedAccounts.includes(acc.id)
  );

  const updatePersonMutation = useMutation({
    mutationFn: (data) => base44.entities.Person.update(personId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
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
    
    // Auto-save custom fields
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
        notes: person.notes || ''
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
      }
    }
  }, [person]);

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="h-full bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">איש קשר לא נמצא</h2>
          <Link to={createPageUrl('ArchiveAccounts')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לאנשי קשר
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50/50 p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <Input
                    value={basicData.first_name}
                    onChange={(e) => handleBasicDataChange('first_name', e.target.value)}
                    placeholder="שם פרטי"
                    className="text-xl font-bold"
                  />
                  <Input
                    value={basicData.last_name}
                    onChange={(e) => handleBasicDataChange('last_name', e.target.value)}
                    placeholder="שם משפחה"
                    className="text-xl font-bold"
                  />
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                      <LinkIcon className="w-4 h-4 ml-2" />
                      שייך לחשבון
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>בחר חשבון לשיוך</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
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
              </div>
              {linkedAccountsData.length > 0 && (
                <div className="mt-2 space-y-2">
                  {linkedAccountsData.map(account => (
                    <div key={account.id} className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <Link to={createPageUrl('CaseDetails') + `?id=${account.id}`} className="text-sm text-green-800 hover:underline flex-1">
                        <span className="font-semibold">משויך לחשבון:</span> {account.client_name} (מס׳ {account.account_number})
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkAccount(account.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b">
            <div>
              <Label className="text-sm">תעודת זהות</Label>
              <Input
                value={basicData.id_number}
                onChange={(e) => handleBasicDataChange('id_number', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">טלפון</Label>
              <Input
                value={basicData.phone}
                onChange={(e) => handleBasicDataChange('phone', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">אימייל</Label>
              <Input
                type="email"
                value={basicData.email}
                onChange={(e) => handleBasicDataChange('email', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">הערות</Label>
              <Input
                value={basicData.notes}
                onChange={(e) => handleBasicDataChange('notes', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Custom Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">שדות מותאמים אישית</h2>
            </div>

            {/* Add New Field */}
            <div className="flex gap-2">
              <Input
                placeholder="שם השדה החדש..."
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddField()}
              />
              <Button 
                onClick={handleAddField}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף שדה
              </Button>
            </div>

            {/* Custom Fields List */}
            {customFields.length > 0 && (
              <div className="space-y-3 mt-4">
                {customFields.map((field) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-1">{field.name}</Label>
                      <Input
                        value={field.value}
                        onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                        placeholder={`הכנס ערך ל-${field.name}...`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}