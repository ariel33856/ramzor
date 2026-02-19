import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { SecureEntities } from '@/components/secureEntities';
import { Loader2, Star, TrendingUp, DollarSign, Clock, Target, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function RatingStars({ rating, max = 5 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function ScoreBar({ label, score, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function CaseDashboards() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['case-transactions', caseId],
    queryFn: () => SecureEntities.Transaction.filter({ property_id: caseId }),
    enabled: !!caseId
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['case-payments-dash', caseId],
    queryFn: async () => {
      const allInsurance = await SecureEntities.Insurance.list();
      return allInsurance.filter(i => i.insured_name === caseData?.client_name);
    },
    enabled: !!caseData?.client_name
  });

  const scores = useMemo(() => {
    if (!caseData) return null;

    const commission = caseData.commission || transactions.reduce((sum, t) => sum + (t.commission || 0), 0);
    const loanAmount = caseData.loan_amount || 0;
    const completedTransactions = transactions.filter(t => t.status === 'completed').length;
    const totalTransactions = transactions.length;

    // שקלול רווחיות - מבוסס על עמלות ביחס להלוואה
    const commissionRate = loanAmount > 0 ? (commission / loanAmount) * 100 : 0;
    const profitScore = Math.min(100, Math.round(commissionRate * 10) || (commission > 0 ? 60 : 20));

    // שקלול יעילות - מבוסס על סטטוס ותהליך
    const statusScores = { 'completed': 100, 'approved': 85, 'bank_submission': 70, 'financial_analysis': 55, 'documents_review': 40, 'documents_pending': 25, 'new': 10 };
    const efficiencyScore = statusScores[caseData.status] || 30;

    // שקלול עסקאות
    const transactionScore = totalTransactions > 0
      ? Math.round((completedTransactions / totalTransactions) * 100)
      : 0;

    // שקלול נפח עסקה
    const volumeScore = loanAmount >= 2000000 ? 95 : loanAmount >= 1000000 ? 80 : loanAmount >= 500000 ? 60 : loanAmount > 0 ? 40 : 10;

    // דירוג כולל
    const overall = Math.round((profitScore * 0.35) + (efficiencyScore * 0.25) + (transactionScore * 0.2) + (volumeScore * 0.2));
    const stars = overall >= 90 ? 5 : overall >= 70 ? 4 : overall >= 50 ? 3 : overall >= 30 ? 2 : 1;
    const label = overall >= 90 ? 'לקוח פלטינום' : overall >= 70 ? 'לקוח זהב' : overall >= 50 ? 'לקוח כסף' : overall >= 30 ? 'לקוח ארד' : 'לקוח חדש';
    const labelColor = overall >= 90 ? 'text-purple-600' : overall >= 70 ? 'text-yellow-600' : overall >= 50 ? 'text-gray-500' : overall >= 30 ? 'text-orange-600' : 'text-blue-500';
    const labelBg = overall >= 90 ? 'bg-purple-50 border-purple-200' : overall >= 70 ? 'bg-yellow-50 border-yellow-200' : overall >= 50 ? 'bg-gray-50 border-gray-200' : overall >= 30 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';

    return { profitScore, efficiencyScore, transactionScore, volumeScore, overall, stars, label, labelColor, labelBg, commission, loanAmount, completedTransactions, totalTransactions };
  }, [caseData, transactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">חזרה לדשבורד</Link>
        </div>
      </div>
    );
  }

  const timeMetrics = useMemo(() => {
    if (!caseData) return null;
    const openDate = new Date(caseData.created_date);
    const now = new Date();
    const totalDays = Math.floor((now - openDate) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = Math.floor(totalDays / 30);

    // זמן עד הגשה לבנק
    const submissionStatuses = ['bank_submission', 'approved', 'completed'];
    const isSubmitted = submissionStatuses.includes(caseData.status);
    
    // זמן עד אישור
    const approvalStatuses = ['approved', 'completed'];
    const isApproved = approvalStatuses.includes(caseData.status);
    const isCompleted = caseData.status === 'completed';

    // ציון מהירות - ככל שסיימו מהר יותר הציון גבוה יותר
    let speedScore;
    if (isCompleted) {
      speedScore = totalDays <= 14 ? 100 : totalDays <= 30 ? 85 : totalDays <= 60 ? 65 : totalDays <= 90 ? 45 : 25;
    } else if (isApproved) {
      speedScore = totalDays <= 21 ? 90 : totalDays <= 45 ? 70 : totalDays <= 75 ? 50 : 30;
    } else if (isSubmitted) {
      speedScore = totalDays <= 14 ? 85 : totalDays <= 30 ? 65 : totalDays <= 60 ? 40 : 20;
    } else {
      speedScore = totalDays <= 7 ? 75 : totalDays <= 21 ? 55 : totalDays <= 45 ? 35 : 15;
    }

    return { openDate, totalDays, totalWeeks, totalMonths, speedScore, isSubmitted, isApproved, isCompleted };
  }, [caseData]);

  return (
    <div className="p-2" dir="rtl">
      {scores && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* דירוג כולל */}
          <div className={`rounded-2xl border-2 ${scores.labelBg} p-6 flex flex-col items-center justify-center gap-3`}>
            <Award className={`w-12 h-12 ${scores.labelColor}`} />
            <h3 className={`text-2xl font-black ${scores.labelColor}`}>{scores.label}</h3>
            <RatingStars rating={scores.stars} />
            <div className="mt-2 text-center">
              <span className="text-5xl font-black text-gray-900">{scores.overall}</span>
              <span className="text-lg text-gray-500 mr-1">/ 100</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">ציון רווחיות משוקלל</p>
          </div>

          {/* שקלולים */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              שקלולים
            </h3>
            <ScoreBar label="רווחיות (עמלות)" score={scores.profitScore} color="#3b82f6" />
            <ScoreBar label="יעילות תהליך" score={scores.efficiencyScore} color="#10b981" />
            <ScoreBar label="הצלחת עסקאות" score={scores.transactionScore} color="#8b5cf6" />
            <ScoreBar label="נפח עסקה" score={scores.volumeScore} color="#f59e0b" />
          </div>

          {/* נתונים מספריים */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              נתונים מספריים
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">סה״כ עמלות</p>
                <p className="text-lg font-bold text-gray-900">₪{(scores.commission || 0).toLocaleString()}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">סכום הלוואה</p>
                <p className="text-lg font-bold text-gray-900">₪{(scores.loanAmount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">עסקאות שהושלמו</p>
                <p className="text-lg font-bold text-gray-900">{scores.completedTransactions} / {scores.totalTransactions}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">דירוג כוכבים</p>
                <p className="text-lg font-bold text-gray-900">{scores.stars} / 5</p>
              </div>
            </div>
          </div>
        </div>

        {/* מדדי זמנים */}
        {timeMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-indigo-600" />
                ציר זמן
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">תאריך פתיחת תיק</span>
                  <span className="text-sm font-bold text-indigo-700">{timeMetrics.openDate.toLocaleDateString('he-IL')}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">ימים מפתיחה</span>
                  <span className="text-sm font-bold text-gray-900">{timeMetrics.totalDays} ימים</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">שבועות מפתיחה</span>
                  <span className="text-sm font-bold text-gray-900">{timeMetrics.totalWeeks} שבועות</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">חודשים מפתיחה</span>
                  <span className="text-sm font-bold text-gray-900">{timeMetrics.totalMonths} חודשים</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-orange-600" />
                שלבי התקדמות
              </h3>
              <div className="space-y-3">
                <div className={`flex justify-between items-center p-3 rounded-xl ${timeMetrics.isSubmitted ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <span className="text-sm font-medium text-gray-700">הוגש לבנק</span>
                  <span className={`text-sm font-bold ${timeMetrics.isSubmitted ? 'text-green-600' : 'text-gray-400'}`}>
                    {timeMetrics.isSubmitted ? '✓ הושלם' : 'ממתין'}
                  </span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-xl ${timeMetrics.isApproved ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <span className="text-sm font-medium text-gray-700">אושר בבנק</span>
                  <span className={`text-sm font-bold ${timeMetrics.isApproved ? 'text-green-600' : 'text-gray-400'}`}>
                    {timeMetrics.isApproved ? '✓ הושלם' : 'ממתין'}
                  </span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-xl ${timeMetrics.isCompleted ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <span className="text-sm font-medium text-gray-700">תיק הושלם</span>
                  <span className={`text-sm font-bold ${timeMetrics.isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    {timeMetrics.isCompleted ? '✓ הושלם' : 'ממתין'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                ציון מהירות טיפול
              </h3>
              <div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] gap-3">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={timeMetrics.speedScore >= 70 ? '#10b981' : timeMetrics.speedScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${timeMetrics.speedScore}, 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-gray-900">{timeMetrics.speedScore}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-600">
                  {timeMetrics.speedScore >= 70 ? 'טיפול מהיר' : timeMetrics.speedScore >= 40 ? 'טיפול סביר' : 'טיפול איטי'}
                </p>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}