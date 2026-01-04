import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  User, Phone, Mail, Home, Banknote, Users, 
  Building2, ChevronRight, ChevronLeft, Check, Loader2, Search, Plus, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function NewCase() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewBorrowerForm, setShowNewBorrowerForm] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [newBorrowerData, setNewBorrowerData] = useState({
    client_name: '',
    last_name: '',
    client_id: '',
    client_phone: '',
    client_email: ''
  });
  
  const urlParams = new URLSearchParams(window.location.search);
  const isArchive = urlParams.get('archive') === 'true';
  const moduleId = urlParams.get('moduleId');

  const { data: allPersons = [] } = useQuery({
    queryKey: ['all-persons'],
    queryFn: () => base44.entities.Person.list()
  });

  const filteredPersons = allPersons.filter(person => 
    person.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.id_number?.includes(searchTerm) ||
    person.phone?.includes(searchTerm)
  );

  const handleCreateWithPerson = async (personId) => {
    setSaving(true);

    const caseData = {
      client_name: '',
      status: 'new',
      urgency: 'medium',
      progress_percentage: 0,
      is_archived: isArchive,
      module_id: moduleId || null
    };

    // Only add account number for main accounts module (no moduleId)
    if (!moduleId) {
      const allCases = await base44.entities.MortgageCase.list();
      const accountNumbers = allCases
        .filter(c => c.account_number)
        .map(c => c.account_number);
      const maxAccountNumber = accountNumbers.length > 0 
        ? Math.max(...accountNumbers)
        : 72515;
      caseData.account_number = maxAccountNumber + 1;
    }

    const newCase = await base44.entities.MortgageCase.create(caseData);

    // Link person to account
    const person = await base44.entities.Person.filter({ id: personId }).then(res => res[0]);
    const linkedAccounts = person.linked_accounts || [];
    await base44.entities.Person.update(personId, {
      linked_accounts: [...linkedAccounts, newCase.id]
    });

    // Create audit log
    await base44.entities.AuditLog.create({
      case_id: newCase.id,
      action_type: 'status_change',
      actor: 'user',
      description: `חשבון חדש נפתח`,
      severity: 'info'
    });

    setSaving(false);
    if (moduleId) {
      navigate(createPageUrl(`ModuleView?moduleId=${moduleId}`));
    } else if (isArchive) {
      navigate(createPageUrl(`ArchiveAccounts`));
    } else {
      navigate(createPageUrl(`CaseDetails?id=${newCase.id}&new=true&accountNumber=${newCase.account_number}`));
    }
  };

  const handleCreateNewPerson = async () => {
    if (!newBorrowerData.client_name.trim()) return;
    
    setSaving(true);

    // Create new person in Person entity
    const newPerson = await base44.entities.Person.create({
      first_name: newBorrowerData.client_name,
      last_name: newBorrowerData.last_name || '',
      id_number: newBorrowerData.client_id || '',
      phone: newBorrowerData.client_phone || '',
      email: newBorrowerData.client_email || '',
      type: 'איש קשר'
    });

    // Create new MortgageCase
    const caseData = {
      client_name: '',
      status: 'new',
      urgency: 'medium',
      progress_percentage: 0,
      is_archived: isArchive,
      module_id: moduleId || null,
      person_id: newPerson.id
    };

    // Only add account number for main accounts module (no moduleId)
    if (!moduleId) {
      const allCases = await base44.entities.MortgageCase.list();
      const accountNumbers = allCases
        .filter(c => c.account_number)
        .map(c => c.account_number);
      const maxAccountNumber = accountNumbers.length > 0 
        ? Math.max(...accountNumbers)
        : 72515;
      caseData.account_number = maxAccountNumber + 1;
    }

    const newCase = await base44.entities.MortgageCase.create(caseData);

    // Link person to account
    await base44.entities.Person.update(newPerson.id, {
      linked_accounts: [newCase.id]
    });

    // Create audit log
    await base44.entities.AuditLog.create({
      case_id: newCase.id,
      action_type: 'status_change',
      actor: 'user',
      description: `חשבון חדש נפתח`,
      severity: 'info'
    });

    setSaving(false);
    if (moduleId) {
      navigate(createPageUrl(`ModuleView?moduleId=${moduleId}`));
    } else if (isArchive) {
      navigate(createPageUrl(`ArchiveAccounts`));
    } else {
      navigate(createPageUrl(`CaseDetails?id=${newCase.id}&new=true&accountNumber=${newCase.account_number}`));
    }
  };



  return (
    <div className="h-full bg-gray-50/50 p-2 overflow-hidden flex items-center justify-center">
      <div className="w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 relative">
            <Button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              variant="ghost"
              size="icon"
              className="absolute left-4 top-4 text-red-500 hover:text-red-600 hover:bg-red-50 border-2 border-red-500 hover:border-red-600"
            >
              <X className="w-5 h-5" />
            </Button>
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
              {!showNewBorrowerForm ? (
                <>
                  <Button
                    onClick={() => setShowNewBorrowerForm(true)}
                    className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Plus className="w-5 h-5 ml-2" />
                    צור איש קשר חדש
                  </Button>

                  <div>
                    <Label className="text-lg">או בחר איש קשר מהרשימה</Label>
                    <div className="relative mt-2">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="חפש איש קשר לפי שם, ת.ז או טלפון..."
                        className="pr-10 text-lg h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[40vh] overflow-y-auto border rounded-lg p-2">
                    {filteredPersons.map(person => (
                      <div
                        key={person.id}
                        className="p-4 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => handleCreateWithPerson(person.id)}
                      >
                        <p className="font-semibold text-gray-900">
                          {person.first_name} {person.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {person.id_number && `ת.ז: ${person.id_number}`}
                          {person.phone && ` • טלפון: ${person.phone}`}
                        </p>
                      </div>
                    ))}
                    {filteredPersons.length === 0 && (
                      <p className="text-center text-gray-500 py-8">לא נמצאו אנשי קשר</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label>שם פרטי *</Label>
                      <Input
                        value={newBorrowerData.client_name}
                        onChange={(e) => setNewBorrowerData({...newBorrowerData, client_name: e.target.value})}
                        placeholder="שם פרטי"
                        className="mt-1"
                        autoFocus
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
                      onClick={handleCreateNewPerson}
                      disabled={saving || !newBorrowerData.client_name.trim()}
                      className="flex-1 h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          יוצר...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 ml-2" />
                          צור חשבון
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowNewBorrowerForm(false)}
                      variant="outline"
                      className="h-12"
                    >
                      ביטול
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}