import React, { useState, useMemo } from 'react';
import { Phone, Mail, MessageSquare, Send, StickyNote, Users, User, ChevronLeft, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const interactionTypes = {
  whatsapp: { icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'וואטסאפ' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'אימייל' },
  phone: { icon: Phone, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'שיחה' },
  note: { icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'הערה' },
};

const dummyInteractions = (contacts) => {
  if (!contacts || contacts.length === 0) return [];
  const types = ['whatsapp', 'email', 'phone', 'note'];
  const titles = {
    whatsapp: ['הודעת וואטסאפ נשלחה', 'תגובה התקבלה בוואטסאפ', 'נשלח מסמך בוואטסאפ'],
    email: ['אימייל נשלח', 'תשובה התקבלה באימייל', 'נשלח סיכום פגישה'],
    phone: ['שיחת טלפון', 'שיחה נכנסת', 'הודעה קולית'],
    note: ['הערה פנימית', 'תזכורת', 'סיכום שיחה'],
  };
  const descriptions = {
    whatsapp: ['נשלחו פרטי הבקשה', 'הלקוח אישר קבלת מסמכים', 'נשלח טופס חתום'],
    email: ['נשלח סיכום תנאי המשכנתא', 'התקבל אישור העסקה', 'נשלחה בקשת מסמכים'],
    phone: ['שיחה בנוגע לתנאי ההלוואה', 'הלקוח התקשר לברר פרטים', 'הושארה הודעה'],
    note: ['יש לעקוב אחרי חתימת המסמכים', 'להתקשר שוב מחר', 'סוכם על מועד פגישה'],
  };

  const items = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    const type = types[i % types.length];
    const contact = contacts[i % contacts.length];
    items.push({
      id: `int-${i}`,
      type,
      contactId: contact.id,
      contactName: `${contact.first_name} ${contact.last_name}`,
      title: titles[type][i % titles[type].length],
      description: descriptions[type][i % descriptions[type].length],
      date: new Date(now - i * 3600000 * (6 + Math.random() * 18)),
    });
  }
  return items.sort((a, b) => b.date - a.date);
};

function formatDate(d) {
  const date = new Date(d);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function getRelationship(contact, caseId) {
  if (!contact.linked_accounts) return 'לווה';
  const link = contact.linked_accounts.find(acc =>
    typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
  );
  if (link && typeof link === 'object') return link.relationship_type || 'לווה';
  return 'לווה';
}

const relColors = {
  'לווה': 'from-yellow-500 to-orange-500',
  'ערב': 'from-pink-500 to-rose-500',
  'ערבה': 'from-pink-500 to-rose-500',
  'בן זוג': 'from-cyan-400 to-sky-400',
  'בת זוג': 'from-cyan-400 to-sky-400',
  'בן/בת זוג': 'from-cyan-400 to-sky-400',
};

export default function CommunicationHub({ linkedContacts = [], caseId }) {
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [combinedView, setCombinedView] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [extraInteractions, setExtraInteractions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');

  const interactions = useMemo(() => dummyInteractions(linkedContacts), [linkedContacts]);
  const allInteractions = useMemo(() => [...extraInteractions, ...interactions].sort((a, b) => b.date - a.date), [interactions, extraInteractions]);

  const filteredInteractions = useMemo(() => {
    if (combinedView || !selectedContactId) return allInteractions;
    return allInteractions.filter(i => i.contactId === selectedContactId);
  }, [allInteractions, selectedContactId, combinedView]);

  const selectedContact = linkedContacts.find(c => c.id === selectedContactId);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    const target = selectedContact || linkedContacts[0];
    if (!target) return;
    setExtraInteractions(prev => [{
      id: `note-${Date.now()}`,
      type: 'note',
      contactId: target.id,
      contactName: `${target.first_name} ${target.last_name}`,
      title: 'הערה פנימית',
      description: noteText.trim(),
      date: new Date(),
    }, ...prev]);
    setNoteText('');
  };

  if (!linkedContacts || linkedContacts.length === 0) {
    return <div className="text-center py-12 text-gray-400">אין אנשי קשר להצגת תקשורת</div>;
  }

  return (
    <div className="flex h-full min-h-[60vh] gap-3" dir="rtl">
      {/* Right Sidebar */}
      <div className="w-1/4 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4" />
            צדדים לתיק
          </h3>
        </div>

        {/* Combined view toggle */}
        <button
          onClick={() => { setCombinedView(true); setSelectedContactId(null); }}
          className={`mx-2 mt-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            combinedView
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          תצוגה משולבת
        </button>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 mt-1">
          {linkedContacts.map(contact => {
            const rel = getRelationship(contact, caseId);
            const isSelected = !combinedView && selectedContactId === contact.id;
            const gradient = relColors[rel] || 'from-gray-500 to-gray-600';
            return (
              <button
                key={contact.id}
                onClick={() => { setSelectedContactId(contact.id); setCombinedView(false); }}
                className={`w-full text-right px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-400 shadow-sm'
                    : 'bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{contact.first_name} {contact.last_name}</div>
                  <div className="text-xs text-gray-500">{rel}</div>
                </div>
                {isSelected && <ChevronLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Action Bar */}
        <div className="p-3 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1.5">
              <MessageSquare className="w-4 h-4" />
              וואטסאפ
            </Button>
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              <Mail className="w-4 h-4" />
              אימייל
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Phone className="w-4 h-4" />
              שיחה
            </Button>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white gap-1.5">
              <Send className="w-4 h-4" />
              שלח לכולם
            </Button>
            {!combinedView && selectedContact && (
              <span className="text-xs text-gray-500 mr-auto">
                פעולות עבור: <span className="font-semibold text-gray-800">{selectedContact.first_name} {selectedContact.last_name}</span>
              </span>
            )}
          </div>
          {/* Quick Note */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="הוסף הערה מהירה..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              className="flex-1 text-sm"
            />
            <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()} className="gap-1.5">
              <Plus className="w-4 h-4" />
              שמור
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredInteractions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">אין אינטראקציות להצגה</div>
          ) : (
            filteredInteractions.map(item => {
              const typeInfo = interactionTypes[item.type];
              const Icon = typeInfo.icon;
              return (
                <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${typeInfo.border} ${typeInfo.bg} transition-all hover:shadow-sm`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.bg} border ${typeInfo.border} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color} border ${typeInfo.border}`}>{typeInfo.label}</span>
                      {combinedView && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {item.contactName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.date)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}