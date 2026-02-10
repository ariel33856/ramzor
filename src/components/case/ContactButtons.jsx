import React from 'react';
import { Heart } from 'lucide-react';

export default function ContactButtons({ linkedContacts, caseId, activeContactId, onContactClick }) {
  if (!linkedContacts || linkedContacts.length === 0) return null;

  const getRelationshipType = (contact) => {
    if (!contact.linked_accounts) return 'לווה';
    const currentLink = contact.linked_accounts.find(acc => 
      typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
    );
    if (currentLink && typeof currentLink === 'object') {
      return currentLink.relationship_type || 'לווה';
    }
    return 'לווה';
  };

  const getDisplayRelationshipType = (contact) => {
    const relType = getRelationshipType(contact);
    const gender = contact.custom_data?.gender || 'male';
    
    if (relType === 'ערב' || relType === 'ערבה') {
      return gender === 'female' ? 'ערבה' : 'ערב';
    } else if (relType === 'ערב ממשכן' || relType === 'ערבה ממשכנת') {
      return gender === 'female' ? 'ערבה ממשכנת' : 'ערב ממשכן';
    } else if (relType === 'בן זוג' || relType === 'בת זוג' || relType === 'בן/בת זוג') {
      return gender === 'female' ? 'בת זוג' : 'בן זוג';
    }
    return relType;
  };

  const getButtonClass = (contact) => {
    const relationshipType = getRelationshipType(contact);
    let base = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white flex flex-col items-center ';
    if (relationshipType === 'בן זוג' || relationshipType === 'בת זוג' || relationshipType === 'בן/בת זוג') {
      base += 'bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-500 hover:to-sky-500';
    } else if (relationshipType === 'לווה') {
      base += 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600';
    } else if (relationshipType === 'ערב' || relationshipType === 'ערבה') {
      base += 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600';
    } else if (relationshipType === 'ערב ממשכן' || relationshipType === 'ערבה ממשכנת') {
      base += 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
    } else {
      base += 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700';
    }
    return base;
  };

  const couples = [];
  const displayedIds = new Set();

  linkedContacts.forEach((contact) => {
    if (displayedIds.has(contact.id)) return;
    
    const spouseId = contact.custom_data?.spouse_id;
    if (spouseId) {
      const partner = linkedContacts.find(c => c.id === spouseId && !displayedIds.has(c.id));
      if (partner) {
        const contactGender = contact.custom_data?.gender || 'male';
        const male = contactGender === 'male' ? contact : partner;
        const female = contactGender === 'male' ? partner : contact;
        couples.push({ contact: male, partner: female });
        displayedIds.add(contact.id);
        displayedIds.add(partner.id);
        return;
      }
    }

    const relType = getRelationshipType(contact);
    if (relType === 'בן זוג' || relType === 'בת זוג' || relType === 'בן/בת זוג') {
      const partner = linkedContacts.find(c => {
        if (c.id === contact.id || displayedIds.has(c.id)) return false;
        const pRelType = getRelationshipType(c);
        return pRelType === 'בן זוג' || pRelType === 'בת זוג' || pRelType === 'בן/בת זוג';
      });
      if (partner) {
        const contactGender = contact.custom_data?.gender || 'male';
        const male = contactGender === 'male' ? contact : partner;
        const female = contactGender === 'male' ? partner : contact;
        couples.push({ contact: male, partner: female });
        displayedIds.add(contact.id);
        displayedIds.add(partner.id);
      }
    }
  });

  const otherContacts = linkedContacts.filter(c => !displayedIds.has(c.id))
    .sort((a, b) => {
      const aType = getRelationshipType(a);
      const bType = getRelationshipType(b);
      const typeOrder = { 'לווה': 0, 'ערב': 1, 'ערבה': 1, 'ערב ממשכן': 2, 'ערבה ממשכנת': 2 };
      return (typeOrder[bType] || 3) - (typeOrder[aType] || 3);
    });

  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ minHeight: '52px' }}>
      {couples.map(({ contact, partner }) => (
        <div key={`couple-${contact.id}-${partner.id}`} className="border-2 border-green-300 rounded-lg p-2 bg-green-50/30">
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <button onClick={() => onContactClick(contact.id)} className={`${getButtonClass(contact)} ${activeContactId === contact.id ? 'ring-4 ring-white outline outline-4 outline-blue-500 shadow-lg' : ''}`}>
                <span className="font-semibold">{contact.first_name} {contact.last_name}</span>
              </button>
            </div>
            <Heart className="w-5 h-5 text-green-500 fill-green-500" />
            <div className="flex flex-col items-center">
              <button onClick={() => onContactClick(partner.id)} className={`${getButtonClass(partner)} ${activeContactId === partner.id ? 'ring-4 ring-white outline outline-4 outline-blue-500 shadow-lg' : ''}`}>
                <span className="font-semibold">{partner.first_name} {partner.last_name}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
      {otherContacts.map((contact) => (
        <div key={contact.id} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <button onClick={() => onContactClick(contact.id)} className={`${getButtonClass(contact)} ${activeContactId === contact.id ? 'ring-4 ring-white outline outline-4 outline-blue-500 shadow-lg' : ''}`}>
              <span className="font-semibold">{contact.first_name} {contact.last_name}</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}