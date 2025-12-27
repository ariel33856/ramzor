import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, UserCheck, Trello, Package,
  Database, Search, Bot, Bell, Calendar, MessageSquare
} from 'lucide-react';

const managementItems = [
  { name: 'שיווק', icon: TrendingUp, page: 'Marketing', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:border-blue-400 hover:bg-blue-100' },
  { name: 'מכירות', icon: ShoppingCart, page: 'Sales', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:border-purple-400 hover:bg-purple-100' },
  { name: 'חשבונות', icon: UserCheck, page: 'Dashboard', gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:border-green-400 hover:bg-green-100' },
  { name: 'גישה לבורדים', icon: Trello, page: 'Boards', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:border-orange-400 hover:bg-orange-100' },
  { name: 'מוצרי מעטפת', icon: Package, page: 'Products', gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', hover: 'hover:border-pink-400 hover:bg-pink-100' },
  { name: 'מערכת ERP', icon: Database, page: 'ERP', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', hover: 'hover:border-indigo-400 hover:bg-indigo-100' },
  { name: 'חיפוש', icon: Search, page: 'SearchPage', gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:border-cyan-400 hover:bg-cyan-100' },
  { name: 'בוט AI', icon: Bot, page: 'AIBot', gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', hover: 'hover:border-violet-400 hover:bg-violet-100' },
  { name: 'התראות ומשימות', icon: Bell, page: 'Notifications', gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200', hover: 'hover:border-red-400 hover:bg-red-100' },
  { name: 'יומן', icon: Calendar, page: 'CalendarPage', gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', hover: 'hover:border-teal-400 hover:bg-teal-100' },
  { name: 'תקשורת', icon: MessageSquare, page: 'Communication', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:border-amber-400 hover:bg-amber-100' },
];

export default function ManagementHub() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 md:p-3">
      <div className="mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {managementItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.page} to={createPageUrl(item.page)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    ${item.bg} ${item.border} ${item.hover}
                    border-2 rounded-2xl p-8 shadow-lg cursor-pointer
                    transition-all duration-300 h-full
                  `}
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className={`
                      w-20 h-20 rounded-2xl flex items-center justify-center
                      bg-gradient-to-br ${item.gradient} shadow-xl
                    `}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {item.name}
                    </h3>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}