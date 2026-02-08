import React, { useEffect } from 'react';
import PersonDetailsView from '@/components/person/PersonDetailsView';

export default function PersonDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');

  useEffect(() => {
    if (personId) {
      localStorage.setItem('lastOpenedPersonId', personId);
    }
  }, [personId]);

  return (
    <div className="h-full">
      <PersonDetailsView personId={personId} />
    </div>
  );
}