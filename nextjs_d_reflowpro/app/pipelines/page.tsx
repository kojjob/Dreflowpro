"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PipelineDetailsModal } from "../components/ui/ModalVariants"

export default function PipelinesPage() {
  const router = useRouter()
  const [selectedTransformation, setSelectedTransformation] = useState<string | null>(null)
  const [selectedPipeline, setSelectedPipeline] = useState<any>(null)
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false)

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
    } else {
      // Redirect to dashboard with pipelines tab active
      router.push('/dashboard?tab=pipelines')
    }
  }, [router])

  // Handler functions
  const handlePipelineClick = (execution: any) => {
    const pipelineData = {
      id: execution.id.toString(),
      name: execution.name,
      description: `Pipeline processing ${execution.recordsProcessed} records`,
      status: execution.status,
      steps: execution.transformations.map((transform: string, index: number) => ({
        name: transform,
        type: transform.toLowerCase(),
        description: `${transform} operation`
      })),
      lastRun: execution.lastRun,
      recordsProcessed: execution.recordsProcessed,
      runtime: execution.runtime
    }
    setSelectedPipeline(pipelineData)
    setIsPipelineModalOpen(true)
  }

  const handleTransformationClick = (transformId: string) => {
    setSelectedTransformation(transformId)
    toast.success(`Selected ${transformId.toUpperCase()} transformation`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white via-indigo-50 to-purple-50 shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600 transition-colors duration-200 bg-white/50 px-3 py-2 rounded-lg hover:bg-white/80"
              >
                <span>←</span>
                <span className="font-medium">Back to Dashboard</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 bg-clip-text text-transparent">
                    ETL Pipelines
                  </h1>
                  <p className="text-sm text-gray-600">Advanced data transformation engine</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-sm font-semibold px-4 py-2 rounded-xl border border-purple-200">
                🚀 Production Ready
              </span>
              <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 border border-white/20 hover:shadow-3xl transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-3xl">🔄</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Data Transformations & ETL Pipelines
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Production-ready data processing with advanced transformation operations,
              real-time monitoring, and enterprise-grade performance optimization
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <div className="text-2xl font-bold">4</div>
                <div className="text-blue-100 text-sm">Transform Types</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                <div className="text-2xl font-bold">99.9%</div>
                <div className="text-green-100 text-sm">Uptime</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                <div className="text-2xl font-bold">1M+</div>
                <div className="text-purple-100 text-sm">Records/sec</div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-orange-100 text-sm">Monitoring</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Transformations Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
        >
          {transformations.map((transform, index) => {
            const gradients = [
              'from-blue-500 to-indigo-600',
              'from-green-500 to-emerald-600',
              'from-purple-500 to-violet-600',
              'from-orange-500 to-red-600'
            ];

            return (
              <motion.div
                key={transform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/20"
                onClick={() => handleTransformationClick(transform.id)}
              >
                <div className="flex items-start space-x-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${gradients[index]} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl">{transform.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                      {transform.name}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {transform.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {transform.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="text-xs bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 px-3 py-1 rounded-full font-medium border border-indigo-200"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1 font-medium">Example:</div>
                      <code className="text-sm text-gray-800 font-mono leading-relaxed">
                        {transform.example}
                      </code>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Enhanced Recent Pipeline Executions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-16 border border-white/20 hover:shadow-2xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-green-600 bg-clip-text text-transparent">
                  Recent Pipeline Executions
                </h2>
                <p className="text-gray-600">Real-time execution monitoring and performance metrics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-xl border border-green-200 shadow-sm">
                ✅ All Systems Operational
              </span>
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">Live Monitoring</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {demoExecutions.map((execution, index) => (
              <motion.div
                key={execution.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-r from-white to-gray-50 border border-gray-200/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-102 cursor-pointer"
                onClick={() => handlePipelineClick(execution)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className={`w-4 h-4 rounded-full shadow-lg ${
                      execution.status === 'completed' ? 'bg-green-500 shadow-green-500/50' :
                      execution.status === 'running' ? 'bg-blue-500 animate-pulse shadow-blue-500/50' :
                      'bg-yellow-500 shadow-yellow-500/50'
                    }`}></div>

                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                        execution.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                        execution.status === 'running' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                        'bg-gradient-to-r from-yellow-500 to-orange-600'
                      }`}>
                        <span className="text-white text-xl">
                          {execution.status === 'completed' ? '✅' : execution.status === 'running' ? '⚡' : '⏳'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{execution.name}</h4>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">📊</span>
                            <span className="text-sm text-gray-600 font-medium">
                              {execution.recordsProcessed} records
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">⏱️</span>
                            <span className="text-sm text-gray-600 font-medium">
                              {execution.runtime}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">🕒</span>
                            <span className="text-sm text-gray-600 font-medium">
                              {execution.lastRun}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {execution.transformations.map((transform, transformIndex) => (
                        <span
                          key={transformIndex}
                          className="text-xs bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 px-3 py-1 rounded-full font-medium border border-purple-200"
                        >
                          {transform}
                        </span>
                      ))}
                    </div>
                    <span className={`text-sm px-4 py-2 rounded-xl capitalize font-semibold shadow-sm ${
                      execution.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' :
                      execution.status === 'running' ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200' :
                      'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {execution.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Technical Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-10 border border-white/20 hover:shadow-2xl transition-all duration-300"
        >
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">🚀</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 bg-clip-text text-transparent mb-4">
              Technical Capabilities
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Enterprise-grade performance and reliability for mission-critical data operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="group text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">⚡</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-xl group-hover:text-blue-600 transition-colors">
                High Performance
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Process millions of records with pandas optimizations, async operations,
                and intelligent memory management
              </p>
            </div>

            <div className="group text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 hover:shadow-lg transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">🔧</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-xl group-hover:text-green-600 transition-colors">
                Flexible Configuration
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Configurable transformations with custom parameters, validation rules,
                and dynamic pipeline orchestration
              </p>
            </div>

            <div className="group text-center bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8 border border-purple-100 hover:shadow-lg transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">📊</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-xl group-hover:text-purple-600 transition-colors">
                Real-time Monitoring
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Track execution metrics, performance stats, data quality indicators,
                and automated alerting systems
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-indigo-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="font-bold text-indigo-900 text-xl">Production Ready Features</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-indigo-800 font-medium">Streaming data processing with configurable batch sizes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-indigo-800 font-medium">Memory-efficient operations for large datasets</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-indigo-800 font-medium">Comprehensive error handling and rollback mechanisms</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-indigo-800 font-medium">Detailed logging and performance metrics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-indigo-800 font-medium">Support for complex data validation rules</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-indigo-800 font-medium">Integration with PostgreSQL and MySQL databases</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pipeline Details Modal */}
      <PipelineDetailsModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        pipeline={selectedPipeline}
      />
    </div>
  )
}