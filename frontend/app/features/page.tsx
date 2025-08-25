import { motion } from "framer-motion"
import { 
  Database, 
  Zap, 
  Brain, 
  Shield, 
  Clock, 
  Users,
  BarChart3,
  CheckCircle,
  Sparkles,
  Globe,
  Smartphone,
  Monitor,
  GitBranch,
  Workflow,
  PieChart,
  RefreshCw,
  Settings,
  FileText,
  Share2,
  Lock,
  Cloud,
  Layers,
  Target
} from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { Metadata } from 'next'
import { generateMetadata, generateStructuredData, generateBreadcrumbSchema } from '../utils/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Features - AI-Powered ETL Platform Features for SMEs',
  description: 'Discover powerful ETL features: 50+ connectors, no-code pipeline builder, AI insights, real-time sync, automated reporting. Perfect for small businesses scaling their data operations.',
  keywords: [
    'ETL platform features',
    'no-code data pipeline',
    'business connectors',
    'AI data insights',
    'real-time data sync',
    'automated reporting',
    'data transformation tools',
    'SME analytics platform',
    'visual pipeline builder',
    'enterprise data features'
  ],
  url: '/features',
})

const breadcrumbSchema = generateBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'Features', url: '/features' }
])

const featureListSchema = generateStructuredData('ItemList', {
  name: 'DreflowPro Features',
  description: 'Complete list of ETL platform features for SMEs',
  numberOfItems: 6,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: '50+ Pre-built Connectors',
      description: 'Connect to popular business tools like QuickBooks, Shopify, Salesforce'
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'No-Code Pipeline Builder',
      description: 'Visual drag-and-drop interface for creating data pipelines'
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'AI-Powered Insights',
      description: 'Automated data analysis and intelligent recommendations'
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: 'Real-time Data Sync',
      description: 'Live data synchronization across all your business systems'
    },
    {
      '@type': 'ListItem',
      position: 5,
      name: 'Automated Reporting',
      description: 'Generate and schedule reports automatically'
    },
    {
      '@type': 'ListItem',
      position: 6,
      name: 'Enterprise Security',
      description: 'Bank-grade security with encryption and compliance'
    }
  ]
})

export default function FeaturesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbSchema }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: featureListSchema }}
      />
      
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Hero Section */}
        <section className="pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <nav className="flex justify-center mb-8" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li><a href="/" className="text-gray-500 hover:text-indigo-600">Home</a></li>
                  <li><span className="text-gray-400 mx-2">/</span></li>
                  <li><span className="text-gray-900 font-medium">Features</span></li>
                </ol>
              </nav>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Powerful ETL Features for <span className="text-indigo-600">Growing SMEs</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Everything you need to transform your business data into actionable insights. 
                No technical expertise required – just connect, transform, and analyze.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature cards would go here */}
              <div className="bg-white p-8 rounded-xl shadow-sm border">
                <h3 className="text-2xl font-bold mb-4">50+ Pre-built Connectors</h3>
                <p className="text-gray-600 mb-4">
                  Connect to all your favorite business tools in minutes. From accounting software 
                  to e-commerce platforms, we've got you covered.
                </p>
                <ul className="text-sm text-gray-500">
                  <li>• QuickBooks & Xero integration</li>
                  <li>• Shopify & WooCommerce sync</li>
                  <li>• Salesforce & HubSpot CRM</li>
                  <li>• Google Analytics & Facebook Ads</li>
                </ul>
              </div>
              
              {/* Add more feature cards */}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
