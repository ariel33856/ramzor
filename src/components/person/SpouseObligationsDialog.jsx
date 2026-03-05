import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SpouseObligationsDialog({ open, onOpenChange, linkedSpouse }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>התחייבויות של {linkedSpouse?.first_name} {linkedSpouse?.last_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {linkedSpouse?.custom_data?.obligations && linkedSpouse.custom_data.obligations.length > 0 ? (
            linkedSpouse.custom_data.obligations.map((obligation, index) => (
              <div key={index} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    {obligation.type}
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">שם המוסד</Label>
                    <Input 
                      value={obligation.institution_name || ''}
                      readOnly
                      placeholder="שם הבנק/מוסד"
                      className="h-8 bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">סכום יתרה</Label>
                    <Input 
                      value={obligation.balance ? parseFloat(obligation.balance).toLocaleString('he-IL') : ''}
                      readOnly
                      placeholder="0"
                      className="h-8 bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">החזר חודשי</Label>
                    <Input 
                      value={obligation.monthly_payment ? parseFloat(obligation.monthly_payment).toLocaleString('he-IL') : ''}
                      readOnly
                      placeholder="0"
                      className="h-8 bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">הערות</Label>
                    <Input 
                      value={obligation.notes || ''}
                      readOnly
                      placeholder="הערות"
                      className="h-8 bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">אין התחייבויות</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}