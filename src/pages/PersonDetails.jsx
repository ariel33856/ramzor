import React from 'react';
import PersonDetailsView from '@/components/person/PersonDetailsView';

export default function PersonDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');

  return (
    <div className="h-full bg-gray-50/50">
      <PersonDetailsView personId={personId} />
    </div>
  );
}