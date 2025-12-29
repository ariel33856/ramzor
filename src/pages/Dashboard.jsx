import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Briefcase, FileCheck, AlertTriangle, TrendingUp, 
  Plus, Search, Filter, Columns, GripVertical, PlusCircle, Archive
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

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  // Initialize with Person fields only, ignore old localStorage with borrower fields
  const [columnOrder, setColumnOrder] = useState(personFields);
  const [newFieldDialog, setNewFieldDialog] = useState(false);
  const [newField, setNewField] = useState({ id: '', label: '' });

  const archiveMutation = useMutation({
    mutationFn: (caseId) => base44.entities.MortgageCase.update(caseId, { is_archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    }
  });

  // Fetch all persons to extract custom fields from their custom_data
  const { data: allPersons = [] } = useQuery({
    queryKey: ['all-persons'],
    queryFn: () => base44.entities.Person.list()
  });

  // Extract unique custom field names from all persons
  const customFieldNames = React.useMemo(() => {
    const fieldNamesSet = new Set();
    allPersons.forEach(person => {
      if (person.custom_data) {
        Object.keys(person.custom_data).forEach(key => fieldNamesSet.add(key));
      }
    });
    return Array.from(fieldNamesSet);
  }, [allPersons]);

  // Rebuild columnOrder with Person fields + custom fields from Person entities
  React.useEffect(() => {
    // Start with base Person fields
    const baseFields = [...personFields];
    
    // Add custom fields from Person entities
    customFieldNames.forEach(fieldName => {
      if (!baseFields.find(col => col.id === fieldName)) {
        baseFields.push({ 
          id: fieldName, 
          label: fieldName, 
          visible: false 
        });
      }
    });
    
    setColumnOrder(baseFields);
  }, [customFieldNames]);

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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(columnOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setColumnOrder(items);
    localStorage.setItem('dashboardColumns', JSON.stringify(items));
  };

  const toggleColumnVisibility = (columnId) => {
    const updated = columnOrder.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumnOrder(updated);
    localStorage.setItem('dashboardColumns', JSON.stringify(updated));
  };

  const addNewField = () => {
    if (newField.id && newField.label) {
      const updated = [...columnOrder, { ...newField, visible: true }];
      setColumnOrder(updated);
      localStorage.setItem('dashboardColumns', JSON.stringify(updated));
      setNewField({ id: '', label: '' });
      setNewFieldDialog(false);
    }
  };

  const { data: allCases = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.MortgageCase.list('-created_date')
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

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Columns className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 max-h-[500px] overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">שדות להצגה וסדר</h4>
                      <Dialog open={newFieldDialog} onOpenChange={setNewFieldDialog}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>הוסף שדה חדש</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>מזהה שדה (באנגלית, ללא רווחים)</Label>
                              <Input
                                value={newField.id}
                                onChange={(e) => setNewField({...newField, id: e.target.value})}
                                placeholder="field_name"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>תווית שדה</Label>
                              <Input
                                value={newField.label}
                                onChange={(e) => setNewField({...newField, label: e.target.value})}
                                placeholder="שם השדה"
                                className="mt-1"
                              />
                            </div>
                            <Button onClick={addNewField} className="w-full">
                              הוסף שדה
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="columns">
                        {(provided) => (
                          <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {columnOrder.map((column, index) => (
                              <Draggable key={column.id} draggableId={column.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-grab ${
                                      snapshot.isDragging ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                    <Checkbox
                                      id={`col-${column.id}`}
                                      checked={column.visible}
                                      onCheckedChange={() => toggleColumnVisibility(column.id)}
                                    />
                                    <label htmlFor={`col-${column.id}`} className="text-sm cursor-pointer flex-1">
                                      {column.label}
                                    </label>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </PopoverContent>
              </Popover>
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
<div className="bg-white rounded-xl shadow-sm border border-gray-100">
  <div className="overflow-x-auto max-h-[100vh]">
    <table className="w-full">
      <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
        <tr className="border-b-2 border-gray-200">
          {columnOrder.filter(col => col.visible).map(col => (
            <th key={col.id} className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
              {col.label}
            </th>
          ))}
          <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">פעולות</th>
        </tr>
      </thead>

      <tbody>
        {filteredCases.map((caseData, index) => {
          // Get linked person(s) for this case
          const linkedPersons = caseToPersonMap[caseData.id] || [];
          const linkedPerson = linkedPersons[0]; // Take first linked person

                  const renderCell = (columnId) => {
                    // Special handling for account_number - comes from case
                    if (columnId === 'account_number') {
                      return <div className="font-semibold text-blue-600">{caseData.account_number || '—'}</div>;
                    }

                    // All other fields come from linked Person
                    if (!linkedPerson) {
                      return <span className="text-gray-600">—</span>;
                    }

                    // Check in custom_data first for custom fields
                    const customValue = linkedPerson.custom_data?.[columnId];
                    const value = customValue || linkedPerson[columnId];

                    switch(columnId) {
                      case 'first_name':
                        return <div className="font-semibold text-gray-900">{value || '—'}</div>;
                      case 'last_name':
                        return <span className="text-gray-600">{value || '—'}</span>;
                      case 'id_number':
                        return <span className="text-gray-600">{value || '—'}</span>;
                      case 'phone':
                        return <span className="text-gray-600">{value || '—'}</span>;
                      case 'email':
                        return <span className="text-gray-600">{value || '—'}</span>;
                      case 'notes':
                        return <span className="text-gray-600">{value || '—'}</span>;
                      default:
                        return <span className="text-gray-600">{value || '—'}</span>;
                    }
                  };

                  return (
                  <motion.tr
                    key={caseData.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                    {columnOrder.filter(col => col.visible).map(col => (
                      <td 
                        key={col.id} 
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => window.location.href = createPageUrl(`CaseDetails?id=${caseData.id}`)}
                      >
                        {renderCell(col.id)}
                      </td>
                    ))}
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
            )}
            </div>
            </div>
            );
            }