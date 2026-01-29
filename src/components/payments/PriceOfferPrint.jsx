import React from 'react';
import { X } from 'lucide-react';

export default function PriceOfferPrint({ caseData, onClose }) {
  const custom_data = caseData?.custom_data || {};
  
  const transactionType = custom_data.transaction_type || 0;
  const loanAmount = custom_data.loan_amount || 0;
  const difficultyLevel = custom_data.difficulty_level || 0;
  const creditReport = custom_data.credit_report || 0;
  
  const calculateBasePrice = () => {
    const baseLoanFee = Math.max(8500, loanAmount * 0.01);
    const extraFamiliesSum = (custom_data.extra_families || []).reduce((sum, family) => sum + (family.family_role || 0), 0);
    const extraTransactionsSum = (custom_data.extra_transactions || []).reduce((sum, transaction) => {
      const txBaseLoanFee = Math.max(8500, (transaction.loan_amount || 0) * 0.01);
      const txExtraFamiliesSum = (transaction.extra_families || []).reduce((fSum, family) => fSum + (family.family_role || 0), 0);
      return sum + txBaseLoanFee + (transaction.transaction_type || 0) + (transaction.difficulty_level || 0) + (transaction.credit_report || 0) + txExtraFamiliesSum;
    }, 0);
    return baseLoanFee + transactionType + difficultyLevel + creditReport + extraFamiliesSum + extraTransactionsSum;
  };

  const calculatedBasePrice = calculateBasePrice();
  const discount = custom_data.discount || 0;
  const priceAfterDiscount = calculatedBasePrice - discount;
  const vat = priceAfterDiscount * 0.18;
  const total = priceAfterDiscount + vat;
  const closingPrice = custom_data.closing_price || priceAfterDiscount;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:bg-white print:p-0 print:fixed print:inset-0">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:rounded-none">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b print:border-b print:sticky print:top-0 flex items-center justify-between p-4">
          <h2 className="text-2xl font-bold text-gray-900">הצעת מחיר</h2>
          <button
            onClick={onClose}
            className="print:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 text-gray-900">
          {/* Case Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b-2 border-blue-600 pb-2">פרטי התיק</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">שם הלקוח</p>
                <p className="text-lg font-semibold">{caseData.client_name} {caseData.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">מספר חשבון</p>
                <p className="text-lg font-semibold">{caseData.account_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">טלפון</p>
                <p className="text-lg font-semibold">{caseData.client_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">אימייל</p>
                <p className="text-lg font-semibold">{caseData.client_email}</p>
              </div>
            </div>
          </div>

          {/* Calculation Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b-2 border-blue-600 pb-2">פירוט החישוב</h3>
            <table className="w-full">
              <tbody className="space-y-2">
                <tr className="border-b">
                  <td className="py-2 text-sm">עמלת סכום ההלוואה</td>
                  <td className="py-2 text-right font-semibold">{formatCurrency(Math.max(8500, loanAmount * 0.01))}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-sm">סוג עסקה</td>
                  <td className="py-2 text-right font-semibold">{formatCurrency(transactionType)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-sm">דרגת קושי</td>
                  <td className="py-2 text-right font-semibold">{formatCurrency(difficultyLevel)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-sm">דוח אשראי</td>
                  <td className="py-2 text-right font-semibold">{formatCurrency(creditReport)}</td>
                </tr>
                {(custom_data.extra_families || []).map((family, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 text-sm">תא משפחתי {idx + 1}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(family.family_role || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-3">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">מחיר לפני מע"מ:</span>
              <span className="font-bold">{formatCurrency(calculatedBasePrice)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">הנחה:</span>
              <span className="font-bold text-red-600">-{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between items-center text-lg border-t-2 pt-3">
              <span className="font-semibold">לאחר הנחה:</span>
              <span className="font-bold">{formatCurrency(priceAfterDiscount)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">מע"מ 18%:</span>
              <span className="font-bold">{formatCurrency(vat)}</span>
            </div>
            <div className="flex justify-between items-center text-2xl pt-3 border-t-2">
              <span className="font-bold">סה"כ להצעה:</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Schedule */}
          {custom_data.payment_times !== undefined && (
            <div>
              <h3 className="text-lg font-semibold mb-3 border-b-2 border-blue-600 pb-2">לוח תשלומים</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2 text-right">תשלום</th>
                    <th className="border p-2 text-center">סכום</th>
                    <th className="border p-2 text-center">תאריך</th>
                    <th className="border p-2 text-center">אמצעי תשלום</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="border p-2">תשלום ראשון</td>
                    <td className="border p-2 text-center">{formatCurrency(custom_data.payment_times)}</td>
                    <td className="border p-2 text-center">{custom_data.payment_times_date || '-'}</td>
                    <td className="border p-2 text-center">{custom_data.payment_times_payment_method || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="pt-8 text-center text-sm text-gray-600">
            <p>הצעה זו בתוקף ל-7 ימים מתאריך הנפקתה</p>
            <p className="mt-2">תאריך: {new Date().toLocaleDateString('he-IL')}</p>
          </div>
        </div>

        {/* Print Button */}
        <div className="print:hidden sticky bottom-0 bg-white border-t p-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700"
          >
            סגור
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            הדפס
          </button>
        </div>
      </div>
    </div>
  );
}