import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, UserCheck, Trello, Package,
  Database, Search, Bot, Bell, Calendar, MessageSquare, Users, FileText, DollarSign
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const managementItems = [
  { name: 'שיווק', icon: TrendingUp, page: 'Marketing', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:border-blue-400 hover:bg-blue-100' },
  { name: 'מכירות', icon: ShoppingCart, page: 'Sales', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:border-purple-400 hover:bg-purple-100' },
  { name: 'לקוחות פעילים', icon: UserCheck, page: 'Dashboard', gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:border-green-400 hover:bg-green-100' },
  { name: 'גישה לבורדים', icon: Trello, page: 'Boards', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:border-orange-400 hover:bg-orange-100' },
  { name: 'מוצרי מעטפת', icon: Package, page: 'Products', gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', hover: 'hover:border-pink-400 hover:bg-pink-100' },
  { name: 'מערכת ERP', icon: Database, page: 'ERP', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', hover: 'hover:border-indigo-400 hover:bg-indigo-100' },
  { name: 'חיפוש', icon: Search, page: 'SearchPage', gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:border-cyan-400 hover:bg-cyan-100' },
  { name: 'בוט AI', icon: Bot, page: 'AIBot', gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', hover: 'hover:border-violet-400 hover:bg-violet-100' },
  { name: 'התראות ומשימות', icon: Bell, page: 'Notifications', gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', border: 'border-red-200', hover: 'hover:border-red-400 hover:bg-red-100' },
  { name: 'יומן', icon: Calendar, page: 'CalendarPage', gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', hover: 'hover:border-teal-400 hover:bg-teal-100' },
  { name: 'תקשורת', icon: MessageSquare, page: 'Communication', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:border-amber-400 hover:bg-amber-100' },
];

export default function Management() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="accounts" className="text-lg">
              <UserCheck className="w-5 h-5 ml-2" />
              חשבונות
            </TabsTrigger>
            <TabsTrigger value="debtors" className="text-lg">
              <Users className="w-5 h-5 ml-2" />
              לווים
            </TabsTrigger>
            <TabsTrigger value="guarantors" className="text-lg">
              <FileText className="w-5 h-5 ml-2" />
              ערבים
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-lg">
              <DollarSign className="w-5 h-5 ml-2" />
              תשלומים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link to={createPageUrl('Dashboard')}>
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all cursor-pointer">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">חשבונות</h2>
                  <p className="text-gray-500">לחץ לצפייה בדשבורד</p>
                </div>
              </Link>
            </motion.div>
          </TabsContent>

          <TabsContent value="debtors">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">לווים</h2>
              <p className="text-gray-500">ניהול וטיפול בלווים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="guarantors">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">ערבים</h2>
              <p className="text-gray-500">ניהול וטיפול בערבים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="payments">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">תשלומים</h2>
              <p className="text-gray-500">ניהול תשלומים ועסקאות</p>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}