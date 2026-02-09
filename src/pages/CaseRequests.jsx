import React from 'react';
import { ClipboardList } from 'lucide-react';

export default function CaseRequests() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  return (
    <div className="p-2" dir="rtl">
      <div className="flex items-center justify-center py-16 text-gray-400">
        <div className="text-center space-y-3">
          <ClipboardList className="w-12 h-12 mx-auto text-gray-300" />
          <p className="text-lg">אין בקשות עדיין</p>
        </div>
      </div>
    </div>
  );
}