import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import SubmissionForm from '../components/submissions/SubmissionForm';


export default function CaseSubmissions() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);

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

  return (
    <div className="p-2" dir="rtl">
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
  );
}