import React, { useState } from 'react';
import { Bot } from 'lucide-react';

export default function AIBot() {
  const [input, setInput] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-0" dir="rtl">
      <div className="h-screen max-w-full mx-auto flex flex-col">
        <div className="flex-shrink-0 p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">בוט AI</h1>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-700">
            <p className="text-gray-300">העמוד בבנייה...</p>
          </div>
        </div>
      </div>
    </div>
  );
}