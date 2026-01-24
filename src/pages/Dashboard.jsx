import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Briefcase, FileCheck, AlertTriangle, TrendingUp, 
  Plus, Search, Filter, Columns, GripVertical, PlusCircle, Archive,
  ArrowUp, ArrowDown, FilterX, X
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
  const [filterUser, setFilterUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('globalFilterUser') || 'all';
    }
    return 'all';
  });
  
  // Load user data including preferences
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const u = await base44.auth.me();
      if (u.dashboard_preferences) {
        if (u.dashboard_preferences.selectedFields) setSelectedFields(u.dashboard_preferences.selectedFields);
        if (u.dashboard_preferences.columnWidths) setColumnWidths(u.dashboard_preferences.columnWidths);
      }
      return u;
    },
    staleTime: 60000
  });

  // Get list of all users for admin filter
  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
    staleTime: 5 * 60 * 1000
  });

  const [selectedFields, setSelectedFields] = useState(['account_number', 'first_name', 'last_name']);
  const [columnMenuOpen, setColumnMenuOpen] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [rangeFilters, setRangeFilters] = useState({});
  const [filterDialogOpen, setFilterDialogOpen] = useState(null);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');


  // Function to save preferences
  const savePreferences = async (updates) => {
    if (!user) return;
    const newPrefs = {
      ...user.dashboard_preferences,
      ...updates
    };
    try {
      await base44.auth.updateMe({ dashboard_preferences: newPrefs });
      // Update local user object to reflect changes without reload
      queryClient.setQueryData(['me'], (old) => ({ ...old, dashboard_preferences: newPrefs }));
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  };

  const archiveMutation = useMutation({
    mutationFn: (caseId) => base44.entities.MortgageCase.update(caseId, { is_archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    }
  });

  const handleFieldToggle = (fieldId) => {
    const newFields = selectedFields.includes(fieldId)
      ? selectedFields.filter(id => id !== fieldId)
      : [...selectedFields, fieldId];
    
    setSelectedFields(newFields);
    savePreferences({ selectedFields: newFields });
  };

  const moveColumnEarlier = (fieldId) => {
    const index = selectedFields.indexOf(fieldId);
    if (index <= 0) return;
    const newFields = [...selectedFields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    
    setSelectedFields(newFields);
    savePreferences({ selectedFields: newFields });
    setColumnMenuOpen(null);
  };

  const moveColumnLater = (fieldId) => {
    const index = selectedFields.indexOf(fieldId);
    if (index === -1 || index >= selectedFields.length - 1) return;
    const newFields = [...selectedFields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    
    setSelectedFields(newFields);
    savePreferences({ selectedFields: newFields });
    setColumnMenuOpen(null);
  };

  const toggleColumnFilter = (fieldId, value) => {
    setColumnFilters(prev => {
      const currentFilters = prev[fieldId] || [];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter(v => v !== value)
        : [...currentFilters, value];
      
      if (newFilters.length === 0) {
        const { [fieldId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [fieldId]: newFilters };
    });
  };

  const clearColumnFilter = (fieldId) => {
    setColumnFilters(prev => {
      const { [fieldId]: removed, ...rest } = prev;
      return rest;
    });
    setRangeFilters(prev => {
      const { [fieldId]: removed, ...rest } = prev;
      return rest;
    });
    setFilterDialogOpen(null);
  };

  const setRangeFilter = (fieldId, from, to) => {
    if (!from && !to) {
      setRangeFilters(prev => {
        const { [fieldId]: removed, ...rest } = prev;
        return rest;
      });
    } else {
      setRangeFilters(prev => ({ ...prev, [fieldId]: { from, to } }));
    }
  };

  const getUniqueValuesForField = (fieldId) => {
    const field = allAvailableFields.find(f => f.id === fieldId);
    if (!field) return [];
    
    const values = new Set();
    // Filter cases based on existing filters (excluding current field)
    const relevantCases = cases.filter(c => {
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
        
        // Check column filters excluding the current field
        const matchesColumnFilters = Object.entries(columnFilters).every(([filterFieldId, filterValues]) => {
          if (filterFieldId === fieldId) return true; // Skip current field
          if (filterValues.length === 0) return true;
          const filterField = allAvailableFields.find(f => f.id === filterFieldId);
          if (!filterField) return true;
          const value = getFieldValue(filterField, c, linkedPerson, allPersons);
          return filterValues.includes(value);
        });
        
        return matchesSearch && matchesStatus && matchesUrgency && matchesColumnFilters;
      } catch (e) {
        return false;
      }
    });

    relevantCases.forEach(caseData => {
      const linkedPersons = caseToPersonMap[caseData.id] || [];
      const linkedPerson = linkedPersons[0];
      const value = getFieldValue(field, caseData, linkedPerson, allPersons);
      if (value && value !== '—') {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(selectedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSelectedFields(items);
    savePreferences({ selectedFields: items });
  };

  const handleColumnResize = (fieldId, startX, startWidth) => {
    const handleMouseMove = (e) => {
      const diff = startX - e.clientX; // RTL - reverse direction
      const newWidth = Math.max(80, startWidth + diff);
      setColumnWidths(prev => {
        const updated = { ...prev, [fieldId]: newWidth };
        return updated;
      });
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    setResizingColumn(fieldId);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Add effect to save column widths when they change, but debounced
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user && Object.keys(columnWidths).length > 0) {
        savePreferences({ columnWidths });
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [columnWidths]);

  React.useEffect(() => {
    const handleGlobalFilterChange = (e) => {
      setFilterUser(e.detail.filterUser);
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    };
    window.addEventListener('globalFilterUserChanged', handleGlobalFilterChange);
    return () => window.removeEventListener('globalFilterUserChanged', handleGlobalFilterChange);
  }, [queryClient]);

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
    queryKey: ['cases', user?.email, filterUser],
    queryFn: async () => {
      if (!user) return [];
      
      // Determine which user to filter by
      const targetUser = (filterUser && filterUser !== 'all') ? filterUser : user.email;
      
      // Show only cases created by the target user
      return base44.entities.MortgageCase.filter({ created_by: targetUser }, '-created_date');
    },
    enabled: !!user,
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

  let filteredCases = cases.filter(c => {
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
      
      // Check column filters
      const matchesColumnFilters = Object.entries(columnFilters).every(([fieldId, filterValues]) => {
        if (filterValues.length === 0) return true;
        const field = allAvailableFields.find(f => f.id === fieldId);
        if (!field) return true;
        const value = getFieldValue(field, c, linkedPerson, allPersons);
        return filterValues.includes(value);
      });

      // Check range filters
      const matchesRangeFilters = Object.entries(rangeFilters).every(([fieldId, range]) => {
        const field = allAvailableFields.find(f => f.id === fieldId);
        if (!field) return true;
        const value = getFieldValue(field, c, linkedPerson, allPersons);
        if (!value || value === '—') return false;
        
        const valueStr = String(value).toLowerCase();
        const fromStr = range.from ? String(range.from).toLowerCase() : '';
        const toStr = range.to ? String(range.to).toLowerCase() : '';
        
        if (fromStr && toStr) {
          return valueStr >= fromStr && valueStr <= toStr;
        } else if (fromStr) {
          return valueStr >= fromStr;
        } else if (toStr) {
          return valueStr <= toStr;
        }
        return true;
      });
      
      return matchesSearch && matchesStatus && matchesUrgency && matchesColumnFilters && matchesRangeFilters;
    } catch (e) {
      return false;
    }
  });

  // Apply sorting
  if (sortField) {
    filteredCases = [...filteredCases].sort((a, b) => {
      const linkedPersonsA = caseToPersonMap[a.id] || [];
      const linkedPersonsB = caseToPersonMap[b.id] || [];
      const linkedPersonA = linkedPersonsA[0];
      const linkedPersonB = linkedPersonsB[0];
      
      const field = allAvailableFields.find(f => f.id === sortField);
      if (!field) return 0;
      
      const valueA = getFieldValue(field, a, linkedPersonA, allPersons);
      const valueB = getFieldValue(field, b, linkedPersonB, allPersons);
      
      const comparison = String(valueA).localeCompare(String(valueB), 'he');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  const stats = {
    total: cases.length,
    pending: cases.filter(c => ['documents_pending', 'documents_review'].includes(c.status)).length,
    critical: cases.filter(c => c.urgency === 'critical').length,
    approved: cases.filter(c => c.status === 'approved').length
  };

  return (
    <div className="h-full bg-gray-50/50 flex flex-col overflow-hidden">
      {/* Filters */}
      <div className="flex-shrink-0 z-50 bg-gradient-to-r from-yellow-400 to-green-500 p-4 shadow-sm border-b border-gray-200">
        <div className="mx-auto px-2 md:px-3">
          <div className="flex flex-col md:flex-row gap-4">
            <Link to={createPageUrl('NewCase')}>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25">
                <Plus className="w-5 h-5 ml-2" />
                חשבון חדש
              </Button>
            </Link>

            <div className="flex-1 relative max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם או ת.ז..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-white text-gray-900"
              />
            </div>

            <div className="ml-auto flex gap-2">
              <FieldsSelector 
                selectedFields={selectedFields}
                onFieldToggle={handleFieldToggle}
              />

              <Popover open={reorderDialogOpen} onOpenChange={setReorderDialogOpen}>
                <PopoverTrigger asChild>
                  <Button className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-lg">
                    <GripVertical className="w-5 h-5 ml-2" />
                    סדר עמודות
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-80 min-h-[150px]" align="start">
                  <button
                    onClick={() => setReorderDialogOpen(false)}
                    className="absolute top-2 left-2 p-1.5 rounded-full hover:bg-red-100 bg-red-50 transition-colors z-50 shadow-sm"
                  >
                    <X className="w-5 h-5 text-red-600 font-bold" />
                  </button>
                  <div className="space-y-3 pt-6">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">סדר עמודות</h4>
                      <p className="text-xs text-gray-600">גרור את השדות כדי לשנות את הסדר</p>
                    </div>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="fields">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2 max-h-80 overflow-y-auto"
                          >
                            {selectedFields.map((fieldId, index) => {
                              const field = allAvailableFields.find(f => f.id === fieldId);
                              return (
                                <Draggable key={fieldId} draggableId={fieldId} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{
                                        ...provided.draggableProps.style,
                                        transform: snapshot.isDragging && provided.draggableProps.style?.transform
                                          ? `${provided.draggableProps.style.transform} translateY(-100px) translateX(-30px)`
                                          : provided.draggableProps.style?.transform,
                                        transition: snapshot.isDragging ? provided.draggableProps.style?.transition : 'none'
                                      }}
                                      className={`
                                        flex items-center gap-2 p-2 rounded-lg border-2
                                        ${snapshot.isDragging 
                                          ? 'bg-blue-50 border-blue-300 shadow-lg' 
                                          : 'bg-white border-gray-200 hover:border-gray-300 transition-all'
                                        }
                                      `}
                                    >
                                      <GripVertical className="w-4 h-4 text-gray-400" />
                                      <span className="flex-1 text-sm font-medium text-gray-900">
                                        {field?.label || fieldId}
                                      </span>
                                      <span className="text-xs text-gray-500">#{index + 1}</span>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
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
      </div>

      <div className="flex-1 overflow-hidden p-1">
        {/* Cases Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full">
                <thead className="sticky top-0 z-40 bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-6 py-2 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    <th className="px-6 py-2 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                    <th className="px-6 py-2 text-right"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}`}>
                      <td className="px-6 py-2"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      <td className="px-6 py-2"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                      <td className="px-6 py-2"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
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
                    {selectedFields.map((fieldId, index) => {
                      const field = allAvailableFields.find(f => f.id === fieldId);
                      const width = columnWidths[fieldId];
                      return (
                        <th 
                          key={fieldId} 
                          className="px-6 py-2 text-right text-sm font-semibold text-gray-700 relative"
                          style={{ width: width ? `${width}px` : 'auto', minWidth: '80px' }}
                        >
                          <div className="flex items-center gap-2">
                            <Popover open={columnMenuOpen === fieldId} onOpenChange={(open) => setColumnMenuOpen(open ? fieldId : null)}>
                              <PopoverTrigger asChild>
                                <button className="hover:text-blue-600 transition-colors cursor-pointer">
                                  {field?.label || fieldId}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-40 min-h-[120px] p-2" align="center">
                                <button
                                  onClick={() => setColumnMenuOpen(null)}
                                  className="absolute top-2 left-2 p-1.5 rounded-full hover:bg-red-100 bg-red-50 transition-colors shadow-sm"
                                >
                                  <X className="w-5 h-5 text-red-600 font-bold" />
                                </button>
                                <div className="space-y-1 pt-6">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    setFilterDialogOpen(fieldId);
                                    setColumnMenuOpen(null);
                                  }}
                                >
                                    <Filter className="w-4 h-4 ml-2" />
                                    סנן
                                    {columnFilters[fieldId]?.length > 0 && (
                                      <span className="mr-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                        {columnFilters[fieldId].length}
                                      </span>
                                    )}
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <button
                              onClick={() => {
                                if (sortField === fieldId) {
                                  setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
                                } else {
                                  setSortField(fieldId);
                                  setSortDirection('desc');
                                }
                              }}
                              className={`p-0.5 rounded border-2 transition-colors flex items-center ${sortField === fieldId ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-100 border-gray-300'}`}
                              title={sortField === fieldId && sortDirection === 'desc' ? 'מיין בסדר עולה' : 'מיין בסדר יורד'}
                            >
                              <ArrowUp className={`w-4 h-4 ${sortField === fieldId && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} style={{transform: 'scaleX(0.7)'}} />
                              <ArrowDown className={`w-4 h-4 -mr-2 ${sortField === fieldId && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} style={{transform: 'scaleX(0.7)'}} />
                            </button>
                            <Popover open={filterDialogOpen === fieldId} onOpenChange={(open) => setFilterDialogOpen(open ? fieldId : null)}>
                              <PopoverTrigger asChild>
                                <button className="relative hover:text-blue-600 transition-colors p-0.5 rounded border-2 border-gray-300 hover:border-blue-400">
                                  <Filter className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                                  {(columnFilters[fieldId]?.length > 0 || rangeFilters[fieldId]) && (
                                    <span className="absolute -top-1 -left-1 px-1 py-0.5 bg-blue-500 text-white text-xs rounded-full leading-none">
                                      {columnFilters[fieldId]?.length || '↔'}
                                    </span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 min-h-[150px]" align="center">
                                <button
                                  onClick={() => setFilterDialogOpen(null)}
                                  className="absolute top-2 left-2 p-1.5 rounded-full hover:bg-red-100 bg-red-50 transition-colors z-50 shadow-sm"
                                >
                                  <X className="w-5 h-5 text-red-600 font-bold" />
                                </button>
                                <div className="space-y-3 pt-6">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <h4 className="font-semibold text-sm">
                                      סנן לפי {field?.label || fieldId}
                                    </h4>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          setSortField(fieldId);
                                          setSortDirection('asc');
                                        }}
                                        className={`p-1.5 rounded transition-colors ${sortField === fieldId && sortDirection === 'asc' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        title="מהקטן לגדול"
                                      >
                                        <ArrowUp className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSortField(fieldId);
                                          setSortDirection('desc');
                                        }}
                                        className={`p-1.5 rounded transition-colors ${sortField === fieldId && sortDirection === 'desc' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        title="מהגדול לקטן"
                                      >
                                        <ArrowDown className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Range Filter */}
                                  <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs font-medium text-gray-700">סינון לפי טווח</p>
                                    <div className="flex flex-col gap-2">
                                      <Input
                                        placeholder="מ..."
                                        value={rangeFilters[fieldId]?.from || ''}
                                        onChange={(e) => setRangeFilter(fieldId, e.target.value, rangeFilters[fieldId]?.to || '')}
                                        className="h-8 text-sm"
                                      />
                                      <Input
                                        placeholder="עד..."
                                        value={rangeFilters[fieldId]?.to || ''}
                                        onChange={(e) => setRangeFilter(fieldId, rangeFilters[fieldId]?.from || '', e.target.value)}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>

                                  {/* Checkbox Filter */}
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    <p className="text-xs font-medium text-gray-700">או בחר ערכים ספציפיים:</p>
                                    {getUniqueValuesForField(fieldId).map(value => (
                                      <div key={value} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                        <Checkbox
                                          checked={columnFilters[fieldId]?.includes(value) || false}
                                          onCheckedChange={() => toggleColumnFilter(fieldId, value)}
                                        />
                                        <label className="flex-1 cursor-pointer text-sm">
                                          {value}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2 justify-end pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => clearColumnFilter(fieldId)}
                                    >
                                      <FilterX className="w-4 h-4 ml-2" />
                                      נקה
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div
                            className={`absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-400 ${
                              resizingColumn === fieldId ? 'bg-blue-500' : 'bg-gray-100'
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const th = e.currentTarget.parentElement;
                              handleColumnResize(fieldId, e.clientX, th.offsetWidth);
                            }}
                          />
                        </th>
                      );
                    })}
                    <th className="px-6 py-2 text-right text-sm font-semibold text-gray-700">העבר לארכיון</th>
                  </tr>
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
                        className={`border-b border-gray-100 hover:bg-opacity-75 transition-colors ${index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}`}
                      >
                        {selectedFields.map(fieldId => {
                          const field = allAvailableFields.find(f => f.id === fieldId);
                          const value = field ? getFieldValue(field, caseData, linkedPerson, allPersons) : '—';
                          const width = columnWidths[fieldId];

                          return (
                            <td 
                              key={fieldId} 
                              className="px-6 py-2 cursor-pointer relative"
                              style={{ width: width ? `${width}px` : 'auto', minWidth: '80px' }}
                              onClick={() => window.location.href = createPageUrl(`CaseDetails?id=${caseData.id}`)}
                            >
                              {fieldId === 'account_number' ? (
                                <div className="font-semibold text-blue-600">{value}</div>
                              ) : fieldId === 'first_name' ? (
                                <div className="font-semibold text-gray-900">{value}</div>
                              ) : (
                                <span className="text-gray-600">{value}</span>
                              )}
                              <div className="absolute top-0 left-0 w-1 h-full bg-gray-100 pointer-events-none" />
                            </td>
                          );
                        })}
                        <td className="px-6 py-2 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveMutation.mutate(caseData.id);
                            }}
                            className="text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                          >
                            <Archive className="w-4 h-4" />
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