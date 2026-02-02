import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Home, MapPin, CheckCircle2, Plus } from 'lucide-react';

export default function CaseProperty() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
  const caseId = urlParams.get('id');

  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['property-assets'],
    queryFn: () => base44.entities.PropertyAsset.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: selectedProperty } = useQuery({
    queryKey: ['selected-property', caseData?.property_id],
    queryFn: () => base44.entities.PropertyAsset.filter({ id: caseData.property_id }).then(res => res[0]),
    enabled: !!caseData?.property_id
  });

  const linkPropertyMutation = useMutation({
    mutationFn: (propertyId) => base44.entities.MortgageCase.update(caseId, { property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setDialogOpen(false);
      setSearchTerm('');
    }
  });

  const createPropertyMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyAsset.create(data),
    onSuccess: (newProperty) => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      linkPropertyMutation.mutate(newProperty.id);
      setCreateDialogOpen(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
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
    createPropertyMutation.mutate(data);
  };

  const filteredProperties = properties.filter(prop =>
    prop.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.property_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {selectedProperty ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">נכס משויך</h3>
              <Button onClick={() => setDialogOpen(true)} variant="outline">
                שנה נכס
              </Button>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-200">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Home className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedProperty.address}</h4>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedProperty.city}</span>
                    <span className="mx-2">•</span>
                    <span>{selectedProperty.property_type}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {selectedProperty.size_sqm && (
                      <div className="bg-white rounded-lg p-3 border border-teal-200">
                        <p className="text-xs text-gray-500">שטח</p>
                        <p className="text-lg font-bold text-gray-900">{selectedProperty.size_sqm} מ"ר</p>
                      </div>
                    )}
                    {selectedProperty.rooms && (
                      <div className="bg-white rounded-lg p-3 border border-teal-200">
                        <p className="text-xs text-gray-500">חדרים</p>
                        <p className="text-lg font-bold text-gray-900">{selectedProperty.rooms}</p>
                      </div>
                    )}
                    {selectedProperty.floor !== undefined && selectedProperty.floor !== null && (
                      <div className="bg-white rounded-lg p-3 border border-teal-200">
                        <p className="text-xs text-gray-500">קומה</p>
                        <p className="text-lg font-bold text-gray-900">{selectedProperty.floor}</p>
                      </div>
                    )}
                    {selectedProperty.price && (
                      <div className="bg-white rounded-lg p-3 border border-teal-200">
                        <p className="text-xs text-gray-500">מחיר</p>
                        <p className="text-lg font-bold text-gray-900">₪{parseInt(selectedProperty.price).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedProperty.status && (
                    <div className="mt-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedProperty.status === 'פנוי' ? 'bg-green-100 text-green-800' :
                        selectedProperty.status === 'תפוס' ? 'bg-gray-100 text-gray-800' :
                        selectedProperty.status === 'להשכרה' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedProperty.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">לא נבחר נכס</h3>
            <p className="text-gray-500 mb-6">בחר נכס מתוך מודול הנכסים</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
              <Home className="w-5 h-5 ml-2" />
              בחר נכס
            </Button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>בחר נכס</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="חיפוש לפי כתובת, עיר או סוג נכס..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button onClick={() => { setDialogOpen(false); setCreateDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-5 h-5 ml-2" />
                נכס חדש
              </Button>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredProperties.map(property => (
                <div
                  key={property.id}
                  className="p-4 border rounded-lg hover:bg-teal-50 cursor-pointer transition-colors flex items-center justify-between"
                  onClick={() => linkPropertyMutation.mutate(property.id)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <Home className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{property.address}</p>
                      <p className="text-sm text-gray-500">{property.city} • {property.property_type}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-600">
                        {property.size_sqm && <span>{property.size_sqm} מ"ר</span>}
                        {property.rooms && <span>{property.rooms} חדרים</span>}
                        {property.price && <span>₪{parseInt(property.price).toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                  {selectedProperty?.id === property.id && (
                    <CheckCircle2 className="w-6 h-6 text-teal-600" />
                  )}
                </div>
              ))}
              {filteredProperties.length === 0 && (
                <p className="text-center text-gray-500 py-8">לא נמצאו נכסים</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>נכס חדש</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                rows={3}
                placeholder="הערות נוספות על הנכס..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                ביטול
              </Button>
              <Button type="submit" disabled={createPropertyMutation.isPending}>
                צור ושייך
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}