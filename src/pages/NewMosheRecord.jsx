import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPageUrl } from '@/utils';

export default function NewMosheRecord() {
  const [formData, setFormData] = useState({
    title: '',
    status: 'פעיל',
    description: '',
    notes: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MosheRecord.create(data),
    onSuccess: (record) => {
      window.location.href = createPageUrl('MosheRecordDetails') + `?id=${record.id}`;
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">רשומה חדשה</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>כותרת *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                placeholder="הזן כותרת"
              />
            </div>

            <div>
              <Label>סטטוס</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
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
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                placeholder="הזן תיאור"
              />
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="הערות נוספות"
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = createPageUrl('ModuleView') + '?moduleId=moshe'}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                צור רשומה
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}