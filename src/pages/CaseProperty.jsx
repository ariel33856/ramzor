import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Home, Plus, Archive } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CaseProperty() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
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

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['property-assets', caseId],
    queryFn: () => base44.entities.PropertyAsset.filter({ case_id: caseId }, '-created_date'),
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000
  });

  const { data: allProperties = [] } = useQuery({
    queryKey: ['all-property-assets'],
    queryFn: () => base44.entities.PropertyAsset.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  const allFieldNames = React.useMemo(() => {
    const fieldNamesSet = new Set(['address', 'city', 'property_type', 'size_sqm', 'rooms', 'floor', 'price', 'owner_name', 'owner_phone', 'status', 'notes']);
    properties.forEach(prop => {
      if (prop.custom_data) {
        Object.keys(prop.custom_data).forEach(key => fieldNamesSet.add(key));
      }
    });
    return Array.from(fieldNamesSet);
  }, [properties]);

  const getFieldLabel = (fieldName) => {
    const labels = {
      address: 'כתובת',
      city: 'עיר',
      property_type: 'סוג נכס',
      size_sqm: 'שטח (מ"ר)',
      rooms: 'חדרים',
      floor: 'קומה',
      price: 'מחיר',
      owner_name: 'שם בעלים',
      owner_phone: 'טלפון בעלים',
      status: 'סטטוס',
      notes: 'הערות'
    };
    return labels[fieldName] || fieldName;
  };

  const getFieldValue = (property, fieldName) => {
    const value = property[fieldName] || (property.custom_data && property.custom_data[fieldName]);
    
    if (typeof value === 'object' && value !== null) {
      return '—';
    }
    
    if (fieldName === 'price' && value) {
      return `₪${parseInt(value).toLocaleString()}`;
    }
    
    if (fieldName === 'size_sqm' && value) {
      return `${value} מ"ר`;
    }
    
    return value || '—';
  };

  const linkPropertyMutation = useMutation({
    mutationFn: (propertyId) => {
      return base44.entities.PropertyAsset.update(propertyId, { case_id: caseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      queryClient.invalidateQueries({ queryKey: ['all-property-assets'] });
      setDialogOpen(false);
      setSearchTerm('');
    }
  });

  const createPropertyMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyAsset.create({ ...data, case_id: caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      queryClient.invalidateQueries({ queryKey: ['all-property-assets'] });
      setCreateDialogOpen(false);
      resetForm();
    }
  });

  const updatePropertyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PropertyAsset.update(id || editingProperty?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      queryClient.invalidateQueries({ queryKey: ['all-property-assets'] });
      if (editDialogOpen) {
        setEditDialogOpen(false);
        setEditingProperty(null);
        resetForm();
      }
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
    setEditingProperty(null);
  };

  const handleEditProperty = (property) => {
    setEditingProperty(property);
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
    setEditDialogOpen(true);
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
    
    if (editingProperty) {
      updatePropertyMutation.mutate(data);
    } else {
      createPropertyMutation.mutate(data);
    }
  };

  const filteredProperties = allProperties.filter(prop =>
    !prop.case_id &&
    (prop.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.property_type?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden p-1">
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-teal-50 to-cyan-50">
                  <tr className="border-b-2 border-gray-200">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <th key={i} className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b border-gray-100">
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : properties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין נכסים משויכים</h3>
            <p className="text-gray-400">בחר נכס קיים או צור נכס חדש</p>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-teal-50 to-cyan-50">
                  <tr className="border-b-2 border-gray-200">
                    {allFieldNames.map(fieldName => (
                      <th key={fieldName} className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                        {getFieldLabel(fieldName)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property, index) => {
                    const updateField = (fieldName, value) => {
                      const data = { [fieldName]: value };
                      if (['size_sqm', 'rooms', 'floor', 'price'].includes(fieldName)) {
                        data[fieldName] = value ? Number(value) : undefined;
                      }
                      updatePropertyMutation.mutate({ id: property.id, data });
                    };

                    return (
                      <motion.tr
                        key={property.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-gray-100"
                      >
                        {allFieldNames.map(fieldName => {
                          const value = property[fieldName] || (property.custom_data && property.custom_data[fieldName]) || '';
                          
                          if (fieldName === 'property_type') {
                            return (
                              <td key={fieldName} className="px-6 py-4">
                                <select
                                  value={value}
                                  onChange={(e) => updateField(fieldName, e.target.value)}
                                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                                  onClick={(e) => e.stopPropagation()}
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
                              </td>
                            );
                          }
                          
                          if (fieldName === 'status') {
                            return (
                              <td key={fieldName} className="px-6 py-4">
                                <select
                                  value={value}
                                  onChange={(e) => updateField(fieldName, e.target.value)}
                                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="פנוי">פנוי</option>
                                  <option value="תפוס">תפוס</option>
                                  <option value="להשכרה">להשכרה</option>
                                  <option value="למכירה">למכירה</option>
                                </select>
                              </td>
                            );
                          }
                          
                          if (fieldName === 'notes') {
                            return (
                              <td key={fieldName} className="px-6 py-4">
                                <textarea
                                  value={value}
                                  onChange={(e) => updateField(fieldName, e.target.value)}
                                  className="w-full h-8 px-2 py-1 rounded-md border border-input bg-background text-sm resize-none"
                                  onClick={(e) => e.stopPropagation()}
                                  rows={1}
                                />
                              </td>
                            );
                          }
                          
                          const isNumeric = ['size_sqm', 'rooms', 'floor', 'price'].includes(fieldName);
                          
                          return (
                            <td key={fieldName} className="px-6 py-4">
                              <Input
                                type={isNumeric ? 'number' : 'text'}
                                step={fieldName === 'rooms' ? '0.5' : undefined}
                                value={value}
                                onChange={(e) => updateField(fieldName, e.target.value)}
                                className={`h-8 text-sm ${fieldName === 'address' ? 'font-semibold' : ''}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Link Property Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
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
              <Button onClick={() => { setDialogOpen(false); setCreateDialogOpen(true); resetForm(); }} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-5 h-5 ml-2" />
                נכס חדש
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProperties.map(property => (
                <div
                  key={property.id}
                  className="p-4 border rounded-lg hover:bg-teal-50 cursor-pointer transition-colors"
                  onClick={() => linkPropertyMutation.mutate(property.id)}
                >
                  <p className="font-semibold text-gray-900">{property.address}</p>
                  <p className="text-sm text-gray-500">{property.city} • {property.property_type}</p>
                </div>
              ))}
              {filteredProperties.length === 0 && (
                <p className="text-center text-gray-500 py-8">כל הנכסים כבר משויכים לחשבונות</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Property Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'עריכת נכס' : 'נכס חדש'}</DialogTitle>
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
              <Button type="button" variant="outline" onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
                resetForm();
              }}>
                ביטול
              </Button>
              <Button type="submit" disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}>
                {editingProperty ? 'עדכן' : 'צור ושייך'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}