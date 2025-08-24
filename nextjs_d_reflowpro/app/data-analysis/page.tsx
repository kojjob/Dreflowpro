'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, Sparkles } from 'lucide-react';

export default function DataAnalysisPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard with data-analysis tab active
    const timer = setTimeout(() => {
      router.push('/dashboard?tab=data-analysis');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Brain className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent mb-4">
            Data Analysis
          </h1>

          <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
            Redirecting you to the unified dashboard for a better experience...
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="font-medium">Preparing your workspace...</span>
          </div>

          <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
            />
          </div>

          <motion.button
            onClick={() => router.push('/dashboard?tab=data-analysis')}
            className="mt-6 inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-sm text-gray-500"
        >
          <p>
            Data Analysis is now integrated into the main dashboard for a unified experience.
          </p>
        </motion.div>
      </div>
    </div>
  );
}