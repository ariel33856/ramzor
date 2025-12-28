import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Calendar as CalendarIcon } from 'lucide-react';

export default function AppointmentDialog({ open, onOpenChange, cases = [], caseId, selectedTimeSlot, appointment }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    case_id: caseId || '',
    title: '',
    description: '',
    date: new Date(),
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    notes: '',
    status: 'scheduled'
  });

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

          {!caseId && (
            <div>
              <Label>לקוח</Label>
              <Select
                value={formData.case_id}
                onValueChange={(value) => setFormData({ ...formData, case_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>ללא שיוך ללקוח</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name} - {c.client_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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