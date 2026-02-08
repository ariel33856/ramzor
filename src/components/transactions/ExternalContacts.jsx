import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Phone, Mail, User, ChevronDown, ChevronUp } from 'lucide-react';

const roleOptions = ['מוכר', 'קונה', 'עו"ד מוכר', 'עו"ד קונה', 'מתווך', 'שמאי', 'רואה חשבון', 'יועץ מס', 'קבלן', 'אחר'];

export default function ExternalContacts({ contacts = [], onChange }) {
  const [expanded, setExpanded] = useState(true);
  const [editIndex, setEditIndex] = useState(null);

  const addContact = () => {
    onChange([...contacts, { name: '', role: '', phone: '', email: '', notes: '' }]);
    setEditIndex(contacts.length);
  };

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeContact = (index) => {
    onChange(contacts.filter((_, i) => i !== index));
    if (editIndex === index) setEditIndex(null);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-gray-700">אנשי קשר בעסקה</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{contacts.length}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-3 pt-0 space-y-2">
          {contacts.map((contact, i) => (
            <div key={i} className="bg-white rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{contact.name?.charAt(0) || '?'}</span>
                  </div>
                  {editIndex !== i && (
                    <div>
                      <span className="text-sm font-medium text-gray-900">{contact.name || 'ללא שם'}</span>
                      {contact.role && <span className="text-xs text-gray-500 mr-2">({contact.role})</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {contact.phone && editIndex !== i && (
                    <a href={`tel:${contact.phone}`} className="p-1 rounded hover:bg-green-50">
                      <Phone className="w-3.5 h-3.5 text-green-600" />
                    </a>
                  )}
                  {contact.email && editIndex !== i && (
                    <a href={`mailto:${contact.email}`} className="p-1 rounded hover:bg-blue-50">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                    </a>
                  )}
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-blue-600" onClick={() => setEditIndex(editIndex === i ? null : i)}>
                    <span className="text-xs">{editIndex === i ? '✓' : '✎'}</span>
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeContact(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {editIndex === i && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Input className="h-8 text-sm" placeholder="שם" value={contact.name} onChange={e => updateContact(i, 'name', e.target.value)} />
                  <Select value={contact.role || ''} onValueChange={v => updateContact(i, 'role', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="תפקיד" /></SelectTrigger>
                    <SelectContent>
                      {roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="h-8 text-sm" placeholder="טלפון" value={contact.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                  <Input className="h-8 text-sm" placeholder="אימייל" value={contact.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                  <Input className="h-8 text-sm col-span-2" placeholder="הערות" value={contact.notes} onChange={e => updateContact(i, 'notes', e.target.value)} />
                </div>
              )}

              {editIndex !== i && (contact.phone || contact.email) && (
                <div className="flex gap-3 text-xs text-gray-500">
                  {contact.phone && <span>{contact.phone}</span>}
                  {contact.email && <span>{contact.email}</span>}
                </div>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addContact} className="w-full border-dashed">
            <Plus className="w-4 h-4 ml-1" />
            הוסף איש קשר
          </Button>
        </div>
      )}
    </div>
  );
}