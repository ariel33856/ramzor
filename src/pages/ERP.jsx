import React from 'react';
import { Database } from 'lucide-react';

export default function ERP() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">מערכת ERP</h1>
            <p className="text-gray-500">ניהול משאבי ארגון</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <p className="text-gray-600">העמוד בבנייה...</p>
        </div>
      </div>
    </div>
  );
}