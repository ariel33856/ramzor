import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, User, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function CasePersonal() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: linkedBorrowers = [] } = useQuery({
    queryKey: ['linked-borrowers', caseData?.linked_borrowers],
    queryFn: async () => {
      if (!caseData?.linked_borrowers || caseData.linked_borrowers.length === 0) return [];
      const promises = caseData.linked_borrowers.map(id => 
        base44.entities.MortgageCase.filter({ id }).then(res => res[0])
      );
      return Promise.all(promises);
    },
    enabled: !!caseData?.linked_borrowers
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
    <div className="min-h-screen bg-gray-50/50 p-2 md:p-3">
      <div className="mx-auto">
        {linkedBorrowers.length > 0 && linkedBorrowers[0] && (
          <Link to={createPageUrl('ArchiveCaseDetails') + `?id=${linkedBorrowers[0].id}`} className="block">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 mb-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">לווה משויך</h3>
                <Button variant="outline" size="sm" onClick={(e) => e.preventDefault()}>
                  צפייה במודול לווים
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">שם לקוח</Label>
                  <p className="font-medium text-gray-900">{linkedBorrowers[0].client_name || '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">שם משפחה</Label>
                  <p className="font-medium text-gray-900">{linkedBorrowers[0].last_name || '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">תעודת זהות</Label>
                  <p className="font-medium text-gray-900">{linkedBorrowers[0].client_id || '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">טלפון</Label>
                  <p className="font-medium text-gray-900">{linkedBorrowers[0].client_phone || '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-600">אימייל</Label>
                  <p className="font-medium text-gray-900">{linkedBorrowers[0].client_email || '—'}</p>
                </div>
              </div>
            </div>
          </Link>
        )}
        

      </div>
    </div>
  );
}