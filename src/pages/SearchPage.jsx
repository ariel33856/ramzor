import React from 'react';
import { Search } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-cyan-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center">
            <Search className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">חיפוש</h1>
            <p className="text-gray-500">חיפוש מתקדם במערכת</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <p className="text-gray-600">העמוד בבנייה...</p>
        </div>
      </div>
    </div>
  );
}