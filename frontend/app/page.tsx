"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import ThemeToggle from "./components/ThemeToggle"
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
  Lightbulb,
  BrainCircuit,
  LineChart,
  MessageSquare,
  AlertTriangle,
  Cpu,
  Network,
  Lock,
  Rocket,
  Calculator,
  ChevronRight,
  Activity,
  DollarSign,
  Package,
  Server,
  Cloud,
  Code2,
  Gauge,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Download,
  Upload,
  Share2,
  TrendingDown,
  BarChart,
  Bot,
  Microscope,
  Wand2,
  Zap as Lightning,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users2,
  Briefcase,
  Plus
} from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [dataProcessed, setDataProcessed] = useState(2500000)
  const [pipelinesCreated, setPipelinesCreated] = useState(15000)
  const [timeSaved, setTimeSaved] = useState(120000)
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3])

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    
    if (token) {
      // If user is logged in, redirect to dashboard
      router.push('/dashboard')
    }

    // Animate counters
    const interval = setInterval(() => {
      setDataProcessed(prev => prev + Math.floor(Math.random() * 1000))
      setPipelinesCreated(prev => prev + Math.floor(Math.random() * 5))
      setTimeSaved(prev => prev + Math.floor(Math.random() * 10))
    }, 3000)

    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Fixed Theme Toggle Button */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Navbar />

      {/* Professional Hero Section */}
      <motion.section 
        className="relative min-h-[85vh] flex items-center pt-20 pb-16 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Subtle Grid Background */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900"
          style={{ opacity }}
        >
          <div className="absolute inset-0 opacity-50 dark:opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='gray' stroke-width='0.5' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </motion.div>
        
        {/* Professional Gradient Overlay */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-transparent dark:from-blue-900/20 dark:to-transparent rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-100 to-transparent dark:from-emerald-900/20 dark:to-transparent rounded-full blur-3xl opacity-60"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-left">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                {/* Enterprise Badge */}
                <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 mb-6">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Enterprise-Grade Data Platform</span>
                </div>
              
                {/* Professional Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                  Transform Your Data Into
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 block sm:inline"> Strategic Decisions</span>
                </h1>
              
                {/* Professional Description */}
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                  Enterprise-grade ETL/ELT platform that unifies your data ecosystem. 
                  Connect, transform, and analyze data from 50+ sources with AI-powered automation—no coding required.
                </p>
                
                {/* Key Benefits List */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Deploy in minutes, not months—with zero infrastructure setup</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">AI-driven insights from GPT-4, Claude, and specialized models</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Enterprise security with SOC2, GDPR, and HIPAA compliance</span>
                  </div>
                </div>

                {/* Professional CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Link 
                    href="/signup"
                    className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <button className="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200">
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Watch Demo
                  </button>
                </div>
                
                {/* Trust Metrics */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5" />
                    <span>5,000+ Companies</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1.5 text-yellow-500" />
                    <span>4.9/5 Rating</span>
                  </div>
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-1.5 text-green-600" />
                    <span>SOC2 Certified</span>
                  </div>
                </div>
              </motion.div>
            </div>
              
            {/* Right Column - Visual Dashboard Preview */}
            <div className="relative hidden lg:block">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                {/* Dashboard Preview Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                  {/* Mini Dashboard Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Live Dashboard</span>
                  </div>
                  
                  {/* Analytics Preview */}
                  <div className="space-y-4">
                    {/* Revenue Chart */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Revenue Analytics</span>
                        <span className="text-xs text-emerald-600">+24%</span>
                      </div>
                      <div className="flex items-end space-x-2 h-20">
                        <div className="w-8 bg-blue-200 dark:bg-blue-800 rounded-t" style={{height: '40%'}}></div>
                        <div className="w-8 bg-blue-300 dark:bg-blue-700 rounded-t" style={{height: '60%'}}></div>
                        <div className="w-8 bg-blue-400 dark:bg-blue-600 rounded-t" style={{height: '45%'}}></div>
                        <div className="w-8 bg-emerald-400 dark:bg-emerald-600 rounded-t" style={{height: '80%'}}></div>
                        <div className="w-8 bg-emerald-500 dark:bg-emerald-500 rounded-t" style={{height: '90%'}}></div>
                        <div className="w-8 bg-emerald-600 dark:bg-emerald-400 rounded-t" style={{height: '75%'}}></div>
                      </div>
                    </div>
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Conversion Rate</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">3.4%</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg. Order Value</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">$142</p>
                      </div>
                    </div>
                    
                    {/* Data Sources */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Connected Sources</span>
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white dark:border-gray-800"></div>
                        <div className="w-6 h-6 bg-green-600 rounded-full border-2 border-white dark:border-gray-800"></div>
                        <div className="w-6 h-6 bg-purple-600 rounded-full border-2 border-white dark:border-gray-800"></div>
                        <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                          <span className="text-xs text-white">+5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                  Real-time Updates
                </div>
                <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                  AI-Powered
                </div>
              </motion.div>
            </div>
          </div>
              
          {/* Enterprise Logos Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700"
          >
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider font-medium">Trusted by Industry Leaders</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center opacity-60">
              {['Microsoft', 'Google', 'Amazon', 'Salesforce', 'Oracle', 'SAP'].map((company, index) => (
                <motion.div 
                  key={company} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="flex items-center justify-center"
                >
                  <span className="text-gray-400 dark:text-gray-600 font-semibold text-base">{company}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* AI-Powered Analytics Showcase Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden transition-colors duration-200">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 dark:from-blue-900/30 dark:to-emerald-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6"
            >
              <BrainCircuit className="w-4 h-4 mr-2" />
              AI That Understands Your Business Context
            </motion.div>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              AI-Powered Intelligence at Every Step
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Leverage cutting-edge AI from multiple providers to transform raw data into strategic insights that drive revenue growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Feature 1: Smart Data Discovery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 transition-all duration-300 border border-blue-100 dark:border-gray-700 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI-Guided Data Mapping</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Our AI automatically discovers relationships between your data sources, suggests optimal join keys, and identifies data quality issues before they impact your analysis.
              </p>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center text-blue-700 font-semibold mb-2">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Business Impact
                </div>
                <p className="text-sm text-blue-600">Save 10+ hours per week on data preparation</p>
              </div>
            </motion.div>

            {/* AI Feature 2: Predictive Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-emerald-100 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LineChart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Predictive Analytics Engine</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Built-in ML models for sales forecasting, churn prediction, and inventory optimization. No data science degree required—just results.
              </p>
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center text-emerald-700 font-semibold mb-2">
                  <Target className="w-5 h-5 mr-2" />
                  Business Impact
                </div>
                <p className="text-sm text-emerald-600">Increase forecast accuracy by 35%</p>
              </div>
            </motion.div>

            {/* AI Feature 3: Natural Language Queries */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-amber-100 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Natural Language Queries</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Type questions in plain English like "What caused the sales spike last quarter?" and get instant visual answers with supporting data.
              </p>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center text-amber-700 font-semibold mb-2">
                  <Users2 className="w-5 h-5 mr-2" />
                  Business Impact
                </div>
                <p className="text-sm text-amber-600">Democratize data access across your organization</p>
              </div>
            </motion.div>

            {/* AI Feature 4: Anomaly Detection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-green-100 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Anomaly Detection</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                AI continuously monitors your KPIs and alerts you to unusual patterns, helping prevent revenue leaks and operational issues before they escalate.
              </p>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center text-green-700 font-semibold mb-2">
                  <Clock className="w-5 h-5 mr-2" />
                  Business Impact
                </div>
                <p className="text-sm text-green-600">Reduce incident response time by 80%</p>
              </div>
            </motion.div>

            {/* AI Feature 5: Smart Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 transition-all duration-300 border border-blue-100 dark:border-gray-700 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Smart Recommendations</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Get specific recommendations like "Increase inventory for Product X by 20% based on seasonal trends and current demand patterns."
              </p>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center text-blue-700 font-semibold mb-2">
                  <Zap className="w-5 h-5 mr-2" />
                  Business Impact
                </div>
                <p className="text-sm text-blue-600">Transform data into decisions 5x faster</p>
              </div>
            </motion.div>

            {/* AI Feature 6: Multi-Model AI */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-indigo-100 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Network className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Multi-Model AI Integration</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Leverages Claude for analysis, GPT for reports, Gemini for predictions, and open-source models for cost optimization.
              </p>
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="flex items-center text-indigo-700 font-semibold mb-2">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Business Impact
                </div>
                <p className="text-sm text-indigo-600">60% lower AI costs than single-provider solutions</p>
              </div>
            </motion.div>
          </div>

          {/* Interactive Demo CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-16 text-center"
          >
            <Link
              href="/playground"
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <Wand2 className="w-6 h-6 mr-2" />
              Try Interactive AI Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4 sm:px-0">
              Why SMEs Choose DReflowPro
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
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
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
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
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
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
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
              <div className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">Popular Connectors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-600 mb-1 sm:mb-2">5min</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-1 sm:mb-2">99.5%</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">$49</div>
              <div className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400">Starting From</div>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Integration Showcase */}
      <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-700 text-sm font-medium mb-6">
                <Network className="w-4 h-4 mr-2" />
                50+ Pre-Built Connectors
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Connect All Your Business Tools
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                One-click integration with the tools you already use. No coding, no complexity, just instant connectivity.
              </p>
            </motion.div>
          </div>

          {/* Connector Categories */}
          <div className="space-y-12">
            {/* E-commerce Connectors */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <ShoppingCart className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">E-commerce Platforms</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {['Shopify', 'WooCommerce', 'BigCommerce', 'Magento', 'Amazon Seller', 'eBay'].map((tool) => (
                  <div key={tool} className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 border border-purple-100 group">
                    <div className="h-12 flex items-center justify-center mb-2">
                      <Package className="w-8 h-8 text-purple-400 group-hover:text-purple-600 transition-colors" />
                    </div>
                    <div className="text-sm font-medium text-gray-700 text-center">{tool}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* CRM & Sales */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <Users2 className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">CRM & Sales Tools</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho CRM', 'Monday.com', 'Freshsales'].map((tool) => (
                  <div key={tool} className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 border border-blue-100 group">
                    <div className="h-12 flex items-center justify-center mb-2">
                      <Briefcase className="w-8 h-8 text-blue-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="text-sm font-medium text-gray-700 text-center">{tool}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Accounting & Finance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <DollarSign className="w-6 h-6 text-green-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Accounting & Finance</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {['QuickBooks', 'Xero', 'FreshBooks', 'Wave', 'Stripe', 'PayPal'].map((tool) => (
                  <div key={tool} className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 border border-green-100 group">
                    <div className="h-12 flex items-center justify-center mb-2">
                      <Calculator className="w-8 h-8 text-green-400 group-hover:text-green-600 transition-colors" />
                    </div>
                    <div className="text-sm font-medium text-gray-700 text-center">{tool}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Marketing & Analytics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <BarChart3 className="w-6 h-6 text-orange-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing & Analytics</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {['Google Analytics', 'Mailchimp', 'Facebook Ads', 'Google Ads', 'Klaviyo', 'Mixpanel'].map((tool) => (
                  <div key={tool} className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 border border-orange-100 group">
                    <div className="h-12 flex items-center justify-center mb-2">
                      <TrendingUp className="w-8 h-8 text-orange-400 group-hover:text-orange-600 transition-colors" />
                    </div>
                    <div className="text-sm font-medium text-gray-700 text-center">{tool}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Databases & Files */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center mb-6">
                <Database className="w-6 h-6 text-indigo-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Databases & File Storage</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {['PostgreSQL', 'MySQL', 'MongoDB', 'Google Sheets', 'Excel', 'Dropbox'].map((tool) => (
                  <div key={tool} className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 border border-indigo-100 group">
                    <div className="h-12 flex items-center justify-center mb-2">
                      <Server className="w-8 h-8 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="text-sm font-medium text-gray-700 text-center">{tool}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Custom Integration CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-16 text-center bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 border border-purple-200"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Don't See Your Tool?
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              We add new connectors weekly. Request yours or use our universal API connector.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/request-connector"
                className="inline-flex items-center bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 border-2 border-purple-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Request Connector
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex items-center bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
              >
                <Code2 className="w-5 h-5 mr-2" />
                API Documentation
              </Link>
            </div>
          </motion.div>
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
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500 flex-shrink-0" />
                  Sales analytics & trends
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500 flex-shrink-0" />
                  Inventory optimization
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-500 flex-shrink-0" />
                  Project profitability analysis
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-500 flex-shrink-0" />
                  Client relationship tracking
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-orange-500 flex-shrink-0" />
                  Supply chain optimization
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-orange-500 flex-shrink-0" />
                  Production efficiency
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900">
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
                  <div className="font-semibold text-gray-900 dark:text-white">Sarah Anderson</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">CEO, TechFlow Solutions</div>
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
                  <div className="font-semibold text-gray-900 dark:text-white">Mike Rodriguez</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Operations Director, GrowthCorp</div>
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
                  <div className="font-semibold text-gray-900 dark:text-white">Lisa Chen</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Founder, DataSmart Retail</div>
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
      <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-900">
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
