import React from 'react';
import PersonDetailsView from '@/components/person/PersonDetailsView';

export default function PersonDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');

  return (
    <div className="h-full">
      <PersonDetailsView personId={personId} />
    </div>
  );
}