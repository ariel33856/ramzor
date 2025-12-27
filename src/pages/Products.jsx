import React from 'react';
import { motion } from 'framer-motion';
import { Home, Building2, MapPin, FileText, DollarSign, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Products() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="residential" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="residential" className="text-lg">
              <Home className="w-5 h-5 ml-2" />
              מגורים
            </TabsTrigger>
            <TabsTrigger value="commercial" className="text-lg">
              <Building2 className="w-5 h-5 ml-2" />
              מסחרי
            </TabsTrigger>
            <TabsTrigger value="land" className="text-lg">
              <MapPin className="w-5 h-5 ml-2" />
              קרקעות
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-lg">
              <FileText className="w-5 h-5 ml-2" />
              פרויקטים
            </TabsTrigger>
            <TabsTrigger value="valuation" className="text-lg">
              <DollarSign className="w-5 h-5 ml-2" />
              שמאות
            </TabsTrigger>
            <TabsTrigger value="market" className="text-lg">
              <TrendingUp className="w-5 h-5 ml-2" />
              שוק
            </TabsTrigger>
          </TabsList>

          <TabsContent value="residential">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">נכסי מגורים</h2>
              <p className="text-gray-500">ניהול נכסי מגורים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="commercial">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">נכסים מסחריים</h2>
              <p className="text-gray-500">ניהול נכסים מסחריים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="land">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">קרקעות</h2>
              <p className="text-gray-500">ניהול קרקעות</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="projects">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">פרויקטים</h2>
              <p className="text-gray-500">ניהול פרויקטים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="valuation">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">שמאות</h2>
              <p className="text-gray-500">שמאות נכסים</p>
            </motion.div>
          </TabsContent>

          <TabsContent value="market">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">ניתוח שוק</h2>
              <p className="text-gray-500">ניתוח נתוני שוק</p>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}