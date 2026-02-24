import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Shield, Users, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function SharingPanel({ caseId, caseTitle, ownerEmail }) {
  const [emailToShare, setEmailToShare] = useState('');
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [shareResult, setShareResult] = useState(null);
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const sharedUsers = caseData?.shared_with || [];

  const shareMutation = useMutation({
    mutationFn: async (email) => {
      if (!email) throw new Error("Email is required");
      if (sharedUsers.includes(email)) {
        throw new Error("המשתמש כבר משותף לתיק זה");
      }
      if (email === ownerEmail) {
        throw new Error("לא ניתן לשתף עם בעלים התיק");
      }
      
      const updatedSharedWith = [...sharedUsers, email];
      await base44.entities.MortgageCase.update(caseId, { shared_with: updatedSharedWith });
      return { shared_with: updatedSharedWith };
    },
    onSuccess: () => {
      setShareResult({ type: 'success', message: `השיתוף עם ${emailToShare} בוצע בהצלחה!` });
      setEmailToShare('');
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setTimeout(() => setShareResult(null), 5000);
    },
    onError: (error) => {
      setShareResult({ type: 'error', message: error.message });
      setTimeout(() => setShareResult(null), 5000);
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (emailToRevoke) => {
      const updatedSharedWith = sharedUsers.filter(e => e !== emailToRevoke);
      await base44.entities.MortgageCase.update(caseId, { shared_with: updatedSharedWith });
      return updatedSharedWith;
    },
    onSuccess: () => {
      setIsRevokeDialogOpen(false);
      setSelectedEmail(null);
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
    onError: (error) => {
      setShareResult({ type: 'error', message: error.message });
    }
  });

  if (!currentUser) return null;

  const isOwner = currentUser.email === ownerEmail;

  if (!isOwner) {
    return (
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Shared Access</AlertTitle>
        <AlertDescription className="text-amber-700">
          You are viewing this case in shared mode. You can view and edit but cannot delete.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-6 border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-gray-800">Share this case</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-3">
          <Input
            placeholder="הכנס אימייל של משתמש"
            value={emailToShare}
            onChange={(e) => { setEmailToShare(e.target.value); setShareResult(null); }}
            className="bg-white"
            onKeyDown={(e) => e.key === 'Enter' && emailToShare && shareMutation.mutate(emailToShare)}
          />
          <Button 
            onClick={() => shareMutation.mutate(emailToShare)}
            disabled={shareMutation.isPending || !emailToShare}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {shareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שתף'}
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
          <h4 className="text-sm font-medium text-gray-500">Current shared users</h4>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : sharedUsers.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Not shared with anyone yet</p>
          ) : (
            <div className="grid gap-2">
              {sharedUsers.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs">
                      {p.shared_email ? p.shared_email.substring(0, 2).toUpperCase() : '??'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.shared_email}</p>
                      <Badge variant="secondary" className="text-xs font-normal h-5">
                        {p.permission === 'edit' ? 'Can Edit' : 'Can View'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setSelectedPermission(p);
                      setIsRevokeDialogOpen(true);
                    }}
                  >
                    Revoke Access
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove access for <span className="font-semibold text-gray-900">{selectedPermission?.shared_email}</span>? 
              They will no longer see this case.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevokeDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPermission && revokeMutation.mutate(selectedPermission.id)}
              disabled={revokeMutation.isPending || !selectedPermission}
            >
              {revokeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}