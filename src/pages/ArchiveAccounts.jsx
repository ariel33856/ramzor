import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Briefcase, FileCheck, AlertTriangle, TrendingUp, 
  Plus, Search, Filter, Columns
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '../components/dashboard/StatsCard';

export default function ArchiveAccounts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [visibleColumns, setVisibleColumns] = useState({
    // personal - פרטים אישיים ופרטי התקשרות
    client_name: true,
    client_id: false,
    client_phone: false,
    client_email: false,
    // data - נתונים
    loan_amount: true,
    property_value: false,
    monthly_income: false,
    monthly_expenses: false,
    family_size: false,
    // status - סטטוס
    status: true,
    urgency: true,
    progress: true,
    // account - חשבון
    account_number: false,
    consultant: false,
    target_bank: false,
    // metrics - מדדים
    ltv_ratio: false,
    dti_ratio: false,
    income_per_capita: false,
    // notes - הערות מיוחדות
    notes: false
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

  const { data: allCases = [], isLoading } = useQuery({
    queryKey: ['archive-cases'],
    queryFn: () => base44.entities.MortgageCase.list('-created_date')
  });

  // Filter only archived cases
  const cases = allCases.filter(c => c.is_archived === true);

  const filteredCases = cases.filter(c => {
    const matchesSearch = !searchTerm || 
      c.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.client_id?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || c.urgency === urgencyFilter;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const stats = {
    total: cases.length,
    pending: cases.filter(c => ['documents_pending', 'documents_review'].includes(c.status)).length,
    critical: cases.filter(c => c.urgency === 'critical').length,
    approved: cases.filter(c => c.status === 'approved').length
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Filters */}
      <div className="sticky top-[64px] z-50 bg-white p-4 shadow-sm border-b border-gray-100 mb-0 -mt-px">
        <div className="mx-auto px-2 md:px-3">
          <div className="flex flex-col md:flex-row gap-4">

            <Link to={createPageUrl('NewCase') + '?archive=true'}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25">
                <Plus className="w-5 h-5 ml-2" />
                חשבון חדש
              </Button>
            </Link>

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
                <SelectItem value="new">חדש</SelectItem>
                <SelectItem value="documents_pending">ממתין למסמכים</SelectItem>
                <SelectItem value="documents_review">בבדיקה</SelectItem>
                <SelectItem value="financial_analysis">ניתוח פיננסי</SelectItem>
                <SelectItem value="bank_submission">הוגש לבנק</SelectItem>
                <SelectItem value="approved">אושר</SelectItem>
                <SelectItem value="rejected">נדחה</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="דחיפות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הדחיפויות</SelectItem>
                <SelectItem value="low">נמוכה</SelectItem>
                <SelectItem value="medium">בינונית</SelectItem>
                <SelectItem value="high">גבוהה</SelectItem>
                <SelectItem value="critical">קריטית</SelectItem>
              </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Columns className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 max-h-[500px] overflow-y-auto">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">שדות להצגה</h4>
                    <div className="space-y-2">
                      <div className="font-semibold text-xs text-gray-500 pt-2">פרטים אישיים ופרטי התקשרות</div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-name"
                          checked={visibleColumns.client_name}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, client_name: checked})}
                        />
                        <label htmlFor="col-name" className="text-sm cursor-pointer">שם לקוח</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-id"
                          checked={visibleColumns.client_id}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, client_id: checked})}
                        />
                        <label htmlFor="col-id" className="text-sm cursor-pointer">תעודת זהות</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-phone"
                          checked={visibleColumns.client_phone}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, client_phone: checked})}
                        />
                        <label htmlFor="col-phone" className="text-sm cursor-pointer">טלפון</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-email"
                          checked={visibleColumns.client_email}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, client_email: checked})}
                        />
                        <label htmlFor="col-email" className="text-sm cursor-pointer">אימייל</label>
                      </div>

                      <div className="font-semibold text-xs text-gray-500 pt-2">נתונים</div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-loan"
                          checked={visibleColumns.loan_amount}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, loan_amount: checked})}
                        />
                        <label htmlFor="col-loan" className="text-sm cursor-pointer">סכום הלוואה</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-property"
                          checked={visibleColumns.property_value}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, property_value: checked})}
                        />
                        <label htmlFor="col-property" className="text-sm cursor-pointer">שווי נכס</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-income"
                          checked={visibleColumns.monthly_income}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, monthly_income: checked})}
                        />
                        <label htmlFor="col-income" className="text-sm cursor-pointer">הכנסה חודשית</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-expenses"
                          checked={visibleColumns.monthly_expenses}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, monthly_expenses: checked})}
                        />
                        <label htmlFor="col-expenses" className="text-sm cursor-pointer">הוצאות חודשיות</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-family"
                          checked={visibleColumns.family_size}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, family_size: checked})}
                        />
                        <label htmlFor="col-family" className="text-sm cursor-pointer">גודל משפחה</label>
                      </div>

                      <div className="font-semibold text-xs text-gray-500 pt-2">סטטוס</div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-status"
                          checked={visibleColumns.status}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, status: checked})}
                        />
                        <label htmlFor="col-status" className="text-sm cursor-pointer">סטטוס</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-urgency"
                          checked={visibleColumns.urgency}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, urgency: checked})}
                        />
                        <label htmlFor="col-urgency" className="text-sm cursor-pointer">דחיפות</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-progress"
                          checked={visibleColumns.progress}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, progress: checked})}
                        />
                        <label htmlFor="col-progress" className="text-sm cursor-pointer">התקדמות</label>
                      </div>

                      <div className="font-semibold text-xs text-gray-500 pt-2">חשבון</div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-account"
                          checked={visibleColumns.account_number}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, account_number: checked})}
                        />
                        <label htmlFor="col-account" className="text-sm cursor-pointer">מספר חשבון</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-consultant"
                          checked={visibleColumns.consultant}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, consultant: checked})}
                        />
                        <label htmlFor="col-consultant" className="text-sm cursor-pointer">יועץ אחראי</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-bank"
                          checked={visibleColumns.target_bank}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, target_bank: checked})}
                        />
                        <label htmlFor="col-bank" className="text-sm cursor-pointer">בנק יעד</label>
                      </div>

                      <div className="font-semibold text-xs text-gray-500 pt-2">מדדים</div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-ltv"
                          checked={visibleColumns.ltv_ratio}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, ltv_ratio: checked})}
                        />
                        <label htmlFor="col-ltv" className="text-sm cursor-pointer">יחס LTV</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-dti"
                          checked={visibleColumns.dti_ratio}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, dti_ratio: checked})}
                        />
                        <label htmlFor="col-dti" className="text-sm cursor-pointer">יחס DTI</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-income-capita"
                          checked={visibleColumns.income_per_capita}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, income_per_capita: checked})}
                        />
                        <label htmlFor="col-income-capita" className="text-sm cursor-pointer">הכנסה לנפש</label>
                      </div>

                      <div className="font-semibold text-xs text-gray-500 pt-2">הערות מיוחדות</div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-notes"
                          checked={visibleColumns.notes}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, notes: checked})}
                        />
                        <label htmlFor="col-notes" className="text-sm cursor-pointer">הערות</label>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            </div>
            </div>

      <div className="mx-auto p-1">
        {/* Cases Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    <th className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    <th className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredCases.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">אין תיקים להצגה</h3>
            <p className="text-gray-400">התחל ביצירת תיק חדש או שנה את הסינון</p>
          </motion.div>
        ) : (
<div className="bg-white rounded-xl shadow-sm border border-gray-100">
  <div className="overflow-x-auto max-h-[75vh]">
    <table className="w-full">
      <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
        <tr className="border-b-2 border-gray-200">
          {visibleColumns.client_name && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שם לקוח</th>}
          {visibleColumns.client_id && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">תעודת זהות</th>}
          {visibleColumns.client_phone && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">טלפון</th>}
          {visibleColumns.client_email && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">אימייל</th>}
          {visibleColumns.loan_amount && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">סכום הלוואה</th>}
          {visibleColumns.property_value && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שווי נכס</th>}
          {visibleColumns.monthly_income && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">הכנסה חודשית</th>}
          {visibleColumns.monthly_expenses && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">הוצאות חודשיות</th>}
          {visibleColumns.family_size && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">גודל משפחה</th>}
          {visibleColumns.status && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">סטטוס</th>}
          {visibleColumns.urgency && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">דחיפות</th>}
          {visibleColumns.progress && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">התקדמות</th>}
          {visibleColumns.consultant && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">יועץ אחראי</th>}
          {visibleColumns.target_bank && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">בנק יעד</th>}
          {visibleColumns.ltv_ratio && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">יחס LTV</th>}
          {visibleColumns.dti_ratio && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">יחס DTI</th>}
          {visibleColumns.income_per_capita && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">הכנסה לנפש</th>}
          {visibleColumns.account_number && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">מספר חשבון</th>}
          {visibleColumns.notes && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">הערות</th>}
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
            onClick={() => window.location.href = createPageUrl(`CaseDetails?id=${caseData.id}`)}
            >
            {visibleColumns.client_name && (
              <td className="px-6 py-4">
                <div className="font-semibold text-gray-900">{caseData.client_name}</div>
              </td>
            )}

            {visibleColumns.client_id && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.client_id || '—'}
              </td>
            )}

            {visibleColumns.client_phone && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.client_phone || '—'}
              </td>
            )}

            {visibleColumns.client_email && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.client_email || '—'}
              </td>
            )}

            {visibleColumns.loan_amount && (
              <td className="px-6 py-4 text-gray-600">
                {formatCurrency(caseData.loan_amount)}
              </td>
            )}

            {visibleColumns.property_value && (
              <td className="px-6 py-4 text-gray-600">
                {formatCurrency(caseData.property_value)}
              </td>
            )}

            {visibleColumns.monthly_income && (
              <td className="px-6 py-4 text-gray-600">
                {formatCurrency(caseData.monthly_income)}
              </td>
            )}

            {visibleColumns.monthly_expenses && (
              <td className="px-6 py-4 text-gray-600">
                {formatCurrency(caseData.monthly_expenses)}
              </td>
            )}

            {visibleColumns.family_size && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.family_size || '—'}
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

            {visibleColumns.progress && (
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${caseData.progress_percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-10">
                    {caseData.progress_percentage || 0}%
                  </span>
                </div>
              </td>
            )}

            {visibleColumns.consultant && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.assigned_consultant || 'לא הוקצה'}
              </td>
            )}

            {visibleColumns.target_bank && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.target_bank ? bankLabels[caseData.target_bank] : '—'}
              </td>
            )}

            {visibleColumns.ltv_ratio && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.ltv_ratio ? `${caseData.ltv_ratio}%` : '—'}
              </td>
            )}

            {visibleColumns.dti_ratio && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.dti_ratio ? `${caseData.dti_ratio}%` : '—'}
              </td>
            )}

            {visibleColumns.income_per_capita && (
              <td className="px-6 py-4 text-gray-600">
                {formatCurrency(caseData.income_per_capita)}
              </td>
            )}

            {visibleColumns.account_number && (
              <td className="px-6 py-4 text-gray-600">
                {caseData.account_number || '—'}
              </td>
            )}

            {visibleColumns.notes && (
              <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                {caseData.notes || '—'}
              </td>
            )}
            </motion.tr>
            ))}
            </tbody>
            </table>
            </div>
            </div>
            )}
            </div>
            </div>
            );
            }