import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, Home, HelpCircle, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClientProgress from '../components/client/ClientProgress';
import DocumentUploader from '../components/documents/DocumentUploader';
import { SecureEntities } from '../components/secureEntities';

export default function ClientPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const { data: caseData, isLoading: loadingCase } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: () => SecureEntities.Document.filter({ case_id: caseId }),
    enabled: !!caseId
  });

  if (loadingCase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">תיק לא נמצא</h2>
          <p className="text-gray-500">אנא בדוק את הקישור שקיבלת מהיועץ שלך</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-lg mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Logo/Header */}
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">פורטל הלקוח</h1>
            <p className="text-gray-500 text-sm">מעקב אחר הבקשה למשכנתא</p>
          </div>

          {/* Progress Card */}
          <ClientProgress caseData={caseData} documents={documents} />

          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">העלאת מסמכים</h3>
            <DocumentUploader
              caseId={caseId}
              onUploadComplete={() => refetchDocs()}
            />
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">צריך עזרה?</h4>
                <p className="text-sm text-gray-500 mb-3">
                  אם יש לך שאלות או שאתה לא בטוח איזה מסמך להעלות, צור קשר עם היועץ שלך.
                </p>
                {caseData.assigned_consultant && (
                  <p className="text-sm text-gray-700 font-medium mb-3">
                    היועץ שלך: {caseData.assigned_consultant}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Phone className="w-4 h-4 ml-1" />
                    התקשר
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mail className="w-4 h-4 ml-1" />
                    שלח מייל
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 py-4">
            <p>המידע שלך מאובטח ומוגן 🔒</p>
            <p className="mt-1">מזהה תיק: {caseId?.slice(0, 8)}...</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}