import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestCard from '@/components/requests/RequestCard';

export default function CaseRequests() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', caseId],
    queryFn: () => base44.entities.Request.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const didAutoCreate = React.useRef(false);
  React.useEffect(() => {
    if (didAutoCreate.current) return;
    if (isLoading) return;
    if (requests.length === 0 && caseId) {
      didAutoCreate.current = true;
      createMutation.mutate();
    }
  }, [isLoading, requests.length, caseId]);

  const { data: caseContacts = [] } = useQuery({
    queryKey: ['linked-contacts', caseId],
    queryFn: async () => {
      const allPersons = await base44.entities.Person.list();
      return allPersons.filter(person => {
        if (!person.linked_accounts || person.linked_accounts.length === 0) return false;
        return person.linked_accounts.some(acc =>
          typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
        );
      });
    },
    enabled: !!caseId,
    staleTime: 30000
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
      <div className="flex items-center justify-between mb-4">
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
              caseContacts={caseContacts}
            />
          ))}
          {requests.length === 0 && !createMutation.isPending && (
            <div className="text-center py-8 text-gray-400">טוען...</div>
          )}
        </div>
      )}
    </div>
  );
}