import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Send } from 'lucide-react';
import SubmissionForm from '../components/submissions/SubmissionForm';
import SubmissionCard from '../components/submissions/SubmissionCard';

export default function CaseSubmissions() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
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
      setFormOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Submission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', caseId] });
      setFormOpen(false);
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
    setFormOpen(true);
  };

  return (
    <div className="p-2" dir="rtl">
      {!formOpen && (
        <div className="flex items-center justify-between mb-3">
          <Button
            onClick={() => { setEditingSubmission(null); setFormOpen(true); }}
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg"
          >
            <Plus className="w-5 h-5 ml-2" />
            הגשה חדשה
          </Button>
        </div>
      )}

      {formOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingSubmission ? 'עריכת הגשה' : 'הגשה חדשה לבנק'}</h3>
          <SubmissionForm
            initialData={editingSubmission}
            onSubmit={handleSubmit}
            onCancel={() => { setFormOpen(false); setEditingSubmission(null); }}
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
      ) : submissions.length === 0 && !formOpen ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">טרם נוספו הגשות לחשבון זה</p>
          <p className="text-gray-400 text-sm mt-1">לחץ על "הגשה חדשה" כדי להגיש בקשה לבנק</p>
        </div>
      ) : (
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