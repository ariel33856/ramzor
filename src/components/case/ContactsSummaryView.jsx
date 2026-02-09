import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, User, Phone, Mail, MapPin, Briefcase, Heart, Baby, CreditCard } from 'lucide-react';

const formatCurrency = (val) => {
  if (!val) return '0';
  return parseFloat(val).toLocaleString('he-IL', { maximumFractionDigits: 0 });
};

export default function ContactsSummaryView({ linkedContacts, caseId }) {
  if (!linkedContacts || linkedContacts.length === 0) {
    return <div className="text-center py-8 text-gray-400">אין אנשי קשר לסיכום</div>;
  }

  const getRelationship = (contact) => {
    if (!contact.linked_accounts) return '';
    const link = contact.linked_accounts.find(acc =>
      typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
    );
    if (link && typeof link === 'object') return link.relationship_type || '';
    return '';
  };

  const getAge = (birthDate) => {
    if (!birthDate) return '';
    const parts = birthDate.split('-');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return '';
    const birth = new Date(year, month - 1, day);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
    return years;
  };

  // Compute totals
  const totalIncome = linkedContacts.reduce((sum, contact) => {
    const sources = contact.custom_data?.income_sources || [];
    return sum + sources.reduce((s, inc) => {
      if (inc.type === 'תלוש משכורת-שכיר') {
        const m1 = parseFloat(inc.month_1_salary) || 0;
        const m2 = parseFloat(inc.month_2_salary) || 0;
        const m3 = parseFloat(inc.month_3_salary) || 0;
        return s + (m1 + m2 + m3) / 3;
      }
      return s + (parseFloat(inc.monthly_amount) || 0);
    }, 0);
  }, 0);

  const totalObligations = linkedContacts.reduce((sum, contact) => {
    const obs = contact.custom_data?.obligations || [];
    return sum + obs.reduce((s, o) => s + (parseFloat(o.monthly_payment) || 0), 0);
  }, 0);

  const relColors = {
    'לווה': 'from-yellow-500 to-orange-500',
    'ערב': 'from-pink-500 to-rose-500',
    'ערבה': 'from-pink-500 to-rose-500',
    'ערב ממשכן': 'from-purple-500 to-pink-500',
    'ערבה ממשכנת': 'from-purple-500 to-pink-500',
    'בן זוג': 'from-cyan-400 to-sky-400',
    'בת זוג': 'from-cyan-400 to-sky-400',
  };

  return (
    <div className="space-y-4 p-1">
      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white border-2 border-green-300 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">סך הכנסות חודשיות</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)} ₪</p>
        </div>
        <div className="bg-white border-2 border-red-300 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">סך התחייבויות חודשיות</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalObligations)} ₪</p>
        </div>
        <div className="bg-white border-2 border-blue-300 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">פנוי חודשי</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalIncome - totalObligations)} ₪</p>
        </div>
      </div>

      {/* Per-contact summary */}
      {linkedContacts.map(contact => {
        const rel = getRelationship(contact);
        const birthDate = contact.custom_data?.id_upload_data?.birth_date || contact.custom_data?.birth_date;
        const age = getAge(birthDate);
        const incomeSources = contact.custom_data?.income_sources || [];
        const obligations = contact.custom_data?.obligations || [];
        const numChildren = contact.custom_data?.id_upload_data?.num_children || contact.custom_data?.num_children || 0;
        const gradient = relColors[rel] || 'from-gray-500 to-gray-600';

        const contactIncome = incomeSources.reduce((s, inc) => {
          if (inc.type === 'תלוש משכורת-שכיר') {
            const m1 = parseFloat(inc.month_1_salary) || 0;
            const m2 = parseFloat(inc.month_2_salary) || 0;
            const m3 = parseFloat(inc.month_3_salary) || 0;
            return s + (m1 + m2 + m3) / 3;
          }
          return s + (parseFloat(inc.monthly_amount) || 0);
        }, 0);

        const contactObligations = obligations.reduce((s, o) => s + (parseFloat(o.monthly_payment) || 0), 0);

        return (
          <div key={contact.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`px-3 py-1 rounded-lg text-white text-sm font-bold bg-gradient-to-r ${gradient}`}>
                {contact.first_name} {contact.last_name}
              </div>
              {rel && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{rel}</span>}
              {age && <span className="text-xs text-gray-500">גיל {age}</span>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{contact.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>{contact.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{contact.residential_city || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Baby className="w-3.5 h-3.5 text-gray-400" />
                <span>{numChildren ? `${numChildren} ילדים` : '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">הכנסה</p>
                <p className="text-sm font-bold text-green-700">{formatCurrency(contactIncome)} ₪</p>
                {incomeSources.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {incomeSources.map((inc, i) => (
                      <p key={i} className="text-xs text-gray-500">{inc.type}{inc.employer_name ? ` - ${inc.employer_name}` : ''}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">התחייבויות</p>
                <p className="text-sm font-bold text-red-700">{formatCurrency(contactObligations)} ₪</p>
                {obligations.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {obligations.map((ob, i) => (
                      <p key={i} className="text-xs text-gray-500">{ob.type}{ob.institution_name ? ` - ${ob.institution_name}` : ''}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">פנוי</p>
                <p className="text-sm font-bold text-blue-700">{formatCurrency(contactIncome - contactObligations)} ₪</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}