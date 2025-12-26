import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, AlertTriangle, CheckCircle, XCircle, Loader2, CreditCard, TrendingDown, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function TransactionScanner({ bankStatement, caseId, onScanComplete }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);

  const scanTransactions = async () => {
    if (!bankStatement?.file_url) return;
    
    setScanning(true);
    
    const scanResult = await base44.integrations.Core.InvokeLLM({
      prompt: `נתח את דף החשבון הבנקאי הבא וזהה בעיות פוטנציאליות:

1. צ'קים חוזרים (חזרו מחוסר כיסוי)
2. חריגות ממסגרת האשראי
3. הלוואות חוזרות (תשלומים קבועים שנראים כהלוואות)
4. משיכות יתר תכופות
5. הפקדות חשודות או לא סדירות

חשוב: זהה דפוסים חריגים בהתנהלות הפיננסית.`,
      file_urls: [bankStatement.file_url],
      response_json_schema: {
        type: "object",
        properties: {
          returned_checks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                amount: { type: "number" },
                reason: { type: "string" }
              }
            }
          },
          credit_limit_breaches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                amount: { type: "number" },
                limit: { type: "number" }
              }
            }
          },
          recurring_loans: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                monthly_amount: { type: "number" },
                identified_as: { type: "string" }
              }
            }
          },
          risk_score: { type: "number" },
          summary: { type: "string" },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    setResults(scanResult);
    
    // Log the scan
    await base44.entities.AuditLog.create({
      case_id: caseId,
      action_type: 'ai_analysis',
      actor: 'AI',
      description: 'סריקת תנועות בנקאיות הושלמה',
      ai_reasoning: scanResult.summary,
      severity: scanResult.risk_score > 50 ? 'warning' : 'info'
    });

    // Add red flags if found
    const redFlags = [];
    if (scanResult.returned_checks?.length > 0) {
      redFlags.push(`${scanResult.returned_checks.length} צ'קים חוזרים`);
    }
    if (scanResult.credit_limit_breaches?.length > 0) {
      redFlags.push(`${scanResult.credit_limit_breaches.length} חריגות ממסגרת`);
    }
    if (scanResult.recurring_loans?.length > 0) {
      redFlags.push(`${scanResult.recurring_loans.length} הלוואות זוהו`);
    }

    setScanning(false);
    onScanComplete?.(scanResult, redFlags);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">סורק תנועות בנקאיות</h3>
          <p className="text-sm text-gray-500">ניתוח AI של דף החשבון לזיהוי בעיות</p>
        </div>
        <Button
          onClick={scanTransactions}
          disabled={scanning || !bankStatement}
          className="bg-gradient-to-r from-purple-600 to-blue-600"
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              סורק...
            </>
          ) : (
            <>
              <Scan className="w-4 h-4 ml-2" />
              התחל סריקה
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Risk Score */}
            <div className={`p-4 rounded-xl ${results.risk_score > 50 ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">ציון סיכון</span>
                <span className={`text-2xl font-bold ${results.risk_score > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {results.risk_score}/100
                </span>
              </div>
              <p className="text-sm mt-2 text-gray-600">{results.summary}</p>
            </div>

            {/* Issues Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Returned Checks */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium">צ'קים חוזרים</span>
                </div>
                {results.returned_checks?.length > 0 ? (
                  <div className="space-y-2">
                    {results.returned_checks.map((check, i) => (
                      <div key={i} className="text-sm p-2 bg-white rounded-lg">
                        <div className="font-medium">₪{check.amount?.toLocaleString()}</div>
                        <div className="text-gray-500">{check.date}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    לא נמצאו
                  </div>
                )}
              </div>

              {/* Credit Limit Breaches */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">חריגות ממסגרת</span>
                </div>
                {results.credit_limit_breaches?.length > 0 ? (
                  <div className="space-y-2">
                    {results.credit_limit_breaches.map((breach, i) => (
                      <div key={i} className="text-sm p-2 bg-white rounded-lg">
                        <div className="font-medium">₪{breach.amount?.toLocaleString()}</div>
                        <div className="text-gray-500">מסגרת: ₪{breach.limit?.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    לא נמצאו
                  </div>
                )}
              </div>

              {/* Recurring Loans */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Repeat className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">הלוואות זוהו</span>
                </div>
                {results.recurring_loans?.length > 0 ? (
                  <div className="space-y-2">
                    {results.recurring_loans.map((loan, i) => (
                      <div key={i} className="text-sm p-2 bg-white rounded-lg">
                        <div className="font-medium">₪{loan.monthly_amount?.toLocaleString()}/חודש</div>
                        <div className="text-gray-500">{loan.description}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                    לא נמצאו
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">המלצות</h4>
                <ul className="space-y-1">
                  {results.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                      <span>•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}