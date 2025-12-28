import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LinkedBorrowerCard({ borrower, caseId, onUnlink }) {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState({
    client_name: borrower.client_name || '',
    last_name: borrower.last_name || '',
    client_id: borrower.client_id || '',
    client_phone: borrower.client_phone || '',
    client_email: borrower.client_email || ''
  });
  const timeoutRef = useRef(null);

  useEffect(() => {
    setEditData({
      client_name: borrower.client_name || '',
      last_name: borrower.last_name || '',
      client_id: borrower.client_id || '',
      client_phone: borrower.client_phone || '',
      client_email: borrower.client_email || ''
    });
  }, [borrower]);

  const updateBorrowerMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.MortgageCase.update(borrower.id, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['all-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['archive-cases'] });
      queryClient.invalidateQueries({ queryKey: ['archive-case', borrower.id] });
      queryClient.invalidateQueries({ queryKey: ['case'] });
    }
  });

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const hasChanges = 
      editData.client_name !== (borrower.client_name || '') ||
      editData.last_name !== (borrower.last_name || '') ||
      editData.client_id !== (borrower.client_id || '') ||
      editData.client_phone !== (borrower.client_phone || '') ||
      editData.client_email !== (borrower.client_email || '');

    if (hasChanges) {
      timeoutRef.current = setTimeout(() => {
        updateBorrowerMutation.mutate(editData);
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editData]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <Link to={createPageUrl('ArchiveCaseDetails') + `?id=${borrower.id}`}>
          <h4 className="text-md font-bold text-gray-900 hover:text-blue-600 cursor-pointer">
            {borrower.last_name ? `${borrower.last_name} ${borrower.client_name}` : borrower.client_name}
          </h4>
        </Link>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = createPageUrl('ArchiveCaseDetails') + `?id=${borrower.id}`}
          >
            צפייה במודול לווים
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.preventDefault();
              if (confirm('האם אתה בטוח שברצונך להסיר את השיוך? הלווה לא יימחק מהמודול.')) {
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
            value={editData.client_name}
            onChange={(e) => setEditData({...editData, client_name: e.target.value})}
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
            value={editData.client_id}
            onChange={(e) => setEditData({...editData, client_id: e.target.value})}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-gray-600">טלפון</Label>
          <Input
            value={editData.client_phone}
            onChange={(e) => setEditData({...editData, client_phone: e.target.value})}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-gray-600">אימייל</Label>
          <Input
            type="email"
            value={editData.client_email}
            onChange={(e) => setEditData({...editData, client_email: e.target.value})}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}