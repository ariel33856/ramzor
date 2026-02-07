import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPageUrl } from '@/utils';
import { Loader2, ArrowRight, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function TransactionDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get('id');

  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => base44.entities.Transaction.filter({ id: transactionId }).then(res => res[0]),
    enabled: !!transactionId
  });

  const { data: allProperties = [] } = useQuery({
    queryKey: ['all-properties-transaction'],
    queryFn: () => base44.entities.PropertyAsset.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (data.amount !== undefined) {
        data.amount = data.amount ? Number(data.amount) : undefined;
      }
      return base44.entities.Transaction.update(transactionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Transaction.update(transactionId, { is_archived: true }),
    onSuccess: () => {
      window.location.href = createPageUrl('ModuleView') + '?moduleId=transactions';
    }
  });

  const handleUpdate = (field, value) => {
    updateMutation.mutate({ [field]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">עסקה לא נמצאה</p>
      </div>
    );
  }

  const linkedProperty = allProperties.find(p => p.id === transaction.property_id);

  return (
    <div className="min-h-screen bg-gray-50/50 p-2">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{transaction.name}</h1>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">האם להעביר עסקה לארכיון?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex justify-center gap-4">
                    <AlertDialogAction 
                      onClick={() => archiveMutation.mutate()}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      העבר לארכיון
                    </AlertDialogAction>
                    <AlertDialogCancel className="bg-green-500 hover:bg-green-600 text-white">ביטול</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                variant="outline"
                onClick={() => window.location.href = createPageUrl('ModuleView') + '?moduleId=transactions'}
              >
                <ArrowRight className="w-4 h-4 ml-2" />
                חזרה לרשימה
              </Button>
            </div>
          </div>
        </div>

        {/* Main Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <Label>שם</Label>
            <Input
              value={transaction.name || ''}
              onChange={(e) => handleUpdate('name', e.target.value)}
              className="text-xl font-bold"
            />
          </div>

          <div>
            <Label>סכום (₪)</Label>
            <Input
              type="number"
              value={transaction.amount || ''}
              onChange={(e) => handleUpdate('amount', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label>שיוך לנכס</Label>
            <Select 
              value={transaction.property_id || ''} 
              onValueChange={(value) => handleUpdate('property_id', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר נכס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>ללא שיוך</SelectItem>
                {allProperties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address}, {property.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {linkedProperty && (
              <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-sm font-semibold text-gray-900">{linkedProperty.address}</p>
                <p className="text-xs text-gray-600">{linkedProperty.city} • {linkedProperty.property_type}</p>
              </div>
            )}
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea
              value={transaction.notes || ''}
              onChange={(e) => handleUpdate('notes', e.target.value)}
              rows={6}
              placeholder="הערות נוספות"
            />
          </div>
        </div>
      </div>
    </div>
  );
}