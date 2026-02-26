import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ContactSharingPanel({ personId, ownerEmail }) {
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [shareResult, setShareResult] = useState(null);
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: personData } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => base44.entities.Person.filter({ id: personId }).then(res => res[0]),
    enabled: !!personId
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch {
        const res = await base44.functions.invoke('getAllUsers', {});
        return res?.data?.users || [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const sharedUsers = personData?.shared_with || [];

  const shareMutation = useMutation({
    mutationFn: async () => {
      const allEmails = allUsers
        .filter(u => u.email !== (ownerEmail || personData?.created_by) && !sharedUsers.includes(u.email))
        .map(u => u.email);
      
      for (const email of allEmails) {
        await base44.functions.invoke('shareContact', { 
          person_id: personId, 
          shared_email: email 
        });
      }
      return { shared_with: [...sharedUsers, ...allEmails] };
    },
    onSuccess: () => {
      setShareResult({ type: 'success', message: 'השיתוף עם כל המשתמשים בוצע בהצלחה!' });
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      setTimeout(() => setShareResult(null), 5000);
    },
    onError: (error) => {
      setShareResult({ type: 'error', message: error.message });
      setTimeout(() => setShareResult(null), 5000);
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (emailToRevoke) => {
      await base44.functions.invoke('shareContact', {
        person_id: personId,
        action: 'revoke',
        shared_email: emailToRevoke
      });
    },
    onSuccess: () => {
      setIsRevokeDialogOpen(false);
      setSelectedEmail(null);
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
    },
    onError: (error) => {
      setShareResult({ type: 'error', message: error.message });
    }
  });

  if (!currentUser) return null;

  const isOwner = currentUser.email === ownerEmail || currentUser.email === personData?.created_by;
  const hasSharedAccess = !isOwner && personData?.shared_with?.includes(currentUser.email);

  if (!isOwner && !hasSharedAccess) return null;

  return (
    <>
      <div className="mb-4">
        <Button 
          onClick={() => shareMutation.mutate()}
          disabled={shareMutation.isPending || sharedUsers.length >= allUsers.length - 1}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {shareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          שתף עם כל המשתמשים
        </Button>
      </div>

      {shareResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm font-medium ${
          shareResult.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {shareResult.type === 'success' 
            ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            : <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
          {shareResult.message}
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-500">משתמשים עם גישה</h4>
        {!personData ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : sharedUsers.length === 0 ? (
          <p className="text-sm text-gray-400 italic">לא משותף עם אף אחד עדיין</p>
        ) : (
          <div className="grid gap-2">
            {sharedUsers.map((email) => (
              <div key={email} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs">
                    {email.substring(0, 2).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setSelectedEmail(email);
                    setIsRevokeDialogOpen(true);
                  }}
                >
                  הסר גישה
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הסר גישה</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שאתה רוצה להסיר גישה ל <span className="font-semibold text-gray-900">{selectedEmail}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevokeDialogOpen(false)}>ביטול</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedEmail && revokeMutation.mutate(selectedEmail)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              הסר גישה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}