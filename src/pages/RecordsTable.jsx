import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Archive, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPageUrl } from '@/utils';

export default function RecordsTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedPropertyForLink, setSelectedPropertyForLink] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
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

  // Load user data
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['property-assets'],
    queryFn: () => base44.entities.PropertyAsset.list('-created_date'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  const { data: allCases = [] } = useQuery({
    queryKey: ['all-cases'],
    queryFn: () => base44.entities.MortgageCase.list(),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyAsset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PropertyAsset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropertyAsset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
    }
  });

  const linkPropertyMutation = useMutation({
    mutationFn: (caseId) => {
      return base44.entities.PropertyAsset.update(selectedPropertyForLink, { case_id: caseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-assets'] });
      setLinkDialogOpen(false);
      setSelectedPropertyForLink(null);
      setLinkSearchTerm('');
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
    setEditingRecord(null);
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
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      address: record.address || '',
      city: record.city || '',
      property_type: record.property_type || 'דירה',
      size_sqm: record.size_sqm || '',
      rooms: record.rooms || '',
      floor: record.floor || '',
      price: record.price || '',
      owner_name: record.owner_name || '',
      owner_phone: record.owner_phone || '',
      status: record.status || 'פנוי',
      notes: record.notes || ''
    });
    setDialogOpen(true);
  };

  const filteredRecords = records.filter(record =>
    record.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.property_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLinkedCaseName = (caseId) => {
    const caseData = allCases.find(c => c.id === caseId);
    if (!caseData) return 'לא מוצא';
    return `${caseData.client_name} ${caseData.last_name || ''} (${caseData.account_number})`;
  };

  const filteredCases = allCases.filter(c => 
    !c.is_archived &&
    (c.client_name?.toLowerCase().includes(linkSearchTerm.toLowerCase()) ||
    c.account_number?.toString().includes(linkSearchTerm))
  );

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden p-1">
      {/* Header */}
      <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-1">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <Button 
            onClick={() => {
              setEditingRecord(null);
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-5 h-5 ml-2" />
            נכס חדש
          </Button>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'עריכת נכס' : 'נכס חדש'}</DialogTitle>
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
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    ביטול
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingRecord ? 'עדכן' : 'צור'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex-1 relative max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין נכסים להצגה</h3>
            <p className="text-gray-400">התחל ביצירת נכס חדש</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-200px)]">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">כתובת</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">עיר</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">סוג</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">חשבון משויך</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">שטח</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">חדרים</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">מחיר</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">בעלים</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">סטטוס</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                      onClick={() => handleEdit(record)}
                    >
                      <td className="px-6 py-3">
                        <span className="font-semibold text-gray-900">{record.address}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-600">{record.city}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-600">{record.property_type}</span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {record.case_id ? (
                          <span className="text-green-700 font-medium">{getLinkedCaseName(record.case_id)}</span>
                        ) : (
                          <span className="text-gray-400 italic">לא משויך</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-600">{record.size_sqm ? `${record.size_sqm} מ"ר` : '—'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-600">{record.rooms || '—'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-900 font-medium">
                          {record.price ? `₪${parseInt(record.price).toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-gray-600">{record.owner_name || '—'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'פנוי' ? 'bg-green-100 text-green-800' :
                          record.status === 'תפוס' ? 'bg-gray-100 text-gray-800' :
                          record.status === 'להשכרה' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPropertyForLink(record.id);
                              setLinkDialogOpen(true);
                            }}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                            title="שייך לחשבון"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(record);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('האם למחוק נכס זה?')) {
                                deleteMutation.mutate(record.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
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

      {/* Link Property Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>שייך נכס לחשבון</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="חיפוש לפי שם או מספר חשבון..."
              value={linkSearchTerm}
              onChange={(e) => setLinkSearchTerm(e.target.value)}
            />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCases.map(caseData => (
                <div
                  key={caseData.id}
                  className="p-4 border rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                  onClick={() => linkPropertyMutation.mutate(caseData.id)}
                >
                  <p className="font-semibold text-gray-900">{caseData.client_name} {caseData.last_name || ''}</p>
                  <p className="text-sm text-gray-500">חשבון מס׳ {caseData.account_number}</p>
                </div>
              ))}
              {filteredCases.length === 0 && (
                <p className="text-center text-gray-500 py-8">לא נמצאו חשבונות</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}