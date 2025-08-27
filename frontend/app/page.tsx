"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import { 
  ArrowRight, 
  Database, 
  Zap, 
  Brain, 
  Shield, 
  Clock, 
  Users,
  BarChart3,
  CheckCircle,
  PlayCircle,
  Sparkles,
  TrendingUp,
  Quote,
  Star,
  Building2,
  ShoppingCart,
  CreditCard,
  FileText,
  Globe,
  Smartphone,
  Monitor,
  PieChart,
  GitBranch,
  Workflow,
  Layers,
  Target,
  Award,
  Lightbulb
} from "lucide-react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    
    if (token) {
      // If user is logged in, redirect to dashboard
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50 to-brand-100">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-brand-50 to-brand-100 border border-brand-100 text-brand-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                The Canva for Data Integration
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight px-4 sm:px-0">
                Turn Your Data Into
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Actionable Insights
                </span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                The first AI-agnostic ETL/ELT platform designed for SMEs. Connect all your business tools, 
                transform your data, and get beautiful reports in just 5 minutes. No technical expertise required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4 sm:pt-6 px-4 sm:px-0">
                <Link 
                  href="/signup"
                  className="group bg-gradient-to-r from-brand-600 to-brand-400 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:shadow-2xl transition-all duration-300 flex items-center w-full sm:w-auto justify-center"
                >
                  Start Free Today
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="flex items-center text-gray-600 hover:text-indigo-600 font-medium text-base sm:text-lg transition-colors">
                  <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Watch Demo
                </button>
              </div>
              
              <div className="flex items-center justify-center text-xs sm:text-sm text-gray-500 pt-4 sm:pt-6">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500" />
                Free forever • 2 pipelines • 10K records/month
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating Elements - Hidden on mobile */}
        <div className="hidden sm:block absolute top-20 left-10 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="hidden sm:block absolute top-40 right-20 w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
        <div className="hidden lg:block absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-10 animate-pulse delay-2000"></div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4 sm:px-0">
              Why SMEs Choose DataReflow
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              Built specifically for small and medium enterprises who need enterprise-grade data integration without enterprise complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center p-4 sm:p-6"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">5-Minute Setup Promise</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Get your first data pipeline running in under 5 minutes. Pre-built templates for 50+ common SME scenarios.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-4 sm:p-6"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">AI-Agnostic Intelligence</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Smart data mapping and transformations using multiple AI providers. No vendor lock-in, optimized costs.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-4 sm:p-6"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Complete Data Journey</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Extract, transform, load, visualize, and share. From pipeline to PowerPoint in one platform.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-indigo-600 mb-1 sm:mb-2">50+</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Popular Connectors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-600 mb-1 sm:mb-2">5min</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-1 sm:mb-2">99.5%</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">$49</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600">Starting From</div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Integrations */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 px-4 sm:px-0">
              Connect Your Favorite Tools
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4 sm:px-0">
              50+ pre-built connectors for the most popular SME tools
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {[
              'QuickBooks', 'Shopify', 'Salesforce', 'Google Analytics', 
              'PostgreSQL', 'Stripe', 'HubSpot', 'BigCommerce',
              'Xero', 'WooCommerce', 'Mailchimp', 'Google Sheets'
            ].map((tool, index) => (
              <div 
                key={tool}
                className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow"
              >
                <div className="text-xs sm:text-sm font-medium text-gray-700">{tool}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4 sm:px-0">
              How DataReflow Works
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              Transform your data journey in just three simple steps. No technical expertise required.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative px-4 sm:px-0"
            >
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 relative">
                  <GitBranch className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                    1
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Connect</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Choose from 50+ pre-built connectors to link your business tools. 
                  One-click authentication for popular platforms like Shopify, QuickBooks, and Salesforce.
                </p>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded flex items-center justify-center">
                      <Database className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded flex items-center justify-center">
                      <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500 rounded flex items-center justify-center">
                      <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 text-left">
                    🔗 Auto-discovery of data sources<br/>
                    🔐 Secure OAuth authentication<br/>
                    ⚡ Real-time data sync
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative px-4 sm:px-0"
            >
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 relative">
                  <Workflow className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                    2
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Transform</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Use our visual pipeline builder to clean, transform, and combine your data. 
                  AI-powered suggestions make complex transformations simple.
                </p>
                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 sm:p-6 rounded-xl border border-green-100">
                  <div className="flex flex-col space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Raw Data</span>
                      <span className="text-xs text-gray-500">Processed</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-green-400 rounded-full"></div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 text-left">
                    🤖 AI-powered data mapping<br/>
                    🔧 Drag-and-drop interface<br/>
                    ✨ Smart transformation suggestions
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="relative px-4 sm:px-0"
            >
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 relative">
                  <PieChart className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                    3
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Visualize</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Generate beautiful reports and dashboards automatically. 
                  Share insights with stakeholders via PDF, PowerPoint, or live dashboards.
                </p>
                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6 rounded-xl border border-orange-100">
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3">
                    <div className="h-4 sm:h-6 bg-gradient-to-r from-blue-400 to-blue-500 rounded"></div>
                    <div className="h-4 sm:h-6 bg-gradient-to-r from-green-400 to-green-500 rounded"></div>
                    <div className="h-4 sm:h-6 bg-gradient-to-r from-purple-400 to-purple-500 rounded"></div>
                    <div className="h-4 sm:h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded"></div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 text-left">
                    📊 Interactive dashboards<br/>
                    📑 Automated report generation<br/>
                    📱 Mobile-responsive design
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4 sm:px-0">
              Perfect for Every Business
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              See how DataReflow transforms data workflows across different industries and business types.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* E-commerce */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">E-commerce</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                "Sync Shopify → Google Analytics → QuickBooks automatically. Get real-time sales insights and inventory management."
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500 flex-shrink-0" />
                  Sales analytics & trends
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500 flex-shrink-0" />
                  Inventory optimization
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500 flex-shrink-0" />
                  Customer behavior insights
                </div>
              </div>
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                <div className="text-xs sm:text-sm font-medium text-indigo-600">Popular with:</div>
                <div className="text-xs sm:text-sm text-gray-500">Online retailers, Dropshippers, Amazon sellers</div>
              </div>
            </motion.div>

            {/* Professional Services */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Professional Services</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                "Connect CRM → Project Management → Invoicing. Track project profitability and client satisfaction."
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-500 flex-shrink-0" />
                  Project profitability analysis
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-500 flex-shrink-0" />
                  Client relationship tracking
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-500 flex-shrink-0" />
                  Resource utilization
                </div>
              </div>
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                <div className="text-xs sm:text-sm font-medium text-indigo-600">Popular with:</div>
                <div className="text-xs sm:text-sm text-gray-500">Agencies, Consultants, Law firms</div>
              </div>
            </motion.div>

            {/* Manufacturing */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Manufacturing</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                "Integrate inventory → production → sales systems. Optimize supply chain and reduce waste."
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-orange-500 flex-shrink-0" />
                  Supply chain optimization
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-orange-500 flex-shrink-0" />
                  Production efficiency
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-orange-500 flex-shrink-0" />
                  Quality control tracking
                </div>
              </div>
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                <div className="text-xs sm:text-sm font-medium text-indigo-600">Popular with:</div>
                <div className="text-xs sm:text-sm text-gray-500">Manufacturers, Distributors, Suppliers</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4 sm:px-0">
              Trusted by SMEs Worldwide
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              Join thousands of businesses that have transformed their data workflows with DataReflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Testimonial 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-brand-50 to-brand-100 p-6 sm:p-8 rounded-2xl border border-indigo-100"
            >
              <div className="flex mb-4 sm:mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 italic">
                "DataReflow reduced our data processing time from 15 hours a week to just 1 hour. 
                The ROI was immediate and the insights are game-changing."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">SA</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Sarah Anderson</div>
                  <div className="text-sm text-gray-600">CEO, TechFlow Solutions</div>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-2xl border border-green-100"
            >
              <div className="flex mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <Quote className="w-8 h-8 text-green-400 mb-4" />
              <p className="text-gray-700 mb-6 italic">
                "The AI-powered data mapping is incredible. It automatically suggested the exact 
                transformations we needed. Setup took literally 5 minutes."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">MR</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Mike Rodriguez</div>
                  <div className="text-sm text-gray-600">Operations Director, GrowthCorp</div>
                </div>
              </div>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-100"
            >
              <div className="flex mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <Quote className="w-8 h-8 text-orange-400 mb-4" />
              <p className="text-gray-700 mb-6 italic">
                "Finally, a data platform that doesn't require a PhD in computer science. 
                My team was up and running the same day we signed up."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">LC</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Lisa Chen</div>
                  <div className="text-sm text-gray-600">Founder, DataSmart Retail</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-4 sm:px-0">
              Enterprise Features, SME Pricing
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-indigo-100 max-w-3xl mx-auto px-4 sm:px-0">
              Get advanced capabilities typically reserved for large enterprises, 
              designed and priced for small and medium businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-start space-x-4"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI-Agnostic Intelligence</h3>
                  <p className="text-indigo-100">
                    Use Claude, GPT, Gemini, or local models. Smart cost optimization 
                    automatically chooses the best AI for each task.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex items-start space-x-4"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
                  <p className="text-indigo-100">
                    SOC 2 compliant with end-to-end encryption, SSO integration, 
                    and GDPR compliance built-in.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-start space-x-4"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Global Scale</h3>
                  <p className="text-indigo-100">
                    Multi-region deployment with 99.5% uptime SLA. 
                    Built to scale from startup to enterprise.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-start space-x-4"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Mobile-First</h3>
                  <p className="text-indigo-100">
                    Monitor pipelines, get alerts, and view reports on any device. 
                    Native mobile app for business owners on the go.
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-200">Pipeline Status</span>
                    <span className="text-green-400">●</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                        <Database className="w-4 h-4 text-white" />
                      </div>
                      <div className="h-2 bg-gradient-to-r from-blue-400 to-green-400 rounded-full flex-1"></div>
                      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-4 rounded-lg">
                      <div className="text-sm text-indigo-200 mb-2">Last 30 days</div>
                      <div className="text-2xl font-bold mb-1">1.2M records processed</div>
                      <div className="text-sm text-green-400">↗ 23% improvement</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-20 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4 sm:px-0">
              Transparent, Fair Pricing
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              No hidden fees, no per-connector charges, no surprises. 
              Pay for what you use with clear, predictable pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-green-50 to-teal-50 border border-green-100"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Award className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Free Forever</h3>
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">$0</div>
              <p className="text-gray-600 text-xs sm:text-sm">
                2 pipelines<br/>
                10K records/month<br/>
                Community support
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">$49</div>
              <p className="text-gray-600 text-sm">
                10 pipelines<br/>
                100K records/month<br/>
                Email support
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 relative"
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Growth</h3>
              <div className="text-3xl font-bold text-purple-600 mb-2">$199</div>
              <p className="text-gray-600 text-sm">
                Unlimited pipelines<br/>
                1M records/month<br/>
                AI features + Priority support
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-gray-700 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-3xl font-bold text-gray-700 mb-2">Custom</div>
              <p className="text-gray-600 text-sm">
                Custom limits<br/>
                Dedicated support<br/>
                SLA guarantees
              </p>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/signup"
              className="bg-gradient-to-r from-brand-600 to-brand-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 inline-flex items-center"
            >
              View Full Pricing
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight px-4 sm:px-0">
              Ready to Transform Your Data?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-indigo-100 max-w-2xl mx-auto px-4 sm:px-0">
              Join thousands of SMEs already using DataReflow to make data-driven decisions. 
              Start your free account today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4 sm:pt-6 px-4 sm:px-0">
              <Link 
                href="/signup"
                className="bg-white text-indigo-600 px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-gray-50 transition-colors flex items-center w-full sm:w-auto justify-center"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link 
                href="/login"
                className="text-white hover:text-indigo-100 font-medium text-lg transition-colors flex items-center border-b-2 border-transparent hover:border-white"
              >
                Existing User? Sign In
              </Link>
            </div>
            <div className="flex items-center justify-center text-sm text-indigo-100 pt-4">
              <CheckCircle className="w-4 h-4 mr-2" />
              No credit card required • 2 pipelines free forever
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
