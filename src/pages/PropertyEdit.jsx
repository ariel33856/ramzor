import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, Loader, Plus, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PropertyEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionForm, setTransactionForm] = useState({
    transaction_type: 'purchase',
    transaction_date: '',
    amount: '',
    buyer_name: '',
    seller_name: '',
    status: 'pending',
    commission: '',
    notes: ''
  });
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    property_type: 'דירה',
    size_sqm: '',
    rooms: '',
    floor: '',
    price: '',
    owner_name: '',
    owner_phone: '',
    status: 'פנוי',
    notes: ''
  });

  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.PropertyAsset.filter({ id: propertyId }).then(res => res[0]),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['property-transactions', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const results = await base44.entities.Transaction.list('-created_date');
      return results.filter(t => t.property_id === propertyId);
    },
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000
  });

  React.useEffect(() => {
    if (property) {
      setFormData({
        address: property.address || '',
        city: property.city || '',
        property_type: property.property_type || 'דירה',
        size_sqm: property.size_sqm || '',
        rooms: property.rooms || '',
        floor: property.floor || '',
        price: property.price || '',
        owner_name: property.owner_name || '',
        owner_phone: property.owner_phone || '',
        status: property.status || 'פנוי',
        notes: property.notes || ''
      });
    }
  }, [property]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyAsset.update(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      navigate(createPageUrl('RecordsTable'));
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['property-transactions']);
      setDialogOpen(false);
      resetTransactionForm();
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['property-transactions']);
      setDialogOpen(false);
      resetTransactionForm();
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['property-transactions'])
  });

  const resetTransactionForm = () => {
    setTransactionForm({
      transaction_type: 'purchase',
      transaction_date: '',
      amount: '',
      buyer_name: '',
      seller_name: '',
      status: 'pending',
      commission: '',
      notes: ''
    });
    setEditingTransaction(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      size_sqm: formData.size_sqm ? Number(formData.size_sqm) : undefined,
      rooms: formData.rooms ? Number(formData.rooms) : undefined,
      floor: formData.floor ? Number(formData.floor) : undefined,
      price: formData.price ? Number(formData.price) : undefined
    };
    updateMutation.mutate(data);
  };

  const handleTransactionSubmit = (e) => {
    e.preventDefault();
    const data = {
      property_id: propertyId,
      ...transactionForm,
      amount: transactionForm.amount ? parseFloat(transactionForm.amount) : null,
      commission: transactionForm.commission ? parseFloat(transactionForm.commission) : null
    };

    if (editingTransaction) {
      updateTransactionMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createTransactionMutation.mutate(data);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      transaction_type: transaction.transaction_type || 'purchase',
      transaction_date: transaction.transaction_date || '',
      amount: transaction.amount || '',
      buyer_name: transaction.buyer_name || '',
      seller_name: transaction.seller_name || '',
      status: transaction.status || 'pending',
      commission: transaction.commission || '',
      notes: transaction.notes || ''
    });
    setDialogOpen(true);
  };

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

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50/50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="h-full">
          <div className="bg-white h-full p-4">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl('RecordsTable'))}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">{property?.address}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>כתובת *</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                    placeholder="רחוב ומספר בית"
                  />
                </div>
                <div>
                  <Label>עיר *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required
                    placeholder="שם העיר"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג נכס *</Label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({...formData, property_type: e.target.value})}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background"
                    required
                  >
                    <option value="דירה">דירה</option>
                    <option value="בית">בית</option>
                    <option value="דירת גן">דירת גן</option>
                    <option value="פנטהאוז">פנטהאוז</option>
                    <option value="משרד">משרד</option>
                    <option value="חנות">חנות</option>
                    <option value="מחסן">מחסן</option>
                    <option value="קרקע">קרקע</option>
                    <option value="אחר">אחר</option>
                  </select>
                </div>
                <div>
                  <Label>סטטוס</Label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="פנוי">פנוי</option>
                    <option value="תפוס">תפוס</option>
                    <option value="להשכרה">להשכרה</option>
                    <option value="למכירה">למכירה</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>שטח (מ"ר)</Label>
                  <Input
                    type="number"
                    value={formData.size_sqm}
                    onChange={(e) => setFormData({...formData, size_sqm: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>מספר חדרים</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.rooms}
                    onChange={(e) => setFormData({...formData, rooms: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>קומה</Label>
                  <Input
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label>מחיר (₪)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>שם בעלים</Label>
                  <Input
                    value={formData.owner_name}
                    onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                    placeholder="שם מלא"
                  />
                </div>
                <div>
                  <Label>טלפון בעלים</Label>
                  <Input
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({...formData, owner_phone: e.target.value})}
                    placeholder="050-1234567"
                  />
                </div>
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={4}
                  placeholder="הערות נוספות על הנכס..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('RecordsTable'))}
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {updateMutation.isPending ? 'שומר...' : 'שמור'}
                </Button>
              </div>
            </form>

            {/* Transactions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">עסקאות</h3>
                <Button
                  onClick={() => {
                    const newId = `temp-${Date.now()}`;
                    createTransactionMutation.mutate({
                      property_id: propertyId,
                      transaction_type: 'purchase',
                      transaction_date: new Date().toISOString().split('T')[0],
                      amount: null,
                      buyer_name: '',
                      seller_name: '',
                      status: 'pending',
                      commission: null,
                      notes: ''
                    });
                  }}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  עסקה חדשה
                </Button>
              </div>

              <div className="space-y-4">
                {transactions.map((transaction, index) => (
                  <div key={transaction.id} className="p-4 bg-gradient-to-br from-blue-50/50 to-white border-2 border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-700">עסקה #{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('האם למחוק עסקה זו?')) {
                            deleteTransactionMutation.mutate(transaction.id);
                          }
                        }}
                        className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>סוג עסקה</Label>
                        <Select 
                          value={transaction.transaction_type} 
                          onValueChange={(val) => {
                            updateTransactionMutation.mutate({ 
                              id: transaction.id, 
                              data: { ...transaction, transaction_type: val }
                            });
                          }}
                        >
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
                        <Label>תאריך</Label>
                        <Input
                          type="date"
                          value={transaction.transaction_date || ''}
                          onChange={(e) => {
                            updateTransactionMutation.mutate({ 
                              id: transaction.id, 
                              data: { ...transaction, transaction_date: e.target.value }
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>סטטוס</Label>
                        <Select 
                          value={transaction.status} 
                          onValueChange={(val) => {
                            updateTransactionMutation.mutate({ 
                              id: transaction.id, 
                              data: { ...transaction, status: val }
                            });
                          }}
                        >
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
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>קונה</Label>
                        <Input
                          value={transaction.buyer_name || ''}
                          onChange={(e) => {
                            updateTransactionMutation.mutate({ 
                              id: transaction.id, 
                              data: { ...transaction, buyer_name: e.target.value }
                            });
                          }}
                          onBlur={() => {}}
                        />
                      </div>
                      <div>
                        <Label>מוכר</Label>
                        <Input
                          value={transaction.seller_name || ''}
                          onChange={(e) => {
                            updateTransactionMutation.mutate({ 
                              id: transaction.id, 
                              data: { ...transaction, seller_name: e.target.value }
                            });
                          }}
                          onBlur={() => {}}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label>סכום</Label>
                        <Input
                          type="number"
                          value={transaction.amount || ''}
                          onChange={(e) => {
                            updateTransactionMutation.mutate({ 
                              id: transaction.id, 
                              data: { ...transaction, amount: e.target.value ? parseFloat(e.target.value) : null }
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>עמלה</Label>
                        <Input
                          type="number"
                          value={transaction.commission || ''}
                          onChange={(e) => {
                            updateTransactionMutation.mutate({ 
                              id: transaction.id, 
                              data: { ...transaction, commission: e.target.value ? parseFloat(e.target.value) : null }
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label>הערות</Label>
                      <Textarea
                        value={transaction.notes || ''}
                        onChange={(e) => {
                          updateTransactionMutation.mutate({ 
                            id: transaction.id, 
                            data: { ...transaction, notes: e.target.value }
                          });
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    אין עסקאות - לחץ על "עסקה חדשה" כדי להתחיל
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}