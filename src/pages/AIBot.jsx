import React from 'react';
import { Bot } from 'lucide-react';

export default function AIBot() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">בוט AI</h1>
            <p className="text-gray-300">עוזר חכם ואוטומציות</p>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-700">
          <p className="text-gray-300">העמוד בבנייה...</p>
        </div>
      </div>
    </div>
  );
}