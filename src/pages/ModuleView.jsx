import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Search, Columns, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ModuleView() {
  const urlParams = new URLSearchParams(window.location.search);
  const moduleId = urlParams.get('moduleId');

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [filterUser, setFilterUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('globalFilterUser') || 'all';
    }
    return 'all';
  });
  
  // Transaction dialog state
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionFormData, setTransactionFormData] = useState({
    name: '',
    amount: '',
    property_id: ''
  });

  const defaultVisibleColumns = {
    client_name: true,
    client_id: false,
    client_phone: false,
    client_email: false,
    loan_amount: true,
    property_value: false,
    monthly_income: false,
    monthly_expenses: false,
    family_size: false,
    status: true,
    urgency: true,
    progress: true,
    account_number: false,
    consultant: false,
    target_bank: false,
    ltv_ratio: false,
    dti_ratio: false,
    income_per_capita: false,
    notes: false
  };

  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);

  // Load user and preferences
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const u = await base44.auth.me();
      if (u.dashboard_preferences?.module_view_columns?.[moduleId]) {
        setVisibleColumns(u.dashboard_preferences.module_view_columns[moduleId]);
      }
      return u;
    },
    staleTime: 60000
  });

  // Get users for admin filter
  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
    staleTime: 5 * 60 * 1000
  });

  const savePreferences = async (newColumns) => {
    if (!user) return;
    const currentPrefs = user.dashboard_preferences || {};
    const modulePrefs = currentPrefs.module_view_columns || {};
    
    const newPrefs = {
      ...currentPrefs,
      module_view_columns: {
        ...modulePrefs,
        [moduleId]: newColumns
      }
    };

    try {
      await base44.auth.updateMe({ dashboard_preferences: newPrefs });
      queryClient.setQueryData(['me'], (old) => ({ ...old, dashboard_preferences: newPrefs }));
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  };

  React.useEffect(() => {
    const handleGlobalFilterChange = (e) => {
      setFilterUser(e.detail.filterUser);
    };
    window.addEventListener('globalFilterUserChanged', handleGlobalFilterChange);
    return () => window.removeEventListener('globalFilterUserChanged', handleGlobalFilterChange);
  }, []);

  const handleColumnToggle = (key, checked) => {
    const newColumns = { ...visibleColumns, [key]: checked };
    setVisibleColumns(newColumns);
    savePreferences(newColumns);
  };

  const { data: module } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => base44.entities.Module.filter({ id: moduleId }).then(res => res[0]),
    enabled: !!moduleId
  });

  const { data: allCases = [], isLoading } = useQuery({
    queryKey: ['module-cases', moduleId, user?.role, user?.email, filterUser],
    queryFn: async () => {
      if (!user) return [];
      
      // Special handling for Moshe module
      if (moduleId === 'moshe') {
        if (user.role === 'admin') {
          if (filterUser !== 'all') {
            return base44.entities.MosheRecord.filter({ created_by: filterUser, is_archived: false }, '-created_date');
          }
          return base44.entities.MosheRecord.filter({ is_archived: false }, '-created_date');
        }
        return base44.entities.MosheRecord.filter({ created_by: user.email, is_archived: false }, '-created_date');
      }
      
      // Special handling for transactions module
      if (moduleId === 'transactions') {
        if (user.role === 'admin') {
          if (filterUser !== 'all') {
            return base44.entities.Transaction.filter({ created_by: filterUser, is_archived: false }, '-created_date');
          }
          return base44.entities.Transaction.filter({ is_archived: false }, '-created_date');
        }
        return base44.entities.Transaction.filter({ created_by: user.email, is_archived: false }, '-created_date');
      }
      
      const baseFilter = { module_id: moduleId };
      
      if (user.role === 'admin') {
        if (filterUser !== 'all') {
          return base44.entities.MortgageCase.filter({ ...baseFilter, created_by: filterUser }, '-created_date');
        }
        return base44.entities.MortgageCase.filter(baseFilter, '-created_date');
      }
      
      return base44.entities.MortgageCase.filter({ ...baseFilter, created_by: user.email }, '-created_date');
    },
    enabled: !!moduleId && !!user
  });

  const { data: allProperties = [] } = useQuery({
    queryKey: ['all-properties-transactions'],
    queryFn: () => base44.entities.PropertyAsset.list('-created_date'),
    enabled: moduleId === 'transactions' && transactionDialogOpen
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create({
      ...data,
      amount: data.amount ? Number(data.amount) : undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-cases'] });
      setTransactionDialogOpen(false);
      setTransactionFormData({ name: '', amount: '', property_id: '' });
    }
  });

  const statusLabels = {
    new: 'חדש',
    documents_pending: 'ממתין למסמכים',
    documents_review: 'בבדיקה',
    financial_analysis: 'ניתוח פיננסי',
    bank_submission: 'הוגש לבנק',
    approved: 'אושר',
    rejected: 'נדחה',
    completed: 'הושלם'
  };

  const urgencyLabels = {
    low: 'נמוכה',
    medium: 'בינונית',
    high: 'גבוהה',
    critical: 'קריטית'
  };

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredCases = allCases.filter(c => {
    if (moduleId === 'moshe') {
      const matchesSearch = !searchTerm || 
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    }
    
    if (moduleId === 'transactions') {
      const matchesSearch = !searchTerm || 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }
    
    const matchesSearch = !searchTerm || 
      c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_id?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || c.urgency === urgencyFilter;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  if (!module) {
    return <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
      <p>טוען מודול...</p>
    </div>;
  }

  const colorGradient = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
    slate: 'from-slate-500 to-slate-600',
    indigo: 'from-indigo-500 to-indigo-600'
  }[module.color] || 'from-blue-500 to-blue-600';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="sticky top-[64px] z-50 bg-white p-4 shadow-sm border-b border-gray-100 mb-0 -mt-px">
        <div className="mx-auto px-2 md:px-3">
          <div className="flex flex-col md:flex-row gap-4">
            {moduleId === 'transactions' ? (
              <Button 
                onClick={() => setTransactionDialogOpen(true)}
                className={`bg-gradient-to-r ${colorGradient} hover:opacity-90 shadow-lg`}
              >
                <Plus className="w-5 h-5 ml-2" />
                עסקה חדשה
              </Button>
            ) : (
              <Link to={moduleId === 'moshe' ? createPageUrl('NewMosheRecord') : createPageUrl('NewCase') + `?moduleId=${moduleId}`}>
                <Button className={`bg-gradient-to-r ${colorGradient} hover:opacity-90 shadow-lg`}>
                  <Plus className="w-5 h-5 ml-2" />
                  רשומה חדשה
                </Button>
              </Link>
            )}

            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם או ת.ז..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>


            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {moduleId === 'moshe' ? (
                  <>
                    <SelectItem value="פעיל">פעיל</SelectItem>
                    <SelectItem value="בהמתנה">בהמתנה</SelectItem>
                    <SelectItem value="הושלם">הושלם</SelectItem>
                  </>
                ) : (
                  Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {moduleId !== 'moshe' && (
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="דחיפות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הדחיפויות</SelectItem>
                  {Object.entries(urgencyLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Columns className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">שדות להצגה</h4>
                  {Object.keys(visibleColumns).map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={visibleColumns[key]}
                        onCheckedChange={(checked) => handleColumnToggle(key, checked)}
                      />
                      <label className="text-sm cursor-pointer">{key}</label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="mx-auto p-1">
        {isLoading ? (
          <div className="text-center py-16">טוען...</div>
        ) : filteredCases.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין רשומות להצגה</h3>
            <p className="text-gray-400">התחל ביצירת רשומה חדשה</p>
          </motion.div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    {moduleId === 'moshe' ? (
                      <>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">כותרת</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">תיאור</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">סטטוס</th>
                      </>
                    ) : moduleId === 'transactions' ? (
                      <>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שם</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">סכום</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">נכס משויך</th>
                      </>
                    ) : (
                      <>
                        {visibleColumns.client_name && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שם</th>}
                        {visibleColumns.status && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">סטטוס</th>}
                        {visibleColumns.urgency && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">דחיפות</th>}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((caseData, index) => (
                    <motion.tr
                      key={caseData.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = moduleId === 'moshe' 
                        ? createPageUrl(`MosheRecordDetails?id=${caseData.id}`)
                        : moduleId === 'transactions'
                        ? createPageUrl(`TransactionDetails?id=${caseData.id}`)
                        : createPageUrl(`ModuleCaseDetails?id=${caseData.id}&moduleId=${moduleId}`)
                      }
                    >
                      {moduleId === 'moshe' ? (
                        <>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{caseData.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{caseData.description || '—'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              caseData.status === 'פעיל' ? 'bg-green-100 text-green-800' :
                              caseData.status === 'בהמתנה' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {caseData.status}
                            </span>
                          </td>
                        </>
                      ) : moduleId === 'transactions' ? (
                        <>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{caseData.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {caseData.amount ? formatCurrency(caseData.amount) : '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">
                              {caseData.property_id ? (
                                (() => {
                                  const prop = allProperties.find(p => p.id === caseData.property_id);
                                  return prop ? `${prop.address}, ${prop.city}` : '—';
                                })()
                              ) : '—'}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {visibleColumns.client_name && (
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{caseData.client_name}</div>
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {statusLabels[caseData.status] || caseData.status}
                              </span>
                            </td>
                          )}
                          {visibleColumns.urgency && (
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                caseData.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                                caseData.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                                caseData.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {urgencyLabels[caseData.urgency] || caseData.urgency}
                              </span>
                            </td>
                          )}
                        </>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>עסקה חדשה</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createTransactionMutation.mutate(transactionFormData);
          }} className="space-y-4">
            <div>
              <Label>שם *</Label>
              <Input
                value={transactionFormData.name}
                onChange={(e) => setTransactionFormData({...transactionFormData, name: e.target.value})}
                required
                placeholder="הזן שם עסקה"
              />
            </div>

            <div>
              <Label>סכום</Label>
              <Input
                type="number"
                value={transactionFormData.amount}
                onChange={(e) => setTransactionFormData({...transactionFormData, amount: e.target.value})}
                placeholder="0"
              />
            </div>

            <div>
              <Label>שיוך לנכס</Label>
              <Select 
                value={transactionFormData.property_id} 
                onValueChange={(value) => setTransactionFormData({...transactionFormData, property_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר נכס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>ללא שיוך</SelectItem>
                  {allProperties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}, {property.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransactionDialogOpen(false)}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={createTransactionMutation.isPending}>
                צור עסקה
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}