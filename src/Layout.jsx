import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users, Settings, LogOut,
  Menu, X, Bell, Search, ChevronDown, Home, Building2,
  TrendingUp, ShoppingCart, UserCheck, Trello, Package,
  Database, Bot, Calendar, MessageSquare
} from 'lucide-react';
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

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 z-50 h-full w-64 bg-white border-l border-gray-100 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Mortgage AI</h1>
                <p className="text-xs text-gray-400">מערכת חכמה</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          {user && (
            <div className="p-4 border-t border-gray-100">
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-medium text-gray-900 truncate">{user.full_name || 'משתמש'}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 ml-2" />
                    הגדרות
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 ml-2" />
                    התנתק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pr-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="hidden md:block">
                <h2 className="text-lg font-semibold text-gray-900">
                  {navigation.find(n => n.page === currentPageName)?.name || currentPageName}
                </h2>
              </div>
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
                <DropdownMenuContent align="start" className="w-auto min-w-[200px] p-2">
                  <Link to={createPageUrl('Marketing')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">שיווק</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Sales')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">מכירות</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Dashboard')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">לקוחות פעילים</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Boards')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">גישה לבורדים</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <Trello className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Products')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-pink-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">מוצרי מעטפת</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('ERP')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-indigo-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">מערכת ERP</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Database className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('SearchPage')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-cyan-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">חיפוש</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                          <Search className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('AIBot')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-violet-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">בוט AI</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Notifications')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">התראות ומשימות</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('CalendarPage')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-teal-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">יומן</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to={createPageUrl('Communication')}>
                    <DropdownMenuItem className="p-3 cursor-pointer hover:bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <span className="text-base font-medium">תקשורת</span>
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-white" />
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