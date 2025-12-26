import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Lock, AlertCircle, Clock } from 'lucide-react';
import ProgressBattery from '../dashboard/ProgressBattery';

const milestoneConfig = {
  initial_consultation: { label: 'פגישה ראשונית', order: 1 },
  document_collection: { label: 'איסוף מסמכים', order: 2 },
  document_verification: { label: 'אימות מסמכים', order: 3 },
  financial_analysis: { label: 'ניתוח פיננסי', order: 4 },
  bank_selection: { label: 'בחירת בנק', order: 5 },
  bank_submission: { label: 'הגשה לבנק', order: 6 },
  bank_approval: { label: 'אישור בנקאי', order: 7 },
  signing: { label: 'חתימת מסמכים', order: 8 },
  completion: { label: 'השלמה', order: 9 }
};

export default function MilestoneTracker({ milestones = [] }) {
  const sortedMilestones = [...milestones].sort((a, b) => {
    const orderA = milestoneConfig[a.milestone_type]?.order || 99;
    const orderB = milestoneConfig[b.milestone_type]?.order || 99;
    return orderA - orderB;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
      case 'blocked':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Circle className="w-6 h-6 text-gray-300" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">מעקב אבני דרך</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute right-[23px] top-8 bottom-8 w-0.5 bg-gray-200" />
        
        <div className="space-y-6">
          {sortedMilestones.map((milestone, index) => {
            const config = milestoneConfig[milestone.milestone_type] || { label: milestone.title };
            
            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex gap-4"
              >
                <div className="relative z-10 bg-white p-1">
                  {getStatusIcon(milestone.status)}
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-medium ${
                      milestone.status === 'completed' ? 'text-emerald-700' :
                      milestone.status === 'blocked' ? 'text-red-700' :
                      milestone.status === 'in_progress' ? 'text-blue-700' :
                      'text-gray-500'
                    }`}>
                      {config.label}
                    </h4>
                    {milestone.due_date && (
                      <span className="text-sm text-gray-400">
                        יעד: {new Date(milestone.due_date).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </div>
                  
                  {milestone.status !== 'pending' && (
                    <ProgressBattery
                      progress={milestone.progress || 0}
                      status={milestone.status}
                      size="sm"
                    />
                  )}
                  
                  {milestone.blocked_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg text-sm text-red-700 border border-red-100">
                      <span className="font-medium">סיבת חסימה:</span> {milestone.blocked_reason}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}