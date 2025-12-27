import React from 'react';
import { Clock, User, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusColors = {
  scheduled: 'bg-teal-100 border-teal-300 text-teal-900',
  completed: 'bg-green-100 border-green-300 text-green-900',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-500'
};

export default function AppointmentCard({ appointment, caseData, onDelete }) {
  return (
    <div className={`p-2 rounded-lg border-2 text-xs ${statusColors[appointment.status]} group relative`}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{appointment.title}</div>
          <div className="flex items-center gap-1 mt-1 opacity-75">
            <Clock className="w-3 h-3" />
            <span>{appointment.start_time} - {appointment.end_time}</span>
          </div>
          {caseData && (
            <div className="flex items-center gap-1 mt-1 opacity-75">
              <User className="w-3 h-3" />
              <span className="truncate">{caseData.client_name}</span>
            </div>
          )}
          {appointment.location && (
            <div className="flex items-center gap-1 mt-1 opacity-75">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('למחוק פגישה זו?')) {
              onDelete();
            }
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}