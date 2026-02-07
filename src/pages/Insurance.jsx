import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function Insurance() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    policy_number: '',
    insurance_type: 'life',
    company_name: '',
    insured_name: '',
    premium_amount: '',
    coverage_amount: '',
    start_date: '',
    end_date: '',
    status: 'active',
    notes: ''
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  const { data: records = [] } = useQuery({
    queryKey: ['insurance-records'],
    queryFn: () => base44.entities.Insurance.list('-created_date'),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Insurance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['insurance-records']);
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Insurance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['insurance-records']);
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Insurance.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['insurance-records'])
  });

  const resetForm = () => {
    setFormData({
      policy_number: '',
      insurance_type: 'life',
      company_name: '',
      insured_name: '',
      premium_amount: '',
      coverage_amount: '',
      start_date: '',
      end_date: '',
      status: 'active',
      notes: ''
    });
    setEditingRecord(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      premium_amount: formData.premium_amount ? parseFloat(formData.premium_amount) : null,
      coverage_amount: formData.coverage_amount ? parseFloat(formData.coverage_amount) : null
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      policy_number: record.policy_number || '',
      insurance_type: record.insurance_type || 'life',
      company_name: record.company_name || '',
      insured_name: record.insured_name || '',
      premium_amount: record.premium_amount || '',
      coverage_amount: record.coverage_amount || '',
      start_date: record.start_date || '',
      end_date: record.end_date || '',
      status: record.status || 'active',
      notes: record.notes || ''
    });
    setDialogOpen(true);
  };

  const filteredRecords = records.filter(record => 
    record.insured_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.policy_number?.includes(searchTerm) ||
    record.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const typeLabels = {
    life: 'ביטוח חיים',
    health: 'ביטוח בריאות',
    home: 'ביטוח דירה',
    car: 'ביטוח רכב',
    pension: 'ביטוח פנסיוני',
    other: 'אחר'
  };

  const statusLabels = {
    active: 'פעיל',
    expired: 'פג תוקף',
    cancelled: 'בוטל'
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50/50 overflow-hidden flex flex-col p-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
        <div className="flex gap-3">
          <Button 
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="w-4 h-4 ml-2" />
            ביטוח חדש
          </Button>

          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-blue-100">
              <tr className="border-b-2 border-blue-200">
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">מספר פוליסה</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">מבוטח</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">חברה</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">סוג</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">פרמיה</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">כיסוי</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">סטטוס</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-400">
                    אין רשומות להצגה
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{record.policy_number}</td>
                    <td className="px-4 py-3 text-gray-700">{record.insured_name}</td>
                    <td className="px-4 py-3 text-gray-700">{record.company_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {typeLabels[record.insurance_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record.premium_amount ? `₪${record.premium_amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record.coverage_amount ? `₪${record.coverage_amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        record.status === 'active' ? 'bg-green-100 text-green-800' :
                        record.status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {statusLabels[record.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(record)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
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
                          className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'עריכת ביטוח' : 'ביטוח חדש'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>מספר פוליסה *</Label>
                <Input
                  value={formData.policy_number}
                  onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>שם מבוטח *</Label>
                <Input
                  value={formData.insured_name}
                  onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג ביטוח</Label>
                <Select value={formData.insurance_type} onValueChange={(val) => setFormData({ ...formData, insurance_type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>חברת ביטוח</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>פרמיה חודשית</Label>
                <Input
                  type="number"
                  value={formData.premium_amount}
                  onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                />
              </div>
              <div>
                <Label>סכום כיסוי</Label>
                <Input
                  type="number"
                  value={formData.coverage_amount}
                  onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>תאריך התחלה</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>תאריך סיום</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>סטטוס</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingRecord ? 'שמור' : 'צור'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}