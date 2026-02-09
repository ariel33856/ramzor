import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
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
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Request.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', caseId] })
  });

  const handleSubmit = () => {
    if (!amount || !requestType) return;
    createMutation.mutate({ case_id: caseId, amount: Number(amount), request_type: requestType });
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">סכום</label>
              <Input type="number" placeholder="הזן סכום..." value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">סוג בקשה</label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג בקשה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הלוואה">הלוואה</SelectItem>
                  <SelectItem value="משכנתא">משכנתא</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={!amount || !requestType} className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700">
              הוסף בקשה
            </Button>
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
              <Input type="number" placeholder="הזן סכום..." value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">סוג בקשה</label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג בקשה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="הלוואה">הלוואה</SelectItem>
                  <SelectItem value="משכנתא">משכנתא</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={!amount || !requestType} className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700">
              הוסף בקשה
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}