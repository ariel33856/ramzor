import React from 'react';
import PersonDetailsView from '@/components/person/PersonDetailsView';

export default function PersonDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');

  return (
    <div className="h-full bg-gray-50/50 p-6">
      <div className="max-w-full mx-auto">
        <PersonDetailsView personId={personId} />
      </div>
    </div>
  );
}