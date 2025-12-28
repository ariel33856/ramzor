import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PersonDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
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
    setCustomFields(customFields.map(f => 
      f.id === fieldId ? { ...f, value } : f
    ));
  };

  const handleSaveBasicData = () => {
    updatePersonMutation.mutate(basicData);
  };

  const handleSave = () => {
    const customData = {};
    customFields.forEach(field => {
      customData[field.name] = field.value;
    });
    updatePersonMutation.mutate({ custom_data: customData });
  };

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
    <div className="h-full bg-gray-50/50 overflow-auto p-2">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-2">{person.type}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={basicData.first_name}
                  onChange={(e) => setBasicData({...basicData, first_name: e.target.value})}
                  placeholder="שם פרטי"
                  className="text-xl font-bold"
                />
                <Input
                  value={basicData.last_name}
                  onChange={(e) => setBasicData({...basicData, last_name: e.target.value})}
                  placeholder="שם משפחה"
                  className="text-xl font-bold"
                />
              </div>
            </div>
            <Link to={createPageUrl('ArchiveAccounts')}>
              <Button variant="outline">
                <ArrowRight className="w-4 h-4 ml-2" />
                חזרה
              </Button>
            </Link>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b">
            <div>
              <Label className="text-sm">תעודת זהות</Label>
              <Input
                value={basicData.id_number}
                onChange={(e) => setBasicData({...basicData, id_number: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">טלפון</Label>
              <Input
                value={basicData.phone}
                onChange={(e) => setBasicData({...basicData, phone: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">אימייל</Label>
              <Input
                type="email"
                value={basicData.email}
                onChange={(e) => setBasicData({...basicData, email: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm">הערות</Label>
              <Input
                value={basicData.notes}
                onChange={(e) => setBasicData({...basicData, notes: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                onClick={handleSaveBasicData}
                disabled={updatePersonMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {updatePersonMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור פרטים בסיסיים'
                )}
              </Button>
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

            {customFields.length > 0 && (
              <Button
                onClick={handleSave}
                disabled={updatePersonMutation.isPending}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {updatePersonMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור שדות'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}