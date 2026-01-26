import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, FileText, Trash2, Check, TrendingUp, PlusCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DocumentUploader from '../components/documents/DocumentUploader';

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
  const [extraFamilies, setExtraFamilies] = useState([]);
  const [extraTransactions, setExtraTransactions] = useState([]);
  const [tempLoanAmount, setTempLoanAmount] = useState('');

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

  const handleFieldClick = (field, value) => {
    setEditingField(field);
    setEditValues({ [field]: value });
  };

  const handleSaveField = (field) => {
    updatePaymentsMutation.mutate({ [field]: parseFloat(editValues[field]) || 0 });
  };

  const handleBlur = (field) => {
    handleSaveField(field);
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
  const calculatedVat = calculatedBasePrice * 0.18;
  const calculatedTotal = calculatedBasePrice + calculatedVat;

  const closingPrice = editValues.closing_price !== undefined ? parseFloat(editValues.closing_price) || 0 : (caseData.custom_data?.closing_price || calculatedTotal);
  const paymentTimes = editValues.payment_times !== undefined ? parseFloat(editValues.payment_times) || 0 : (caseData.custom_data?.payment_times || 0);
  const paymentsReceived = editValues.payments_received !== undefined ? parseFloat(editValues.payments_received) || 0 : (caseData.custom_data?.payments_received || 0);
  const debtBalance = closingPrice - paymentsReceived;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const renderPriceRow = (label, fieldName, priceWithoutVat, onDelete) => {
    const vat = priceWithoutVat * 0.18;
    const totalWithVat = priceWithoutVat + vat;
    const isEditing = editingField === fieldName;
    const dateFieldName = fieldName ? `${fieldName}_date` : null;
    const paymentMethodFieldName = fieldName ? `${fieldName}_payment_method` : null;

    return (
      <div className="grid grid-cols-6 gap-4 mb-2 items-center">
        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
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
        <div 
          className={`bg-blue-50 rounded-lg p-3 text-right transition-colors ${fieldName ? 'cursor-pointer hover:bg-blue-100' : ''}`}
          onClick={() => fieldName && !isEditing && handleFieldClick(fieldName, priceWithoutVat)}
        >
          <p className="text-xs text-gray-600 mb-1">ללא מע"מ</p>
          {fieldName ? (
            <Input
              type="text"
              inputMode="decimal"
              value={new Intl.NumberFormat('he-IL').format(editValues[fieldName] !== undefined ? editValues[fieldName] : priceWithoutVat)}
              onChange={(e) => {
                const numValue = e.target.value.replace(/,/g, '');
                if (!isNaN(numValue) || numValue === '') {
                  setEditValues({ ...editValues, [fieldName]: numValue });
                }
              }}
              onBlur={() => handleBlur(fieldName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBlur(fieldName);
                if (e.key === 'Escape') setEditValues({ ...editValues, [fieldName]: undefined });
              }}
              onClick={(e) => e.stopPropagation()}
              className="!text-lg !font-bold text-blue-600 !border-0 !bg-transparent !p-0 !h-[1.75rem] !leading-[1.75rem]"
            />
          ) : (
            <p className="text-lg font-bold text-blue-600">{formatCurrency(priceWithoutVat)}</p>
          )}
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-right">
          <p className="text-xs text-gray-600 mb-1">מע"מ 18%</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(vat)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-right">
          <p className="text-xs text-gray-600 mb-1">סה"כ עם מע"מ</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalWithVat)}</p>
        </div>
        {fieldName ? (
          <>
            <div className="bg-purple-50 rounded-lg p-3 text-right">
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
                className="!text-sm !font-bold text-purple-600 !border-0 !bg-transparent !p-0 !h-[1.75rem]"
              />
            </div>
            <div className="bg-teal-50 rounded-lg p-3 text-right">
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
                className="!text-sm !font-bold text-teal-600 !border-0 !bg-transparent !p-0 !h-[1.75rem]"
              />
            </div>
          </>
        ) : (
          <div className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-600 font-medium">התקבל</span>
              <span className="text-base font-bold text-blue-700">
                {closingPrice > 0 ? Math.round((paymentsReceived / closingPrice) * 100) : 0}%
              </span>
            </div>
            <div className="relative w-full h-5 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
              <div 
                className="absolute top-0 right-0 h-full transition-all duration-500 overflow-hidden"
                style={{ 
                  width: `${closingPrice > 0 ? Math.min(Math.round((paymentsReceived / closingPrice) * 100), 100) : 0}%`
                }}
              >
                <div 
                  className="h-full bg-gradient-to-l from-red-600 via-yellow-500 to-green-600"
                  style={{ 
                    width: (() => {
                      const percent = closingPrice > 0 ? Math.min(Math.round((paymentsReceived / closingPrice) * 100), 100) : 0;
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">חישוב מחיר</h3>
          
          <div className="flex gap-2 mb-4 flex-wrap items-end">
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
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">ש״ח</span>
              </div>
            </div>

            <div className="w-28">
              <label className="block text-xs font-medium text-gray-700 mb-1">קושי</label>
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
            </div>

            <div className="w-28">
              <label className="block text-xs font-medium text-gray-700 mb-1">אשראי</label>
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
                  <SelectItem value="6000">מאוד</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {extraFamilies.map((family, index) => (
              <div key={index} className="flex items-center gap-1">
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
            ))}

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
          </div>



          {/* Extra Transactions */}
          {extraTransactions.map((transaction, index) => (
            <div key={index} className="pt-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">עסקה נוספת {index + 1}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newTransactions = extraTransactions.filter((_, i) => i !== index);
                    setExtraTransactions(newTransactions);
                    updatePaymentsMutation.mutate({ extra_transactions: newTransactions });
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap items-end">
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
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">ש״ח</span>
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
                      <SelectItem value="6000">מאוד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(transaction.extra_families || []).map((family, fIndex) => (
                  <div key={fIndex} className="flex items-center gap-1">
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
                ))}

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
            <div className="bg-blue-50 p-4 rounded-lg space-y-1">
              <div className="flex justify-between text-sm font-semibold text-blue-900 mb-2">
                <span>בסיס חישוב:</span>
                <span>{formatCurrency(calculatedBasePrice)}</span>
              </div>
              <div className="text-xs text-gray-600 space-y-1 mr-4">
                <div className="flex justify-between">
                  <span>• סכום הלוואה ({formatCurrency(loanAmount)} × 1% = {formatCurrency(loanAmount * 0.01)}, מינימום 8,500):</span>
                  <span className="font-medium">{formatCurrency(Math.max(8500, loanAmount * 0.01))}</span>
                </div>
                {transactionType > 0 && (
                  <div className="flex justify-between">
                    <span>• סוג עסקה ({transactionType === 1000 ? 'שיפוצים' : 'איחוד'}):</span>
                    <span className="font-medium">{formatCurrency(transactionType)}</span>
                  </div>
                )}
                {difficultyLevel > 0 && (
                  <div className="flex justify-between">
                    <span>• דרגת קושי ({difficultyLevel === 1000 ? 'בינונית' : difficultyLevel === 5000 ? 'קשה' : ''}):</span>
                    <span className="font-medium">{formatCurrency(difficultyLevel)}</span>
                  </div>
                )}
                {creditReport > 0 && (
                  <div className="flex justify-between">
                    <span>• דוח אשראי ({creditReport === 3000 ? 'בעייתי' : creditReport === 6000 ? 'בעייתי מאוד' : ''}):</span>
                    <span className="font-medium">{formatCurrency(creditReport)}</span>
                  </div>
                )}
                {extraFamilies.length > 0 && extraFamilies.map((family, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>• תא משפחתי נוסף ({family.family_role === 8500 ? 'לווה נוסף' : 'ערב'}):</span>
                    <span className="font-medium">{formatCurrency(family.family_role || 0)}</span>
                  </div>
                ))}
                {extraTransactions.map((transaction, idx) => {
                  const txBaseLoanFee = Math.max(8500, (transaction.loan_amount || 0) * 0.01);
                  const txExtraFamiliesSum = (transaction.extra_families || []).reduce((fSum, family) => fSum + (family.family_role || 0), 0);
                  const txTotal = txBaseLoanFee + (transaction.transaction_type || 0) + (transaction.difficulty_level || 0) + (transaction.credit_report || 0) + txExtraFamiliesSum;
                  return (
                    <div key={idx} className="flex justify-between">
                      <span>• עסקה נוספת {idx + 1}:</span>
                      <span className="font-medium">{formatCurrency(txTotal)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">מע"מ (18%):</span>
              <span className="font-semibold">{formatCurrency(calculatedVat)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>סה"כ:</span>
              <span className="text-green-600">{formatCurrency(calculatedTotal)}</span>
            </div>
            <Button
              onClick={() => updatePaymentsMutation.mutate({ closing_price: calculatedTotal })}
              className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              עדכן מחיר סגירה
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">מחיר סגירה</h3>
          {renderPriceRow('מחיר סגירה', 'closing_price', closingPrice)}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">זמני תשלום</h3>
          {renderPriceRow('זמני תשלום', 'payment_times', paymentTimes)}
          {Array.from({ length: paymentTimesCount - 1 }).map((_, index) => {
            const fieldName = `payment_times_${index + 2}`;
            return renderPriceRow(
              `זמן תשלום ${index === 0 ? 'שני' : index === 1 ? 'שלישי' : index === 2 ? 'רביעי' : index === 3 ? 'חמישי' : `${index + 2}`}`, 
              fieldName, 
              caseData.custom_data?.[fieldName] || 0,
              () => setPaymentTimesCount(prev => Math.max(2, prev - 1))
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
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">מצב תשלומים</h3>
          {renderPriceRow('תשלומים שהתקבלו', 'payments_received', paymentsReceived)}
          <div className="pt-3 mt-3">
            {renderPriceRow('יתרת חוב', null, debtBalance)}
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