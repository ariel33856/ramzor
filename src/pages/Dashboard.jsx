import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Briefcase, FileCheck, AlertTriangle, TrendingUp, 
  Plus, Search, Filter, Columns, GripVertical, PlusCircle, Archive,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '../components/dashboard/StatsCard';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { personFields } from '../components/case/personFields';
import FieldsSelector from '../components/dashboard/FieldsSelector';
import { getAllFields, getFieldValue } from '../components/dashboard/FieldsHierarchy';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedFields, setSelectedFields] = useState(() => {
    const saved = localStorage.getItem('dashboardSelectedFields');
    return saved ? JSON.parse(saved) : ['account_number', 'first_name', 'last_name'];
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(null);

  const archiveMutation = useMutation({
    mutationFn: (caseId) => base44.entities.MortgageCase.update(caseId, { is_archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    }
  });

  const handleFieldToggle = (fieldId) => {
    setSelectedFields(prev => {
      const newFields = prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId];
      localStorage.setItem('dashboardSelectedFields', JSON.stringify(newFields));
      return newFields;
    });
  };

  const moveColumnEarlier = (fieldId) => {
    setSelectedFields(prev => {
      const index = prev.indexOf(fieldId);
      if (index <= 0) return prev;
      const newFields = [...prev];
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      localStorage.setItem('dashboardSelectedFields', JSON.stringify(newFields));
      return newFields;
    });
    setColumnMenuOpen(null);
  };

  const moveColumnLater = (fieldId) => {
    setSelectedFields(prev => {
      const index = prev.indexOf(fieldId);
      if (index === -1 || index >= prev.length - 1) return prev;
      const newFields = [...prev];
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
      localStorage.setItem('dashboardSelectedFields', JSON.stringify(newFields));
      return newFields;
    });
    setColumnMenuOpen(null);
  };

  const handleColumnDragEnd = (result) => {
    if (!result.destination) return;
    
    const newFields = Array.from(selectedFields);
    const [removed] = newFields.splice(result.source.index, 1);
    newFields.splice(result.destination.index, 0, removed);
    
    setSelectedFields(newFields);
    localStorage.setItem('dashboardSelectedFields', JSON.stringify(newFields));
  };

  // Fetch all persons to extract custom fields from their custom_data
  const { data: allPersons = [] } = useQuery({
    queryKey: ['all-persons'],
    queryFn: () => base44.entities.Person.list(),
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // קבל את כל השדות האפשריים מההיררכיה
  const allAvailableFields = React.useMemo(() => getAllFields(), []);

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
    queryFn: () => base44.entities.MortgageCase.list('-created_date'),
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Create a map of case IDs to their linked persons
  const caseToPersonMap = React.useMemo(() => {
    const map = {};
    allPersons.forEach(person => {
      if (person.linked_accounts && Array.isArray(person.linked_accounts)) {
        person.linked_accounts.forEach(caseId => {
          if (!map[caseId]) {
            map[caseId] = [];
          }
          map[caseId].push(person);
        });
      }
    });
    return map;
  }, [allPersons, allCases]);

  // Filter only non-archived cases without module_id (main accounts module)
  const cases = allCases.filter(c => !c.is_archived && !c.module_id);

  const filteredCases = cases.filter(c => {
    try {
      const linkedPersons = caseToPersonMap[c.id] || [];
      const linkedPerson = linkedPersons[0];

      const matchesSearch = !searchTerm || 
        linkedPerson?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linkedPerson?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        linkedPerson?.id_number?.includes(searchTerm) ||
        linkedPerson?.phone?.includes(searchTerm) ||
        c.account_number?.toString().includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'all' || c.urgency === urgencyFilter;
      return matchesSearch && matchesStatus && matchesUrgency;
    } catch (e) {
      return false;
    }
  });

  const stats = {
    total: cases.length,
    pending: cases.filter(c => ['documents_pending', 'documents_review'].includes(c.status)).length,
    critical: cases.filter(c => c.urgency === 'critical').length,
    approved: cases.filter(c => c.status === 'approved').length
  };

  return (
  <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden">
    {/* Filters */}
    <div className="flex-shrink-0 z-50 bg-white p-4 shadow-sm border-b border-gray-100">
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

              <FieldsSelector 
                selectedFields={selectedFields}
                onFieldToggle={handleFieldToggle}
              />
            </div>
            </div>
            </div>

            <div className="flex-1 overflow-hidden p-1">
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
<DragDropContext onDragEnd={handleColumnDragEnd}>
<div className="bg-white rounded-xl shadow-sm border border-gray-100">
  <div className="overflow-x-auto max-h-[100vh]">
    <table className="w-full">
      <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
        <Droppable droppableId="columns" direction="horizontal">
          {(provided) => (
            <tr 
              className="border-b-2 border-gray-200"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {selectedFields.map((fieldId, index) => {
                const field = allAvailableFields.find(f => f.id === fieldId);
                return (
                  <Draggable key={fieldId} draggableId={fieldId} index={index}>
                    {(provided, snapshot) => (
                      <th 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`px-6 py-4 text-right text-sm font-semibold text-gray-700 ${
                          snapshot.isDragging ? 'bg-blue-100 shadow-lg' : ''
                        }`}
                      >
                        <Popover open={columnMenuOpen === fieldId} onOpenChange={(open) => setColumnMenuOpen(open ? fieldId : null)}>
                          <PopoverTrigger asChild>
                            <button className="hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-gray-400" />
                              {field?.label || fieldId}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-2" align="start">
                            <div className="space-y-1">
                              {index > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => moveColumnEarlier(fieldId)}
                                >
                                  <ArrowUp className="w-4 h-4 ml-2" />
                                  מקם מוקדם יותר
                                </Button>
                              )}
                              {index < selectedFields.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => moveColumnLater(fieldId)}
                                >
                                  <ArrowDown className="w-4 h-4 ml-2" />
                                  מקם מאוחר יותר
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </th>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">העבר לארכיון</th>
            </tr>
          )}
        </Droppable>
      </thead>

      <tbody>
        {filteredCases.map((caseData, index) => {
          const linkedPersons = caseToPersonMap[caseData.id] || [];
          const linkedPerson = linkedPersons[0];

                  return (
                  <motion.tr
                    key={caseData.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                    {selectedFields.map(fieldId => {
                      const field = allAvailableFields.find(f => f.id === fieldId);
                      const value = field ? getFieldValue(field, caseData, linkedPerson, allPersons) : '—';

                      return (
                        <td 
                          key={fieldId} 
                          className="px-6 py-4 cursor-pointer"
                          onClick={() => window.location.href = createPageUrl(`CaseDetails?id=${caseData.id}`)}
                        >
                          {fieldId === 'account_number' ? (
                            <div className="font-semibold text-blue-600">{value}</div>
                          ) : fieldId === 'first_name' ? (
                            <div className="font-semibold text-gray-900">{value}</div>
                          ) : (
                            <span className="text-gray-600">{value}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveMutation.mutate(caseData.id);
                        }}
                        className="text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                      >
                        <Archive className="w-4 h-4 ml-2" />
                        ארכב
                      </Button>
                    </td>
                  </motion.tr>
                  );
                  })}
                  </tbody>
            </table>
            </div>
            </div>
</DragDropContext>
            )}
            </div>
            </div>
            );
            }