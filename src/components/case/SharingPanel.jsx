import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, UserMinus, UserPlus, Lock, Eye } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SharingPanel({ caseData, currentUser }) {
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 5 * 60 * 1000
  });

  const shareMutation = useMutation({
    mutationFn: (email) => SecureEntities.MortgageCase.shareWith(caseData.id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] });
      setEmailInput('');
      setInputError('');
    }
  });

  const unshareMutation = useMutation({
    mutationFn: (email) => SecureEntities.MortgageCase.unshareWith(caseData.id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseData.id] });
      setRemoveTarget(null);
    }
  });

  const sharedWith = caseData.shared_with || [];
  const isOwner = caseData.created_by === currentUser?.email || currentUser?.role === 'admin';

  if (!isOwner) return null;

  const handleShare = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setInputError('נא להזין כתובת אימייל');
      return;
    }
    const userExists = usersList.some(u => u.email.toLowerCase() === email);
    if (!userExists) {
      setInputError('משתמש זה אינו רשום במערכת');
      return;
    }
    if (email === caseData.created_by) {
      setInputError('זהו בעל החשבון');
      return;
    }
    if (sharedWith.includes(email)) {
      setInputError('החשבון כבר משותף עם משתמש זה');
      return;
    }
    setInputError('');
    shareMutation.mutate(email);
  };

  const getSharedUserName = (email) => {
    const u = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    return u ? (u.full_name || u.email) : email;
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Users className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">שיתוף חשבון</h3>
      </div>

      {/* Add new user */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">הוסף משתמש לשיתוף</label>
        <div className="flex gap-2">
          <Input
            placeholder="כתובת אימייל..."
            value={emailInput}
            onChange={(e) => { setEmailInput(e.target.value); setInputError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleShare()}
            className="flex-1 text-left"
            dir="ltr"
          />
          <Button
            onClick={handleShare}
            disabled={shareMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 ml-1" />
            שתף
          </Button>
        </div>
        {inputError && (
          <p className="text-sm text-red-500 mt-1">{inputError}</p>
        )}
      </div>

      {/* Current shared users */}
      {sharedWith.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <Lock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">החשבון אינו משותף עם אף משתמש</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600 mb-3">משותף עם:</p>
          {sharedWith.map((email) => (
            <div key={email} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{getSharedUserName(email)}</p>
                  <p className="text-xs text-gray-500 text-left" dir="ltr">{email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  <Eye className="w-3 h-3 ml-1" />
                  צפייה בלבד
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => setRemoveTarget(email)}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-center">
                        הסרת גישה משותפת
                      </AlertDialogTitle>
                    </AlertDialogHeader>
                    <p className="text-center text-gray-600 py-2">
                      להסיר את <strong>{getSharedUserName(email)}</strong> מהחשבון?
                    </p>
                    <AlertDialogFooter className="flex justify-center gap-4">
                      <AlertDialogAction
                        onClick={() => unshareMutation.mutate(email)}
                        className="bg-red-500 hover:bg-red-600 flex-1 max-w-xs"
                      >
                        הסר גישה
                      </AlertDialogAction>
                      <AlertDialogCancel className="bg-green-500 hover:bg-green-600 text-white flex-1 max-w-xs">
                        ביטול
                      </AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}