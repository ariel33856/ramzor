import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Building2, User, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const profileTabs = [
  { id: 'internal', label: 'פרופיל פנימי', icon: User, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-300' },
  { id: 'bank', label: 'פרופיל לבנק', icon: Landmark, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50', border: 'border-green-300' },
  { id: 'client', label: 'פרופיל ללקוח', icon: Building2, gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-300' },
];

export default function CaseProfiles() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const [activeProfile, setActiveProfile] = useState('internal');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  const active = profileTabs.find(t => t.id === activeProfile);

  return (
    <div className="p-2" dir="rtl">
      {/* Profile Tabs */}
      <div className="flex gap-3 mb-4">
        {profileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeProfile === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveProfile(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all font-semibold text-sm
                ${isActive ? `${tab.bg} ${tab.border} shadow-md` : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}
              `}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${tab.gradient}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Content */}
      <div className={`bg-white rounded-xl border-2 ${active.border} p-6 min-h-[60vh]`}>
        <p className="text-gray-500 text-center py-12">
          {active.label} - טרם נוסף תוכן
        </p>
      </div>
    </div>
  );
}