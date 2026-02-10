import React, { useState } from 'react';
import CommunicationHub from './CommunicationHub';
import personTabDefs from '../person/personTabDefs';

const formatCurrency = (val) => {
  if (!val) return '0';
  return parseFloat(val).toLocaleString('he-IL', { maximumFractionDigits: 0 });
};

const getRelationship = (contact, caseId) => {
  if (!contact.linked_accounts) return 'לווה';
  const link = contact.linked_accounts.find(acc =>
    typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
  );
  if (link && typeof link === 'object') return link.relationship_type || 'לווה';
  return 'לווה';
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

const thClass = "px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 border-b-2 border-gray-300 text-right whitespace-nowrap";
const tdClass = "px-3 py-2.5 text-sm border-b border-gray-100 text-right";

const getNameStyle = (rel) => {
  if (rel === 'לווה') return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-lg inline-block';
  if (rel === 'ערב' || rel === 'ערבה') return 'bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 py-1 rounded-lg inline-block';
  if (rel === 'ערב ממשכן' || rel === 'ערבה ממשכנת') return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-lg inline-block';
  if (rel === 'בן זוג' || rel === 'בת זוג' || rel === 'בן/בת זוג') return 'bg-gradient-to-r from-cyan-400 to-sky-400 text-white px-2 py-1 rounded-lg inline-block';
  return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white px-2 py-1 rounded-lg inline-block';
};

export default function ContactsSummaryView({ linkedContacts, caseId }) {
  const [activeTab, _setActiveTab] = useState(() => window._sharedPersonTab || 'documentation');
  const setActiveTab = (tab) => {
    _setActiveTab(tab);
    window._sharedPersonTab = tab;
  };

  if (!linkedContacts || linkedContacts.length === 0) {
    return <div className="text-center py-8 text-gray-400">אין אנשי קשר לסיכום</div>;
  }

  // Group contacts: couples together (male first), then others sorted by relationship
  const sortedContacts = (() => {
    const result = [];
    const displayedIds = new Set();

    // First find couples (via spouse_id or both being בן/בת זוג)
    linkedContacts.forEach(contact => {
      if (displayedIds.has(contact.id)) return;
      const spouseId = contact.custom_data?.spouse_id;
      if (spouseId) {
        const partner = linkedContacts.find(c => c.id === spouseId && !displayedIds.has(c.id));
        if (partner) {
          const contactGender = contact.custom_data?.gender || 'male';
          const male = contactGender === 'male' ? contact : partner;
          const female = contactGender === 'male' ? partner : contact;
          result.push(male, female);
          displayedIds.add(contact.id);
          displayedIds.add(partner.id);
          return;
        }
      }
      const relType = getRelationship(contact, caseId);
      if (relType === 'בן זוג' || relType === 'בת זוג' || relType === 'בן/בת זוג') {
        const partner = linkedContacts.find(c => {
          if (c.id === contact.id || displayedIds.has(c.id)) return false;
          const pRel = getRelationship(c, caseId);
          return pRel === 'בן זוג' || pRel === 'בת זוג' || pRel === 'בן/בת זוג';
        });
        if (partner) {
          const contactGender = contact.custom_data?.gender || 'male';
          const male = contactGender === 'male' ? contact : partner;
          const female = contactGender === 'male' ? partner : contact;
          result.push(male, female);
          displayedIds.add(contact.id);
          displayedIds.add(partner.id);
        }
      }
    });

    // Then add remaining contacts sorted by relationship type
    const remaining = linkedContacts
      .filter(c => !displayedIds.has(c.id))
      .sort((a, b) => {
        const relA = getRelationship(a, caseId);
        const relB = getRelationship(b, caseId);
        const order = { 'לווה': 0, 'ערב': 1, 'ערבה': 1, 'ערב ממשכן': 2, 'ערבה ממשכנת': 2 };
        return (order[relA] ?? 9) - (order[relB] ?? 9);
      });

    return [...result, ...remaining];
  })();

  // Build groups: couples and singles for subtotals
  const contactGroups = (() => {
    const groups = [];
    const usedIds = new Set();
    
    // Find couples first
    sortedContacts.forEach(contact => {
      if (usedIds.has(contact.id)) return;
      const spouseId = contact.custom_data?.spouse_id;
      if (spouseId) {
        const partner = sortedContacts.find(c => c.id === spouseId && !usedIds.has(c.id));
        if (partner) {
          const contactGender = contact.custom_data?.gender || 'male';
          const male = contactGender === 'male' ? contact : partner;
          const female = contactGender === 'male' ? partner : contact;
          groups.push({ type: 'couple', contacts: [male, female], label: `${male.first_name} ${male.last_name} + ${female.first_name} ${female.last_name}` });
          usedIds.add(contact.id);
          usedIds.add(partner.id);
          return;
        }
      }
      const relType = getRelationship(contact, caseId);
      if (relType === 'בן זוג' || relType === 'בת זוג' || relType === 'בן/בת זוג') {
        const partner = sortedContacts.find(c => {
          if (c.id === contact.id || usedIds.has(c.id)) return false;
          const pRel = getRelationship(c, caseId);
          return pRel === 'בן זוג' || pRel === 'בת זוג' || pRel === 'בן/בת זוג';
        });
        if (partner) {
          const contactGender = contact.custom_data?.gender || 'male';
          const male = contactGender === 'male' ? contact : partner;
          const female = contactGender === 'male' ? partner : contact;
          groups.push({ type: 'couple', contacts: [male, female], label: `${male.first_name} ${male.last_name} + ${female.first_name} ${female.last_name}` });
          usedIds.add(contact.id);
          usedIds.add(partner.id);
        }
      }
    });
    
    // Add remaining as singles
    sortedContacts.forEach(contact => {
      if (usedIds.has(contact.id)) return;
      groups.push({ type: 'single', contacts: [contact], label: `${contact.first_name} ${contact.last_name}` });
      usedIds.add(contact.id);
    });
    
    return groups;
  })();

  const getContactIncome = (contact) => {
    const sources = contact.custom_data?.income_sources || [];
    return sources.reduce((s, inc) => {
      if (inc.type === 'תלוש משכורת-שכיר') {
        const m1 = parseFloat(inc.month_1_salary) || 0;
        const m2 = parseFloat(inc.month_2_salary) || 0;
        const m3 = parseFloat(inc.month_3_salary) || 0;
        return s + (m1 + m2 + m3) / 3;
      }
      return s + (parseFloat(inc.monthly_amount) || 0);
    }, 0);
  };

  const getContactObligations = (contact) => {
    const obs = contact.custom_data?.obligations || [];
    return obs.reduce((s, o) => s + (parseFloat(o.monthly_payment) || 0), 0);
  };

  const subtotalRowClass = "bg-gray-200 font-bold text-sm";
  const grandTotalRowClass = "bg-gray-800 text-white font-bold text-base";

  const tabDefs = [
    { id: 'documentation', label: 'תקשורת', activeBg: 'bg-teal-50', activeText: 'text-teal-700', borderColor: 'border-teal-400', bottomBorderColor: 'border-b-teal-400' },
    { id: 'identity', label: 'תעודת זהות', activeBg: 'bg-amber-50', activeText: 'text-amber-700', borderColor: 'border-amber-400', bottomBorderColor: 'border-b-amber-400' },
    { id: 'income', label: 'הכנסות', activeBg: 'bg-green-50', activeText: 'text-green-700', borderColor: 'border-green-400', bottomBorderColor: 'border-b-green-400' },
    { id: 'obligations', label: 'התחייבויות ועו"ש', activeBg: 'bg-rose-50', activeText: 'text-rose-700', borderColor: 'border-rose-400', bottomBorderColor: 'border-b-rose-400' },
    { id: 'general', label: 'פרטים אישיים', activeBg: 'bg-blue-50', activeText: 'text-blue-700', borderColor: 'border-blue-400', bottomBorderColor: 'border-b-blue-400' },
    { id: 'properties', label: 'נכסים', activeBg: 'bg-purple-50', activeText: 'text-purple-700', borderColor: 'border-purple-400', bottomBorderColor: 'border-b-purple-400' },
    { id: 'health', label: 'מסמכים', activeBg: 'bg-cyan-50', activeText: 'text-cyan-700', borderColor: 'border-cyan-400', bottomBorderColor: 'border-b-cyan-400' },
    { id: 'transactions', label: 'עסקאות', activeBg: 'bg-amber-50', activeText: 'text-black', borderColor: 'border-black', bottomBorderColor: 'border-b-black' },
  ];

  // Compute totals
  const totalIncome = sortedContacts.reduce((sum, contact) => {
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

  const totalObligations = sortedContacts.reduce((sum, contact) => {
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
      <div className="p-4 bg-blue-50 border-2 border-blue-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'general' ? 'block' : 'none' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr>
                  <th className={thClass}>שם</th>
                  <th className={thClass}>קשר</th>
                  <th className={thClass}>ת.ז</th>
                  <th className={thClass}>גיל</th>
                  <th className={thClass}>טלפון</th>
                  <th className={thClass}>אימייל</th>
                  <th className={thClass}>ישוב</th>
                  <th className={thClass}>ילדים</th>
                </tr>
              </thead>
              <tbody>
                {sortedContacts.map(contact => {
                  const rel = getRelationship(contact, caseId);
                  const birthDate = contact.custom_data?.id_upload_data?.birth_date || contact.custom_data?.birth_date;
                  const age = getAge(birthDate);
                  const numChildren = contact.custom_data?.id_upload_data?.num_children || contact.custom_data?.num_children || 0;
                  return (
                    <tr key={contact.id} className="hover:bg-blue-50/50">
                      <td className={tdClass}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>
                      <td className={tdClass}>{rel || '-'}</td>
                      <td className={tdClass}>{contact.id_number || '-'}</td>
                      <td className={tdClass}>{age || '-'}</td>
                      <td className={tdClass}>{contact.phone || '-'}</td>
                      <td className={tdClass}>{contact.email || '-'}</td>
                      <td className={tdClass}>{contact.residential_city || '-'}</td>
                      <td className={tdClass}>{numChildren || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {/* Identity Tab */}
      <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'identity' ? 'block' : 'none' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr>
                  <th className={thClass}>שם</th>
                  <th className={thClass}>קשר</th>
                  <th className={thClass}>ת.ז</th>
                  <th className={thClass}>תאריך לידה</th>
                  <th className={thClass}>גיל</th>
                  <th className={thClass}>מין</th>
                  <th className={thClass}>ילדים</th>
                  <th className={thClass}>ישוב</th>
                  <th className={thClass}>רחוב</th>
                  <th className={thClass}>בנין</th>
                  <th className={thClass}>דירה</th>
                </tr>
              </thead>
              <tbody>
                {sortedContacts.map(contact => {
                  const rel = getRelationship(contact, caseId);
                  const idData = contact.custom_data?.id_upload_data || {};
                  const birthDate = idData.birth_date || contact.custom_data?.birth_date;
                  const age = getAge(birthDate);
                  const gender = contact.custom_data?.gender || idData.gender || '';
                  const numChildren = idData.num_children || contact.custom_data?.num_children || 0;
                  return (
                    <tr key={contact.id} className="hover:bg-amber-50/50">
                      <td className={tdClass}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>
                      <td className={tdClass}>{rel || '-'}</td>
                      <td className={tdClass}>{contact.id_number || '-'}</td>
                      <td className={tdClass}>{birthDate || '-'}</td>
                      <td className={tdClass}>{age || '-'}</td>
                      <td className={tdClass}>{gender === 'male' ? 'זכר' : gender === 'female' ? 'נקבה' : '-'}</td>
                      <td className={tdClass}>{numChildren || '-'}</td>
                      <td className={tdClass}>{contact.residential_city || '-'}</td>
                      <td className={tdClass}>{contact.address || '-'}</td>
                      <td className={tdClass}>{contact.building_number || '-'}</td>
                      <td className={tdClass}>{contact.apartment_number || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {/* Income Tab */}
      <div className="p-4 bg-green-50 border-2 border-green-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'income' ? 'block' : 'none' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr>
                  <th className={thClass}>שם</th>
                  <th className={thClass}>קשר</th>
                  <th className={thClass}>סוג הכנסה</th>
                  <th className={thClass}>מעסיק</th>
                  <th className={thClass}>סכום חודשי</th>
                </tr>
              </thead>
              <tbody>
                {contactGroups.flatMap((group, gi) => {
                  const rows = [];
                  let groupTotal = 0;
                  group.contacts.forEach(contact => {
                    const rel = getRelationship(contact, caseId);
                    const incomeSources = contact.custom_data?.income_sources || [];
                    if (incomeSources.length === 0) {
                      rows.push(
                        <tr key={contact.id} className="hover:bg-green-50/50">
                          <td className={tdClass}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>
                          <td className={tdClass}>{rel || '-'}</td>
                          <td className={tdClass} colSpan={3}>אין מקורות הכנסה</td>
                        </tr>
                      );
                    } else {
                      incomeSources.forEach((inc, i) => {
                        const amt = inc.type === 'תלוש משכורת-שכיר'
                          ? ((parseFloat(inc.month_1_salary) || 0) + (parseFloat(inc.month_2_salary) || 0) + (parseFloat(inc.month_3_salary) || 0)) / 3
                          : parseFloat(inc.monthly_amount) || 0;
                        groupTotal += amt;
                        rows.push(
                          <tr key={`${contact.id}-${i}`} className="hover:bg-green-50/50">
                            {i === 0 && <td className={tdClass} rowSpan={incomeSources.length}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>}
                            {i === 0 && <td className={tdClass} rowSpan={incomeSources.length}>{rel || '-'}</td>}
                            <td className={tdClass}>{inc.type}</td>
                            <td className={tdClass}>{inc.employer_name || '-'}</td>
                            <td className={`${tdClass} font-bold text-green-700`}>{formatCurrency(amt)} ₪</td>
                          </tr>
                        );
                      });
                    }
                  });
                  // Subtotal row for couple or single
                  if (group.contacts.length > 1 || contactGroups.length > 1) {
                    rows.push(
                      <tr key={`subtotal-${gi}`} className={subtotalRowClass}>
                        <td className="px-3 py-2 text-right" colSpan={4}>סה״כ {group.label}</td>
                        <td className="px-3 py-2 text-right text-green-800">{formatCurrency(groupTotal)} ₪</td>
                      </tr>
                    );
                  }
                  return rows;
                })}
              </tbody>
              <tfoot>
                <tr className={grandTotalRowClass}>
                  <td className="px-3 py-3 text-right" colSpan={4}>סה״כ כולל</td>
                  <td className="px-3 py-3 text-right">{formatCurrency(totalIncome)} ₪</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      {/* Obligations Tab */}
      <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'obligations' ? 'block' : 'none' }}>
          {/* Summary row */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr>
                  <th className={`${thClass} bg-green-100 text-green-700`}>סה״כ הכנסות</th>
                  <th className={`${thClass} bg-red-100 text-red-700`}>סה״כ התחייבויות</th>
                  <th className={`${thClass} bg-blue-100 text-blue-700`}>פנוי חודשי</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-3 text-center text-lg font-bold text-green-700 border-b">{formatCurrency(totalIncome)} ₪</td>
                  <td className="px-3 py-3 text-center text-lg font-bold text-red-700 border-b">{formatCurrency(totalObligations)} ₪</td>
                  <td className="px-3 py-3 text-center text-lg font-bold text-blue-700 border-b">{formatCurrency(totalIncome - totalObligations)} ₪</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr>
                  <th className={thClass}>שם</th>
                  <th className={thClass}>קשר</th>
                  <th className={thClass}>הכנסה</th>
                  <th className={thClass}>סוג התחייבות</th>
                  <th className={thClass}>מוסד</th>
                  <th className={thClass}>תשלום חודשי</th>
                  <th className={thClass}>יתרה</th>
                  <th className={thClass}>פנוי</th>
                </tr>
              </thead>
              <tbody>
                {contactGroups.flatMap((group, gi) => {
                  const rows = [];
                  let groupIncome = 0;
                  let groupObl = 0;
                  group.contacts.forEach(contact => {
                    const rel = getRelationship(contact, caseId);
                    const obligations = contact.custom_data?.obligations || [];
                    const cIncome = getContactIncome(contact);
                    const cObl = getContactObligations(contact);
                    groupIncome += cIncome;
                    groupObl += cObl;
                    const rowCount = Math.max(obligations.length, 1);
                    if (obligations.length === 0) {
                      rows.push(
                        <tr key={contact.id} className="hover:bg-rose-50/50">
                          <td className={tdClass}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>
                          <td className={tdClass}>{rel || '-'}</td>
                          <td className={`${tdClass} font-bold text-green-700`}>{formatCurrency(cIncome)} ₪</td>
                          <td className={tdClass} colSpan={3}>אין התחייבויות</td>
                          <td className={tdClass}>-</td>
                          <td className={`${tdClass} font-bold text-blue-700`}>{formatCurrency(cIncome)} ₪</td>
                        </tr>
                      );
                    } else {
                      obligations.forEach((ob, i) => {
                        rows.push(
                          <tr key={`${contact.id}-${i}`} className="hover:bg-rose-50/50">
                            {i === 0 && <td className={tdClass} rowSpan={rowCount}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>}
                            {i === 0 && <td className={tdClass} rowSpan={rowCount}>{rel || '-'}</td>}
                            {i === 0 && <td className={`${tdClass} font-bold text-green-700`} rowSpan={rowCount}>{formatCurrency(cIncome)} ₪</td>}
                            <td className={tdClass}>{ob.type}</td>
                            <td className={tdClass}>{ob.institution_name || '-'}</td>
                            <td className={`${tdClass} font-bold text-red-700`}>{formatCurrency(ob.monthly_payment)} ₪</td>
                            <td className={tdClass}>{ob.balance ? `${formatCurrency(ob.balance)} ₪` : '-'}</td>
                            {i === 0 && <td className={`${tdClass} font-bold text-blue-700`} rowSpan={rowCount}>{formatCurrency(cIncome - cObl)} ₪</td>}
                          </tr>
                        );
                      });
                    }
                  });
                  // Subtotal row
                  if (group.contacts.length > 1 || contactGroups.length > 1) {
                    rows.push(
                      <tr key={`subtotal-obl-${gi}`} className={subtotalRowClass}>
                        <td className="px-3 py-2 text-right" colSpan={2}>סה״כ {group.label}</td>
                        <td className="px-3 py-2 text-right text-green-800">{formatCurrency(groupIncome)} ₪</td>
                        <td className="px-3 py-2 text-right" colSpan={2}></td>
                        <td className="px-3 py-2 text-right text-red-800">{formatCurrency(groupObl)} ₪</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right text-blue-800">{formatCurrency(groupIncome - groupObl)} ₪</td>
                      </tr>
                    );
                  }
                  return rows;
                })}
              </tbody>
              <tfoot>
                <tr className={grandTotalRowClass}>
                  <td className="px-3 py-3 text-right" colSpan={2}>סה״כ כולל</td>
                  <td className="px-3 py-3 text-right">{formatCurrency(totalIncome)} ₪</td>
                  <td className="px-3 py-3 text-right" colSpan={2}></td>
                  <td className="px-3 py-3 text-right">{formatCurrency(totalObligations)} ₪</td>
                  <td className="px-3 py-3 text-right"></td>
                  <td className="px-3 py-3 text-right">{formatCurrency(totalIncome - totalObligations)} ₪</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      {/* Properties Tab */}
      <div className="p-4 bg-purple-50 border-2 border-purple-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'properties' ? 'block' : 'none' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr>
                  <th className={thClass}>שם</th>
                  <th className={thClass}>קשר</th>
                  <th className={thClass}>מס׳ נכסים</th>
                </tr>
              </thead>
              <tbody>
                {sortedContacts.map(contact => {
                  const rel = getRelationship(contact, caseId);
                  const propertyIds = contact.linked_properties || [];
                  return (
                    <tr key={contact.id} className="hover:bg-purple-50/50">
                      <td className={tdClass}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>
                      <td className={tdClass}>{rel || '-'}</td>
                      <td className={tdClass}>{propertyIds.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {/* Health/Documents Tab */}
      <div className="p-4 bg-cyan-50 border-2 border-cyan-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'health' ? 'block' : 'none' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr>
                  <th className={thClass}>שם</th>
                  <th className={thClass}>קשר</th>
                  <th className={thClass}>מצב בריאותי</th>
                  <th className={thClass}>השכלה</th>
                </tr>
              </thead>
              <tbody>
                {sortedContacts.map(contact => {
                  const rel = getRelationship(contact, caseId);
                  const healthStatus = contact.custom_data?.health_status || '';
                  const education = contact.custom_data?.education || '';
                  return (
                    <tr key={contact.id} className="hover:bg-cyan-50/50">
                      <td className={tdClass}><span className={`${getNameStyle(rel)} font-semibold`}>{contact.first_name} {contact.last_name}</span></td>
                      <td className={tdClass}>{rel || '-'}</td>
                      <td className={tdClass}>{healthStatus || '-'}</td>
                      <td className={tdClass}>{education || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {/* Documentation/Communication Tab */}
      <div className="p-4 bg-teal-50 border-2 border-teal-400 rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'documentation' ? 'block' : 'none' }}>
          <CommunicationHub linkedContacts={linkedContacts} caseId={caseId} />
        </div>

      {/* Transactions Tab */}
      <div className="p-4 bg-amber-50 border-2 border-black rounded-b-lg" style={{ minHeight: '60vh', marginTop: '-2px', display: activeTab === 'transactions' ? 'block' : 'none' }}>
          <div className="text-center py-12 text-gray-500">
            <p>סיכום עסקאות</p>
          </div>
        </div>
    </div>
  );
}