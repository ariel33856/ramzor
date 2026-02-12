import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

const bankLabels = {
  hapoalim: 'הפועלים',
  leumi: 'לאומי',
  mizrahi: 'מזרחי טפחות',
  discount: 'דיסקונט',
  fibi: 'הבינלאומי',
  yahav: 'יהב',
  mercantile: 'מרכנתיל',
  other: 'אחר'
};

const loanTypeLabels = {
  purchase: 'רכישה',
  renovation: 'שיפוץ',
  refinance: 'מחזור',
  equity_release: 'משכנתא הפוכה',
  other: 'אחר'
};

const trackTypes = ['פריים', 'קבועה לא צמודה', 'קבועה צמודה', 'משתנה כל 5 שנים', 'משתנה צמודה', 'אחר'];

export default function SubmissionForm({ onSubmit, onCancel, initialData }) {
  const [form, setForm] = useState(initialData || {
    bank: '',
    bank_branch: '',
    loan_amount: '',
    loan_type: 'purchase',
    loan_period_years: '',
    interest_rate: '',
    monthly_payment: '',
    submission_date: new Date().toISOString().split('T')[0],
    status: 'submitted',
    contact_person: '',
    contact_phone: '',
    notes: '',
    tracks: []
  });

  const timerRef = useRef(null);
  const isFirstRender = useRef(true);
  const isEditing = !!initialData;

  const prepareData = useCallback((formData) => {
    return {
      ...formData,
      loan_amount: formData.loan_amount ? Number(formData.loan_amount) : undefined,
      loan_period_years: formData.loan_period_years ? Number(formData.loan_period_years) : undefined,
      interest_rate: formData.interest_rate ? Number(formData.interest_rate) : undefined,
      monthly_payment: formData.monthly_payment ? Number(formData.monthly_payment) : undefined,
      tracks: (formData.tracks || []).map(t => ({
        ...t,
        amount: t.amount ? Number(t.amount) : undefined,
        period_years: t.period_years ? Number(t.period_years) : undefined,
        interest_rate: t.interest_rate ? Number(t.interest_rate) : undefined,
        monthly_payment: t.monthly_payment ? Number(t.monthly_payment) : undefined,
      }))
    };
  }, []);

  // Auto-save only when editing an existing submission
  useEffect(() => {
    if (!isEditing) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSubmit(prepareData(form)), 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [form, prepareData, isEditing]);

  const handleManualSave = () => {
    onSubmit(prepareData(form));
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addTrack = () => {
    setForm(prev => ({
      ...prev,
      tracks: [...(prev.tracks || []), { track_type: '', amount: '', period_years: '', interest_rate: '', monthly_payment: '' }]
    }));
  };

  const updateTrack = (index, field, value) => {
    setForm(prev => {
      const tracks = [...(prev.tracks || [])];
      tracks[index] = { ...tracks[index], [field]: value };
      return { ...prev, tracks };
    });
  };

  const removeTrack = (index) => {
    setForm(prev => ({
      ...prev,
      tracks: prev.tracks.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Bank & Basic Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">בנק *</Label>
          <Select value={form.bank} onValueChange={(v) => updateField('bank', v)}>
            <SelectTrigger><SelectValue placeholder="בחר בנק" /></SelectTrigger>
            <SelectContent>
              {Object.entries(bankLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">סניף</Label>
          <Input value={form.bank_branch} onChange={e => updateField('bank_branch', e.target.value)} placeholder="סניף" />
        </div>
        <div>
          <Label className="text-xs">סוג הלוואה</Label>
          <Select value={form.loan_type} onValueChange={(v) => updateField('loan_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(loanTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">תאריך הגשה</Label>
          <Input type="date" value={form.submission_date} onChange={e => updateField('submission_date', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">סכום הלוואה מבוקש</Label>
          <Input type="number" value={form.loan_amount} onChange={e => updateField('loan_amount', e.target.value)} placeholder="₪" />
        </div>
        <div>
          <Label className="text-xs">תקופה (שנים)</Label>
          <Input type="number" value={form.loan_period_years} onChange={e => updateField('loan_period_years', e.target.value)} placeholder="שנים" />
        </div>
        <div>
          <Label className="text-xs">ריבית %</Label>
          <Input type="number" step="0.01" value={form.interest_rate} onChange={e => updateField('interest_rate', e.target.value)} placeholder="%" />
        </div>
        <div>
          <Label className="text-xs">החזר חודשי</Label>
          <Input type="number" value={form.monthly_payment} onChange={e => updateField('monthly_payment', e.target.value)} placeholder="₪" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">סטטוס</Label>
          <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">טיוטה</SelectItem>
              <SelectItem value="submitted">הוגש</SelectItem>
              <SelectItem value="in_review">בבדיקה</SelectItem>
              <SelectItem value="approved">אושר</SelectItem>
              <SelectItem value="rejected">נדחה</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">איש קשר בבנק</Label>
          <Input value={form.contact_person} onChange={e => updateField('contact_person', e.target.value)} placeholder="שם" />
        </div>
        <div>
          <Label className="text-xs">טלפון איש קשר</Label>
          <Input value={form.contact_phone} onChange={e => updateField('contact_phone', e.target.value)} placeholder="טלפון" />
        </div>
      </div>

      {/* Tracks */}
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">מסלולי הלוואה</h4>
          <Button size="sm" variant="outline" onClick={addTrack}>
            <Plus className="w-4 h-4 ml-1" />
            הוסף מסלול
          </Button>
        </div>
        {(form.tracks || []).map((track, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2 p-2 bg-white rounded border">
            <div>
              <Label className="text-xs">סוג מסלול</Label>
              <Select value={track.track_type} onValueChange={(v) => updateTrack(i, 'track_type', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  {trackTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">סכום</Label>
              <Input className="h-8 text-xs" type="number" value={track.amount} onChange={e => updateTrack(i, 'amount', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">תקופה (שנים)</Label>
              <Input className="h-8 text-xs" type="number" value={track.period_years} onChange={e => updateTrack(i, 'period_years', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">ריבית %</Label>
              <Input className="h-8 text-xs" type="number" step="0.01" value={track.interest_rate} onChange={e => updateTrack(i, 'interest_rate', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">החזר חודשי</Label>
              <Input className="h-8 text-xs" type="number" value={track.monthly_payment} onChange={e => updateTrack(i, 'monthly_payment', e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => removeTrack(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {(!form.tracks || form.tracks.length === 0) && (
          <p className="text-xs text-gray-400 text-center py-2">לא נוספו מסלולים</p>
        )}
      </div>

      <div>
        <Label className="text-xs">הערות</Label>
        <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder="הערות נוספות..." rows={2} />
      </div>


    </div>
  );
}