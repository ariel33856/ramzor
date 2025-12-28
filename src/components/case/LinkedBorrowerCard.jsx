import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LinkedBorrowerCard({ borrower, caseId, onUnlink }) {
  const queryClient = useQueryClient();
  const { data: customFieldsData = [] } = useQuery({
    queryKey: ['custom-fields-borrower'],
    queryFn: () => base44.entities.CustomField.filter({ module_type: 'borrower' }, 'order')
  });
  
  // שימוש בנתונים מ-Person אם קיים, אחרת מ-MortgageCase
  const personData = borrower._person || {};
  
  const [editData, setEditData] = useState({
    first_name: personData.first_name || borrower.client_name || '',
    last_name: personData.last_name || borrower.last_name || '',
    id_number: personData.id_number || borrower.client_id || '',
    phone: personData.phone || borrower.client_phone || '',
    email: personData.email || borrower.client_email || '',
    ...(personData.custom_data || borrower.custom_data || {})
  });
  const timeoutRef = useRef(null);

  useEffect(() => {
    const personData = borrower._person || {};
    setEditData({
      first_name: personData.first_name || borrower.client_name || '',
      last_name: personData.last_name || borrower.last_name || '',
      id_number: personData.id_number || borrower.client_id || '',
      phone: personData.phone || borrower.client_phone || '',
      email: personData.email || borrower.client_email || '',
      ...(personData.custom_data || borrower.custom_data || {})
    });
  }, [borrower]);

  const updateBorrowerMutation = useMutation({
    mutationFn: async (data) => {
      // אם ללווה יש person_id, נעדכן את ה-Person
      if (borrower.person_id) {
        const personData = {
          first_name: data.first_name,
          last_name: data.last_name,
          id_number: data.id_number,
          phone: data.phone,
          email: data.email,
          custom_data: data.custom_data
        };
        await base44.entities.Person.update(borrower.person_id, personData);
      } else {
        // אם אין person_id, נעדכן את ה-MortgageCase ישירות
        const caseData = {
          client_name: data.first_name,
          last_name: data.last_name,
          client_id: data.id_number,
          client_phone: data.phone,
          client_email: data.email,
          custom_data: data.custom_data
        };
        await base44.entities.MortgageCase.update(borrower.id, caseData);
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['all-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['archive-cases'] });
      queryClient.invalidateQueries({ queryKey: ['archive-case', borrower.id] });
      queryClient.invalidateQueries({ queryKey: ['case'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const personData = borrower._person || {};
    const originalData = {
      first_name: personData.first_name || borrower.client_name || '',
      last_name: personData.last_name || borrower.last_name || '',
      id_number: personData.id_number || borrower.client_id || '',
      phone: personData.phone || borrower.client_phone || '',
      email: personData.email || borrower.client_email || '',
      ...(personData.custom_data || borrower.custom_data || {})
    };
    
    const hasChanges = JSON.stringify(editData) !== JSON.stringify(originalData);

    if (hasChanges) {
      timeoutRef.current = setTimeout(() => {
        // Separate custom fields from regular fields
        const customFieldIds = customFieldsData.map(f => f.field_id);
        const custom_data = {};
        const regularData = {};
        
        Object.keys(editData).forEach(key => {
          if (customFieldIds.includes(key)) {
            custom_data[key] = editData[key];
          } else {
            regularData[key] = editData[key];
          }
        });
        
        updateBorrowerMutation.mutate({ ...regularData, custom_data });
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editData, customFieldsData]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        {borrower.person_id ? (
          <Link to={createPageUrl('PersonDetails') + `?id=${borrower.person_id}`}>
            <h4 className="text-md font-bold text-gray-900 hover:text-blue-600 cursor-pointer">
              {editData.last_name ? `${editData.last_name} ${editData.first_name}` : editData.first_name}
            </h4>
          </Link>
        ) : (
          <Link to={createPageUrl('ArchiveCaseDetails') + `?id=${borrower.id}`}>
            <h4 className="text-md font-bold text-gray-900 hover:text-blue-600 cursor-pointer">
              {editData.last_name ? `${editData.last_name} ${editData.first_name}` : editData.first_name}
            </h4>
          </Link>
        )}
        <div className="flex gap-2">
          {borrower.person_id && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = createPageUrl('PersonDetails') + `?id=${borrower.person_id}`}
            >
              צפייה באיש קשר
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.preventDefault();
              if (confirm('האם אתה בטוח שברצונך להסיר את השיוך?')) {
                onUnlink(borrower.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-600">שם פרטי</Label>
          <Input
            value={editData.first_name}
            onChange={(e) => setEditData({...editData, first_name: e.target.value})}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-gray-600">שם משפחה</Label>
          <Input
            value={editData.last_name}
            onChange={(e) => setEditData({...editData, last_name: e.target.value})}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-gray-600">תעודת זהות</Label>
          <Input
            value={editData.id_number}
            onChange={(e) => setEditData({...editData, id_number: e.target.value})}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-gray-600">טלפון</Label>
          <Input
            value={editData.phone}
            onChange={(e) => setEditData({...editData, phone: e.target.value})}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-gray-600">אימייל</Label>
          <Input
            type="email"
            value={editData.email}
            onChange={(e) => setEditData({...editData, email: e.target.value})}
            className="mt-1"
          />
        </div>
        {customFieldsData.map((field) => (
          <div key={field.field_id}>
            <Label className="text-gray-600">{field.field_name}</Label>
            <Input
              value={editData[field.field_id] || ''}
              onChange={(e) => setEditData({...editData, [field.field_id]: e.target.value})}
              className="mt-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}