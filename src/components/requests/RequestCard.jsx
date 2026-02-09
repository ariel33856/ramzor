import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

const formatCurrency = (val) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

const calcMonthlyPayment = (amt, months, rate) => {
  if (!amt || !months || !rate) return null;
  const monthlyRate = (rate / 100) / 12;
  const n = months;
  const payment = amt * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  return Math.round(payment);
};

export default function RequestCard({ request, index, onUpdate, onDelete }) {
  const [requestType, setRequestType] = useState(request.request_type || '');
  const [amount, setAmount] = useState(request.amount?.toString() || '');
  const [periodMonths, setPeriodMonths] = useState(request.period_months?.toString() || '');
  const [interestRate, setInterestRate] = useState(request.interest_rate?.toString() || '');
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  const doSave = (data) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(() => {
      onUpdate(request.id, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const handleTypeChange = (val) => {
    setRequestType(val);
    doSave({ request_type: val, amount: Number(amount), period_months: periodMonths ? Number(periodMonths) : undefined, interest_rate: interestRate ? Number(interestRate) : undefined });
  };

  const handleAmountChange = (val) => {
    setAmount(val);
    doSave({ request_type: requestType, amount: Number(val), period_months: periodMonths ? Number(periodMonths) : undefined, interest_rate: interestRate ? Number(interestRate) : undefined });
  };

  const handlePeriodChange = (val) => {
    setPeriodMonths(val);
    doSave({ request_type: requestType, amount: Number(amount), period_months: val ? Number(val) : undefined, interest_rate: interestRate ? Number(interestRate) : undefined });
  };

  const handleInterestChange = (val) => {
    setInterestRate(val);
    doSave({ request_type: requestType, amount: Number(amount), period_months: periodMonths ? Number(periodMonths) : undefined, interest_rate: val ? Number(val) : undefined });
  };

  const monthly = calcMonthlyPayment(Number(amount), Number(periodMonths), Number(interestRate));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-500">בקשה {index + 1}</span>
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-xs">
              <Check className="w-3 h-3" /> נשמר
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(request.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">סוג בקשה</label>
          <Select value={requestType} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="בחר סוג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="הלוואה">הלוואה</SelectItem>
              <SelectItem value="משכנתא">משכנתא</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">סכום</label>
          <Input type="number" className="h-9" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="סכום..." />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">תקופה בחודשים</label>
          <Input type="number" className="h-9" value={periodMonths} onChange={(e) => handlePeriodChange(e.target.value)} placeholder="חודשים..." />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">ריבית</label>
          <Input type="number" step="0.01" className="h-9" value={interestRate} onChange={(e) => handleInterestChange(e.target.value)} placeholder="ריבית..." />
        </div>
      </div>
      {monthly && (
        <div className="mt-3 p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2">
          <span className="text-xs font-medium text-indigo-700">החזר חודשי משוער:</span>
          <span className="text-lg font-bold text-indigo-900">{formatCurrency(monthly)}</span>
        </div>
      )}
    </motion.div>
  );
}