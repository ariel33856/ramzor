import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Plus, Loader2, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import AppointmentDialog from '@/components/calendar/AppointmentDialog';
import AppointmentCard from '@/components/calendar/AppointmentCard';

export default function CaseCalendar() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['case-appointments', caseId],
    queryFn: () => base44.entities.Appointment.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (appointmentId) => base44.entities.Appointment.delete(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-appointments', caseId] });
    }
  });

  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setDialogOpen(true);
  };

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setDialogOpen(true);
  };

  const getDaysInWeek = (date) => {
    const week = [];
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 8);

  const getAppointmentsForDateTime = (date, hour) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => {
      if (apt.date !== dateStr) return false;
      const startHour = parseInt(apt.start_time.split(':')[0]);
      return startHour === hour;
    });
  };

  const weekDays = getDaysInWeek(new Date(selectedDate));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-900">יומן פגישות</h2>
        </div>
        <Button
          onClick={handleNewAppointment}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4 ml-2" />
          פגישה חדשה
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg border">
        <Button
          variant="outline"
          onClick={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 7);
            setSelectedDate(newDate);
          }}
        >
          שבוע קודם
        </Button>
        <span className="text-sm font-medium">
          {format(weekDays[0], 'd MMMM', { locale: he })} - {format(weekDays[6], 'd MMMM yyyy', { locale: he })}
        </span>
        <Button
          variant="outline"
          onClick={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 7);
            setSelectedDate(newDate);
          }}
        >
          שבוע הבא
        </Button>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header */}
            <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-10">
              <div className="p-3 border-l text-sm font-medium text-gray-500">שעה</div>
              {weekDays.map((day, idx) => (
                <div key={idx} className="p-3 border-l text-center">
                  <div className="text-sm font-medium text-gray-900">
                    {format(day, 'EEEE', { locale: he })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(day, 'd/M')}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="max-h-[600px] overflow-y-auto">
              {timeSlots.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
                  <div className="p-3 border-l bg-gray-50 text-sm text-gray-600 flex items-start">
                    <Clock className="w-3 h-3 ml-1 mt-0.5" />
                    {hour}:00
                  </div>
                  {weekDays.map((day, idx) => {
                    const dayAppointments = getAppointmentsForDateTime(day, hour);
                    return (
                      <div key={idx} className="p-2 border-l hover:bg-gray-50 cursor-pointer transition-colors">
                        {dayAppointments.map((apt) => (
                          <AppointmentCard
                            key={apt.id}
                            appointment={apt}
                            onEdit={() => handleEditAppointment(apt)}
                            onDelete={() => deleteAppointmentMutation.mutate(apt.id)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caseId={caseId}
        appointment={selectedAppointment}
      />
    </div>
  );
}