import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  User, Phone, Mail, Home, Banknote, Users, 
  Building2, ChevronRight, ChevronLeft, Check, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const steps = [
  { id: 1, title: 'פרטי לקוח', icon: User },
  { id: 2, title: 'פרטי נכס', icon: Home },
  { id: 3, title: 'פרטים פיננסיים', icon: Banknote }
];

export default function NewCase() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    client_id: '',
    client_phone: '',
    client_email: '',
    property_value: '',
    loan_amount: '',
    monthly_income: '',
    monthly_expenses: '',
    family_size: '',
    target_bank: '',
    urgency: 'medium',
    notes: '',
    status: 'new',
    progress_percentage: 0
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);

    // Calculate financial metrics
    const propertyValue = parseFloat(formData.property_value) || 0;
    const loanAmount = parseFloat(formData.loan_amount) || 0;
    const monthlyIncome = parseFloat(formData.monthly_income) || 0;
    const monthlyExpenses = parseFloat(formData.monthly_expenses) || 0;
    const familySize = parseInt(formData.family_size) || 1;

    const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
    // Assume monthly mortgage payment is loan / 300 (rough estimate for 25 years)
    const estimatedPayment = loanAmount / 300;
    const dti = monthlyIncome > 0 ? ((monthlyExpenses + estimatedPayment) / monthlyIncome) * 100 : 0;
    const incomePerCapita = familySize > 0 ? (monthlyIncome - monthlyExpenses - estimatedPayment) / familySize : 0;

    const caseData = {
      ...formData,
      property_value: propertyValue,
      loan_amount: loanAmount,
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      family_size: familySize,
      ltv_ratio: Math.round(ltv * 10) / 10,
      dti_ratio: Math.round(dti * 10) / 10,
      income_per_capita: Math.round(incomePerCapita),
      red_flags: []
    };

    // Add red flags based on metrics
    if (ltv > 75) caseData.red_flags.push('LTV גבוה מ-75%');
    if (dti > 40) caseData.red_flags.push('DTI גבוה מ-40%');
    if (incomePerCapita < 2500) caseData.red_flags.push('הכנסה לנפש נמוכה');

    const newCase = await base44.entities.MortgageCase.create(caseData);

    // Create initial milestones
    const milestones = [
      { milestone_type: 'initial_consultation', title: 'פגישה ראשונית', status: 'completed', progress: 100 },
      { milestone_type: 'document_collection', title: 'איסוף מסמכים', status: 'in_progress', progress: 0 },
      { milestone_type: 'document_verification', title: 'אימות מסמכים', status: 'pending', progress: 0 },
      { milestone_type: 'financial_analysis', title: 'ניתוח פיננסי', status: 'pending', progress: 0 },
      { milestone_type: 'bank_selection', title: 'בחירת בנק', status: 'pending', progress: 0 },
      { milestone_type: 'bank_submission', title: 'הגשה לבנק', status: 'pending', progress: 0 },
      { milestone_type: 'bank_approval', title: 'אישור בנקאי', status: 'pending', progress: 0 },
      { milestone_type: 'signing', title: 'חתימת מסמכים', status: 'pending', progress: 0 },
      { milestone_type: 'completion', title: 'השלמה', status: 'pending', progress: 0 }
    ];

    await base44.entities.Milestone.bulkCreate(
      milestones.map(m => ({ ...m, case_id: newCase.id }))
    );

    // Create audit log
    await base44.entities.AuditLog.create({
      case_id: newCase.id,
      action_type: 'status_change',
      actor: 'user',
      description: `תיק חדש נפתח עבור ${formData.client_name}`,
      severity: 'info'
    });

    setSaving(false);
    navigate(createPageUrl(`CaseDetails?id=${newCase.id}`));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>שם מלא *</Label>
                <div className="relative mt-1.5">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={formData.client_name}
                    onChange={(e) => updateField('client_name', e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="pr-10"
                  />
                </div>
              </div>
              <div>
                <Label>תעודת זהות *</Label>
                <div className="relative mt-1.5">
                  <Input
                    value={formData.client_id}
                    onChange={(e) => updateField('client_id', e.target.value)}
                    placeholder="000000000"
                    maxLength={9}
                  />
                </div>
              </div>
              <div>
                <Label>טלפון</Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={formData.client_phone}
                    onChange={(e) => updateField('client_phone', e.target.value)}
                    placeholder="050-0000000"
                    className="pr-10"
                  />
                </div>
              </div>
              <div>
                <Label>אימייל</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => updateField('client_email', e.target.value)}
                    placeholder="email@example.com"
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>מספר נפשות במשק הבית</Label>
              <div className="relative mt-1.5">
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  value={formData.family_size}
                  onChange={(e) => updateField('family_size', e.target.value)}
                  placeholder="4"
                  className="pr-10"
                  min={1}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>שווי הנכס (₪) *</Label>
                <div className="relative mt-1.5">
                  <Home className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.property_value}
                    onChange={(e) => updateField('property_value', e.target.value)}
                    placeholder="2,000,000"
                    className="pr-10"
                  />
                </div>
              </div>
              <div>
                <Label>סכום הלוואה מבוקש (₪) *</Label>
                <div className="relative mt-1.5">
                  <Banknote className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.loan_amount}
                    onChange={(e) => updateField('loan_amount', e.target.value)}
                    placeholder="1,400,000"
                    className="pr-10"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>בנק יעד</Label>
              <Select value={formData.target_bank} onValueChange={(v) => updateField('target_bank', v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="בחר בנק" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hapoalim">בנק הפועלים</SelectItem>
                  <SelectItem value="leumi">בנק לאומי</SelectItem>
                  <SelectItem value="mizrahi">מזרחי טפחות</SelectItem>
                  <SelectItem value="discount">בנק דיסקונט</SelectItem>
                  <SelectItem value="fibi">הבינלאומי</SelectItem>
                  <SelectItem value="other">אחר / לא ידוע</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>הכנסה חודשית ברוטו (₪)</Label>
                <Input
                  type="number"
                  value={formData.monthly_income}
                  onChange={(e) => updateField('monthly_income', e.target.value)}
                  placeholder="25,000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>התחייבויות חודשיות (₪)</Label>
                <Input
                  type="number"
                  value={formData.monthly_expenses}
                  onChange={(e) => updateField('monthly_expenses', e.target.value)}
                  placeholder="3,000"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>רמת דחיפות</Label>
              <Select value={formData.urgency} onValueChange={(v) => updateField('urgency', v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="medium">בינונית</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="critical">קריטית</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>הערות נוספות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="מידע נוסף שחשוב לדעת..."
                className="mt-1.5 h-24"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">פתיחת תיק חדש</h1>
            <p className="text-gray-500 mt-1">מלא את הפרטים להתחלת תהליך המשכנתא</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isCompleted ? 'bg-emerald-500 text-white' :
                      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <div className="hidden md:block">
                      <p className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-400">שלב {step.id}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {renderStep()}

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-5 h-5 ml-1" />
                הקודם
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  הבא
                  <ChevronRight className="w-5 h-5 mr-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !formData.client_name || !formData.client_id || !formData.loan_amount}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      יוצר תיק...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 ml-2" />
                      צור תיק
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}