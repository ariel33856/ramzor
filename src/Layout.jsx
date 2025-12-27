import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, FileText, Users, Settings, LogOut,
  Menu, X, Bell, Search, ChevronDown, Home, Building2,
  TrendingUp, ShoppingCart, UserCheck, Trello, Package,
  Database, Bot, Calendar, MessageSquare, Layers
} from 'lucide-react';
import { tabs, pageMapping } from '@/components/CaseTabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navigation = [
  { name: 'מרכז פיקוד', icon: LayoutDashboard, page: 'Dashboard' },
  { name: 'תיק חדש', icon: FileText, page: 'NewCase' },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get case ID from URL if on case-related pages
  const urlParams = new URLSearchParams(window.location.search);
  const casePages = ['CaseDetails', 'CasePersonal', 'CaseContact', 'CaseSummary', 'CaseNotes', 'CaseData', 
                     'CaseWorkflow', 'CaseStatus', 'CaseProfiles', 'CaseMetrics', 'CaseDashboards', 
                     'CaseDocuments', 'CaseTracking', 'CaseContacts', 'CaseCalculator', 'CasePayments', 
                     'CaseInsurance', 'CaseProducts', 'CaseAccount'];
  const caseId = casePages.includes(currentPageName) ? urlParams.get('id') : null;

  const { data: caseData } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => base44.entities.MortgageCase.filter({ id: caseId }).then(res => res[0]),
    enabled: !!caseId
  });

  const casePageTitles = {
    'CasePersonal': 'פרטים אישיים',
    'CaseContact': 'צור קשר',
    'CaseSummary': 'תקציר התיק',
    'CaseNotes': 'הערות מיוחדות',
    'CaseData': 'נתונים',
    'CaseWorkflow': 'תהליך עבודה',
    'CaseStatus': 'סטטוס',
    'CaseProfiles': 'פרופילים',
    'CaseMetrics': 'מדדים',
    'CaseDashboards': 'דשבורדים',
    'CaseDocuments': 'מסמכים',
    'CaseTracking': 'תיעוד התקשרות',
    'CaseContacts': 'אנשי קשר',
    'CaseCalculator': 'מחשבון',
    'CasePayments': 'תשלומים',
    'CaseInsurance': 'ביטוחים',
    'CaseProducts': 'מוצרי מעטפת',
    'CaseAccount': 'חשבון'
  };

  // Don't show layout for client portal
  if (currentPageName === 'ClientPortal') {
    return <>{children}</>;
  }

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50/50" dir="rtl">
      <style>{`
        :root {
          --primary: 220 90% 56%;
          --primary-foreground: 0 0% 100%;
        }
        
        * {
          font-family: 'Inter', 'Heebo', sans-serif;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Main Content */}
      <div>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              {(currentPageName === 'Dashboard' || currentPageName === 'Management' || currentPageName === 'Marketing' || currentPageName === 'Sales' || currentPageName === 'Products') && (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {currentPageName === 'Dashboard' && 'חשבונות'}
                    {currentPageName === 'Management' && 'לווים וערבים'}
                    {currentPageName === 'Marketing' && 'משכנתאות'}
                    {currentPageName === 'Sales' && 'עסקאות'}
                    {currentPageName === 'Products' && 'נכסים'}
                  </h1>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/25">
                        <Layers className="w-5 h-5 ml-2" />
                        מודולים
                        <ChevronDown className="w-4 h-4 mr-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[140px] p-2 space-y-2 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200">
                      <Link to={createPageUrl('Dashboard')}>
                        <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-green-50 border-2 border-green-200 hover:border-green-400 hover:bg-green-100 rounded-lg transition-all">
                          <div className="flex items-center gap-2 justify-end w-full">
                            <span className="text-sm font-medium">חשבונות</span>
                            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                              <UserCheck className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </DropdownMenuItem>
                      </Link>
                      
                      <Link to={createPageUrl('Management')}>
                        <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-purple-50 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100 rounded-lg transition-all">
                          <div className="flex items-center gap-2 justify-end w-full">
                            <span className="text-sm font-medium">לווים וערבים</span>
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <LayoutDashboard className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </DropdownMenuItem>
                      </Link>
                      
                      <Link to={createPageUrl('Marketing')}>
                        <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-blue-50 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 rounded-lg transition-all">
                          <div className="flex items-center gap-2 justify-end w-full">
                            <span className="text-sm font-medium">משכנתאות</span>
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </DropdownMenuItem>
                      </Link>
                      
                      <Link to={createPageUrl('Sales')}>
                        <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-purple-50 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100 rounded-lg transition-all">
                          <div className="flex items-center gap-2 justify-end w-full">
                            <span className="text-sm font-medium">עסקאות</span>
                            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <ShoppingCart className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </DropdownMenuItem>
                      </Link>
                      
                      <Link to={createPageUrl('Products')}>
                        <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-pink-50 border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-100 rounded-lg transition-all">
                          <div className="flex items-center gap-2 justify-end w-full">
                            <span className="text-sm font-medium">נכסים</span>
                            <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                              <Package className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </DropdownMenuItem>
                      </Link>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link to={createPageUrl('AllDashboards')}>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25">
                      <Layers className="w-5 h-5 ml-2" />
                      דשבורדים
                    </Button>
                  </Link>
                </>
              )}
              {currentPageName === 'AllDashboards' && (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">דשבורדים</h1>
                  <Link to={createPageUrl('Dashboard')}>
                    <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25">
                      <UserCheck className="w-5 h-5 ml-2" />
                      חשבונות
                    </Button>
                  </Link>
                </>
              )}
              {currentPageName === 'CaseDetails' && caseData && (
                <h1 className="text-2xl font-bold text-gray-900">{caseData.client_name}</h1>
              )}
              {casePageTitles[currentPageName] && caseData && (() => {
                const currentTab = tabs.find(tab => pageMapping[tab.id] === currentPageName);
                if (!currentTab) return null;
                const Icon = currentTab.icon;
                return (
                  <>
                    <Link to={createPageUrl('CaseDetails') + `?id=${caseId}`}>
                      <Button variant="outline" className="text-blue-600 hover:text-blue-700 border-blue-200">
                        {caseData.client_name}
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className={`flex items-center gap-2 ${currentTab.bg} border-2 ${currentTab.border} hover:shadow-lg`}>
                          <div className={`w-6 h-6 bg-gradient-to-br ${currentTab.gradient} rounded-lg flex items-center justify-center`}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{casePageTitles[currentPageName]}</span>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-auto min-w-[200px] p-2 max-h-[500px] overflow-y-auto">
                        {tabs.map((tab) => {
                          const TabIcon = tab.icon;
                          const pageName = pageMapping[tab.id];
                          return (
                            <Link key={tab.id} to={createPageUrl(pageName) + `?id=${caseId}`}>
                              <DropdownMenuItem className={`px-3 py-2 cursor-pointer ${tab.bg} border-2 ${tab.border} hover:${tab.border} hover:shadow-md rounded-lg transition-all mb-2`}>
                                <div className="flex items-center gap-3 justify-end w-full">
                                  <span className="text-sm font-medium">{tab.label}</span>
                                  <div className={`w-8 h-8 bg-gradient-to-br ${tab.gradient} rounded-lg flex items-center justify-center`}>
                                    <TabIcon className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            </Link>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                );
              })()}
              {currentPageName === 'CalendarPage' && (
                <h1 className="text-2xl font-bold text-gray-900">יומן</h1>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" title="חזרה למסך הראשי">
                  <Home className="w-5 h-5 text-gray-500" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    ניהול
                    <ChevronDown className="w-4 h-4 mr-2 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-auto min-w-[160px] p-2 space-y-4 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200">
                  {caseId && (
                    <Link to={createPageUrl('CaseDetails') + `?id=${caseId}`}>
                      <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-purple-300 hover:border-purple-500 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all">
                        <div className="flex items-center gap-2 justify-end w-full">
                          <span className="text-sm font-bold text-white">כרטיסיות</span>
                          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                            <LayoutDashboard className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  
                  <Link to={createPageUrl('Marketing')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-blue-50 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">שיווק</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Sales')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-purple-50 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">מכירות</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Dashboard')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-green-50 border-2 border-green-200 hover:border-green-400 hover:bg-green-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">חשבונות</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                          <UserCheck className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Boards')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-orange-50 border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">גישה לבורדים</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <Trello className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Products')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-pink-50 border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">מוצרי מעטפת</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('ERP')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">מערכת ERP</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Database className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('SearchPage')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-cyan-50 border-2 border-cyan-200 hover:border-cyan-400 hover:bg-cyan-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">חיפוש</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                          <Search className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('AIBot')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-violet-50 border-2 border-violet-200 hover:border-violet-400 hover:bg-violet-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">בוט AI</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Notifications')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-red-50 border-2 border-red-200 hover:border-red-400 hover:bg-red-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">התראות ומשימות</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                          <Bell className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('CalendarPage')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-teal-50 border-2 border-teal-200 hover:border-teal-400 hover:bg-teal-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">יומן</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Communication')}>
                    <DropdownMenuItem className="px-1.5 py-1 cursor-pointer bg-amber-50 border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-100 rounded-lg transition-all">
                      <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-sm font-medium">תקשורת</span>
                        <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}