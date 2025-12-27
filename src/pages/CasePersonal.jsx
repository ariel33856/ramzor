import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, User, Save, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function CasePersonal() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogStep, setDialogStep] = useState('choose'); // 'choose', 'list' or 'new'
  const [newBorrowerData, setNewBorrowerData] = useState({
    client_name: '',
    last_name: '',
    client_id: '',
    client_phone: '',
    client_email: ''
  });

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: linkedBorrowers = [] } = useQuery({
    queryKey: ['linked-borrowers', caseData?.linked_borrowers],
    queryFn: async () => {
      if (!caseData?.linked_borrowers || caseData.linked_borrowers.length === 0) return [];
      // הסרת כפילויות מהמערך
      const uniqueIds = [...new Set(caseData.linked_borrowers)];
      const promises = uniqueIds.map(id => 
        base44.entities.MortgageCase.filter({ id }).then(res => res[0])
      );
      const results = await Promise.all(promises);
      // סינון של תוצאות null או undefined
      return results.filter(borrower => borrower != null);
    },
    enabled: !!caseData?.linked_borrowers
  });

  const { data: allBorrowers = [] } = useQuery({
    queryKey: ['all-borrowers'],
    queryFn: () => base44.entities.MortgageCase.filter({ is_archived: true, module_id: null })
  });

  const filteredBorrowers = allBorrowers.filter(borrower => 
    borrower.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    borrower.client_id?.includes(searchTerm) ||
    borrower.client_phone?.includes(searchTerm)
  );

  const linkBorrowerMutation = useMutation({
    mutationFn: (borrowerId) => {
      const currentBorrowers = caseData.linked_borrowers || [];
      return base44.entities.MortgageCase.update(caseId, { 
        linked_borrowers: [...currentBorrowers, borrowerId] 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['all-borrowers'] });
      setDialogOpen(false);
      setSearchTerm('');
    }
  });

  const createAndLinkBorrowerMutation = useMutation({
    mutationFn: async (borrowerData) => {
      // יצירת לווה חדש במודול הלווים (is_archived=true, module_id=null)
      const newBorrower = await base44.entities.MortgageCase.create({
        ...borrowerData,
        is_archived: true,
        module_id: null,
        status: 'new',
        urgency: 'medium'
      });
      
      // שיוך הלווה החדש לחשבון הנוכחי
      const currentBorrowers = caseData.linked_borrowers || [];
      await base44.entities.MortgageCase.update(caseId, { 
        linked_borrowers: [...currentBorrowers, newBorrower.id] 
      });
      
      return newBorrower;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['all-borrowers'] });
      setDialogOpen(false);
      setDialogStep('choose');
      setNewBorrowerData({
        client_name: '',
        last_name: '',
        client_id: '',
        client_phone: '',
        client_email: ''
      });
    }
  });

  const unlinkBorrowerMutation = useMutation({
    mutationFn: (borrowerId) => {
      const currentBorrowers = caseData.linked_borrowers || [];
      const updatedBorrowers = currentBorrowers.filter(id => id !== borrowerId);
      return base44.entities.MortgageCase.update(caseId, { 
        linked_borrowers: updatedBorrowers 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
    }
  });

  const [formData, setFormData] = useState({
    client_name: '',
    client_id: '',
    client_phone: '',
    client_email: ''
  });

  const [borrowerName, setBorrowerName] = useState('');

  React.useEffect(() => {
    if (caseData) {
      setFormData({
        client_name: caseData.client_name || '',
        client_id: caseData.client_id || '',
        client_phone: caseData.client_phone || '',
        client_email: caseData.client_email || ''
      });
    }
  }, [caseData]);

  React.useEffect(() => {
    if (linkedBorrowers.length > 0 && linkedBorrowers[0]) {
      setBorrowerName(linkedBorrowers[0].client_name || '');
    }
  }, [linkedBorrowers]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const updateBorrowerMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(linkedBorrowers[0].id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-borrowers'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-2 md:p-3">
      <div className="mx-auto">
        <div className="flex justify-end mb-4">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setDialogStep('choose');
              setSearchTerm('');
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <LinkIcon className="w-4 h-4 ml-2" />
                הוסף לווה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>
                  {dialogStep === 'choose' ? 'הוסף לווה' : 
                   dialogStep === 'new' ? 'הוסף לווה חדש' : 
                   'בחר לווה מהרשימה'}
                </DialogTitle>
              </DialogHeader>
              
              {dialogStep === 'choose' ? (
                <div className="space-y-4 py-4">
                  <Button 
                    className="w-full h-20 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => setDialogStep('new')}
                  >
                    <User className="w-6 h-6 ml-3" />
                    הוסף לווה חדש
                  </Button>
                  
                  <Button 
                    className="w-full h-20 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    onClick={() => setDialogStep('list')}
                  >
                    <LinkIcon className="w-6 h-6 ml-3" />
                    בחר מרשימה קיימת
                  </Button>
                </div>
              ) : dialogStep === 'new' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>שם פרטי *</Label>
                      <Input
                        value={newBorrowerData.client_name}
                        onChange={(e) => setNewBorrowerData({...newBorrowerData, client_name: e.target.value})}
                        placeholder="שם פרטי"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>שם משפחה</Label>
                      <Input
                        value={newBorrowerData.last_name}
                        onChange={(e) => setNewBorrowerData({...newBorrowerData, last_name: e.target.value})}
                        placeholder="שם משפחה"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>תעודת זהות</Label>
                      <Input
                        value={newBorrowerData.client_id}
                        onChange={(e) => setNewBorrowerData({...newBorrowerData, client_id: e.target.value})}
                        placeholder="תעודת זהות"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>טלפון</Label>
                      <Input
                        value={newBorrowerData.client_phone}
                        onChange={(e) => setNewBorrowerData({...newBorrowerData, client_phone: e.target.value})}
                        placeholder="טלפון"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>אימייל</Label>
                      <Input
                        type="email"
                        value={newBorrowerData.client_email}
                        onChange={(e) => setNewBorrowerData({...newBorrowerData, client_email: e.target.value})}
                        placeholder="אימייל"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      onClick={() => createAndLinkBorrowerMutation.mutate(newBorrowerData)}
                      disabled={!newBorrowerData.client_name || createAndLinkBorrowerMutation.isPending}
                    >
                      {createAndLinkBorrowerMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          יוצר...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 ml-2" />
                          שמור וקשר לחשבון
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setDialogStep('choose');
                        setNewBorrowerData({
                          client_name: '',
                          last_name: '',
                          client_id: '',
                          client_phone: '',
                          client_email: ''
                        });
                      }}
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    placeholder="חיפוש לפי שם, ת.ז או טלפון..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredBorrowers.map(borrower => (
                      <div
                        key={borrower.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => linkBorrowerMutation.mutate(borrower.id)}
                      >
                        <p className="font-semibold text-gray-900">{borrower.client_name}</p>
                        <p className="text-sm text-gray-500">{borrower.client_id} • {borrower.client_phone}</p>
                      </div>
                    ))}
                    {filteredBorrowers.length === 0 && (
                      <p className="text-center text-gray-500 py-8">לא נמצאו לווים</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setDialogStep('choose');
                      setSearchTerm('');
                    }}
                  >
                    חזרה
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {linkedBorrowers.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">לווים משויכים ({linkedBorrowers.length})</h3>
            {linkedBorrowers.map((borrower, index) => (
              <div key={`${borrower.id}-${index}`} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Link to={createPageUrl('ArchiveCaseDetails') + `?id=${borrower.id}`}>
                    <h4 className="text-md font-bold text-gray-900 hover:text-blue-600 cursor-pointer">{borrower.client_name}</h4>
                  </Link>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = createPageUrl('ArchiveCaseDetails') + `?id=${borrower.id}`}
                    >
                      צפייה במודול לווים
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm('האם אתה בטוח שברצונך להסיר את השיוך? הלווה לא יימחק מהמודול.')) {
                          unlinkBorrowerMutation.mutate(borrower.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">שם משפחה</Label>
                      <p className="font-medium text-gray-900">{borrower.last_name || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">תעודת זהות</Label>
                      <p className="font-medium text-gray-900">{borrower.client_id || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">טלפון</Label>
                      <p className="font-medium text-gray-900">{borrower.client_phone || '—'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">אימייל</Label>
                      <p className="font-medium text-gray-900">{borrower.client_email || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        

      </div>
    </div>
  );
}