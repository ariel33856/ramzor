// המבנה ההיררכי של קבוצות, כרטיסיות, קומפוננטות ושדות
// מבוסס על המבנה מ-CaseDetails

import { tabs } from '@/components/CaseTabs';

// הקבוצות הראשיות (כמו ב-CaseDetails)
export const mainGroups = [
  {
    id: 'personal_info',
    label: 'מידע אישי',
    color: 'blue',
    tabIds: ['personal', 'contact', 'contacts']
  },
  {
    id: 'management',
    label: 'ניהול וארגון',
    color: 'purple',
    tabIds: ['summary', 'notes', 'status', 'workflow', 'calendar', 'tracking', 'documents', 'data']
  },
  {
    id: 'analysis',
    label: 'ניתוח וביצועים',
    color: 'green',
    tabIds: ['profiles', 'metrics', 'dashboards']
  },
  {
    id: 'finance',
    label: 'פיננסים ומוצרים',
    color: 'orange',
    tabIds: ['calculator', 'payments', 'insurance', 'products', 'account']
  }
];

// הקומפוננטות והשדות שלהן לפי כרטיסייה
export const tabComponents = {
  personal: [
    {
      id: 'person_details',
      label: 'פרטי איש קשר',
      fields: []
    }
  ],
  contact: [
    {
      id: 'contact_info',
      label: 'פרטי התקשרות',
      fields: []
    }
  ],
  contacts: [
    {
      id: 'linked_contacts',
      label: 'אנשי קשר משויכים',
      fields: []
    }
  ],
  summary: [
    {
      id: 'case_summary',
      label: 'תקציר כללי',
      fields: []
    }
  ],
  notes: [
    {
      id: 'case_notes',
      label: 'הערות התיק',
      fields: []
    }
  ],
  status: [
    {
      id: 'status_info',
      label: 'מידע סטטוס',
      fields: [
        { id: 'main_status', label: 'סטטוס ראשי', source: 'case', visible: false }
      ]
    }
  ],
  data: [
    {
      id: 'financial_data',
      label: 'נתונים פיננסיים',
      fields: []
    }
  ],
  profiles: [
    {
      id: 'client_profile',
      label: 'פרופיל לקוח',
      fields: []
    }
  ],
  account: [
    {
      id: 'account_info',
      label: 'מידע חשבון',
      fields: []
    }
  ],
  workflow: [
    {
      id: 'workflow_status',
      label: 'תהליך עבודה',
      fields: []
    }
  ],
  metrics: [
    {
      id: 'case_metrics',
      label: 'מדדי תיק',
      fields: []
    }
  ],
  calendar: [
    {
      id: 'calendar_info',
      label: 'מידע יומן',
      fields: []
    }
  ],
  tracking: [
    {
      id: 'tracking_info',
      label: 'מעקב',
      fields: []
    }
  ],
  documents: [
    {
      id: 'documents_info',
      label: 'מסמכים',
      fields: []
    }
  ],
  dashboards: [
    {
      id: 'dashboard_info',
      label: 'דשבורד',
      fields: []
    }
  ],
  calculator: [
    {
      id: 'calculator_info',
      label: 'מחשבון',
      fields: []
    }
  ],
  payments: [
    {
      id: 'payments_info',
      label: 'תשלומים',
      fields: []
    }
  ],
  insurance: [
    {
      id: 'insurance_info',
      label: 'ביטוחים',
      fields: []
    }
  ],
  products: [
    {
      id: 'products_info',
      label: 'מוצרים',
      fields: []
    }
  ]
};

// פונקציה לקבלת כל השדות האפשריים
export const getAllFields = () => {
  const allFields = [];
  
  Object.entries(tabComponents).forEach(([tabId, components]) => {
    components.forEach(component => {
      component.fields.forEach(field => {
        // הוסף את המידע על הכרטיסייה והקומפוננטה
        const tab = tabs.find(t => t.id === tabId);
        const group = mainGroups.find(g => g.tabIds.includes(tabId));
        
        allFields.push({
          ...field,
          tabId,
          tabLabel: tab?.label || tabId,
          componentId: component.id,
          componentLabel: component.label,
          groupId: group?.id,
          groupLabel: group?.label
        });
      });
    });
  });
  
  return allFields;
};

// פונקציה לקבלת ערך שדה מהנתונים - מטפלת גם בשדות רגילים וגם ב-custom_data
export const getFieldValue = (field, caseData, linkedPerson, allPersons) => {
  if (!field) return '—';
  
  if (field.source === 'case') {
    const value = caseData?.[field.id];
    
    // טיפול מיוחד בשדות ספציפיים
    if (field.id === 'status') {
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
      return statusLabels[value] || value || '—';
    }
    
    if (field.id === 'main_status') {
      return value || 'ליד חדש';
    }
    
    if (field.id === 'urgency') {
      const urgencyLabels = {
        low: 'נמוכה',
        medium: 'בינונית',
        high: 'גבוהה',
        critical: 'קריטית'
      };
      return urgencyLabels[value] || value || '—';
    }
    
    if (field.id === 'target_bank') {
      const bankLabels = {
        hapoalim: 'הפועלים',
        leumi: 'לאומי',
        mizrahi: 'מזרחי',
        discount: 'דיסקונט',
        fibi: 'פיבי',
        other: 'אחר'
      };
      return bankLabels[value] || value || '—';
    }
    
    if ((field.id === 'created_date' || field.id === 'updated_date') && value) {
      const date = new Date(value);
      const israelTime = new Date(date.getTime() + (2 * 60 * 60 * 1000));
      return israelTime.toLocaleDateString('he-IL');
    }
    
    if (['property_value', 'loan_amount', 'monthly_income', 'monthly_expenses'].includes(field.id) && value) {
      return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
    }
    
    if (field.id === 'red_flags' && Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : '—';
    }
    
    if (field.id === 'linked_borrowers' && Array.isArray(value)) {
      return value.length > 0 ? `${value.length} לווים` : '—';
    }
    
    if (field.id === 'is_archived') {
      return value ? 'כן' : 'לא';
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? 'כן' : 'לא';
    }
    
    // בדוק ב-custom_data אם לא נמצא
    const customValue = caseData?.custom_data?.[field.id];
    return value || customValue || '—';
  } else if (field.source === 'person') {
    if (!linkedPerson) return '—';
    
    const value = linkedPerson[field.id];
    
    if (field.id === 'linked_accounts' && Array.isArray(value)) {
      return value.length > 0 ? `${value.length} חשבונות` : '—';
    }
    
    if (field.id === 'type') {
      const typeLabels = {
        'לווה': 'לווה',
        'ערב': 'ערב',
        'איש קשר': 'איש קשר'
      };
      return typeLabels[value] || value || '—';
    }
    
    if (field.id === 'is_archived') {
      return value ? 'כן' : 'לא';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'כן' : 'לא';
    }
    
    return value || '—';
  } else if (field.source === 'person_custom') {
    if (!linkedPerson) return '—';
    
    const value = linkedPerson.custom_data?.[field.id];
    
    if (field.id === 'spouse_id' && value) {
      const spouse = allPersons?.find(p => p.id === value);
      return spouse ? `${spouse.first_name} ${spouse.last_name}` : '—';
    }
    
    return value || '—';
  }
  
  return '—';
};