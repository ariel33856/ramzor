import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { tabs, pageMapping } from '@/components/CaseTabs';
import { Button } from '@/components/ui/button';

// Import all case page components
import CasePersonal from './CasePersonal';
import CaseContact from './CaseContact';
import CaseSummary from './CaseSummary';
import CaseNotes from './CaseNotes';
import CaseData from './CaseData';
import CaseWorkflow from './CaseWorkflow';
import CaseCalendar from './CaseCalendar';
import CaseStatus from './CaseStatus';
import CaseProfiles from './CaseProfiles';
import CaseMetrics from './CaseMetrics';
import CaseDashboards from './CaseDashboards';
import CaseDocuments from './CaseDocuments';
import CaseTracking from './CaseTracking';
import CaseContacts from './CaseContacts';
import CaseCalculator from './CaseCalculator';
import CasePayments from './CasePayments';
import CaseInsurance from './CaseInsurance';
import CaseProducts from './CaseProducts';
import CaseAccount from './CaseAccount';

const pageComponents = {
  personal: CasePersonal,
  contact: CaseContact,
  summary: CaseSummary,
  notes: CaseNotes,
  data: CaseData,
  workflow: CaseWorkflow,
  calendar: CaseCalendar,
  status: CaseStatus,
  profiles: CaseProfiles,
  metrics: CaseMetrics,
  dashboards: CaseDashboards,
  documents: CaseDocuments,
  tracking: CaseTracking,
  contacts: CaseContacts,
  calculator: CaseCalculator,
  payments: CasePayments,
  insurance: CaseInsurance,
  products: CaseProducts,
  account: CaseAccount
};

export default function CaseDetails() {
  const [activeTab, setActiveTab] = useState('personal');
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const { data: casesList = [], isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.MortgageCase.list()
  });

  const caseData = caseId ? casesList.find(c => c.id === caseId) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseId || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto p-2 md:p-3">
        {/* Tabs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(isActive ? null : tab.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300
                  ${tab.bg}
                  ${isActive 
                    ? `${tab.border} shadow-lg` 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    bg-gradient-to-br ${tab.gradient} shadow-md
                    ${isActive ? 'scale-110' : ''}
                    transition-transform duration-300
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`
                    text-xs font-medium text-center leading-tight
                    ${isActive ? 'text-gray-900' : 'text-gray-600'}
                  `}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <ChevronUp className="w-4 h-4 text-gray-600 absolute bottom-1" />
                  )}
                  {!isActive && (
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute bottom-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Expandable Content Area */}
        <AnimatePresence>
          {activeTab && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`
                bg-white rounded-2xl border-2 ${activeTabData.border} p-8 shadow-lg mb-6
                ${activeTabData.bg} bg-opacity-30
              `}
            >
              <Link to={createPageUrl(pageMapping[activeTab]) + `?id=${caseId}`} className={`flex items-center gap-3 mb-6 p-4 rounded-xl border-2 ${activeTabData.border} ${activeTabData.bg} hover:shadow-lg transition-all cursor-pointer`}>
                <div className={`
                  w-14 h-14 rounded-xl flex items-center justify-center
                  bg-gradient-to-br ${activeTabData.gradient} shadow-lg
                `}>
                  {React.createElement(activeTabData.icon, { className: "w-7 h-7 text-white" })}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeTabData.label}
                </h2>
              </Link>

              {React.createElement(pageComponents[activeTab])}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}