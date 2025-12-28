import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';

export default function AppointmentDialog({ open, onOpenChange, cases = [], caseId, selectedTimeSlot, appointment }) {
  const queryClient = useQueryClient();
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactData, setNewContactData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    type: 'איש קשר'
  });
  const [formData, setFormData] = useState({
    case_id: caseId || '',
    contact_person_id: '',
    title: '',
    description: '',
    date: new Date(),
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    notes: '',
    status: 'scheduled'
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['persons'],
    queryFn: () => base44.entities.Person.list()
  });

  const { data: selectedCase } = useQuery({
    queryKey: ['case-for-appointment', formData.case_id],
    queryFn: () => base44.entities.MortgageCase.filter({ id: formData.case_id }).then(res => res[0]),
    enabled: !!formData.case_id
  });

  const relatedContacts = formData.case_id && selectedCase?.linked_borrowers 
    ? allContacts.filter(c => selectedCase.linked_borrowers.includes(c.id))
    : [];

  useEffect(() => {
    if (selectedTimeSlot) {
      setFormData(prev => ({
        ...prev,
        date: selectedTimeSlot.date,
        start_time: selectedTimeSlot.time
      }));
    }
  }, [selectedTimeSlot]);

  useEffect(() => {
    if (caseId) {
      setFormData(prev => ({
        ...prev,
        case_id: caseId
      }));
    }
  }, [caseId]);

  useEffect(() => {
    if (appointment) {
      setFormData({
        case_id: appointment.case_id || '',
        contact_person_id: appointment.contact_person_id || '',
        title: appointment.title || '',
        description: appointment.description || '',
        date: appointment.date ? new Date(appointment.date) : new Date(),
        start_time: appointment.start_time || '09:00',
        end_time: appointment.end_time || '10:00',
        location: appointment.location || '',
        notes: appointment.notes || '',
        status: appointment.status || 'scheduled'
      });
    } else if (!caseId) {
      setFormData({
        case_id: '',
        contact_person_id: '',
        title: '',
        description: '',
        date: new Date(),
        start_time: '09:00',
        end_time: '10:00',
        location: '',
        notes: '',
        status: 'scheduled'
      });
    }
  }, [appointment, caseId]);

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.Person.create(data),
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      setFormData({ ...formData, contact_person_id: newContact.id });
      setShowNewContactForm(false);
      setNewContactData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        type: 'איש קשר'
      });
    }
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => {
      const submitData = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd')
      };
      if (appointment?.id) {
        return base44.entities.Appointment.update(appointment.id, submitData);
      }
      return base44.entities.Appointment.create(submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onOpenChange(false);
      setFormData({
        case_id: '',
        contact_person_id: '',
        title: '',
        description: '',
        date: new Date(),
        start_time: '09:00',
        end_time: '10:00',
        location: '',
        notes: '',
        status: 'scheduled'
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createAppointmentMutation.mutate(formData);
  };

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appointment ? 'עריכת פגישה' : 'פגישה חדשה'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>כותרת הפגישה *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="לדוגמה: פגישת ייעוץ משכנתא"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!caseId && (
              <div>
                <Label>חשבון משויך</Label>
                <Select
                  value={formData.case_id}
                  onValueChange={(value) => setFormData({ ...formData, case_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר חשבון (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא שיוך לחשבון</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.client_name} - {c.client_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>איש קשר</Label>
              {showNewContactForm ? (
                <div className="space-y-2 p-3 border rounded-lg bg-gray-50">
                  <div className="flex gap-2">
                    <Input
                      placeholder="שם פרטי"
                      value={newContactData.first_name}
                      onChange={(e) => setNewContactData({ ...newContactData, first_name: e.target.value })}
                    />
                    <Input
                      placeholder="שם משפחה"
                      value={newContactData.last_name}
                      onChange={(e) => setNewContactData({ ...newContactData, last_name: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="טלפון"
                    value={newContactData.phone}
                    onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                  />
                  <Input
                    placeholder="אימייל"
                    value={newContactData.email}
                    onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => createContactMutation.mutate(newContactData)}
                      disabled={!newContactData.first_name || !newContactData.last_name}
                    >
                      שמור
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewContactForm(false);
                        setNewContactData({ first_name: '', last_name: '', phone: '', email: '', type: 'איש קשר' });
                      }}
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  value={formData.contact_person_id}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setShowNewContactForm(true);
                    } else {
                      setFormData({ ...formData, contact_person_id: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר איש קשר (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>ללא איש קשר</SelectItem>
                    {relatedContacts.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">אנשי קשר משויכים לחשבון</div>
                        {relatedContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name} {contact.phone && `- ${contact.phone}`}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">כל אנשי הקשר</div>
                    {allContacts.filter(c => !relatedContacts.find(rc => rc.id === c.id)).map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name} {contact.phone && `- ${contact.phone}`}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">
                      <div className="flex items-center gap-2 text-blue-600 font-semibold">
                        <Plus className="w-4 h-4" />
                        <span>הוסף איש קשר חדש</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>תאריך *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(formData.date, 'PPP', { locale: he })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    locale={he}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>סטטוס</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">מתוכננת</SelectItem>
                  <SelectItem value="completed">הושלמה</SelectItem>
                  <SelectItem value="cancelled">בוטלה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>שעת התחלה *</Label>
              <Select
                value={formData.start_time}
                onValueChange={(value) => setFormData({ ...formData, start_time: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>שעת סיום *</Label>
              <Select
                value={formData.end_time}
                onValueChange={(value) => setFormData({ ...formData, end_time: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>מיקום</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="כתובת או מיקום הפגישה"
            />
          </div>

          <div>
            <Label>תיאור</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="פרטים נוספים על הפגישה"
              rows={3}
            />
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות פנימיות"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
              disabled={createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? 'שומר...' : appointment ? 'עדכן פגישה' : 'שמור פגישה'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}