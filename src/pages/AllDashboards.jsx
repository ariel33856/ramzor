import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Briefcase, FileCheck, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';

export default function AllDashboards() {
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.MortgageCase.list('-created_date')
  });

  const stats = {
    total: cases.length,
    pending: cases.filter(c => ['documents_pending', 'documents_review'].includes(c.status)).length,
    critical: cases.filter(c => c.urgency === 'critical').length,
    approved: cases.filter(c => c.status === 'approved').length,
    inProgress: cases.filter(c => ['new', 'financial_analysis', 'bank_submission'].includes(c.status)).length
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">דשבורדים לקוחות פעילים</h1>
        </motion.div>

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