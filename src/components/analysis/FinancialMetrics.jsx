import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function FinancialMetrics({ caseData }) {
  const formatPercent = (value) => {
    if (!value && value !== 0) return '—';
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
  };

  const metrics = [
    {
      label: 'LTV - יחס הלוואה לשווי',
      value: caseData.ltv_ratio,
      formatted: formatPercent(caseData.ltv_ratio),
      threshold: 75,
      description: 'אחוז ההלוואה מתוך שווי הנכס. עד 75% נחשב תקין.',
      isGood: caseData.ltv_ratio <= 75
    },
    {
      label: 'DTI - יחס חוב להכנסה',
      value: caseData.dti_ratio,
      formatted: formatPercent(caseData.dti_ratio),
      threshold: 40,
      description: 'אחוז ההחזר החודשי מתוך ההכנסה. עד 40% נדרש.',
      isGood: caseData.dti_ratio <= 40
    },
    {
      label: 'הכנסה לנפש',
      value: caseData.income_per_capita,
      formatted: formatCurrency(caseData.income_per_capita),
      threshold: 2500,
      description: 'הכנסה פנויה לנפש אחרי החזר המשכנתא.',
      isGood: caseData.income_per_capita >= 2500
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative p-5 rounded-2xl border-2 ${
              metric.value === undefined || metric.value === null
                ? 'bg-gray-50 border-gray-200'
                : metric.isGood
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{metric.description}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {metric.value !== undefined && metric.value !== null && (
                metric.isGood ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )
              )}
            </div>
            
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metric.formatted}
            </div>
            
            {metric.value !== undefined && metric.value !== null && (
              <div className={`text-sm ${metric.isGood ? 'text-emerald-600' : 'text-red-600'}`}>
                {metric.isGood ? 'בטווח התקין' : `מעל הסף (${metric.threshold}${metric.label.includes('הכנסה') ? '₪' : '%'})`}
              </div>
            )}

            {/* Visual threshold indicator */}
            {metric.value !== undefined && metric.value !== null && !metric.label.includes('הכנסה') && (
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(metric.value / metric.threshold * 100, 150)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${metric.isGood ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>0%</span>
                  <span className="font-medium">{metric.threshold}%</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </TooltipProvider>
  );
}