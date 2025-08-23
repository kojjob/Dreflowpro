"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
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
  TrendingUp
} from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token')
    
    if (token) {
      router.push('/dashboard')
    } else {
      setIsCheckingAuth(false)
    }
  }, [router])

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="backdrop-blur-md bg-white/80 border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                DReflowPro
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login"
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/signup"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                The Canva for Data Integration
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Turn Your Data Into
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Actionable Insights
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                The first AI-agnostic ETL/ELT platform designed for SMEs. Connect all your business tools, 
                transform your data, and get beautiful reports in just 5 minutes. No technical expertise required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <Link 
                  href="/signup"
                  className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 flex items-center"
                >
                  Start Free Today
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="flex items-center text-gray-600 hover:text-indigo-600 font-medium text-lg transition-colors">
                  <PlayCircle className="w-6 h-6 mr-2" />
                  Watch Demo
                </button>
              </div>
              
              <div className="flex items-center justify-center text-sm text-gray-500 pt-6">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Free forever • 2 pipelines • 10K records/month
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-10 animate-pulse delay-2000"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why SMEs Choose DReflowPro
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built specifically for small and medium enterprises who need enterprise-grade data integration without enterprise complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center p-6"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">5-Minute Setup Promise</h3>
              <p className="text-gray-600">
                Get your first data pipeline running in under 5 minutes. Pre-built templates for 50+ common SME scenarios.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-6"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Agnostic Intelligence</h3>
              <p className="text-gray-600">
                Smart data mapping and transformations using multiple AI providers. No vendor lock-in, optimized costs.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Complete Data Journey</h3>
              <p className="text-gray-600">
                Extract, transform, load, visualize, and share. From pipeline to PowerPoint in one platform.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">50+</div>
              <div className="text-gray-600">Popular Connectors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">5min</div>
              <div className="text-gray-600">Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">99.5%</div>
              <div className="text-gray-600">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">$49</div>
              <div className="text-gray-600">Starting From</div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Integrations */}
      <section className="py-20 bg-gradient-to-r from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Connect Your Favorite Tools
            </h2>
            <p className="text-lg text-gray-600">
              50+ pre-built connectors for the most popular SME tools
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            {[
              'QuickBooks', 'Shopify', 'Salesforce', 'Google Analytics', 
              'PostgreSQL', 'Stripe', 'HubSpot', 'BigCommerce',
              'Xero', 'WooCommerce', 'Mailchimp', 'Google Sheets'
            ].map((tool, index) => (
              <div 
                key={tool}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow"
              >
                <div className="text-sm font-medium text-gray-700">{tool}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Ready to Transform Your Data?
            </h2>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Join thousands of SMEs already using DReflowPro to make data-driven decisions. 
              Start your free account today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Link 
                href="/signup"
                className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors flex items-center"
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">DReflowPro</span>
              </div>
              <p className="text-gray-400">
                The Canva for Data Integration. Democratizing data analytics for SMEs worldwide.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Templates</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Guides</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Community</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 DReflowPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
