import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PropertyEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50/50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
            {transactions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-bold text-gray-900">עסקאות</h3>
                </div>
                <div className="space-y-3">
                  {transactions.map((transaction) => {
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
                    return (
                      <div key={transaction.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {typeLabels[transaction.transaction_type]}
                            </span>
                            <p className="text-sm text-gray-500 mt-2">
                              {transaction.transaction_date ? new Date(transaction.transaction_date).toLocaleDateString('he-IL') : '—'}
                            </p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {statusLabels[transaction.status]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {transaction.buyer_name && (
                            <div>
                              <p className="text-gray-500">קונה</p>
                              <p className="font-semibold text-gray-900">{transaction.buyer_name}</p>
                            </div>
                          )}
                          {transaction.seller_name && (
                            <div>
                              <p className="text-gray-500">מוכר</p>
                              <p className="font-semibold text-gray-900">{transaction.seller_name}</p>
                            </div>
                          )}
                          {transaction.amount && (
                            <div>
                              <p className="text-gray-500">סכום</p>
                              <p className="font-bold text-gray-900">₪{transaction.amount.toLocaleString()}</p>
                            </div>
                          )}
                          {transaction.commission && (
                            <div>
                              <p className="text-gray-500">עמלה</p>
                              <p className="font-semibold text-gray-900">₪{transaction.commission.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        {transaction.notes && (
                          <p className="mt-3 text-sm text-gray-600 border-t border-gray-200 pt-3">{transaction.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}