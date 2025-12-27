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

export default function NewCase() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState('');
  
  const urlParams = new URLSearchParams(window.location.search);
  const isArchive = urlParams.get('archive') === 'true';
  const moduleId = urlParams.get('moduleId');

  const handleSubmit = async () => {
    if (!clientName.trim()) return;
    
    setSaving(true);

    // Get all existing cases to calculate next account number
    const allCases = await base44.entities.MortgageCase.list('-created_date', 1);
    const lastAccountNumber = allCases.length > 0 && allCases[0].account_number 
      ? allCases[0].account_number 
      : 72515;
    const nextAccountNumber = lastAccountNumber + 1;

    const caseData = {
      client_name: clientName,
      client_id: '',
      loan_amount: 0,
      account_number: nextAccountNumber,
      status: 'new',
      urgency: 'medium',
      progress_percentage: 0,
      is_archived: isArchive,
      module_id: moduleId || null
    };

    const newCase = await base44.entities.MortgageCase.create(caseData);

    // Create audit log
    await base44.entities.AuditLog.create({
      case_id: newCase.id,
      action_type: 'status_change',
      actor: 'user',
      description: `חשבון חדש נפתח עבור ${clientName}`,
      severity: 'info'
    });

    setSaving(false);
    if (moduleId) {
      navigate(createPageUrl(`ModuleView?moduleId=${moduleId}`));
    } else if (isArchive) {
      navigate(createPageUrl(`ArchiveAccounts`));
    } else {
      navigate(createPageUrl(`Dashboard`));
    }
  };



  return (
    <div className="min-h-screen bg-gray-50/50 p-2 md:p-3">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">חשבון חדש</h1>
                <p className="text-gray-500">הזן שם לקוח ליצירת חשבון</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-lg">שם לקוח *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="הכנס שם לקוח..."
                  className="mt-2 text-lg h-12"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={saving || !clientName.trim()}
                className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    יוצר חשבון...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 ml-2" />
                    צור חשבון
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}