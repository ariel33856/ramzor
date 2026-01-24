import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, FileText, Trash2, Check, Edit2, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DocumentUploader from '../components/documents/DocumentUploader';

export default function CasePayments() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: documents = [] } = useQuery({
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

  if (!caseData) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
        <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">
          חזרה לדשבורד
        </Link>
      </div>
    );
  }

  const agreement = documents[0];

  const closingPrice = caseData.custom_data?.closing_price || 0;
  const paymentsReceived = caseData.custom_data?.payments_received || 0;
  const debtBalance = closingPrice - paymentsReceived;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const renderPriceRow = (label, priceWithoutVat) => {
    const vat = priceWithoutVat * 0.18;
    const totalWithVat = priceWithoutVat + vat;

    return (
      <div className="grid grid-cols-4 gap-4 mb-3 items-center">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="bg-blue-50 rounded-lg p-3 text-right">
          <p className="text-xs text-gray-600 mb-1">ללא מעמ"ם</p>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(priceWithoutVat)}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-right">
          <p className="text-xs text-gray-600 mb-1">מעמ"ם 18%</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(vat)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-right">
          <p className="text-xs text-gray-600 mb-1">סה"כ עם מעמ"ם</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalWithVat)}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">סיכום תשלומים</h3>
          {renderPriceRow('מחיר סגירה', closingPrice)}
          {renderPriceRow('תשלומים שהתקבלו', paymentsReceived)}
          <div className="border-t-2 border-gray-200 pt-3 mt-3">
            {renderPriceRow('יתרת חוב', debtBalance)}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">חוזה שירות</h3>
          {!agreement && !showUploader ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-8 text-center">
              <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
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
      </div>
    </div>
  );
}