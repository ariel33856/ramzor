import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, FileText, Trash2, Check, TrendingUp, PlusCircle, X, PenTool, Send, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DocumentUploader from '../components/documents/DocumentUploader';
import SignaturePad from '../components/payments/SignaturePad';

export default function CasePayments() {
  const spinnerStyles = `
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type="number"] {
      -moz-appearance: textfield;
    }
  `;
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [showUploader, setShowUploader] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [paymentTimesCount, setPaymentTimesCount] = useState(2);
  const [paymentsReceivedCount, setPaymentsReceivedCount] = useState(1);
  const [extraFamilies, setExtraFamilies] = useState([]);
  const [extraTransactions, setExtraTransactions] = useState([]);
  const [tempLoanAmount, setTempLoanAmount] = useState('');
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [emailForSignature, setEmailForSignature] = useState('');
  const [percentages, setPercentages] = useState({});

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

  const updatePaymentsMutation = useMutation({
    mutationFn: (data) => base44.entities.MortgageCase.update(caseId, {
      custom_data: {
        ...caseData.custom_data,
        ...data
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setEditingField(null);
    }
  });

  const saveSignatureMutation = useMutation({
    mutationFn: (signatureData) => base44.entities.MortgageCase.update(caseId, {
      custom_data: {
        ...caseData.custom_data,
        signature: signatureData,
        signature_status: 'signed',
        signature_date: new Date().toISOString()
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setSignatureDialogOpen(false);
    }
  });

  const sendSignatureLinkMutation = useMutation({
    mutationFn: async (email) => {
      // Create a signature link (in real app, would use actual e-signature service)
      const signatureLink = `${window.location.origin}${createPageUrl('ClientPortal')}?id=${caseId}&action=sign`;
      
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: 'בקשה לחתימה על הצעת מחיר',
        body: `
שלום,

אנא לחץ על הקישור הבא כדי לחתום על הצעת המחיר:
${signatureLink}

בברכה,
צוות יועצי המשכנתא
        `
      });

      return base44.entities.MortgageCase.update(caseId, {
        custom_data: {
          ...caseData.custom_data,
          signature_status: 'pending',
          signature_link_sent_to: email,
          signature_link_sent_at: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      setEmailForSignature('');
    }
  });

  const handleFieldClick = (field, value) => {
    setEditingField(field);
    setEditValues({ [field]: value });
  };

  const handleSaveField = (field) => {
    updatePaymentsMutation.mutate({ [field]: parseFloat(editValues[field]) || 0 });
  };

  const handleBlur = (field) => {
    const newValue = parseFloat(editValues[field]) || 0;
    updatePaymentsMutation.mutate({ [field]: newValue });
  };

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

  // Load extra families from custom_data on mount
  React.useEffect(() => {
    if (caseData?.custom_data?.extra_families) {
      setExtraFamilies(caseData.custom_data.extra_families);
    }
  }, [caseData?.custom_data?.extra_families]);

  // Load extra transactions from custom_data on mount
  React.useEffect(() => {
    if (caseData?.custom_data?.extra_transactions) {
      setExtraTransactions(caseData.custom_data.extra_transactions);
    }
  }, [caseData?.custom_data?.extra_transactions]);

  // Get calculation inputs
  const transactionType = caseData?.custom_data?.transaction_type || 0;
  const loanAmount = caseData?.custom_data?.loan_amount || 0;
  const difficultyLevel = caseData?.custom_data?.difficulty_level || 0;
  const creditReport = caseData?.custom_data?.credit_report || 0;
  
  // Calculate formula
  const calculateBasePrice = () => {
    const baseLoanFee = Math.max(8500, loanAmount * 0.01);
    const extraFamiliesSum = extraFamilies.reduce((sum, family) => sum + (family.family_role || 0), 0);

    // Add extra transactions
    const extraTransactionsSum = extraTransactions.reduce((sum, transaction) => {
      const txBaseLoanFee = Math.max(8500, (transaction.loan_amount || 0) * 0.01);
      const txExtraFamiliesSum = (transaction.extra_families || []).reduce((fSum, family) => fSum + (family.family_role || 0), 0);
      return sum + txBaseLoanFee + (transaction.transaction_type || 0) + (transaction.difficulty_level || 0) + (transaction.credit_report || 0) + txExtraFamiliesSum;
    }, 0);

    return baseLoanFee + transactionType + difficultyLevel + creditReport + extraFamiliesSum + extraTransactionsSum;
  };

  const calculatedBasePrice = calculateBasePrice();
  const discount = editValues.discount !== undefined ? parseFloat(editValues.discount) || 0 : (caseData.custom_data?.discount || 0);
  const priceAfterDiscount = calculatedBasePrice - discount;
  const calculatedVat = priceAfterDiscount * 0.18;
  const calculatedTotal = priceAfterDiscount + calculatedVat;

  const closingPrice = editValues.closing_price !== undefined ? parseFloat(editValues.closing_price) || 0 : (caseData.custom_data?.closing_price || priceAfterDiscount);
  const paymentTimes = editValues.payment_times !== undefined ? parseFloat(editValues.payment_times) || 0 : (caseData.custom_data?.payment_times || 0);
  const paymentsReceived = editValues.payments_received !== undefined ? parseFloat(editValues.payments_received) || 0 : (caseData.custom_data?.payments_received || 0);

  // Calculate overdue payments based on due dates
  const calculateOverduePayments = () => {
    const today = new Date();
    const overduePayments = [];

    for (let i = 1; i <= paymentTimesCount; i++) {
      const amountFieldName = i === 1 ? 'payment_times' : `payment_times_${i}`;
      const dateFieldName = `${amountFieldName}_date`;
      const dueDate = caseData.custom_data?.[dateFieldName];

      if (dueDate) {
        const dueDateObj = new Date(dueDate.split('/').reverse().join('-'));
        if (dueDateObj < today) {
          const expectedAmount = editValues[amountFieldName] !== undefined ? parseFloat(editValues[amountFieldName]) || 0 : (caseData.custom_data?.[amountFieldName] || 0);
          const receivedFieldName = i === 1 ? 'payments_received' : `payments_received_${i}`;
          const receivedAmount = editValues[receivedFieldName] !== undefined ? parseFloat(editValues[receivedFieldName]) || 0 : (caseData.custom_data?.[receivedFieldName] || 0);

          const missing = Math.max(0, expectedAmount - receivedAmount);
          if (missing > 0) {
            overduePayments.push({
              index: i,
              amountFieldName,
              dateFieldName,
              expectedAmount,
              receivedAmount,
              missing,
              percentage: expectedAmount > 0 ? (missing / expectedAmount) * 100 : 0
            });
          }
        }
      }
    }
    return overduePayments;
  };

  const overduePayments = calculateOverduePayments();
  
  // Calculate total payments received including additional payments
  const totalPaymentsReceived = paymentsReceived + Array.from({ length: paymentsReceivedCount - 1 }).reduce((sum, _, index) => {
    const fieldName = `payments_received_${index + 2}`;
    const value = editValues[fieldName] !== undefined ? parseFloat(editValues[fieldName]) || 0 : (caseData.custom_data?.[fieldName] || 0);
    return sum + value;
  }, 0);
  
  const debtBalance = closingPrice - totalPaymentsReceived;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const renderPriceRow = (label, fieldName, priceWithoutVat, onDelete) => {
    const vat = priceWithoutVat * 0.18;
    const totalWithVat = priceWithoutVat + vat;
    const isEditing = editingField === fieldName;
    const dateFieldName = fieldName ? `${fieldName}_date` : null;
    const paymentMethodFieldName = fieldName ? `${fieldName}_payment_method` : null;
    const percentageFieldName = fieldName ? `${fieldName}_percentage` : null;
      const isRemainingPayment = fieldName === 'remaining_payment_times';
      const isLatePayment = fieldName && fieldName.startsWith('late_payment');
      const isBalanceClear = (isRemainingPayment && priceWithoutVat === 0) || (isLatePayment && priceWithoutVat === 0);
      const hasDebt = (isRemainingPayment && priceWithoutVat > 0) || (isLatePayment && priceWithoutVat > 0);
    
    // Calculate amount based on percentage if percentage is set
    const currentPercentage = percentages[percentageFieldName] !== undefined ? percentages[percentageFieldName] : (caseData.custom_data?.[percentageFieldName] || '');
    const calculatedAmount = isRemainingPayment ? priceWithoutVat : (currentPercentage ? (priceAfterDiscount * parseFloat(currentPercentage)) / 100 : priceWithoutVat);
    const displayAmount = isEditing ? (editValues[fieldName] !== undefined ? parseFloat(editValues[fieldName]) : calculatedAmount) : (caseData.custom_data?.[fieldName] !== undefined && !isRemainingPayment ? caseData.custom_data[fieldName] : calculatedAmount);

    return (
      <div className="grid grid-cols-7 gap-3 mb-2 items-stretch">
        <div className={`text-sm font-semibold flex items-center gap-2 ${isBalanceClear ? 'text-green-900' : hasDebt ? 'text-red-900' : 'text-gray-900'}`}>
          {label}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
        <div className={`rounded-lg p-3 text-right flex flex-col justify-center h-[60px] ${isBalanceClear ? 'bg-green-50' : hasDebt ? 'bg-red-50' : 'bg-blue-50'}`}>
          <p className={`text-xs mb-1 ${isBalanceClear ? 'text-green-600' : isRemainingPayment ? 'text-red-600' : 'text-gray-600'}`}>ללא מע"מ</p>
          {isEditing && fieldName !== 'remaining_payment_times' && (fieldName === 'payments_received' || fieldName?.startsWith('payments_received_') || fieldName === 'late_payment' || fieldName === 'payment_times' || fieldName?.startsWith('payment_times_')) ? (
            <Input
              type="text"
              inputMode="decimal"
              value={editValues[fieldName] !== undefined ? new Intl.NumberFormat('he-IL').format(editValues[fieldName]) : new Intl.NumberFormat('he-IL').format(displayAmount)}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, '');
                setEditValues({ ...editValues, [fieldName]: value });
              }}
              onBlur={() => handleBlur(fieldName)}
              autoFocus
              className="text-lg font-bold text-blue-600 !border-2 !border-blue-400 !bg-white"
            />
          ) : (
            <p 
              className={`text-lg font-bold ${isBalanceClear ? 'text-green-600' : hasDebt ? 'text-red-600' : 'text-blue-600'} ${(fieldName === 'payments_received' || fieldName?.startsWith('payments_received_') || fieldName === 'late_payment' || fieldName === 'payment_times' || fieldName?.startsWith('payment_times_')) && fieldName !== 'remaining_payment_times' ? `cursor-pointer hover:${isBalanceClear ? 'bg-green-100' : hasDebt ? 'bg-red-100' : 'bg-blue-100'} rounded px-2 -mx-2 transition-colors` : ''}`}
               onClick={() => (fieldName === 'payments_received' || fieldName?.startsWith('payments_received_') || fieldName === 'late_payment' || fieldName === 'payment_times' || fieldName?.startsWith('payment_times_')) && fieldName !== 'remaining_payment_times' && handleFieldClick(fieldName, displayAmount)}
            >
              {formatCurrency(displayAmount)}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-3 text-right flex flex-col justify-center h-[60px] ${isBalanceClear ? 'bg-green-50' : hasDebt ? 'bg-red-50' : 'bg-orange-50'}`}>
          <p className={`text-xs mb-1 ${isBalanceClear ? 'text-green-600' : isRemainingPayment ? 'text-red-600' : 'text-gray-600'}`}>מע"מ 18%</p>
          <p className={`text-lg font-bold ${isBalanceClear ? 'text-green-600' : hasDebt ? 'text-red-600' : 'text-orange-600'}`}>{formatCurrency(vat)}</p>
        </div>
        <div className={`rounded-lg p-3 text-right flex flex-col justify-center h-[60px] ${isBalanceClear ? 'bg-green-50' : hasDebt ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`text-xs mb-1 ${isBalanceClear ? 'text-green-600' : isRemainingPayment ? 'text-red-600' : 'text-gray-600'}`}>סה"כ עם מע"מ</p>
          <p className={`text-lg font-bold ${isBalanceClear ? 'text-green-600' : hasDebt ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(totalWithVat)}</p>
        </div>
        {fieldName && (fieldName === 'payments_received' || fieldName?.startsWith('payments_received_') || fieldName === 'late_payment' || fieldName === 'payment_times' || fieldName?.startsWith('payment_times_') || fieldName === 'remaining_payment_times') && (
          <div className={`rounded-lg p-3 text-right flex flex-col justify-center h-[60px] ${isBalanceClear ? 'bg-green-50' : hasDebt ? 'bg-red-50' : 'bg-indigo-50'}`}>
            <p className={`text-xs mb-1 ${isBalanceClear ? 'text-green-600' : isRemainingPayment ? 'text-red-600' : 'text-gray-600'}`}>אחוז %</p>
            {fieldName === 'remaining_payment_times' || fieldName === 'late_payment' || fieldName?.startsWith('late_payment_') ? (
              <p className={`text-lg font-bold ${isBalanceClear ? 'text-green-600' : hasDebt ? 'text-red-600' : 'text-indigo-600'}`}>
                {priceAfterDiscount > 0 ? ((priceWithoutVat / priceAfterDiscount) * 100).toFixed(1) : '0'}%
              </p>
            ) : (
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={percentages[percentageFieldName] !== undefined ? percentages[percentageFieldName] : (caseData.custom_data?.[percentageFieldName] || '')}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.]/g, '');
                  setPercentages({ ...percentages, [percentageFieldName]: value });
                }}
                onBlur={() => {
                  if (percentages[percentageFieldName] !== undefined) {
                    const percentage = parseFloat(percentages[percentageFieldName]) || 0;
                    const calculatedValue = (priceAfterDiscount * percentage) / 100;
                    updatePaymentsMutation.mutate({ 
                      [fieldName]: calculatedValue,
                      [percentageFieldName]: percentage
                    });
                  }
                }}
                className="text-lg font-bold text-indigo-600 !border-2 !border-indigo-400 !bg-white h-9"
              />
            )}
          </div>
        )}
        {fieldName && fieldName !== 'remaining_payment_times' && fieldName !== 'debt_balance' ? (
          <>
            <div className="bg-purple-50 rounded-lg p-3 text-right flex flex-col justify-center h-[60px]">
              <p className="text-xs text-gray-600 mb-1">תאריך</p>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={editValues[dateFieldName] !== undefined ? editValues[dateFieldName] : (caseData.custom_data?.[dateFieldName] || '')}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2);
                  }
                  if (value.length >= 5) {
                    value = value.slice(0, 5) + '/' + value.slice(5);
                  }
                  if (value.length > 10) {
                    value = value.slice(0, 10);
                  }
                  setEditValues({ ...editValues, [dateFieldName]: value });
                }}
                onBlur={() => {
                  if (editValues[dateFieldName] !== undefined) {
                    updatePaymentsMutation.mutate({ [dateFieldName]: editValues[dateFieldName] });
                  }
                }}
                className="!text-sm !font-bold text-purple-600 !border-0 !bg-transparent !p-0 h-9"
              />
            </div>
            <div className="bg-teal-50 rounded-lg p-3 text-right flex flex-col justify-center h-[60px]">
              <p className="text-xs text-gray-600 mb-1">אמצעי תשלום</p>
              <Input
                type="text"
                placeholder="מזומן/העברה/צ׳ק"
                value={editValues[paymentMethodFieldName] !== undefined ? editValues[paymentMethodFieldName] : (caseData.custom_data?.[paymentMethodFieldName] || '')}
                onChange={(e) => setEditValues({ ...editValues, [paymentMethodFieldName]: e.target.value })}
                onBlur={() => {
                  if (editValues[paymentMethodFieldName] !== undefined) {
                    updatePaymentsMutation.mutate({ [paymentMethodFieldName]: editValues[paymentMethodFieldName] });
                  }
                }}
                className="!text-sm !font-bold text-teal-600 !border-0 !bg-transparent !p-0 h-9"
              />
            </div>
          </>
        ) : fieldName ? (
        <div className="col-span-2"></div>
        ) : (
        <div className={`col-span-2 rounded-lg p-2 border-2 h-[60px] flex flex-col justify-center ${isBalanceClear ? 'bg-green-50 border-green-200' : hasDebt ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${isBalanceClear ? 'text-green-600' : hasDebt ? 'text-red-600' : 'text-blue-600'}`}>התקבל</span>
            <span className={`text-base font-bold ${isBalanceClear ? 'text-green-700' : hasDebt ? 'text-red-700' : 'text-blue-700'}`}>
              {closingPrice > 0 ? Math.round((totalPaymentsReceived / closingPrice) * 100) : 0}%
            </span>
          </div>
          <div className="relative w-full h-5 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
            <div 
              className="absolute top-0 right-0 h-full transition-all duration-500 overflow-hidden"
              style={{ 
                width: `${closingPrice > 0 ? Math.min(Math.round((totalPaymentsReceived / closingPrice) * 100), 100) : 0}%`
              }}
            >
              <div 
                className={`h-full ${isBalanceClear ? 'bg-gradient-to-l from-green-600 to-green-400' : hasDebt ? 'bg-gradient-to-l from-red-600 to-red-400' : 'bg-gradient-to-l from-red-600 via-yellow-500 to-green-600'}`}
                style={{ 
                  width: (() => {
                    const percent = closingPrice > 0 ? Math.min(Math.round((totalPaymentsReceived / closingPrice) * 100), 100) : 0;
                    return percent > 0 ? `${10000 / percent}%` : '0%';
                  })()
                }}
              />
            </div>
          </div>
        </div>
        )}
        </div>
        );
        };

  return (
    <div className="h-full bg-gray-50/50 p-6">
      <style>{spinnerStyles}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Calculation Inputs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">הצעת מחיר</h3>
          
          <div className="flex gap-2 mb-4 flex-wrap items-start">
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700 mb-1">סוג עסקה</label>
              <Select
                value={String(transactionType)}
                onValueChange={(value) => updatePaymentsMutation.mutate({ transaction_type: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">רכישה</SelectItem>
                  <SelectItem value="1000">שיפוצים</SelectItem>
                  <SelectItem value="2500">איחוד</SelectItem>
                </SelectContent>
              </Select>
              <div className="h-5 mt-1 flex items-center justify-center">
                <p className="text-xs text-blue-600 font-semibold">{formatCurrency(transactionType)}</p>
              </div>
            </div>

            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700 mb-1">סכום</label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={tempLoanAmount !== '' ? new Intl.NumberFormat('he-IL').format(tempLoanAmount) : (loanAmount ? new Intl.NumberFormat('he-IL').format(loanAmount) : '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    setTempLoanAmount(value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    updatePaymentsMutation.mutate({ loan_amount: parseFloat(value) || 0 });
                    setTempLoanAmount('');
                  }}
                  className="h-8 text-sm pl-8"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">₪</span>
              </div>
              <div className="h-5 mt-1 flex items-center justify-center">
                <p className="text-xs text-blue-600 font-semibold">{formatCurrency(Math.max(8500, loanAmount * 0.01))}</p>
              </div>
            </div>

            <div className="w-28">
              <label className="block text-xs font-medium text-gray-700 mb-1">דרגת קושי</label>
              <Select
                value={String(difficultyLevel)}
                onValueChange={(value) => updatePaymentsMutation.mutate({ difficulty_level: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">קלה</SelectItem>
                  <SelectItem value="1000">בינונית</SelectItem>
                  <SelectItem value="5000">קשה</SelectItem>
                </SelectContent>
              </Select>
              <div className="h-5 mt-1 flex items-center justify-center">
                <p className="text-xs text-blue-600 font-semibold">{formatCurrency(difficultyLevel)}</p>
              </div>
            </div>

            <div className="w-28">
              <label className="block text-xs font-medium text-gray-700 mb-1">דוח אשראי</label>
              <Select
                value={String(creditReport)}
                onValueChange={(value) => updatePaymentsMutation.mutate({ credit_report: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="0">תקין</SelectItem>
                   <SelectItem value="3000">בעייתי</SelectItem>
                   <SelectItem value="6000">אדום</SelectItem>
                </SelectContent>
                </Select>
              <div className="h-5 mt-1 flex items-center justify-center">
                <p className="text-xs text-blue-600 font-semibold">{formatCurrency(creditReport)}</p>
              </div>
            </div>

            {extraFamilies.map((family, index) => (
              <div key={index} className="w-28">
                <label className="block text-xs font-medium text-gray-700 mb-1 invisible">תא</label>
                <div className="flex items-center gap-1">
                  <Select
                    value={String(family.family_role || 0)}
                    onValueChange={(value) => {
                      const newFamilies = [...extraFamilies];
                      newFamilies[index] = { ...newFamilies[index], family_role: parseInt(value) };
                      setExtraFamilies(newFamilies);
                      updatePaymentsMutation.mutate({ extra_families: newFamilies });
                    }}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue placeholder="בחר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8500">לווה נוסף</SelectItem>
                      <SelectItem value="4250">ערב</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newFamilies = extraFamilies.filter((_, i) => i !== index);
                      setExtraFamilies(newFamilies);
                      updatePaymentsMutation.mutate({ extra_families: newFamilies });
                    }}
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="h-5 mt-1 flex items-center justify-center">
                  <p className="text-xs text-blue-600 font-semibold">{formatCurrency(family.family_role || 0)}</p>
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 invisible">הוסף</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newFamilies = [...extraFamilies, { family_role: 8500 }];
                  setExtraFamilies(newFamilies);
                  updatePaymentsMutation.mutate({ extra_families: newFamilies });
                }}
                className="h-8 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 text-sm px-3"
              >
                <PlusCircle className="w-3 h-3 ml-1" />
                הוסף תא משפחתי
              </Button>
              <div className="h-5 mt-1"></div>
            </div>
            </div>

            {/* Extra Transactions */}
          {extraTransactions.map((transaction, index) => (
            <div key={index} className="pt-4 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-semibold text-gray-900">עסקה נוספת {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newTransactions = extraTransactions.filter((_, i) => i !== index);
                    setExtraTransactions(newTransactions);
                    updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                  }}
                  className="text-red-600 hover:bg-red-50 h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap items-start">
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">סוג עסקה</label>
                  <Select
                    value={String(transaction.transaction_type || 0)}
                    onValueChange={(value) => {
                      const newTransactions = [...extraTransactions];
                      newTransactions[index] = { ...newTransactions[index], transaction_type: parseInt(value) };
                      setExtraTransactions(newTransactions);
                      updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="בחר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">רכישה</SelectItem>
                      <SelectItem value="1000">שיפוצים</SelectItem>
                      <SelectItem value="2500">איחוד</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="h-5 mt-1 flex items-center justify-center">
                    <p className="text-xs text-blue-600 font-semibold">{formatCurrency(transaction.transaction_type || 0)}</p>
                  </div>
                </div>

                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">סכום</label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={transaction.loan_amount ? new Intl.NumberFormat('he-IL').format(transaction.loan_amount) : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        const newTransactions = [...extraTransactions];
                        newTransactions[index] = { ...newTransactions[index], loan_amount: value };
                        setExtraTransactions(newTransactions);
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, '');
                        const newTransactions = [...extraTransactions];
                        newTransactions[index] = { ...newTransactions[index], loan_amount: parseFloat(value) || 0 };
                        setExtraTransactions(newTransactions);
                        updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                      }}
                      className="h-8 text-sm pl-8"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">₪</span>
                  </div>
                  <div className="h-5 mt-1 flex items-center justify-center">
                    <p className="text-xs text-blue-600 font-semibold">{formatCurrency(Math.max(8500, (transaction.loan_amount || 0) * 0.01))}</p>
                  </div>
                </div>

                <div className="w-28">
                  <label className="block text-xs font-medium text-gray-700 mb-1">קושי</label>
                  <Select
                    value={String(transaction.difficulty_level || 0)}
                    onValueChange={(value) => {
                      const newTransactions = [...extraTransactions];
                      newTransactions[index] = { ...newTransactions[index], difficulty_level: parseInt(value) };
                      setExtraTransactions(newTransactions);
                      updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="בחר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">קלה</SelectItem>
                      <SelectItem value="1000">בינונית</SelectItem>
                      <SelectItem value="5000">קשה</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="h-5 mt-1 flex items-center justify-center">
                    <p className="text-xs text-blue-600 font-semibold">{formatCurrency(transaction.difficulty_level || 0)}</p>
                  </div>
                </div>

                <div className="w-28">
                  <label className="block text-xs font-medium text-gray-700 mb-1">אשראי</label>
                  <Select
                    value={String(transaction.credit_report || 0)}
                    onValueChange={(value) => {
                      const newTransactions = [...extraTransactions];
                      newTransactions[index] = { ...newTransactions[index], credit_report: parseInt(value) };
                      setExtraTransactions(newTransactions);
                      updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="בחר" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">תקין</SelectItem>
                      <SelectItem value="3000">בעייתי</SelectItem>
                      <SelectItem value="6000">אדום</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="h-5 mt-1 flex items-center justify-center">
                    <p className="text-xs text-blue-600 font-semibold">{formatCurrency(transaction.credit_report || 0)}</p>
                  </div>
                  </div>

                {(transaction.extra_families || []).map((family, fIndex) => (
                  <div key={fIndex} className="w-28">
                    <label className="block text-xs font-medium text-gray-700 mb-1 invisible">תא</label>
                    <div className="flex items-center gap-1">
                      <Select
                        value={String(family.family_role || 0)}
                        onValueChange={(value) => {
                          const newTransactions = [...extraTransactions];
                          const newFamilies = [...(transaction.extra_families || [])];
                          newFamilies[fIndex] = { ...newFamilies[fIndex], family_role: parseInt(value) };
                          newTransactions[index] = { ...newTransactions[index], extra_families: newFamilies };
                          setExtraTransactions(newTransactions);
                          updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                        }}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue placeholder="בחר" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8500">לווה נוסף</SelectItem>
                          <SelectItem value="4250">ערב</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newTransactions = [...extraTransactions];
                          const newFamilies = (transaction.extra_families || []).filter((_, i) => i !== fIndex);
                          newTransactions[index] = { ...newTransactions[index], extra_families: newFamilies };
                          setExtraTransactions(newTransactions);
                          updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                        }}
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="h-5 mt-1 flex items-center justify-center">
                      <p className="text-xs text-blue-600 font-semibold">{formatCurrency(family.family_role || 0)}</p>
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 invisible">הוסף</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTransactions = [...extraTransactions];
                      const newFamilies = [...(transaction.extra_families || []), { family_role: 8500 }];
                      newTransactions[index] = { ...newTransactions[index], extra_families: newFamilies };
                      setExtraTransactions(newTransactions);
                      updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                    }}
                    className="h-8 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 text-sm px-3"
                  >
                    <PlusCircle className="w-3 h-3 ml-1" />
                    הוסף תא משפחתי
                  </Button>
                  <div className="h-5 mt-1"></div>
                </div>
              </div>


            </div>
          ))}

          {/* Add Transaction Button */}
          <div className="pt-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newTransactions = [...extraTransactions, { transaction_type: 0, loan_amount: 0, difficulty_level: 0, credit_report: 0 }];
                setExtraTransactions(newTransactions);
                updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
              }}
              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            >
              <PlusCircle className="w-4 h-4 ml-2" />
              הוסף עסקה
            </Button>
          </div>



          {/* Calculation Summary */}
          <div className="mt-6 pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 text-xs">מחיר לפני מע"מ:</span>
                <span className="font-semibold">{formatCurrency(calculatedBasePrice)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 text-xs">הנחה:</span>
                <div className="relative w-24">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={editValues.discount !== undefined ? new Intl.NumberFormat('he-IL').format(editValues.discount) : (discount ? new Intl.NumberFormat('he-IL').format(discount) : '')}
                    onChange={(e) => {
                      const numValue = e.target.value.replace(/,/g, '');
                      if (!isNaN(numValue) || numValue === '') {
                        setEditValues({ ...editValues, discount: numValue });
                      }
                    }}
                    onBlur={() => {
                      if (editValues.discount !== undefined) {
                        updatePaymentsMutation.mutate({ discount: parseFloat(editValues.discount) || 0 });
                      }
                    }}
                    className="h-7 text-xs pl-6 text-left font-semibold"
                  />
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-gray-500">₪</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="relative w-16">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={editValues.discountPercent !== undefined ? editValues.discountPercent : (calculatedBasePrice > 0 ? ((discount / calculatedBasePrice) * 100).toFixed(1) : '0')}
                    onChange={(e) => {
                      const numValue = e.target.value.replace(/[^\d.]/g, '');
                      if (!isNaN(numValue) || numValue === '') {
                        setEditValues({ ...editValues, discountPercent: numValue });
                        const discountAmount = (calculatedBasePrice * parseFloat(numValue || 0)) / 100;
                        setEditValues({ ...editValues, discountPercent: numValue, discount: discountAmount.toFixed(0) });
                      }
                    }}
                    onBlur={() => {
                      if (editValues.discountPercent !== undefined) {
                        const discountAmount = (calculatedBasePrice * parseFloat(editValues.discountPercent || 0)) / 100;
                        updatePaymentsMutation.mutate({ discount: discountAmount });
                        setEditValues({ ...editValues, discountPercent: undefined });
                      }
                    }}
                    className="h-7 text-xs pl-5 text-left font-semibold"
                  />
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 text-xs">לאחר הנחה:</span>
                <span className="font-semibold">{formatCurrency(priceAfterDiscount)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 text-xs">מע"מ (18%):</span>
                <span className="font-semibold">{formatCurrency(calculatedVat)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm mr-auto">
                <span className="text-gray-700 font-semibold">סה"כ:</span>
                <span className="font-bold text-green-600 text-base">{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">זמני תשלום</h4>
              {renderPriceRow('תשלום ראשון', 'payment_times', paymentTimes)}
              {Array.from({ length: paymentTimesCount - 1 }).map((_, index) => {
                const fieldName = `payment_times_${index + 2}`;
                return renderPriceRow(
                  `זמן תשלום ${index === 0 ? 'שני' : index === 1 ? 'שלישי' : index === 2 ? 'רביעי' : index === 3 ? 'חמישי' : `${index + 2}`}`, 
                  fieldName, 
                  caseData.custom_data?.[fieldName] || 0,
                  () => {
                    const updates = { [fieldName]: undefined };
                    updatePaymentsMutation.mutate(updates);
                    setPaymentTimesCount(prev => Math.max(2, prev - 1));
                  }
                );
              })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentTimesCount(prev => prev + 1)}
                className="mb-4 mr-auto bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              >
                <PlusCircle className="w-4 h-4 ml-2" />
                הוסף זמן תשלום
              </Button>

              {/* Payment Times Summary */}
              {(() => {
                const totalPaymentTimes = Array.from({ length: paymentTimesCount }).reduce((sum, _, index) => {
                  const fn = index === 0 ? 'payment_times' : `payment_times_${index + 1}`;
                  return sum + (editValues[fn] !== undefined ? parseFloat(editValues[fn]) || 0 : (caseData.custom_data?.[fn] || 0));
                }, 0);
                const remainingBalance = Math.max(0, priceAfterDiscount - totalPaymentTimes);
                return renderPriceRow('יתרה להזנת זמן תשלום', 'remaining_payment_times', remainingBalance);
              })()}

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => window.print()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  הפקת הצעת מחיר
                </Button>
                <Button
                  onClick={() => updatePaymentsMutation.mutate({ closing_price: priceAfterDiscount })}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  עדכן מחיר סגירה
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">מחיר סגירה</h3>
          {renderPriceRow('מחיר סגירה', 'closing_price', closingPrice)}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">מצב תשלומים</h3>
          {renderPriceRow('תשלומים שהתקבלו', 'payments_received', paymentsReceived)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaymentsReceivedCount(prev => prev + 1)}
            className="mb-4 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            <PlusCircle className="w-4 h-4 ml-2" />
            הוסף תשלום
          </Button>
          {Array.from({ length: paymentsReceivedCount - 1 }).map((_, index) => {
            const fieldName = `payments_received_${index + 2}`;
            return renderPriceRow(
              `תשלום ${index === 0 ? 'שני' : index === 1 ? 'שלישי' : index === 2 ? 'רביעי' : index === 3 ? 'חמישי' : `${index + 2}`}`, 
              fieldName, 
              caseData.custom_data?.[fieldName] || 0,
              () => setPaymentsReceivedCount(prev => Math.max(1, prev - 1))
            );
          })}
          <div className="pt-3 mt-3 border-t border-gray-200">
            {renderPriceRow('סך התשלומים שהתקבלו', null, totalPaymentsReceived)}
            {renderPriceRow('יתרת חוב', 'debt_balance', debtBalance)}
            {overduePayments.length > 0 ? (
              overduePayments.map((overdue, idx) => (
                <React.Fragment key={idx}>
                  {renderPriceRow(
                    `תשלום בפיגור${idx > 0 ? ` ${idx + 1}` : ''}`, 
                    `late_payment_${idx}`, 
                    overdue.missing
                  )}
                </React.Fragment>
              ))
            ) : (
              renderPriceRow('תשלום בפיגור', 'late_payment', 0)
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">חתימה דיגיטלית</h3>

          {caseData.custom_data?.signature_status === 'signed' ? (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">הצעת המחיר נחתמה</p>
                    <p className="text-sm text-green-700">
                      תאריך חתימה: {new Date(caseData.custom_data.signature_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
                {caseData.custom_data?.signature && (
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-2">חתימה:</p>
                    <img 
                      src={caseData.custom_data.signature} 
                      alt="חתימה" 
                      className="max-h-24 border border-gray-200 rounded"
                    />
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  updatePaymentsMutation.mutate({ 
                    signature: null, 
                    signature_status: null,
                    signature_date: null 
                  });
                }}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                מחק חתימה
              </Button>
            </div>
          ) : caseData.custom_data?.signature_status === 'pending' ? (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                <div>
                  <p className="font-semibold text-yellow-900">ממתין לחתימה</p>
                  <p className="text-sm text-yellow-700">
                    קישור נשלח אל: {caseData.custom_data.signature_link_sent_to}
                  </p>
                  <p className="text-xs text-yellow-600">
                    {new Date(caseData.custom_data.signature_link_sent_at).toLocaleString('he-IL')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => setSignatureDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <PenTool className="w-4 h-4 ml-2" />
                  חתום עכשיו
                </Button>

                <div className="flex gap-2">
                  <Input
                    placeholder="אימייל לחתימה"
                    value={emailForSignature}
                    onChange={(e) => setEmailForSignature(e.target.value)}
                    type="email"
                  />
                  <Button
                    onClick={() => sendSignatureLinkMutation.mutate(emailForSignature)}
                    disabled={!emailForSignature || sendSignatureLinkMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {sendSignatureLinkMutation.isPending ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-2" />
                    )}
                    שלח
                  </Button>
                </div>
              </div>
            </div>
          )}
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

      {/* Signature Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>חתימה על הצעת המחיר</DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={(signatureData) => saveSignatureMutation.mutate(signatureData)}
            onCancel={() => setSignatureDialogOpen(false)}
            initialSignature={caseData.custom_data?.signature}
          />
        </DialogContent>
      </Dialog>
      </div>
      );
      }