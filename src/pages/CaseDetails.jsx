import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Loader2, User, Phone, FileText, MessageSquare, Database,
  Workflow, Activity, Users, TrendingUp, LayoutDashboard,
  FolderOpen, MessageCircle, Contact, Calculator, CreditCard,
  Shield, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const tabs = [
  { id: 'personal', label: 'פרטים אישיים ופרטי התקשרות', icon: User, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'contact', label: 'צור קשר', icon: Phone, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50', border: 'border-green-200' },
  { id: 'summary', label: 'תקציר התיק', icon: FileText, gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'notes', label: 'הערות מיוחדות', icon: MessageSquare, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'data', label: 'נתונים', icon: Database, gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { id: 'workflow', label: 'תהליך עבודה', icon: Workflow, gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'status', label: 'סטטוס', icon: Activity, gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  { id: 'profiles', label: 'פרופילים', icon: Users, gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { id: 'metrics', label: 'מדדים', icon: TrendingUp, gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'dashboards', label: 'דשבורדים', icon: LayoutDashboard, gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { id: 'documents', label: 'מסמכים', icon: FolderOpen, gradient: 'from-sky-500 to-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
  { id: 'tracking', label: 'תיעוד התקשרות', icon: MessageCircle, gradient: 'from-lime-500 to-lime-600', bg: 'bg-lime-50', border: 'border-lime-200' },
  { id: 'contacts', label: 'אנשי קשר', icon: Contact, gradient: 'from-fuchsia-500 to-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
  { id: 'calculator', label: 'מחשבון', icon: Calculator, gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  { id: 'payments', label: 'תשלומים', icon: CreditCard, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'insurance', label: 'ביטוחים', icon: Shield, gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'products', label: 'מוצרי מעטפת', icon: Package, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200' },
];

export default function CaseDetails() {
  const [activeTab, setActiveTab] = useState('personal');
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline mt-2 inline-block">
            חזרה לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300
                  ${isActive 
                    ? `${tab.bg} ${tab.border} shadow-lg` 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    bg-gradient-to-br ${tab.gradient} shadow-md
                    ${isActive ? 'scale-110' : ''}
                    transition-transform duration-300
                  `}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`
                    text-xs font-medium text-center leading-tight
                    ${isActive ? 'text-gray-900' : 'text-gray-600'}
                  `}>
                    {tab.label}
                  </span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${tab.gradient} opacity-10`}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`
            bg-white rounded-2xl border-2 ${activeTabData.border} p-8 shadow-lg
            ${activeTabData.bg} bg-opacity-30
          `}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`
              w-14 h-14 rounded-xl flex items-center justify-center
              bg-gradient-to-br ${activeTabData.gradient} shadow-lg
            `}>
              {React.createElement(activeTabData.icon, { className: "w-7 h-7 text-white" })}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{activeTabData.label}</h2>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-gray-500 text-center py-8">
              תוכן הכרטיסייה "{activeTabData.label}" יתווסף בהמשך
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}