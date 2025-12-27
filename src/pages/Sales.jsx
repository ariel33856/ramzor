import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, DollarSign, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Sales() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="deals" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="deals" className="text-lg">
              <FileText className="w-5 h-5 ml-2" />
              עסקאות
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-lg">
              <Users className="w-5 h-5 ml-2" />
              לקוחות
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-lg">
              <DollarSign className="w-5 h-5 ml-2" />
              תשלומים
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-lg">
              <TrendingUp className="w-5 h-5 ml-2" />
              דוחות
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-lg">
              <Calendar className="w-5 h-5 ml-2" />
              לו״ז
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-lg">
              <MessageSquare className="w-5 h-5 ml-2" />
              תקשורת
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deals">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">עסקאות</h2>
              <p className="text-gray-500">ניהול עסקאות ומכירות</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="clients">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">לקוחות</h2>
              <p className="text-gray-500">ניהול לקוחות</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="payments">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">תשלומים</h2>
              <p className="text-gray-500">מעקב תשלומים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">דוחות</h2>
              <p className="text-gray-500">דוחות ואנליטיקה</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="schedule">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">לוח זמנים</h2>
              <p className="text-gray-500">ניהול לוח זמנים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="communication">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">תקשורת</h2>
              <p className="text-gray-500">תקשורת עם לקוחות</p>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}