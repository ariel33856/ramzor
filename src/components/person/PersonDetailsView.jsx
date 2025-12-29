import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function PersonDetailsView({ personId }) {
  const queryClient = useQueryClient();
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCollapsed1_5, setIsCollapsed1_5] = useState(false);
  const [isCollapsed2, setIsCollapsed2] = useState(false);
  const [relationshipType, setRelationshipType] = useState('לווה');
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
      queryClient.invalidateQueries({ queryKey: ['linked-contacts'] });
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
            <Label className="text-sm font-medium whitespace-nowrap">שם פרטי</Label>
            <Input
              value={basicData.first_name}
              onChange={(e) => handleBasicDataChange('first_name', e.target.value)}
              placeholder="שם פרטי"
              className="text-xl font-bold w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">שם משפחה</Label>
            <Input
              value={basicData.last_name}
              onChange={(e) => handleBasicDataChange('last_name', e.target.value)}
              placeholder="שם משפחה"
              className="text-xl font-bold w-64"
            />
          </div>
        </div>
        <div className="mr-auto flex items-center gap-2">
          {linkedAccountsData.length > 0 ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 whitespace-nowrap">
                    {relationshipType ? `זיקה לחשבון: ${relationshipType}` : 'זיקה לחשבון'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-center" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
                  <DropdownMenuItem onClick={() => setRelationshipType('לווה')} className="justify-center">לווה</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRelationshipType('ערב')} className="justify-center">ערב</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRelationshipType('ערב ממשכן')} className="justify-center">ערב ממשכן</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRelationshipType('בן/בת זוג')} className="justify-center">בן/בת זוג</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {linkedAccountsData.map(account => (
                <div key={account.id} className="flex items-center gap-0">
                  <Link to={createPageUrl('CaseDetails') + `?id=${account.id}`}>
                    <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 whitespace-nowrap rounded-l-none">
                      חשבון משויך: {account.client_name} ({account.account_number})
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
          <Link to={createPageUrl('PersonDetails') + `?id=${personId}`} className="w-full">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 whitespace-nowrap w-full">
              להצגה במודול אנשי קשר
            </Button>
          </Link>
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
          <Label className="text-sm whitespace-nowrap">מס' תעודת זהות</Label>
          <Input
            value={basicData.id_number}
            onChange={(e) => handleBasicDataChange('id_number', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">תאריך לידה</Label>
          <Input
            value={basicData.phone}
            onChange={(e) => handleBasicDataChange('phone', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">תאריך הנפקת ת.ז.</Label>
          <Input
            type="email"
            value={basicData.email}
            onChange={(e) => handleBasicDataChange('email', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">תוקף ת.ז.</Label>
          <Input
            value={basicData.notes}
            onChange={(e) => handleBasicDataChange('notes', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">אזרחות ישראלית</Label>
          <Input />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">אזרחות אחרת</Label>
          <Input />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">מיקרוד</Label>
          <Input />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">מצב משפחתי</Label>
          <Input />
        </div>
      </div>


        </div>
      )}
      </div>

      {/* New Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => setIsCollapsed1_5(!isCollapsed1_5)}
          className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 transition-colors border-b"
        >
          {isCollapsed1_5 ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          )}
          <h2 className="text-lg font-bold text-gray-900">כרטיסיה חדשה</h2>
        </button>

        {/* Content */}
        {!isCollapsed1_5 && (
          <div className="p-6">
            <p className="text-gray-600">תוכן הכרטיסיה...</p>
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
          <h2 className="text-lg font-bold text-gray-900">כרטיסיה נוספת</h2>
        </button>

        {/* Content */}
        {!isCollapsed2 && (
          <div className="p-6">
            <p className="text-gray-600">תוכן הכרטיסיה השנייה...</p>
          </div>
        )}
      </div>
    </div>
  );
}