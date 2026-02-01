import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function RecordsTable() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: 'active'
  });

  // Load user data
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  // Create placeholder query - replace with actual entity when created
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['records'],
    queryFn: async () => {
      // TODO: Replace with actual entity fetch
      // return base44.entities.Record.list();
      return [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // TODO: Replace with actual entity creation
      // return base44.entities.Record.create(data);
      return Promise.resolve({ id: Date.now(), ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      // TODO: Replace with actual entity update
      // return base44.entities.Record.update(id, data);
      return Promise.resolve({ id, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      // TODO: Replace with actual entity delete
      // return base44.entities.Record.delete(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      status: 'active'
    });
    setEditingRecord(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      title: record.title || '',
      description: record.description || '',
      category: record.category || '',
      status: record.status || 'active'
    });
    setDialogOpen(true);
  };

  const filteredRecords = records.filter(record =>
    record.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden p-1">
      {/* Header */}
      <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-1">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-5 h-5 ml-2" />
                רשומה חדשה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'עריכת רשומה' : 'רשומה חדשה'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>כותרת</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>תיאור</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                  />
                </div>
                <div>
                  <Label>קטגוריה</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    ביטול
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingRecord ? 'עדכן' : 'צור'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex-1 relative max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין רשומות להצגה</h3>
            <p className="text-gray-400">התחל ביצירת רשומה חדשה</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-200px)]">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">כותרת</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">תיאור</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">קטגוריה</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">סטטוס</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-3">
                        <span className="font-semibold text-gray-900">{record.title}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-600 line-clamp-1">{record.description}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-600">{record.category}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.status === 'active' ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('האם למחוק רשומה זו?')) {
                                deleteMutation.mutate(record.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}