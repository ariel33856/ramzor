import React, { useState, useMemo } from 'react';
import { Phone, Mail, MessageSquare, Send, StickyNote, Users, User, ChevronLeft, Plus, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SecureEntities } from '@/components/secureEntities';

const interactionTypes = {
  whatsapp: { icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'וואטסאפ' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'אימייל' },
  phone: { icon: Phone, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'שיחה' },
  note: { icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'הערה' },
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
  const [typeFilter, setTypeFilter] = useState('all');
  const [addingType, setAddingType] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const queryClient = useQueryClient();

  // Build query filter based on linked contacts and case
  const contactIds = linkedContacts.map(c => c.id);

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions', caseId, contactIds.join(',')],
    queryFn: async () => {
      if (caseId) {
        const byCaseId = await SecureEntities.Interaction.filter({ case_id: caseId }, '-interaction_date');
        // Also fetch by contact IDs not linked to this case
        const byContactPromises = contactIds.map(id => 
          base44.entities.Interaction.filter({ contact_id: id }, '-interaction_date')
        );
        const byContactResults = await Promise.all(byContactPromises);
        const byContact = byContactResults.flat();
        // Merge and deduplicate
        const allMap = new Map();
        [...byCaseId, ...byContact].forEach(i => allMap.set(i.id, i));
        return Array.from(allMap.values()).sort((a, b) => 
          new Date(b.interaction_date || b.created_date) - new Date(a.interaction_date || a.created_date)
        );
      } else if (contactIds.length > 0) {
        const byContactPromises = contactIds.map(id => 
          SecureEntities.Interaction.filter({ contact_id: id }, '-interaction_date')
        );
        const results = await Promise.all(byContactPromises);
        return results.flat().sort((a, b) => 
          new Date(b.interaction_date || b.created_date) - new Date(a.interaction_date || a.created_date)
        );
      }
      return [];
    },
    enabled: contactIds.length > 0 || !!caseId,
    staleTime: 30000
  });

  const filteredInteractions = useMemo(() => {
    let result = interactions;
    if (!combinedView && selectedContactId) {
      result = result.filter(i => i.contact_id === selectedContactId);
    }
    if (typeFilter !== 'all') {
      result = result.filter(i => i.type === typeFilter);
    }
    return result;
  }, [interactions, selectedContactId, combinedView, typeFilter]);

  const selectedContact = linkedContacts.find(c => c.id === selectedContactId);

  const createMutation = useMutation({
    mutationFn: (data) => SecureEntities.Interaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      setNoteText('');
      setNewTitle('');
      setNewDescription('');
      setAddingType(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SecureEntities.Interaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interactions'] })
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    const target = selectedContact || linkedContacts[0];
    if (!target) return;
    createMutation.mutate({
      case_id: caseId || '',
      contact_id: target.id,
      contact_name: `${target.first_name} ${target.last_name}`,
      type: 'note',
      title: 'הערה פנימית',
      description: noteText.trim(),
      interaction_date: new Date().toISOString()
    });
  };

  const handleAddInteraction = (type) => {
    if (!newTitle.trim()) return;
    const target = selectedContact || linkedContacts[0];
    if (!target) return;
    createMutation.mutate({
      case_id: caseId || '',
      contact_id: target.id,
      contact_name: `${target.first_name} ${target.last_name}`,
      type,
      title: newTitle.trim(),
      description: newDescription.trim(),
      interaction_date: new Date().toISOString()
    });
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
            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1.5" onClick={() => { setAddingType('whatsapp'); setNewTitle(''); setNewDescription(''); }}>
              <MessageSquare className="w-4 h-4" />
              + וואטסאפ
            </Button>
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5" onClick={() => { setAddingType('email'); setNewTitle(''); setNewDescription(''); }}>
              <Mail className="w-4 h-4" />
              + אימייל
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setAddingType('phone'); setNewTitle(''); setNewDescription(''); }}>
              <Phone className="w-4 h-4" />
              + שיחה
            </Button>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            {[
              { key: 'all', label: 'הכל', bg: 'bg-gray-500 hover:bg-gray-600', activeBg: 'bg-gray-700' },
              { key: 'whatsapp', label: 'וואטסאפ', bg: 'bg-green-500 hover:bg-green-600', activeBg: 'bg-green-700' },
              { key: 'email', label: 'אימייל', bg: 'bg-blue-500 hover:bg-blue-600', activeBg: 'bg-blue-700' },
              { key: 'phone', label: 'שיחות', bg: 'bg-gray-400 hover:bg-gray-500', activeBg: 'bg-gray-600' },
              { key: 'note', label: 'הערות', bg: 'bg-amber-500 hover:bg-amber-600', activeBg: 'bg-amber-700' },
            ].map(f => (
              <Button
                key={f.key}
                size="sm"
                onClick={() => setTypeFilter(f.key)}
                className={`text-white gap-1 ${typeFilter === f.key ? `${f.activeBg} ring-2 ring-offset-1 ring-gray-400` : f.bg}`}
              >
                {f.label}
              </Button>
            ))}
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

        {/* Add Interaction Form */}
        {addingType && (
          <div className="p-3 border-b border-gray-100 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">
                {interactionTypes[addingType]?.label || addingType} חדש
              </span>
              <Button size="sm" variant="ghost" onClick={() => setAddingType(null)} className="mr-auto text-xs">ביטול</Button>
            </div>
            <Input
              placeholder="כותרת..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="תיאור..."
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddInteraction(addingType)}
              className="text-sm"
            />
            <Button size="sm" onClick={() => handleAddInteraction(addingType)} disabled={!newTitle.trim() || createMutation.isPending}>
              <Plus className="w-4 h-4 ml-1" />
              שמור
            </Button>
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredInteractions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">אין אינטראקציות להצגה</div>
          ) : (
            filteredInteractions.map(item => {
              const typeInfo = interactionTypes[item.type] || interactionTypes.note;
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
                      {combinedView && item.contact_name && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {item.contact_name}
                        </span>
                      )}
                    </div>
                    {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.interaction_date || item.created_date)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 self-start"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}