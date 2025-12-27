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

  const [formData, setFormData] = useState({
    client_name: '',
    client_id: '',
    client_phone: '',
    client_email: ''
  });

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

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(caseId, data),
    onSuccess: () => {
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>שם מלא</Label>
            <Input
              value={formData.client_name}
              onChange={(e) => setFormData({...formData, client_name: e.target.value})}
              placeholder="הכנס שם מלא"
            />
          </div>
          <div>
            <Label>תעודת זהות</Label>
            <Input
              value={formData.client_id}
              onChange={(e) => setFormData({...formData, client_id: e.target.value})}
              placeholder="הכנס תעודת זהות"
            />
          </div>
          <div>
            <Label>טלפון</Label>
            <Input
              value={formData.client_phone}
              onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
              placeholder="הכנס טלפון"
            />
          </div>
          <div>
            <Label>אימייל</Label>
            <Input
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData({...formData, client_email: e.target.value})}
              placeholder="הכנס אימייל"
            />
          </div>
          <Button type="submit" disabled={updateMutation.isPending} className="w-full">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
            שמור שינויים
          </Button>
        </form>
      </div>
    </div>
  );
}