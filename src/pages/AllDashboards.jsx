import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, UserCheck, Trello, Package,
  Database, Search, Bot, Bell, Calendar, MessageSquare, LayoutDashboard
} from 'lucide-react';

const dashboards = [
  { name: 'לקוחות פעילים', icon: UserCheck, page: 'Dashboard', gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { name: 'שיווק', icon: TrendingUp, page: 'Marketing', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { name: 'מכירות', icon: ShoppingCart, page: 'Sales', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { name: 'בורדים', icon: Trello, page: 'Boards', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { name: 'מוצרים', icon: Package, page: 'Products', gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  { name: 'ERP', icon: Database, page: 'ERP', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { name: 'חיפוש', icon: Search, page: 'SearchPage', gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { name: 'בוט AI', icon: Bot, page: 'AIBot', gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  { name: 'התראות', icon: Bell, page: 'Notifications', gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { name: 'יומן', icon: Calendar, page: 'CalendarPage', gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { name: 'תקשורת', icon: MessageSquare, page: 'Communication', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'ניהול כללי', icon: LayoutDashboard, page: 'Management', gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
];

export default function AllDashboards() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">כל הדשבורדים</h1>
          <p className="text-gray-500">גישה מהירה לכל הדשבורדים במערכת</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboards.map((dashboard, index) => {
            const Icon = dashboard.icon;
            return (
              <motion.div
                key={dashboard.page}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={createPageUrl(dashboard.page)}>
                  <div className={`${dashboard.bg} ${dashboard.border} border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer group hover:border-opacity-100`}>
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className={`w-16 h-16 bg-gradient-to-br ${dashboard.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{dashboard.name}</h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}