import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPageUrl } from '@/utils';
import { Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function MosheRecordDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const recordId = urlParams.get('id');

  const { data: record, isLoading } = useQuery({
    queryKey: ['moshe-record', recordId],
    queryFn: () => base44.entities.MosheRecord.filter({ id: recordId }).then(res => res[0]),
    enabled: !!recordId
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MosheRecord.update(recordId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moshe-record', recordId] });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.MosheRecord.update(recordId, { is_archived: true }),
    onSuccess: () => {
      window.location.href = createPageUrl('ModuleView') + '?moduleId=moshe';
    }
  });

  const handleUpdate = (field, value) => {
    updateMutation.mutate({ [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">רשומה לא נמצאה</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{record.title}</h1>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-center">האם להעביר רשומה לארכיון?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex justify-center gap-4">
                  <AlertDialogAction 
                    onClick={() => archiveMutation.mutate()}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    העבר לארכיון
                  </AlertDialogAction>
                  <AlertDialogCancel className="bg-green-500 hover:bg-green-600 text-white">ביטול</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              variant="outline"
              onClick={() => window.location.href = createPageUrl('ModuleView') + '?moduleId=moshe'}
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה לרשימה
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <Label>כותרת</Label>
              <Input
                value={record.title || ''}
                onChange={(e) => handleUpdate('title', e.target.value)}
                className="text-xl font-bold"
              />
            </div>

            <div>
              <Label>סטטוס</Label>
              <Select 
                value={record.status || 'פעיל'} 
                onValueChange={(value) => handleUpdate('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="פעיל">פעיל</SelectItem>
                  <SelectItem value="בהמתנה">בהמתנה</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>תיאור</Label>
              <Textarea
                value={record.description || ''}
                onChange={(e) => handleUpdate('description', e.target.value)}
                rows={6}
                placeholder="הזן תיאור"
              />
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={record.notes || ''}
                onChange={(e) => handleUpdate('notes', e.target.value)}
                rows={6}
                placeholder="הערות נוספות"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}