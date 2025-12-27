import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CasePersonal() {
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
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto">
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
      </div>
    </div>
  );
}