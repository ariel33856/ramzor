import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import ExternalContacts from '../transactions/ExternalContacts';

export default function PersonPropertiesTab({ 
  person, personId, linkedProperties, setLinkedProperties, 
  allProperties, updatePersonMutation 
}) {
  const queryClient = useQueryClient();
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [createPropertyDialogOpen, setCreatePropertyDialogOpen] = useState(false);
  const [activePropertyIndex, setActivePropertyIndex] = useState(0);
  const [propertyFormData, setPropertyFormData] = useState({
    address: '', city: '', property_type: 'דירה', size_sqm: '', rooms: '', floor: '', price: '', status: 'פנוי', notes: ''
  });

  // Get case ID from URL to also show case-linked properties
  const urlCaseId = new URLSearchParams(window.location.search).get('id');

  // Fetch properties linked to the case (via case_id or property_id on case)
  const { data: caseProperties = [] } = useQuery({
    queryKey: ['case-properties-for-person', urlCaseId],
    queryFn: () => SecureEntities.PropertyAsset.listForCase(urlCaseId),
    enabled: !!urlCaseId,
    staleTime: 30000
  });

  const linkedPropertiesData = allProperties.filter(prop => linkedProperties.includes(prop.id));

  // Merge: person's linked properties + case properties (deduplicated)
  const allDisplayProperties = React.useMemo(() => {
    const map = new Map();
    linkedPropertiesData.forEach(p => map.set(p.id, { ...p, source: 'person' }));
    caseProperties.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, { ...p, source: 'case' });
    });
    return Array.from(map.values());
  }, [linkedPropertiesData, caseProperties]);

  const filteredProperties = allProperties.filter(prop =>
    !linkedProperties.includes(prop.id) &&
    (prop.address?.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
    prop.city?.toLowerCase().includes(propertySearchTerm.toLowerCase()))
  );

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: () => SecureEntities.Transaction.list('-transaction_date'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => SecureEntities.Transaction.create(data),
    onSuccess: () => queryClient.invalidateQueries(['all-transactions'])
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }) => SecureEntities.Transaction.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['all-transactions'])
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id) => SecureEntities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['all-transactions'])
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data) => {
      const newProperty = await base44.entities.PropertyAsset.create(data);
      const updatedProperties = [...linkedProperties, newProperty.id];
      await base44.entities.Person.update(personId, { linked_properties: updatedProperties });
      return newProperty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['all-properties'] });
      setCreatePropertyDialogOpen(false);
      setPropertyFormData({ address: '', city: '', property_type: 'דירה', size_sqm: '', rooms: '', floor: '', price: '', status: 'פנוי', notes: '' });
    }
  });

  const typeLabels = { purchase: 'רכישה', renovation: 'שיפוץ', expansion: 'הרחבה', loan_consolidation: 'איחוד הלוואות', general_purpose: 'כל מטרה' };
  const statusLabels = { pending: 'בתהליך', completed: 'הושלם', cancelled: 'בוטל' };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-teal-200 hover:border-teal-400">
                <LinkIcon className="w-4 h-4 ml-2" />
                שייך נכס קיים
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader><DialogTitle>בחר נכס לשיוך</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="חיפוש לפי כתובת או עיר..." value={propertySearchTerm} onChange={(e) => setPropertySearchTerm(e.target.value)} />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProperties.map(property => (
                    <div key={property.id} className="p-4 border rounded-lg hover:bg-teal-50 cursor-pointer transition-colors" onClick={() => {
                      const updatedProperties = [...linkedProperties, property.id];
                      setLinkedProperties(updatedProperties);
                      updatePersonMutation.mutate({ linked_properties: updatedProperties });
                      setPropertyDialogOpen(false);
                      setPropertySearchTerm('');
                    }}>
                      <p className="font-semibold text-gray-900">{property.address}</p>
                      <p className="text-sm text-gray-500">{property.city} • {property.property_type}</p>
                    </div>
                  ))}
                  {filteredProperties.length === 0 && <p className="text-center text-gray-500 py-8">לא נמצאו נכסים</p>}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setCreatePropertyDialogOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-4 h-4 ml-2" />
            נכס חדש
          </Button>
        </div>
      </div>
      
      {allDisplayProperties.length === 0 ? (
        <p className="text-center text-gray-500 py-8">אין נכסים משויכים</p>
      ) : (
        <div>
          <div className="flex mb-0">
            {allDisplayProperties.map((property, index) => (
              <button
                key={property.id}
                onClick={() => setActivePropertyIndex(index)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-2 border-b-0 transition-all ${
                  activePropertyIndex === index
                    ? 'bg-white text-purple-700 border-purple-400 relative z-10'
                    : 'bg-purple-100 text-purple-500 border-purple-200 hover:bg-purple-50'
                }`}
                style={{ marginBottom: '-2px' }}
              >
                {property.source === 'case' && <span className="text-xs text-teal-600 ml-1">(חשבון)</span>}
                נכס {index + 1}: {property.address || 'ללא כתובת'}, {property.city || ''}
              </button>
            ))}
          </div>
          
          {allDisplayProperties.filter((_, i) => i === activePropertyIndex).map((property) => {
            const updateField = (fieldName, value) => {
              const data = { [fieldName]: value };
              if (['size_sqm', 'rooms', 'floor', 'price'].includes(fieldName)) data[fieldName] = value ? Number(value) : undefined;
              base44.entities.PropertyAsset.update(property.id, data).then(() => queryClient.invalidateQueries({ queryKey: ['all-properties'] }));
            };
            const propertyTransactions = allTransactions.filter(t => t.property_id === property.id);

            return (
              <motion.div key={property.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>כתובת</Label><Input value={property.address || ''} onChange={(e) => updateField('address', e.target.value)} className="font-semibold" /></div>
                  <div><Label>עיר</Label><Input value={property.city || ''} onChange={(e) => updateField('city', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><Label>סוג נכס</Label>
                    <select value={property.property_type || 'דירה'} onChange={(e) => updateField('property_type', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background">
                      {['דירה','בית','דירת גן','פנטהאוז','משרד','חנות','מחסן','קרקע','אחר'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div><Label>סטטוס</Label>
                    <select value={property.status || 'פנוי'} onChange={(e) => updateField('status', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background">
                      {['פנוי','תפוס','להשכרה','למכירה'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div><Label>שטח (מ"ר)</Label><Input type="number" value={property.size_sqm || ''} onChange={(e) => updateField('size_sqm', e.target.value)} /></div>
                  <div><Label>מספר חדרים</Label><Input type="number" step="0.5" value={property.rooms || ''} onChange={(e) => updateField('rooms', e.target.value)} /></div>
                  <div><Label>קומה</Label><Input type="number" value={property.floor || ''} onChange={(e) => updateField('floor', e.target.value)} /></div>
                </div>
                <div className="mt-4"><Label>מחיר (₪)</Label><Input type="number" value={property.price || ''} onChange={(e) => updateField('price', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><Label>שם בעלים</Label><Input value={property.owner_name || ''} onChange={(e) => updateField('owner_name', e.target.value)} /></div>
                  <div><Label>טלפון בעלים</Label><Input value={property.owner_phone || ''} onChange={(e) => updateField('owner_phone', e.target.value)} /></div>
                </div>
                <div className="mt-4"><Label>הערות</Label><Textarea value={property.notes || ''} onChange={(e) => updateField('notes', e.target.value)} rows={3} /></div>
                
                {/* Transactions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-900">עסקאות</h4>
                    <Button size="sm" onClick={() => createTransactionMutation.mutate({ property_id: property.id, transaction_type: 'purchase', transaction_date: new Date().toISOString().split('T')[0], status: 'pending' })} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-3 h-3 ml-1" />עסקה חדשה
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {propertyTransactions.map((transaction, idx) => (
                      <div key={transaction.id} className="p-3 bg-gradient-to-br from-blue-50/50 to-white border-2 border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-semibold text-gray-700">עסקה #{idx + 1} - {typeLabels[transaction.transaction_type]}</h5>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm('האם למחוק עסקה זו?')) deleteTransactionMutation.mutate(transaction.id); }} className="h-6 w-6 text-red-600 hover:text-red-800 hover:bg-red-100"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div><Label className="text-xs">סוג עסקה</Label>
                            <Select value={transaction.transaction_type} onValueChange={(val) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, transaction_type: val } })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{Object.entries(typeLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><Label className="text-xs">תאריך</Label><Input type="date" className="h-8" value={transaction.transaction_date || ''} onChange={(e) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, transaction_date: e.target.value } })} /></div>
                          <div><Label className="text-xs">סטטוס</Label>
                            <Select value={transaction.status} onValueChange={(val) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, status: val } })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{Object.entries(statusLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div><Label className="text-xs">קונה</Label><Input className="h-8" value={transaction.buyer_name || ''} onChange={(e) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, buyer_name: e.target.value } })} /></div>
                          <div><Label className="text-xs">מוכר</Label><Input className="h-8" value={transaction.seller_name || ''} onChange={(e) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, seller_name: e.target.value } })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div><Label className="text-xs">סכום</Label><Input className="h-8" type="number" value={transaction.amount || ''} onChange={(e) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, amount: e.target.value ? parseFloat(e.target.value) : null } })} /></div>
                          <div><Label className="text-xs">עמלה</Label><Input className="h-8" type="number" value={transaction.commission || ''} onChange={(e) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, commission: e.target.value ? parseFloat(e.target.value) : null } })} /></div>
                        </div>
                        <div className="mt-3"><ExternalContacts contacts={transaction.external_contacts || []} onChange={(contacts) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, external_contacts: contacts } })} /></div>
                        <div className="mt-3"><Label className="text-xs">הערות</Label><Textarea className="text-sm" value={transaction.notes || ''} onChange={(e) => updateTransactionMutation.mutate({ id: transaction.id, data: { ...transaction, notes: e.target.value } })} rows={2} /></div>
                      </div>
                    ))}
                    {propertyTransactions.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">אין עסקאות - לחץ על "עסקה חדשה" כדי להתחיל</div>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Property Dialog */}
      <Dialog open={createPropertyDialogOpen} onOpenChange={setCreatePropertyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>נכס חדש</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createPropertyMutation.mutate({
              ...propertyFormData,
              size_sqm: propertyFormData.size_sqm ? Number(propertyFormData.size_sqm) : undefined,
              rooms: propertyFormData.rooms ? Number(propertyFormData.rooms) : undefined,
              floor: propertyFormData.floor ? Number(propertyFormData.floor) : undefined,
              price: propertyFormData.price ? Number(propertyFormData.price) : undefined
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>כתובת *</Label><Input value={propertyFormData.address} onChange={(e) => setPropertyFormData({...propertyFormData, address: e.target.value})} required placeholder="רחוב ומספר בית" /></div>
              <div><Label>עיר *</Label><Input value={propertyFormData.city} onChange={(e) => setPropertyFormData({...propertyFormData, city: e.target.value})} required placeholder="שם העיר" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>סוג נכס *</Label>
                <select value={propertyFormData.property_type} onChange={(e) => setPropertyFormData({...propertyFormData, property_type: e.target.value})} className="w-full h-9 px-3 rounded-md border border-input bg-background" required>
                  {['דירה','בית','דירת גן','פנטהאוז','משרד','חנות','מחסן','קרקע','אחר'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div><Label>סטטוס</Label>
                <select value={propertyFormData.status} onChange={(e) => setPropertyFormData({...propertyFormData, status: e.target.value})} className="w-full h-9 px-3 rounded-md border border-input bg-background">
                  {['פנוי','תפוס','להשכרה','למכירה'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>שטח (מ"ר)</Label><Input type="number" value={propertyFormData.size_sqm} onChange={(e) => setPropertyFormData({...propertyFormData, size_sqm: e.target.value})} placeholder="0" /></div>
              <div><Label>מספר חדרים</Label><Input type="number" step="0.5" value={propertyFormData.rooms} onChange={(e) => setPropertyFormData({...propertyFormData, rooms: e.target.value})} placeholder="0" /></div>
              <div><Label>קומה</Label><Input type="number" value={propertyFormData.floor} onChange={(e) => setPropertyFormData({...propertyFormData, floor: e.target.value})} placeholder="0" /></div>
            </div>
            <div><Label>מחיר (₪)</Label><Input type="number" value={propertyFormData.price} onChange={(e) => setPropertyFormData({...propertyFormData, price: e.target.value})} placeholder="0" /></div>
            <div><Label>הערות</Label><Input value={propertyFormData.notes} onChange={(e) => setPropertyFormData({...propertyFormData, notes: e.target.value})} placeholder="הערות נוספות..." /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreatePropertyDialogOpen(false)}>ביטול</Button>
              <Button type="submit" disabled={createPropertyMutation.isPending}>צור ושייך</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}