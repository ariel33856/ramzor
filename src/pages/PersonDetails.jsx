import React, { useState } from 'react';
import PersonDetailsView from '@/components/person/PersonDetailsView';

export default function PersonDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');
  const [activeTab, setActiveTab] = useState('details');

  return (
    <div className="h-full bg-gray-50/50 p-2">
      <div className="max-w-full mx-auto relative">
        {/* Tab buttons */}
        <div className="flex gap-2 mb-2 relative">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 rounded-t-xl font-semibold transition-all relative ${
              activeTab === 'details'
                ? 'bg-white text-blue-600 shadow-lg z-20 -mb-px border-t-2 border-x-2 border-blue-500'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 z-10'
            }`}
          >
            פרטים
          </button>
          <button
            onClick={() => setActiveTab('additional')}
            className={`px-6 py-3 rounded-t-xl font-semibold transition-all relative ${
              activeTab === 'additional'
                ? 'bg-white text-blue-600 shadow-lg z-20 -mb-px border-t-2 border-x-2 border-blue-500'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 z-10'
            }`}
          >
            נוסף
          </button>
        </div>

        {/* Tab content */}
        <div className="relative">
          {activeTab === 'details' && (
            <div className="relative z-10">
              <PersonDetailsView personId={personId} />
            </div>
          )}
          {activeTab === 'additional' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">תוכן נוסף</h2>
              <p className="text-gray-600">כאן תוכל להוסיף תוכן נוסף</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}