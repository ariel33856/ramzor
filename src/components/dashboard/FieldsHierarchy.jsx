// המבנה ההיררכי של קבוצות, כרטיסיות, קומפוננטות ושדות
// מבוסס על המבנה מ-CaseDetails

import { tabs } from '@/components/CaseTabs';
import { personFields } from '@/components/case/personFields';

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
      fields: personFields.map(field => ({
        id: field.id,
        label: field.label,
        source: 'person', // מאיזו ישות מגיע הנתון
        visible: field.visible || false
      }))
    }
  ],
  contact: [
    {
      id: 'contact_info',
      label: 'פרטי התקשרות',
      fields: [
        { id: 'phone', label: 'טלפון', source: 'person', visible: false },
        { id: 'email', label: 'אימייל', source: 'person', visible: false }
      ]
    }
  ],
  account: [
    {
      id: 'account_info',
      label: 'מידע חשבון',
      fields: [
        { id: 'account_number', label: 'מספר חשבון', source: 'case', visible: true },
        { id: 'status', label: 'סטטוס', source: 'case', visible: false },
        { id: 'created_date', label: 'תאריך פתיחה', source: 'case', visible: false }
      ]
    }
  ]
  // ניתן להוסיף כרטיסיות נוספות כאן
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

// פונקציה לקבלת ערך שדה מהנתונים
export const getFieldValue = (field, caseData, linkedPerson, allPersons) => {
  if (!field) return '—';
  
  if (field.source === 'case') {
    return caseData?.[field.id] || '—';
  } else if (field.source === 'person') {
    if (!linkedPerson) return '—';
    
    // בדוק קודם ב-custom_data
    const customValue = linkedPerson.custom_data?.[field.id];
    const value = customValue || linkedPerson[field.id];
    
    return value || '—';
  }
  
  return '—';
};