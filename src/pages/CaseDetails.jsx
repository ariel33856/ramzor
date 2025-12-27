import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { tabs, pageMapping } from '@/components/CaseTabs';
import { Button } from '@/components/ui/button';
import CaseTabContent from '@/components/case/CaseTabContent';

export default function CaseDetails() {
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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto p-0">
        <div className="space-y-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <div
                key={tab.id}
                className={`
                  bg-white rounded-2xl border-2 ${tab.border} p-6 shadow-lg
                  ${tab.bg} bg-opacity-30
                `}
              >
                <Link to={createPageUrl(pageMapping[tab.id]) + `?id=${caseId}`} className={`flex items-center gap-3 mb-4 p-3 rounded-xl border-2 ${tab.border} ${tab.bg} hover:shadow-lg transition-all cursor-pointer`}>
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    bg-gradient-to-br ${tab.gradient} shadow-lg
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {tab.label}
                  </h2>
                </Link>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <CaseTabContent tabId={tab.id} caseId={caseId} caseData={caseData} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}