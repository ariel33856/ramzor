import React from 'react';

export default function CaseSubmissions() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  return (
    <div className="p-2" dir="rtl">
      <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[60vh]">
        <p className="text-gray-500 text-center py-12">טרם נוספו הגשות לתיק זה</p>
      </div>
    </div>
  );
}