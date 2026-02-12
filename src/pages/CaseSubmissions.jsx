import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import SubmissionForm from '../components/submissions/SubmissionForm';
import RequestCard from '@/components/requests/RequestCard';


export default function CaseSubmissions() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);

  // Submissions
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions', caseId],
    queryFn: () => base44.entities.Submission.filter({ case_id: caseId }, '-created_date'),
    enabled: !!caseId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Submission.create({ ...data, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', caseId] });
      setShowNewForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Submission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', caseId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Submission.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions', caseId] })
  });

  // Requests
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['requests', caseId],
    queryFn: () => base44.entities.Request.filter({ case_id: caseId }),
    enabled: !!caseId
  });

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

  const didAutoCreate = React.useRef(false);
  React.useEffect(() => {
    if (didAutoCreate.current) return;
    if (requestsLoading) return;
    if (requests.length === 0 && caseId) {
      didAutoCreate.current = true;
      createRequestMutation.mutate();
    }
  }, [requestsLoading, requests.length, caseId]);

  const createRequestMutation = useMutation({
    mutationFn: () => base44.entities.Request.create({ case_id: caseId, amount: 0, request_type: 'הלוואה' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Request.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id) => base44.entities.Request.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  return (
    <div className="p-2 flex gap-3" dir="rtl">
      {/* Submissions - main area */}
      <div className="flex-1 min-w-0">
        <div className="mb-3">
          <Button
            onClick={() => setShowNewForm(true)}
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg"
            disabled={showNewForm}
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף הגשה
          </Button>
        </div>

        {showNewForm && (
          <div className="bg-white rounded-xl border-2 border-green-300 p-4 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">הגשה חדשה לבנק</h3>
            <SubmissionForm
              key="new"
              initialData={null}
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowNewForm(false)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-48" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => (
              <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600">הגשה #{sub.id?.slice(-6)}</h3>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => deleteMutation.mutate(sub.id)}>
                    <Trash2 className="w-4 h-4 ml-1" />
                    מחק הגשה
                  </Button>
                </div>
                <SubmissionForm
                  key={sub.id}
                  initialData={sub}
                  onSubmit={(data) => updateMutation.mutate({ id: sub.id, data })}
                  onCancel={() => {}}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requests - side panel */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">בקשות</h3>
            </div>
            <Button size="sm" onClick={() => createRequestMutation.mutate()} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700">
              <Plus className="w-4 h-4 ml-1" />
              חדשה
            </Button>
          </div>
          {requestsLoading ? (
            <div className="text-center py-8 text-gray-400">טוען...</div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
              {requests.map((req, index) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  index={index}
                  onUpdate={(id, data) => updateRequestMutation.mutate({ id, data })}
                  onDelete={(id) => deleteRequestMutation.mutate(id)}
                  caseContacts={caseContacts}
                />
              ))}
              {requests.length === 0 && !createRequestMutation.isPending && (
                <div className="text-center py-8 text-gray-400">אין בקשות</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}