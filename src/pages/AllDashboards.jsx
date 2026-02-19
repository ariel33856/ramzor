import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Briefcase, FileCheck, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import { SecureEntities } from '../components/secureEntities';

export default function AllDashboards() {
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => SecureEntities.MortgageCase.list('-created_date')
  });

  const stats = {
    total: cases.length,
    pending: cases.filter(c => ['documents_pending', 'documents_review'].includes(c.status)).length,
    critical: cases.filter(c => c.urgency === 'critical').length,
    approved: cases.filter(c => c.status === 'approved').length,
    inProgress: cases.filter(c => ['new', 'financial_analysis', 'bank_submission'].includes(c.status)).length
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-2 md:p-3">
      <div className="mx-auto">


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="סה״כ תיקים"
            value={stats.total}
            icon={Briefcase}
            color="blue"
          />
          <StatsCard
            title="ממתינים למסמכים"
            value={stats.pending}
            icon={FileCheck}
            color="orange"
          />
          <StatsCard
            title="דורשים תשומת לב"
            value={stats.critical}
            icon={AlertTriangle}
            color="red"
          />
          <StatsCard
            title="אושרו החודש"
            value={stats.approved}
            icon={TrendingUp}
            color="green"
            trend="+12%"
            trendUp
          />
          <StatsCard
            title="בתהליך טיפול"
            value={stats.inProgress}
            icon={Clock}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}