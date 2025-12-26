import React from 'react';
import { AlertTriangle, Clock, Zap, Flame } from 'lucide-react';

const urgencyConfig = {
  low: {
    label: 'נמוכה',
    icon: Clock,
    classes: 'bg-gray-100 text-gray-600 border-gray-200'
  },
  medium: {
    label: 'בינונית',
    icon: Zap,
    classes: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  high: {
    label: 'גבוהה',
    icon: AlertTriangle,
    classes: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  critical: {
    label: 'קריטית',
    icon: Flame,
    classes: 'bg-red-50 text-red-700 border-red-200 animate-pulse'
  }
};

export default function UrgencyBadge({ urgency = 'medium', showLabel = true }) {
  const config = urgencyConfig[urgency] || urgencyConfig.medium;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.classes}`}>
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}