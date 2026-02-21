import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink, ChevronDown, ChevronUp, Eye, Share2 } from 'lucide-react';
import SharingPanel from '@/components/case/SharingPanel';
import ContactButtons from '@/components/case/ContactButtons';
import AddContactButton from '@/components/case/AddContactButton';
import ContactsSummaryView from '@/components/case/ContactsSummaryView';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { tabs, pageMapping } from '@/components/CaseTabs';
import { SecureEntities } from '@/components/secureEntities';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Import all case page components
import CasePersonal from './CasePersonal';
import CaseContact from './CaseContact';
import CaseSummary from './CaseSummary';
import CaseNotes from './CaseNotes';
import CaseData from './CaseData';
import CaseWorkflow from './CaseWorkflow';
import CaseCalendar from './CaseCalendar';
import CaseStatus from './CaseStatus';
import CaseProfiles from './CaseProfiles';
import CaseMetrics from './CaseMetrics';
import CaseDashboards from './CaseDashboards';
import CaseDocuments from './CaseDocuments';
import CaseTracking from './CaseTracking';

import CaseCalculator from './CaseCalculator';
import CasePayments from './CasePayments';
import CaseInsurance from './CaseInsurance';
import CaseProducts from './CaseProducts';
import CaseProperty from './CaseProperty';
import CaseSubmissions from './CaseSubmissions';
import CaseRequests from './CaseRequests';

const pageComponents = {
  personal: CasePersonal,
  contact: CaseContact,
  summary: CaseSummary,
  notes: CaseNotes,
  data: CaseData,
  workflow: CaseWorkflow,
  calendar: CaseCalendar,
  status: CaseStatus,
  profiles: CaseProfiles,
  metrics: CaseMetrics,
  dashboards: CaseDashboards,
  documents: CaseDocuments,
  tracking: CaseTracking,

  calculator: CaseCalculator,
  payments: CasePayments,
  insurance: CaseInsurance,
  products: CaseProducts,
  property: CaseProperty,
  submissions: CaseSubmissions,
  requests: CaseRequests
};

export default function CaseDetails() {
  const [activeTab, setActiveTab] = useState('personal');
  const [activeContactId, setActiveContactId] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showSharingPanel, setShowSharingPanel] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get('id');
  const isNew = urlParams.get('new') === 'true';
  const accountNumber = urlParams.get('accountNumber');
  const [showCongrats, setShowCongrats] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000
  });

  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => SecureEntities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId,
    retry: 1,
    staleTime: 30000
  });

  const { data: linkedContacts = [] } = useQuery({
    queryKey: ['linked-contacts', caseId],
    queryFn: async () => {
      const allPersons = await SecureEntities.Person.list();
      const seen = new Set();
      return allPersons.filter(person => {
        if (!person.linked_accounts || person.linked_accounts.length === 0) return false;
        const isLinked = person.linked_accounts.some(acc =>
          typeof acc === 'string' ? acc === caseId : acc.case_id === caseId
        );
        if (isLinked && !seen.has(person.id)) {
          seen.add(person.id);
          return true;
        }
        return false;
      });
    },
    enabled: !!caseId,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (isNew && accountNumber && caseData) {
      setShowCongrats(true);
      
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3b82f6', '#8b5cf6', '#ec4899']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#8b5cf6', '#ec4899']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Auto close after 1.75 seconds
      setTimeout(() => {
        setShowCongrats(false);
      }, 1750);

      // Remove new parameter from URL
      const newUrl = window.location.pathname + `?id=${caseId}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [isNew, accountNumber, caseData, caseId]);

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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">תיק לא נמצא</h2>
          <Link to={createPageUrl('Dashboard')}>
            <Button>חזרה לדשבורד</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeTabData = activeTab ? tabs.find(t => t.id === activeTab) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
        <DialogContent className="sm:max-w-lg border-4 border-transparent bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 shadow-2xl [&>button]:hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-lg"></div>
          <div className="relative">
            <DialogHeader>
              <DialogTitle className="text-center text-4xl font-black mb-4">
                <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
                  🎉 מזל טוב 🎉
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-8 space-y-4">
              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-6 shadow-xl transform hover:scale-105 transition-transform">
                <p className="text-5xl font-black text-white drop-shadow-lg">
                  חשבון מס׳ {accountNumber || caseData?.account_number}
                </p>
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                נפתח בהצלחה
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mx-auto p-2 md:p-3">
        {/* Tabs Grid - Column Layout */}
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-6">
            {/* מידע אישי */}
            <div className="border-2 border-blue-400 rounded-xl p-4 bg-blue-200 shadow-sm">
              <button className="w-full bg-white text-gray-900 font-semibold text-sm py-2 px-4 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors mb-3">
                מידע
              </button>
              <div className="grid grid-cols-2 gap-3">
                {tabs.filter(tab => ['personal', 'contact', 'summary', 'tracking', 'data', 'requests', 'profiles', 'metrics'].includes(tab.id)).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => {
                        if (isActive) {
                          window.location.href = createPageUrl(pageMapping[tab.id]) + `?id=${caseId}`;
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        w-full relative p-4 rounded-xl border-2 transition-all duration-300
                        ${tab.bg}
                        ${isActive 
                          ? `${tab.border} shadow-lg` 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
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
                        {isActive && (
                          <ChevronUp className="w-4 h-4 text-gray-600 absolute bottom-1" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ניהול וארגון */}
            <div className="border-2 border-purple-400 rounded-xl p-4 bg-purple-200 shadow-sm">
              <button className="w-full bg-white text-gray-900 font-semibold text-sm py-2 px-4 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors mb-3">
                ניהול
              </button>
              <div className="grid grid-cols-2 gap-3">
                {tabs.filter(tab => ['notes', 'status', 'workflow', 'calendar', 'submissions'].includes(tab.id)).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => {
                        if (isActive) {
                          window.location.href = createPageUrl(pageMapping[tab.id]) + `?id=${caseId}`;
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all duration-300
                        ${tab.bg}
                        ${isActive 
                          ? `${tab.border} shadow-lg` 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
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
                        {isActive && (
                          <ChevronUp className="w-4 h-4 text-gray-600 absolute bottom-1" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ניתוחים ומוצרים */}
            <div className="border-2 border-orange-400 rounded-xl p-4 bg-orange-200 shadow-sm">
              <button className="w-full bg-white text-gray-900 font-semibold text-sm py-2 px-4 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors mb-3">
                ניתוחים ומוצרים
              </button>
              <div className="grid grid-cols-2 gap-3">
                {tabs.filter(tab => ['payments', 'insurance', 'products', 'dashboards'].includes(tab.id)).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => {
                        if (isActive) {
                          window.location.href = createPageUrl(pageMapping[tab.id]) + `?id=${caseId}`;
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all duration-300
                        ${tab.bg}
                        ${isActive 
                          ? `${tab.border} shadow-lg` 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
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
                        {isActive && (
                          <ChevronUp className="w-4 h-4 text-gray-600 absolute bottom-1" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Content Area */}
          {activeTab && activeTabData && (
            <div
              className={`
                bg-white rounded-2xl border-2 ${activeTabData.border} p-8 shadow-lg mb-6
                ${activeTabData.bg} bg-opacity-30
              `}
            >
              <div className={`flex items-center gap-3 mb-6 px-8 py-4 rounded-xl border-2 ${activeTabData.border} ${activeTabData.bg} hover:shadow-lg transition-all flex-wrap`}>
                <div 
                  onClick={() => window.location.href = createPageUrl(pageMapping[activeTab]) + `?id=${caseId}`}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center
                    bg-gradient-to-br ${activeTabData.gradient} shadow-lg
                  `}>
                    {React.createElement(activeTabData.icon, { className: "w-7 h-7 text-white" })}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {activeTabData.label}
                    {activeTab === 'personal' && <span className="text-gray-600 text-lg font-normal"> ({linkedContacts.length})</span>}
                  </h2>
                </div>
                {activeTab === 'personal' && (
                  <>
                    {linkedContacts.length > 0 && (
                      <>
                        <span className="text-gray-400">|</span>
                        <ContactButtons
                          linkedContacts={linkedContacts}
                          caseId={caseId}
                          activeContactId={activeContactId}
                          onContactClick={(contactId) => {
                           const scrollContainer = document.querySelector('main');
                           const currentScroll = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
                           setActiveContactId(contactId);
                           setShowSummary(false);
                           if (window.changeCaseContact) {
                             window.changeCaseContact(contactId);
                           }
                           requestAnimationFrame(() => {
                             if (scrollContainer) {
                               scrollContainer.scrollTop = currentScroll;
                             } else {
                               window.scrollTo({ top: currentScroll, behavior: 'instant' });
                             }
                           });
                          }}
                        />
                      </>
                    )}
                    <button
                      onClick={() => {
                        const scrollContainer = document.querySelector('main');
                        const currentScroll = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
                        setShowSummary(true);
                        setActiveContactId(null);
                        if (window.showCaseSummary) {
                          window.showCaseSummary();
                        }
                        requestAnimationFrame(() => {
                          if (scrollContainer) {
                            scrollContainer.scrollTop = currentScroll;
                          } else {
                            window.scrollTo({ top: currentScroll, behavior: 'instant' });
                          }
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 ${showSummary ? 'ring-4 ring-white outline outline-4 outline-blue-500 shadow-lg' : ''}`}
                    >
                      סיכום
                    </button>
                    <AddContactButton caseId={caseId} linkedContacts={linkedContacts} />
                  </>
                )}
              </div>

              <div style={{ minHeight: '60vh' }}>
                {pageComponents[activeTab] && React.createElement(pageComponents[activeTab])}
              </div>
            </div>
          )}

      </div>
    </div>
  );
}