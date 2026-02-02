import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function PropertyEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

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

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.PropertyAsset.filter({ id: propertyId }).then(res => res[0]),
    enabled: !!propertyId,
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
      <div className="h-full flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50/50 flex flex-col p-0">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('RecordsTable'))}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">עריכת נכס</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-sm p-6">
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

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl('RecordsTable'))}>
                ביטול
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                שמור שינויים
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}