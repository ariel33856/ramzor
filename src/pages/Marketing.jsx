import React from 'react';
import { motion } from 'framer-motion';
import { Home, Building2, FileText, Users, Calculator, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Marketing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 md:p-3">
      <div className="mx-auto">
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="properties" className="text-lg">
              <Home className="w-5 h-5 ml-2" />
              נכסים
            </TabsTrigger>
            <TabsTrigger value="banks" className="text-lg">
              <Building2 className="w-5 h-5 ml-2" />
              בנקים
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-lg">
              <FileText className="w-5 h-5 ml-2" />
              מסמכים
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-lg">
              <Users className="w-5 h-5 ml-2" />
              לקוחות
            </TabsTrigger>
            <TabsTrigger value="calculator" className="text-lg">
              <Calculator className="w-5 h-5 ml-2" />
              מחשבונים
            </TabsTrigger>
            <TabsTrigger value="tracking" className="text-lg">
              <TrendingUp className="w-5 h-5 ml-2" />
              מעקב
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">נכסים</h2>
              <p className="text-gray-500">ניהול נכסים למשכנתאות</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="banks">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">בנקים</h2>
              <p className="text-gray-500">ניהול קשרי בנקים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="documents">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">מסמכים</h2>
              <p className="text-gray-500">ניהול מסמכים למשכנתאות</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="clients">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">לקוחות</h2>
              <p className="text-gray-500">ניהול לקוחות משכנתאות</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="calculator">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">מחשבונים</h2>
              <p className="text-gray-500">מחשבוני משכנתאות</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="tracking">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">מעקב</h2>
              <p className="text-gray-500">מעקב אחר תהליכי משכנתאות</p>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}