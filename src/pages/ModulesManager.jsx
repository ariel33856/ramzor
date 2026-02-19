import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SecureEntities } from '../components/secureEntities';

const colorOptions = [
  { value: 'blue', label: 'כחול', gradient: 'from-blue-500 to-blue-600' },
  { value: 'green', label: 'ירוק', gradient: 'from-green-500 to-green-600' },
  { value: 'purple', label: 'סגול', gradient: 'from-purple-500 to-purple-600' },
  { value: 'red', label: 'אדום', gradient: 'from-red-500 to-red-600' },
  { value: 'orange', label: 'כתום', gradient: 'from-orange-500 to-orange-600' },
  { value: 'pink', label: 'ורוד', gradient: 'from-pink-500 to-pink-600' },
  { value: 'slate', label: 'אפור', gradient: 'from-slate-500 to-slate-600' },
  { value: 'indigo', label: 'אינדיגו', gradient: 'from-indigo-500 to-indigo-600' },
];

export default function ModulesManager() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: 'Folder', color: 'blue' });

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: () => SecureEntities.Module.list('order')
  });

  const createMutation = useMutation({
    mutationFn: (data) => SecureEntities.Module.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setIsOpen(false);
      setFormData({ name: '', icon: 'Folder', color: 'blue' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => SecureEntities.Module.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setEditingModule(null);
      setIsOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SecureEntities.Module.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    }
  });

  const handleSubmit = () => {
    if (editingModule) {
      updateMutation.mutate({ id: editingModule.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, order: modules.length });
    }
  };

  const handleEdit = (module) => {
    setEditingModule(module);
    setFormData({ name: module.name, icon: module.icon, color: module.color });
    setIsOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('האם אתה בטוח שברצונך למחוק מודול זה?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ניהול מודולים</h1>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingModule(null);
              setFormData({ name: '', icon: 'Folder', color: 'blue' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-5 h-5 ml-2" />
                הוסף מודול
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingModule ? 'עריכת מודול' : 'מודול חדש'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>שם המודול</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="הכנס שם מודול..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>צבע</Label>
                  <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded bg-gradient-to-br ${option.gradient}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  <Save className="w-4 h-4 ml-2" />
                  {editingModule ? 'שמור שינויים' : 'צור מודול'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => {
            const colorOption = colorOptions.find(c => c.value === module.color) || colorOptions[0];
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorOption.gradient} flex items-center justify-center shadow-md`}>
                      <span className="text-white text-xl font-bold">{module.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{module.name}</h3>
                      <p className="text-sm text-gray-500">{colorOption.label}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(module)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(module.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {modules.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-gray-500">אין מודולים עדיין. צור מודול ראשון!</p>
          </div>
        )}
      </div>
    </div>
  );
}