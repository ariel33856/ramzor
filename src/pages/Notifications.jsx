import React from 'react';
import { Bell } from 'lucide-react';

export default function Notifications() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
            <Bell className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">התראות ומשימות</h1>
            <p className="text-gray-500">מעקב אחר משימות והתראות</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <p className="text-gray-600">העמוד בבנייה...</p>
        </div>
      </div>
    </div>
  );
}