import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, Building2, MapPin, DollarSign, Calendar, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function PropertyAssets() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    property_type: '',
    size_sqm: '',
    rooms: '',
    price: '',
    purchase_date: '',
    notes: ''
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Property.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Property.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    }
  });

  const resetForm = () => {
    setFormData({
      address: '',
      city: '',
      property_type: '',
      size_sqm: '',
      rooms: '',
      price: '',
      purchase_date: '',
      notes: ''
    });
    setEditingProperty(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      address: property.address || '',
      city: property.city || '',
      property_type: property.property_type || '',
      size_sqm: property.size_sqm || '',
      rooms: property.rooms || '',
      price: property.price || '',
      purchase_date: property.purchase_date || '',
      notes: property.notes || ''
    });
    setDialogOpen(true);
  };

  const filteredProperties = properties.filter(p =>
    p.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.property_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden p-1">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-pink-500 to-red-500 p-3 rounded-lg mb-2">
        <div className="flex items-center justify-between gap-3">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-white text-pink-600 hover:bg-pink-50">
                <Plus className="w-5 h-5 ml-2" />
                נכס חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProperty ? 'עריכת נכס' : 'נכס חדש'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>כתובת</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="רחוב ומספר"
                      required
                    />
                  </div>
                  <div>
                    <Label>עיר</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="עיר"
                      required
                    />
                  </div>
                  <div>
                    <Label>סוג נכס</Label>
                    <Input
                      value={formData.property_type}
                      onChange={(e) => setFormData({...formData, property_type: e.target.value})}
                      placeholder="דירה / בית / מסחרי"
                    />
                  </div>
                  <div>
                    <Label>שטח (מ"ר)</Label>
                    <Input
                      type="number"
                      value={formData.size_sqm}
                      onChange={(e) => setFormData({...formData, size_sqm: e.target.value})}
                      placeholder="שטח במ&quot;ר"
                    />
                  </div>
                  <div>
                    <Label>מספר חדרים</Label>
                    <Input
                      type="number"
                      value={formData.rooms}
                      onChange={(e) => setFormData({...formData, rooms: e.target.value})}
                      placeholder="מספר חדרים"
                    />
                  </div>
                  <div>
                    <Label>מחיר</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="מחיר בשקלים"
                    />
                  </div>
                  <div>
                    <Label>תאריך רכישה</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>הערות</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="הערות נוספות"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    ביטול
                  </Button>
                  <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                    {editingProperty ? 'עדכן' : 'הוסף'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="חיפוש נכס..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Building2 className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין נכסים להצגה</h3>
            <p className="text-gray-400">התחל בהוספת נכס חדש</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-pink-50 to-red-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">כתובת</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">עיר</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">סוג נכס</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">שטח (מ"ר)</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">חדרים</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">מחיר</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">תאריך רכישה</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">הערות</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((property, index) => (
                    <motion.tr
                      key={property.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b hover:bg-pink-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-pink-600" />
                          <span className="font-medium">{property.address}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{property.city}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs">
                          {property.property_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{property.size_sqm || '—'}</td>
                      <td className="px-4 py-3 text-sm text-center">{property.rooms || '—'}</td>
                      <td className="px-4 py-3 text-sm text-center font-semibold text-green-700">
                        {property.price ? `₪${Number(property.price).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {property.purchase_date ? new Date(property.purchase_date).toLocaleDateString('he-IL') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {property.notes || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(property)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm('האם למחוק נכס זה?')) {
                                deleteMutation.mutate(property.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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