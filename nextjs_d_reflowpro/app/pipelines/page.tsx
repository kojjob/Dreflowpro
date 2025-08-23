"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export default function PipelinesPage() {
  const router = useRouter()
  const [selectedTransformation, setSelectedTransformation] = useState<string | null>(null)

  const transformations = [
    {
      id: 'join',
      name: 'JOIN Operations',
      description: 'Combine data from multiple sources with INNER, LEFT, RIGHT, and FULL OUTER joins',
      icon: '🔗',
      features: ['Multiple join types', 'Key-based matching', 'Null handling', 'Performance optimized'],
      example: 'JOIN users ON orders.user_id = users.id'
    },
    {
      id: 'deduplicate',
      name: 'DEDUPLICATE',
      description: 'Remove duplicate records based on specified columns or complete rows',
      icon: '🧹',
      features: ['Subset-based deduplication', 'Complete row matching', 'Configurable keep strategy', 'Memory efficient'],
      example: 'DEDUPLICATE BY email, phone KEEP first'
    },
    {
      id: 'validate',
      name: 'VALIDATE',
      description: 'Ensure data quality with comprehensive validation rules',
      icon: '✅',
      features: ['Type validation', 'Range checks', 'Pattern matching', 'Custom rules'],
      example: 'VALIDATE email MATCHES email_pattern, age BETWEEN 0 AND 120'
    },
    {
      id: 'aggregate',
      name: 'AGGREGATE',
      description: 'Group and summarize data with various aggregation functions',
      icon: '📊',
      features: ['Multiple aggregations', 'Group by operations', 'Statistical functions', 'Custom calculations'],
      example: 'GROUP BY category AGGREGATE SUM(amount), AVG(rating), COUNT(*)'
    }
  ]

  const demoExecutions = [
    {
      id: 1,
      name: 'Customer Data Pipeline',
      status: 'completed',
      runtime: '2.34s',
      recordsProcessed: '10,000',
      transformations: ['JOIN', 'DEDUPLICATE', 'VALIDATE'],
      lastRun: '2 minutes ago'
    },
    {
      id: 2,
      name: 'Sales Analytics ETL',
      status: 'running',
      runtime: '1.82s',
      recordsProcessed: '5,432',
      transformations: ['AGGREGATE', 'JOIN'],
      lastRun: 'Running now'
    },
    {
      id: 3,
      name: 'Product Catalog Sync',
      status: 'completed',
      runtime: '0.95s',
      recordsProcessed: '2,150',
      transformations: ['VALIDATE', 'DEDUPLICATE'],
      lastRun: '15 minutes ago'
    }
  ]

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-gray-600"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">ETL Pipelines</h1>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                Demo Mode
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Data Transformations & ETL Pipelines
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Production-ready data processing with advanced transformation operations
          </p>
        </motion.div>

        {/* Transformations Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12"
        >
          {transformations.map((transform) => (
            <div
              key={transform.id}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => setSelectedTransformation(transform.id)}
            >
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{transform.icon}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{transform.name}</h3>
                  <p className="text-gray-600 mb-4">{transform.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {transform.features.map((feature, index) => (
                      <span
                        key={index}
                        className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className="bg-gray-100 rounded-lg p-3">
                    <code className="text-sm text-gray-800 font-mono">
                      {transform.example}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Recent Pipeline Executions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Pipeline Executions</h2>
            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              All Systems Operational
            </span>
          </div>

          <div className="space-y-4">
            {demoExecutions.map((execution) => (
              <motion.div
                key={execution.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      execution.status === 'completed' ? 'bg-green-400' :
                      execution.status === 'running' ? 'bg-blue-400 animate-pulse' :
                      'bg-yellow-400'
                    }`}></div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">{execution.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          {execution.recordsProcessed} records
                        </span>
                        <span className="text-sm text-gray-600">
                          Runtime: {execution.runtime}
                        </span>
                        <span className="text-sm text-gray-600">
                          {execution.lastRun}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {execution.transformations.map((transform, index) => (
                      <span
                        key={index}
                        className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                      >
                        {transform}
                      </span>
                    ))}
                    <span className={`text-sm px-3 py-1 rounded-full capitalize ${
                      execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                      execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {execution.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Technical Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Technical Capabilities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">High Performance</h3>
              <p className="text-sm text-gray-600">
                Process millions of records with pandas optimizations and async operations
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🔧</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Flexible Configuration</h3>
              <p className="text-sm text-gray-600">
                Configurable transformations with custom parameters and validation rules
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Monitoring</h3>
              <p className="text-sm text-gray-600">
                Track execution metrics, performance stats, and data quality indicators
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-indigo-50 rounded-lg">
            <h4 className="font-semibold text-indigo-800 mb-2">Production Ready Features</h4>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• Streaming data processing with configurable batch sizes</li>
              <li>• Memory-efficient operations for large datasets</li>
              <li>• Comprehensive error handling and rollback mechanisms</li>
              <li>• Detailed logging and performance metrics</li>
              <li>• Support for complex data validation rules</li>
              <li>• Integration with PostgreSQL and MySQL databases</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}