import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, FileText, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DocumentUploader from '../components/documents/DocumentUploader';

const urlParams = new URLSearchParams(window.location.search);
const caseId = urlParams.get('id');

export default function CaseServiceAgreement() {
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['case-documents', caseId, 'service_agreement'],
    queryFn: () => base44.entities.Document.filter({ 
      case_id: caseId,
      document_type: 'service_agreement'
    }),
    enabled: !!caseId,
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.Document.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', caseId, 'service_agreement'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const agreement = documents[0];

  return (
    <div className="space-y-6">
      {!agreement && !showUploader ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-8 text-center">
          <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">חוזה שירות</h3>
          <p className="text-gray-600 mb-4">טרם הועלה חוזה בין נותן השירות ללקוח</p>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => setShowUploader(true)}
          >
            <Upload className="w-4 h-4 ml-2" />
            העלה חוזה
          </Button>
        </div>
      ) : agreement ? (
        <div className="bg-white rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{agreement.file_name}</p>
                <p className="text-sm text-gray-600">הועלה ב-{new Date(agreement.created_date).toLocaleDateString('he-IL')}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate(agreement.id)}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <a 
            href={agreement.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg transition-colors"
          >
            צפה בחוזה
          </a>
        </div>
      ) : null}

      {showUploader && (
        <DocumentUploader
          caseId={caseId}
          defaultDocumentType="service_agreement"
          onSuccess={() => {
            setShowUploader(false);
            queryClient.invalidateQueries({ queryKey: ['case-documents', caseId, 'service_agreement'] });
          }}
          onCancel={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}