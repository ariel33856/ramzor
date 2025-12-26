import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Upload, CheckCircle, XCircle, RefreshCw, Brain, Flag, 
  CheckSquare, User, Bell, Info, AlertTriangle, AlertCircle 
} from 'lucide-react';

const actionConfig = {
  document_upload: { icon: Upload, color: 'blue', label: 'העלאת מסמך' },
  document_verified: { icon: CheckCircle, color: 'emerald', label: 'מסמך אומת' },
  document_rejected: { icon: XCircle, color: 'red', label: 'מסמך נדחה' },
  status_change: { icon: RefreshCw, color: 'purple', label: 'שינוי סטטוס' },
  ai_analysis: { icon: Brain, color: 'indigo', label: 'ניתוח AI' },
  red_flag_detected: { icon: Flag, color: 'red', label: 'דגל אדום' },
  task_completed: { icon: CheckSquare, color: 'emerald', label: 'משימה הושלמה' },
  human_override: { icon: User, color: 'orange', label: 'התערבות אנושית' },
  client_notification: { icon: Bell, color: 'blue', label: 'התראה ללקוח' }
};

const severityConfig = {
  info: { icon: Info, bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  warning: { icon: AlertTriangle, bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  error: { icon: AlertCircle, bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  critical: { icon: AlertCircle, bgColor: 'bg-red-100', borderColor: 'border-red-300' }
};

export default function AuditTrail({ logs = [], showReasoning = true }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">מעקב פעולות</h3>
      
      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            אין פעולות לתצוגה
          </div>
        ) : (
          logs.map((log, index) => {
            const action = actionConfig[log.action_type] || { icon: Info, color: 'gray', label: log.action_type };
            const severity = severityConfig[log.severity] || severityConfig.info;
            const Icon = action.icon;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${severity.bgColor} ${severity.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-${action.color}-100`}>
                    <Icon className={`w-4 h-4 text-${action.color}-600`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{action.label}</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{log.description}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <User className="w-3 h-3" />
                      <span>{log.actor}</span>
                    </div>
                    
                    {showReasoning && log.ai_reasoning && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-medium text-indigo-700">נתיב חשיבה AI</span>
                        </div>
                        <p className="text-sm text-gray-600">{log.ai_reasoning}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}