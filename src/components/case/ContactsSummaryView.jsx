import React, { useState } from 'react';
import { Phone, Mail, MapPin, Baby } from 'lucide-react';

const formatCurrency = (val) => {
  if (!val) return '0';
  return parseFloat(val).toLocaleString('he-IL', { maximumFractionDigits: 0 });
};

const getRelationship = (contact, caseId) => {
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

const relColors = {
  'לווה': 'from-yellow-500 to-orange-500',
  'ערב': 'from-pink-500 to-rose-500',
  'ערבה': 'from-pink-500 to-rose-500',
  'ערב ממשכן': 'from-purple-500 to-pink-500',
  'ערבה ממשכנת': 'from-purple-500 to-pink-500',
  'בן זוג': 'from-cyan-400 to-sky-400',
  'בת זוג': 'from-cyan-400 to-sky-400',
};

export default function ContactsSummaryView({ linkedContacts, caseId }) {
  const [activeTab, setActiveTab] = useState('general');

  if (!linkedContacts || linkedContacts.length === 0) {
    return <div className="text-center py-8 text-gray-400">אין אנשי קשר לסיכום</div>;
  }

  const tabDefs = [
    { id: 'general', label: 'פרטים אישיים', activeBg: 'bg-blue-50', activeText: 'text-blue-700', borderColor: 'border-blue-400', bottomBorderColor: 'border-b-blue-400' },
    { id: 'identity', label: 'תעודת זהות', activeBg: 'bg-amber-50', activeText: 'text-amber-700', borderColor: 'border-amber-400', bottomBorderColor: 'border-b-amber-400' },
    { id: 'income', label: 'הכנסות', activeBg: 'bg-green-50', activeText: 'text-green-700', borderColor: 'border-green-400', bottomBorderColor: 'border-b-green-400' },
    { id: 'obligations', label: 'התחייבויות ועו"ש', activeBg: 'bg-rose-50', activeText: 'text-rose-700', borderColor: 'border-rose-400', bottomBorderColor: 'border-b-rose-400' },
    { id: 'properties', label: 'נכסים', activeBg: 'bg-purple-50', activeText: 'text-purple-700', borderColor: 'border-purple-400', bottomBorderColor: 'border-b-purple-400' },
  ];

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

  const activeTabDef = tabDefs.find(t => t.id === activeTab);
  const activeBottomBorder = activeTabDef?.bottomBorderColor || '';

  return (
    <div>
      {/* Tab Headers */}
      <div className="flex">
        {tabDefs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 text-sm font-semibold rounded-t-lg border-2 ${
              activeTab === tab.id
                ? `${tab.activeText} ${tab.activeBg} ${tab.borderColor} border-b-0 relative z-10`
                : `${tab.activeText} ${tab.activeBg} ${tab.borderColor} ${activeBottomBorder}`
            }`}
            style={{ marginBottom: '-2px', padding: '0.2rem 1rem' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px' }}>
          <div className="space-y-3">
            {linkedContacts.map(contact => {
              const rel = getRelationship(contact, caseId);
              const birthDate = contact.custom_data?.id_upload_data?.birth_date || contact.custom_data?.birth_date;
              const age = getAge(birthDate);
              const numChildren = contact.custom_data?.id_upload_data?.num_children || contact.custom_data?.num_children || 0;
              const gradient = relColors[rel] || 'from-gray-500 to-gray-600';

              return (
                <div key={contact.id} className="bg-white border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`px-3 py-1 rounded-lg text-white text-sm font-bold bg-gradient-to-r ${gradient}`}>
                      {contact.first_name} {contact.last_name}
                    </div>
                    {rel && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{rel}</span>}
                    {age && <span className="text-xs text-gray-500">גיל {age}</span>}
                    {contact.id_number && <span className="text-xs text-gray-500">ת.ז: {contact.id_number}</span>}
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Identity Tab */}
      {activeTab === 'identity' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px' }}>
          <div className="space-y-3">
            {linkedContacts.map(contact => {
              const rel = getRelationship(contact, caseId);
              const gradient = relColors[rel] || 'from-gray-500 to-gray-600';
              const idData = contact.custom_data?.id_upload_data || {};
              const birthDate = idData.birth_date || contact.custom_data?.birth_date;
              const age = getAge(birthDate);
              const gender = contact.custom_data?.gender || idData.gender || '';
              const maritalStatus = contact.custom_data?.marital_status || '';
              const numChildren = idData.num_children || contact.custom_data?.num_children || 0;

              return (
                <div key={contact.id} className="bg-white border-2 border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`px-3 py-1 rounded-lg text-white text-sm font-bold bg-gradient-to-r ${gradient}`}>
                      {contact.first_name} {contact.last_name}
                    </div>
                    {rel && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{rel}</span>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div><span className="text-gray-500 text-xs">ת.ז:</span> <span className="font-medium">{contact.id_number || '-'}</span></div>
                    <div><span className="text-gray-500 text-xs">תאריך לידה:</span> <span className="font-medium">{birthDate || '-'}</span></div>
                    <div><span className="text-gray-500 text-xs">גיל:</span> <span className="font-medium">{age || '-'}</span></div>
                    <div><span className="text-gray-500 text-xs">מין:</span> <span className="font-medium">{gender === 'male' ? 'זכר' : gender === 'female' ? 'נקבה' : '-'}</span></div>
                    <div><span className="text-gray-500 text-xs">ילדים:</span> <span className="font-medium">{numChildren || '-'}</span></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
                    <div><span className="text-gray-500 text-xs">ישוב:</span> <span className="font-medium">{contact.residential_city || '-'}</span></div>
                    <div><span className="text-gray-500 text-xs">רחוב:</span> <span className="font-medium">{contact.address || '-'}</span></div>
                    <div><span className="text-gray-500 text-xs">בנין:</span> <span className="font-medium">{contact.building_number || '-'}</span></div>
                    <div><span className="text-gray-500 text-xs">דירה:</span> <span className="font-medium">{contact.apartment_number || '-'}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income Tab */}
      {activeTab === 'income' && (
        <div className="p-4 bg-green-50 border-2 border-green-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px' }}>
          <div className="space-y-3">
            {linkedContacts.map(contact => {
              const rel = getRelationship(contact, caseId);
              const gradient = relColors[rel] || 'from-gray-500 to-gray-600';
              const incomeSources = contact.custom_data?.income_sources || [];
              const contactIncome = incomeSources.reduce((s, inc) => {
                if (inc.type === 'תלוש משכורת-שכיר') {
                  const m1 = parseFloat(inc.month_1_salary) || 0;
                  const m2 = parseFloat(inc.month_2_salary) || 0;
                  const m3 = parseFloat(inc.month_3_salary) || 0;
                  return s + (m1 + m2 + m3) / 3;
                }
                return s + (parseFloat(inc.monthly_amount) || 0);
              }, 0);

              return (
                <div key={contact.id} className="bg-white border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`px-3 py-1 rounded-lg text-white text-sm font-bold bg-gradient-to-r ${gradient}`}>
                      {contact.first_name} {contact.last_name}
                    </div>
                    {rel && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{rel}</span>}
                    <div className="mr-auto bg-green-100 border border-green-300 rounded-lg px-3 py-1">
                      <span className="text-sm font-bold text-green-700">{formatCurrency(contactIncome)} ₪</span>
                    </div>
                  </div>
                  {incomeSources.length > 0 ? (
                    <div className="space-y-2">
                      {incomeSources.map((inc, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm bg-green-50 border border-green-200 rounded-lg p-2">
                          <span className="font-medium text-gray-700">{inc.type}</span>
                          {inc.employer_name && <span className="text-gray-500">- {inc.employer_name}</span>}
                          <span className="mr-auto font-bold text-green-700">
                            {inc.type === 'תלוש משכורת-שכיר' 
                              ? formatCurrency(((parseFloat(inc.month_1_salary) || 0) + (parseFloat(inc.month_2_salary) || 0) + (parseFloat(inc.month_3_salary) || 0)) / 3)
                              : formatCurrency(inc.monthly_amount)
                            } ₪
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">אין מקורות הכנסה</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 border-2 border-green-400 bg-white rounded-lg px-4 py-3">
            <span className="text-sm font-bold text-gray-700">סך הכנסות כל אנשי הקשר:</span>
            <span className="text-xl font-bold text-green-700">{formatCurrency(totalIncome)} ₪</span>
          </div>
        </div>
      )}

      {/* Obligations Tab */}
      {activeTab === 'obligations' && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px' }}>
          {/* Totals Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
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

          {/* Per-contact obligations */}
          <div className="space-y-3">
            {linkedContacts.map(contact => {
              const rel = getRelationship(contact, caseId);
              const gradient = relColors[rel] || 'from-gray-500 to-gray-600';
              const obligations = contact.custom_data?.obligations || [];
              const incomeSources = contact.custom_data?.income_sources || [];
              const contactObligations = obligations.reduce((s, o) => s + (parseFloat(o.monthly_payment) || 0), 0);
              const contactIncome = incomeSources.reduce((s, inc) => {
                if (inc.type === 'תלוש משכורת-שכיר') {
                  const m1 = parseFloat(inc.month_1_salary) || 0;
                  const m2 = parseFloat(inc.month_2_salary) || 0;
                  const m3 = parseFloat(inc.month_3_salary) || 0;
                  return s + (m1 + m2 + m3) / 3;
                }
                return s + (parseFloat(inc.monthly_amount) || 0);
              }, 0);

              return (
                <div key={contact.id} className="bg-white border-2 border-rose-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`px-3 py-1 rounded-lg text-white text-sm font-bold bg-gradient-to-r ${gradient}`}>
                      {contact.first_name} {contact.last_name}
                    </div>
                    {rel && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{rel}</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">הכנסה</p>
                      <p className="text-sm font-bold text-green-700">{formatCurrency(contactIncome)} ₪</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">התחייבויות</p>
                      <p className="text-sm font-bold text-red-700">{formatCurrency(contactObligations)} ₪</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">פנוי</p>
                      <p className="text-sm font-bold text-blue-700">{formatCurrency(contactIncome - contactObligations)} ₪</p>
                    </div>
                  </div>
                  {obligations.length > 0 ? (
                    <div className="space-y-2">
                      {obligations.map((ob, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm bg-rose-50 border border-rose-200 rounded-lg p-2">
                          <span className="font-medium text-gray-700">{ob.type}</span>
                          {ob.institution_name && <span className="text-gray-500">- {ob.institution_name}</span>}
                          <span className="mr-auto font-bold text-red-700">{formatCurrency(ob.monthly_payment)} ₪</span>
                          {ob.balance && <span className="text-xs text-gray-400">יתרה: {formatCurrency(ob.balance)} ₪</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">אין התחייבויות</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Properties Tab */}
      {activeTab === 'properties' && (
        <div className="p-4 bg-purple-50 border-2 border-purple-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px' }}>
          <div className="space-y-3">
            {linkedContacts.map(contact => {
              const rel = getRelationship(contact, caseId);
              const gradient = relColors[rel] || 'from-gray-500 to-gray-600';
              const propertyIds = contact.linked_properties || [];

              return (
                <div key={contact.id} className="bg-white border-2 border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`px-3 py-1 rounded-lg text-white text-sm font-bold bg-gradient-to-r ${gradient}`}>
                      {contact.first_name} {contact.last_name}
                    </div>
                    {rel && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{rel}</span>}
                    <span className="text-xs text-gray-500">{propertyIds.length} נכסים</span>
                  </div>
                  {propertyIds.length === 0 && (
                    <p className="text-xs text-gray-400">אין נכסים משויכים</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}