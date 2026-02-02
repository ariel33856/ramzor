import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '@/utils';
import { ArrowRight, Link as LinkIcon } from 'lucide-react';

export default function PropertyAssetDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  const [formData, setFormData] = useState(null);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.PropertyAsset.filter({ id: propertyId }).then(res => res[0]),
    enabled: !!propertyId,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          address: data.address || '',
          city: data.city || '',
          property_type: data.property_type || 'דירה',
          size_sqm: data.size_sqm || '',
          rooms: data.rooms || '',
          floor: data.floor || '',
          price: data.price || '',
          owner_name: data.owner_name || '',
          owner_phone: data.owner_phone || '',
          status: data.status || 'פנוי',
          notes: data.notes || ''
        });
      }
    }
  });

  const { data: linkedCase } = useQuery({
    queryKey: ['linked-case', property?.case_id],
    queryFn: () => base44.entities.MortgageCase.filter({ id: property.case_id }).then(res => res[0]),
    enabled: !!property?.case_id
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyAsset.update(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
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

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl('RecordsTable'))}
            className="flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לנכסים
          </Button>

          {linkedCase && (
            <Button
              onClick={() => navigate(createPageUrl('CaseDetails') + `?id=${linkedCase.id}`)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              {linkedCase.client_name} {linkedCase.last_name || ''} (חשבון {linkedCase.account_number})
            </Button>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          {property.address}, {property.city}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white h-full border-none p-6">
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

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl('RecordsTable'))}>
                ביטול
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}