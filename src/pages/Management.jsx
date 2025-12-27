import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Management() {
  const [firstName, setFirstName] = useState('');

  return (
    <div className="min-h-screen bg-gray-50/50 p-2 md:p-3">
      <div className="mx-auto">
        <div className="space-y-4">
          <div>
            <Label htmlFor="firstName" className="text-lg font-medium">שם פרטי *</Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="הכנס שם פרטי..."
              className="mt-2 text-lg h-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}