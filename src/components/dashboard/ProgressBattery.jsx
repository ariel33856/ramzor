import React from 'react';
import { motion } from 'framer-motion';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryCharging } from 'lucide-react';

export default function ProgressBattery({ progress = 0, label, status = 'in_progress', size = 'md' }) {
  const getColor = () => {
    if (status === 'blocked') return 'bg-red-500';
    if (status === 'completed') return 'bg-emerald-500';
    if (progress < 25) return 'bg-red-400';
    if (progress < 50) return 'bg-orange-400';
    if (progress < 75) return 'bg-yellow-400';
    return 'bg-emerald-400';
  };

  const getBatteryIcon = () => {
    if (status === 'blocked') return Battery;
    if (status === 'completed') return BatteryFull;
    if (progress < 25) return BatteryLow;
    if (progress < 75) return BatteryMedium;
    return BatteryCharging;
  };

  const Icon = getBatteryIcon();
  const sizeClasses = size === 'sm' ? 'h-2' : 'h-3';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${status === 'completed' ? 'text-emerald-500' : status === 'blocked' ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-sm font-semibold text-gray-600">{progress}%</span>
          </div>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full ${sizeClasses} overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`${sizeClasses} rounded-full ${getColor()}`}
        />
      </div>
    </div>
  );
}