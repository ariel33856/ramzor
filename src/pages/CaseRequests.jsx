import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';

export default function CaseRequests() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [requestType, setRequestType] = useState('');
  const [periodMonths, setPeriodMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', caseId],
    queryFn: () => base44.entities.Request.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Request.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', caseId] });
      setDialogOpen(false);
      setAmount('');
      setRequestType('');
      setPeriodMonths('');
      setInterestRate('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Request.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  const autoSaveTimer = useRef(null);
  const [saved, setSaved] = useState(false);

  const autoSave = (newAmount, newType, newPeriod, newInterest) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaved(false);
    if (!newAmount || !newType) return;
    autoSaveTimer.current = setTimeout(() => {
      createMutation.mutate({ case_id: caseId, amount: Number(newAmount), request_type: newType, period_months: newPeriod ? Number(newPeriod) : undefined, interest_rate: newInterest ? Number(newInterest) : undefined });
    }, 800);
  };

  const handleAmountChange = (val) => {
    setAmount(val);
    autoSave(val, requestType, periodMonths, interestRate);
  };

  const handleTypeChange = (val) => {
    setRequestType(val);
    autoSave(amount, val, periodMonths, interestRate);
  };

  const handlePeriodChange = (val) => {
    setPeriodMonths(val);
    autoSave(amount, requestType, val, interestRate);
  };

  const handleInterestChange = (val) => {
    setInterestRate(val);
    autoSave(amount, requestType, periodMonths, val);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-2" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700">
          <Plus className="w-4 h-4 ml-2" />
          בקשה חדשה
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">טוען...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-fuchsia-200 p-6 max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">בקשה חדשה</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">סוג בקשה</label>
              <Select value={requestType} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג בקשה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הלוואה">הלוואה</SelectItem>
                  <SelectItem value="משכנתא">משכנתא</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">סכום</label>
              <Input type="number" placeholder="הזן סכום..." value={amount} onChange={(e) => handleAmountChange(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">תקופה בחודשים</label>
              <Input type="number" placeholder="הזן מספר חודשים..." value={periodMonths} onChange={(e) => handlePeriodChange(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">ריבית</label>
              <Input type="number" step="0.01" placeholder="הזן ריבית..." value={interestRate} onChange={(e) => handleInterestChange(e.target.value)} />
            </div>
            {saved && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                נשמר
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map((req, index) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border-2 border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-6">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${req.request_type === 'משכנתא' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {req.request_type}
                </div>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(req.amount)}</span>
                {req.period_months && <span className="text-sm text-gray-500">{req.period_months} חודשים</span>}
                {req.interest_rate && <span className="text-sm text-gray-500">ריבית {req.interest_rate}%</span>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(req.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>בקשה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">סכום</label>
              <Input type="number" placeholder="הזן סכום..." value={amount} onChange={(e) => handleAmountChange(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">תקופה בחודשים</label>
              <Input type="number" placeholder="הזן מספר חודשים..." value={periodMonths} onChange={(e) => handlePeriodChange(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">ריבית</label>
              <Input type="number" step="0.01" placeholder="הזן ריבית..." value={interestRate} onChange={(e) => handleInterestChange(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">סוג בקשה</label>
              <Select value={requestType} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג בקשה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הלוואה">הלוואה</SelectItem>
                  <SelectItem value="משכנתא">משכנתא</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {saved && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                נשמר
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}