import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function Sales() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">מכירות</h1>
            <p className="text-gray-500">ניהול עסקאות ופעילות מכירות</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <p className="text-gray-600">העמוד בבנייה...</p>
        </div>
      </div>
    </div>
  );
}