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
import ExternalContacts from '../components/transactions/ExternalContacts';

const typeLabels = {
  purchase: 'רכישה',
  sale: 'מכירה',
  rent: 'השכרה',
  lease: 'חכירה',
  other: 'אחר'
};

const statusLabels = {
  pending: 'בתהליך',
  completed: 'הושלם',
  cancelled: 'בוטל'
};

export default function CaseTransactions() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    property_id: '',
    transaction_type: 'purchase',
    transaction_date: '',
    amount: '',
    buyer_name: '',
    seller_name: '',
    status: 'pending',
    commission: '',
    notes: '',
    external_contacts: []
  });

  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(r => r[0]),
    enabled: !!caseId
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.PropertyAsset.list('-created_date')
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['case-transactions', caseId],
    queryFn: () => base44.entities.Transaction.filter({ property_id: caseData?.property_id }),
    enabled: !!caseData?.property_id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create({ ...data, property_id: caseData?.property_id || data.property_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-transactions', caseId] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-transactions', caseId] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case-transactions', caseId] })
  });

  const resetForm = () => {
    setFormData({
      property_id: '',
      transaction_type: 'purchase',
      transaction_date: '',
      amount: '',
      buyer_name: '',
      seller_name: '',
      status: 'pending',
      commission: '',
      notes: '',
      external_contacts: []
    });
    setEditingRecord(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      commission: formData.commission ? parseFloat(formData.commission) : null
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
      property_id: record.property_id || '',
      transaction_type: record.transaction_type || 'purchase',
      transaction_date: record.transaction_date || '',
      amount: record.amount || '',
      buyer_name: record.buyer_name || '',
      seller_name: record.seller_name || '',
      status: record.status || 'pending',
      commission: record.commission || '',
      notes: record.notes || '',
      external_contacts: record.external_contacts || []
    });
    setDialogOpen(true);
  };

  const filteredRecords = allTransactions.filter(record =>
    record.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-2 space-y-3">
      <div className="flex gap-3">
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700"
        >
          <Plus className="w-4 h-4 ml-2" />
          עסקה חדשה
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

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-amber-50 to-yellow-50">
            <tr className="border-b-2 border-amber-200">
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">סוג</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">תאריך</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">קונה</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">מוכר</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">סכום</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">עמלה</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">סטטוס</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">אנשי קשר</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-12 text-gray-400">
                  {!caseData?.property_id ? 'אין נכס משויך לחשבון זה' : 'אין עסקאות להצגה'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-amber-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                      {typeLabels[record.transaction_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {record.transaction_date ? new Date(record.transaction_date).toLocaleDateString('he-IL') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{record.buyer_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{record.seller_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {record.amount ? `₪${record.amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {record.commission ? `₪${record.commission.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      record.status === 'completed' ? 'bg-green-100 text-green-800' :
                      record.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {statusLabels[record.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(record.external_contacts || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {record.external_contacts.map((c, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {c.name}{c.role ? ` (${c.role})` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(record)} className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('האם למחוק עסקה זו?')) deleteMutation.mutate(record.id); }} className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'עריכת עסקה' : 'עסקה חדשה'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג עסקה *</Label>
                <Select value={formData.transaction_type} onValueChange={(val) => setFormData({ ...formData, transaction_type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תאריך עסקה *</Label>
                <Input type="date" value={formData.transaction_date} onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שם קונה</Label>
                <Input value={formData.buyer_name} onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })} />
              </div>
              <div>
                <Label>שם מוכר</Label>
                <Input value={formData.seller_name} onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סכום עסקה</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
              </div>
              <div>
                <Label>עמלה</Label>
                <Input type="number" value={formData.commission} onChange={(e) => setFormData({ ...formData, commission: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ExternalContacts
              contacts={formData.external_contacts}
              onChange={(contacts) => setFormData({ ...formData, external_contacts: contacts })}
            />
            <div>
              <Label>הערות</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">{editingRecord ? 'שמור' : 'צור'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}