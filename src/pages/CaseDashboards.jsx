import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CaseDashboards() {
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-2xl border-2 border-violet-200 p-8 shadow-lg bg-violet-50 bg-opacity-30">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">דשבורדים</h2>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-gray-500 text-center py-8">
              תוכן הכרטיסייה "דשבורדים" יתווסף בהמשך
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}