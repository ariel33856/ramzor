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

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [visibleColumns, setVisibleColumns] = useState({
    account_number: true,
    client_name: true,
    borrower_id: true,
    borrower_phone: true,
    borrower_email: true
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
    queryKey: ['cases'],
    queryFn: () => base44.entities.MortgageCase.list('-created_date')
  });

  const { data: allBorrowers = [] } = useQuery({
    queryKey: ['all-borrowers'],
    queryFn: () => base44.entities.Person.filter({ type: 'לווה' })
  });

  // Filter only non-archived cases without module_id (main accounts module)
  const cases = allCases.filter(c => !c.is_archived && !c.module_id);

  // Helper function to get linked borrower name
    const getLinkedBorrowerName = (caseData) => {
      if (!caseData.linked_borrowers || caseData.linked_borrowers.length === 0) {
        return caseData.client_name || '—';
      }
      const linkedBorrower = allBorrowers.find(b => b.id === caseData.linked_borrowers[0]);
      if (linkedBorrower) {
        return `${linkedBorrower.first_name} ${linkedBorrower.last_name}`;
      }
      return caseData.client_name || '—';
    };

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

            <Link to={createPageUrl('NewCase')}>
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
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-account-num"
                          checked={visibleColumns.account_number}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, account_number: checked})}
                        />
                        <label htmlFor="col-account-num" className="text-sm cursor-pointer">מספר חשבון</label>
                      </div>
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
                          id="col-borrower-id"
                          checked={visibleColumns.borrower_id}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, borrower_id: checked})}
                        />
                        <label htmlFor="col-borrower-id" className="text-sm cursor-pointer">תעודת זהות לווה</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-borrower-phone"
                          checked={visibleColumns.borrower_phone}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, borrower_phone: checked})}
                        />
                        <label htmlFor="col-borrower-phone" className="text-sm cursor-pointer">טלפון לווה</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="col-borrower-email"
                          checked={visibleColumns.borrower_email}
                          onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, borrower_email: checked})}
                        />
                        <label htmlFor="col-borrower-email" className="text-sm cursor-pointer">אימייל לווה</label>
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
          {visibleColumns.account_number && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">מספר חשבון</th>}
          {visibleColumns.client_name && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">שם לקוח</th>}
          {visibleColumns.borrower_id && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">ת.ז. לווה</th>}
          {visibleColumns.borrower_phone && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">טלפון לווה</th>}
          {visibleColumns.borrower_email && <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">אימייל לווה</th>}
        </tr>
      </thead>

      <tbody>
        {filteredCases.map((caseData, index) => {
          const linkedBorrower = caseData.linked_borrowers && caseData.linked_borrowers.length > 0 
            ? allBorrowers.find(b => b.id === caseData.linked_borrowers[0])
            : null;

          return (
          <motion.tr
            key={caseData.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.02 }}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => window.location.href = createPageUrl(`CaseDetails?id=${caseData.id}`)}
            >
            {visibleColumns.account_number && (
              <td className="px-6 py-4">
                <div className="font-semibold text-blue-600">{caseData.account_number || '—'}</div>
              </td>
            )}

            {visibleColumns.client_name && (
              <td className="px-6 py-4">
                <div className="font-semibold text-gray-900">{getLinkedBorrowerName(caseData)}</div>
              </td>
            )}

            {visibleColumns.borrower_id && (
              <td className="px-6 py-4 text-gray-600">
                {linkedBorrower?.client_id || '—'}
              </td>
            )}

            {visibleColumns.borrower_phone && (
              <td className="px-6 py-4 text-gray-600">
                {linkedBorrower?.client_phone || '—'}
              </td>
            )}

            {visibleColumns.borrower_email && (
              <td className="px-6 py-4 text-gray-600">
                {linkedBorrower?.client_email || '—'}
              </td>
            )}
            </motion.tr>
            );
            })}
            </tbody>
            </table>
            </div>
            </div>
            )}
            </div>
            </div>
            );
            }