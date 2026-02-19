import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import { Plus, ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, startOfWeek, addWeeks, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import AppointmentDialog from '@/components/calendar/AppointmentDialog';
import AppointmentCard from '@/components/calendar/AppointmentCard';

export default function CaseCalendar() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => SecureEntities.Appointment.list('-date')
  });

  // Filter appointments for this case only
  const appointments = (allAppointments || []).filter(apt => apt.case_id === caseId);

  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (id) => SecureEntities.Appointment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  const handleNewAppointment = (timeSlot = null) => {
    setSelectedTimeSlot(timeSlot);
    setDialogOpen(true);
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getAppointmentsForDateAndTime = (date, time) => {
    return appointments.filter(apt => {
      if (!apt.date || !apt.start_time) return false;
      const aptDate = typeof apt.date === 'string' ? apt.date : format(apt.date, 'yyyy-MM-dd');
      const dateStr = format(date, 'yyyy-MM-dd');
      return aptDate === dateStr && apt.start_time.startsWith(time.slice(0, 2));
    });
  };

  const getAppointmentsForDate = (date) => {
    return appointments.filter(apt => {
      if (!apt.date) return false;
      const aptDate = typeof apt.date === 'string' ? apt.date : format(apt.date, 'yyyy-MM-dd');
      const dateStr = format(date, 'yyyy-MM-dd');
      return aptDate === dateStr;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-end mb-4">
        <Button
          onClick={() => handleNewAppointment()}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
        >
          <Plus className="w-5 h-5 ml-2" />
          פגישה חדשה
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Calendar Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={he}
                className="rounded-md"
              />
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">פגישות היום</h3>
                <div className="space-y-2">
                  {getAppointmentsForDate(selectedDate).length === 0 ? (
                    <p className="text-sm text-gray-400">אין פגישות מתוכננות</p>
                  ) : (
                    getAppointmentsForDate(selectedDate).map(apt => (
                      <div key={apt.id} className="text-sm p-2 bg-teal-50 rounded-lg">
                        <div className="font-medium text-teal-900">{apt.title}</div>
                        <div className="text-teal-600 text-xs flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {apt.start_time} - {apt.end_time}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Week View */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Week Header */}
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDate(addWeeks(selectedDate, -1))}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <h2 className="text-xl font-bold text-white">
                    {format(selectedDate, 'MMMM yyyy', { locale: he })}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
                    className="text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Week Grid */}
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Days Header */}
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="p-3 bg-gray-50 border-l border-gray-200">
                      <span className="text-sm font-medium text-gray-500">שעה</span>
                    </div>
                    {getWeekDays().map((day, idx) => (
                      <div
                        key={idx}
                        className={`p-3 text-center border-l border-gray-200 ${
                          isSameDay(day, new Date()) ? 'bg-teal-50' : 'bg-gray-50'
                        }`}
                      >
                        <div className="text-xs text-gray-500">
                          {format(day, 'EEEE', { locale: he })}
                        </div>
                        <div className={`text-lg font-bold ${
                          isSameDay(day, new Date()) ? 'text-teal-600' : 'text-gray-900'
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time Slots */}
                  <div className="max-h-[600px] overflow-y-auto">
                    {timeSlots.map((time) => (
                      <div key={time} className="grid grid-cols-8 border-b border-gray-100">
                        <div className="p-3 bg-gray-50 border-l border-gray-200 text-sm font-medium text-gray-600">
                          {time}
                        </div>
                        {getWeekDays().map((day, dayIdx) => {
                          const dayAppointments = getAppointmentsForDateAndTime(day, time);
                          return (
                            <div
                              key={dayIdx}
                              className="p-2 border-l border-gray-100 hover:bg-teal-50/30 cursor-pointer transition-colors min-h-[80px]"
                              onClick={() => handleNewAppointment({ date: day, time })}
                            >
                              <div className="space-y-1">
                                {dayAppointments.map((apt) => (
                                  <AppointmentCard
                                    key={apt.id}
                                    appointment={apt}
                                    caseData={caseData}
                                    onDelete={() => deleteAppointmentMutation.mutate(apt.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caseId={caseId}
        selectedTimeSlot={selectedTimeSlot}
      />
    </div>
  );
}