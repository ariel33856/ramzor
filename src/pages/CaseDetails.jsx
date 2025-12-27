import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { tabs, pageMapping } from '@/components/CaseTabs';

export default function CaseDetails() {
  const [activeTab, setActiveTab] = useState('personal');
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`
            bg-white rounded-2xl border-2 ${activeTabData.border} p-8 shadow-lg
            ${activeTabData.bg} bg-opacity-30
          `}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`
              w-14 h-14 rounded-xl flex items-center justify-center
              bg-gradient-to-br ${activeTabData.gradient} shadow-lg
            `}>
              {React.createElement(activeTabData.icon, { className: "w-7 h-7 text-white" })}
            </div>
            <Link to={createPageUrl(pageMapping[activeTab]) + `?id=${caseId}`}>
              <h2 className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                {activeTabData.label}
              </h2>
            </Link>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            {activeTab === 'personal' && caseData && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">שם מלא</label>
                  <p className="text-lg text-gray-900 mt-1">{caseData.client_name || 'לא צוין'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">תעודת זהות</label>
                  <p className="text-lg text-gray-900 mt-1">{caseData.client_id || 'לא צוין'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">טלפון</label>
                  <p className="text-lg text-gray-900 mt-1">{caseData.client_phone || 'לא צוין'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">אימייל</label>
                  <p className="text-lg text-gray-900 mt-1">{caseData.client_email || 'לא צוין'}</p>
                </div>
              </div>
            )}
            {activeTab !== 'personal' && (
              <p className="text-gray-500 text-center py-8">
                תוכן הכרטיסייה "{activeTabData.label}" יתווסף בהמשך
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}