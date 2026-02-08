import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import SubmissionForm from '../components/submissions/SubmissionForm';
import SubmissionCard from '../components/submissions/SubmissionCard';

export default function CaseSubmissions() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [editingSubmission, setEditingSubmission] = useState(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions', caseId],
    queryFn: () => base44.entities.Submission.filter({ case_id: caseId }, '-created_date'),
    enabled: !!caseId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Submission.create({ ...data, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', caseId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Submission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', caseId] });
      setEditingSubmission(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Submission.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions', caseId] })
  });

  const handleSubmit = (data) => {
    if (editingSubmission) {
      updateMutation.mutate({ id: editingSubmission.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (sub) => {
    setEditingSubmission(sub);
  };

  return (
    <div className="p-2" dir="rtl">
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingSubmission ? 'עריכת הגשה' : 'הגשה חדשה לבנק'}</h3>
        <SubmissionForm
          key={editingSubmission?.id || 'new'}
          initialData={editingSubmission}
          onSubmit={handleSubmit}
          onCancel={() => { setEditingSubmission(null); }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </div>
          ))}
        </div>
      ) : submissions.length === 0 ? null : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}