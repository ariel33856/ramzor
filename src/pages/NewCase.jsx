import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

  const [filterUser, setFilterUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('globalFilterUser') || 'all';
    }
    return 'all';
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  const { data: allPersons = [] } = useQuery({
    queryKey: ['all-persons', currentUser?.email, filterUser],
    queryFn: async () => {
      if (!currentUser) return [];
      const targetUser = (filterUser && filterUser !== 'all') ? filterUser : currentUser.email;
      return base44.entities.Person.filter({ created_by: targetUser });
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const handleGlobalFilterChange = (e) => {
      setFilterUser(e.detail.filterUser);
      queryClient.invalidateQueries({ queryKey: ['all-persons'] });
    };
    window.addEventListener('globalFilterUserChanged', handleGlobalFilterChange);
    return () => window.removeEventListener('globalFilterUserChanged', handleGlobalFilterChange);
  }, [queryClient]);

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
      main_status: 'ליד חדש',
      urgency: 'medium',
      progress_percentage: 0,
      is_archived: isArchive,
    };
    if (moduleId) caseData.module_id = moduleId;

    // Only add account number for main accounts module (no moduleId)
    if (!moduleId) {
      try {
        const latestCases = await base44.entities.MortgageCase.list('-account_number', 1);
        const maxAccountNumber = latestCases.length > 0 && latestCases[0].account_number 
          ? latestCases[0].account_number 
          : 72515;
        caseData.account_number = maxAccountNumber + 1;
      } catch (error) {
        console.error("Error fetching latest case for account number:", error);
        caseData.account_number = 72516; // Fallback
      }
    }

    const newCase = await base44.entities.MortgageCase.create(caseData);

    // Link person to account
    const person = allPersons.find(p => p.id === personId);
    if (person) {
      const linkedAccounts = person.linked_accounts || [];
      // Sanitize linked_accounts
      const sanitizedLinkedAccounts = linkedAccounts.map(acc => {
        if (typeof acc === 'string') {
          return { case_id: acc, relationship_type: 'לווה' };
        }
        // Ensure relationship_type exists
        if (!acc.relationship_type) {
          return { ...acc, relationship_type: 'לווה' };
        }
        return acc;
      });
      
      await base44.entities.Person.update(personId, {
        linked_accounts: [...sanitizedLinkedAccounts, { case_id: newCase.id, relationship_type: 'לווה' }]
      });
    }

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
      main_status: 'ליד חדש',
      urgency: 'medium',
      progress_percentage: 0,
      is_archived: isArchive,
      person_id: newPerson.id
    };
    if (moduleId) caseData.module_id = moduleId;

    // Only add account number for main accounts module (no moduleId)
    if (!moduleId) {
      try {
        const latestCases = await base44.entities.MortgageCase.list('-account_number', 1);
        const maxAccountNumber = latestCases.length > 0 && latestCases[0].account_number 
          ? latestCases[0].account_number 
          : 72515;
        caseData.account_number = maxAccountNumber + 1;
      } catch (error) {
        console.error("Error fetching latest case for account number:", error);
        caseData.account_number = 72516; // Fallback
      }
    }

    const newCase = await base44.entities.MortgageCase.create(caseData);

    // Link person to account
    await base44.entities.Person.update(newPerson.id, {
      linked_accounts: [{ case_id: newCase.id, relationship_type: 'לווה' }]
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
    <div className="h-full bg-gray-50/50 p-2 overflow-hidden">
      <div className="w-full h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full"
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-8 relative h-full overflow-y-auto">
            <Button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              variant="ghost"
              size="icon"
              className="absolute left-4 top-4 text-red-500 hover:text-red-600 hover:bg-red-50 border-2 border-red-500 hover:border-red-600"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="space-y-6 pt-8">
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