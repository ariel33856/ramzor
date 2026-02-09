import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ClipboardList, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestCard from '@/components/requests/RequestCard';
import LinkedContactsList from '@/components/requests/LinkedContactsList';

export default function CaseRequests() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', caseId],
    queryFn: () => base44.entities.Request.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.Request.create({ case_id: caseId, amount: 0, request_type: 'הלוואה' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Request.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Request.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  const handleUpdate = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  return (
    <div className="p-1" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* חלונית בקשות */}
        <div className="lg:col-span-2 bg-white rounded-xl border-2 border-fuchsia-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-fuchsia-600" />
              <h3 className="text-lg font-bold text-gray-900">בקשות</h3>
            </div>
            <Button onClick={() => createMutation.mutate()} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700">
              <Plus className="w-4 h-4 ml-2" />
              בקשה חדשה
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">טוען...</div>
          ) : (
            <div className="grid gap-3">
              {requests.map((req, index) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  index={index}
                  onUpdate={handleUpdate}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
              {requests.length === 0 && (
                <div className="text-center py-8 text-gray-400">אין בקשות. לחץ על "בקשה חדשה" כדי להוסיף.</div>
              )}
            </div>
          )}
        </div>

        {/* חלונית אנשי קשר */}
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">אנשי קשר</h3>
          </div>
          <LinkedContactsList caseId={caseId} />
        </div>
      </div>
    </div>
  );
}