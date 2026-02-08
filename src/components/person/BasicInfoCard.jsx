import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function BasicInfoCard({ basicData, onBasicDataChange }) {
  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">שם פרטי</Label>
          <Input
            value={basicData.first_name}
            onChange={(e) => onBasicDataChange('first_name', e.target.value)}
            placeholder="שם פרטי"
            className="text-xl font-bold w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">שם משפחה</Label>
          <Input
            value={basicData.last_name}
            onChange={(e) => onBasicDataChange('last_name', e.target.value)}
            placeholder="שם משפחה"
            className="text-xl font-bold w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">טלפון</Label>
          <Input
            value={basicData.phone}
            onChange={(e) => onBasicDataChange('phone', e.target.value)}
            placeholder="טלפון"
            className="text-xl font-bold w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">מייל</Label>
          <Input
            value={basicData.email}
            onChange={(e) => onBasicDataChange('email', e.target.value)}
            placeholder="מייל"
            className="text-xl font-bold w-40"
          />
        </div>
      </div>
    </div>
  );
}