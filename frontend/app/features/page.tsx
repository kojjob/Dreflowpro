"use client"

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

export default function Features() {
  const heroFeatures = [
    {
      icon: Clock,
      title: "5-Minute Setup",
      description: "Get your first data pipeline running in under 5 minutes with our guided setup process."
    },
    {
      icon: Brain,
      title: "AI-Agnostic",
      description: "Use any AI provider - Claude, GPT, Gemini, or local models. No vendor lock-in."
    },
    {
      icon: BarChart3,
      title: "Complete Journey",
      description: "Extract, transform, load, visualize, and share. From pipeline to PowerPoint."
    }
  ]

  const coreFeatures = [
    {
      icon: GitBranch,
      title: "Visual Pipeline Builder",
      description: "Drag-and-drop interface to build complex data pipelines without coding.",
      features: [
        "Intuitive visual editor",
        "Pre-built transformation blocks",
        "Real-time pipeline testing",
        "Version control for pipelines"
      ],
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: Database,
      title: "50+ Pre-Built Connectors",
      description: "Connect to all your favorite business tools with one-click authentication.",
      features: [
        "Popular SaaS tools (Salesforce, HubSpot)",
        "E-commerce platforms (Shopify, WooCommerce)",
        "Financial systems (QuickBooks, Stripe)",
        "Analytics tools (Google Analytics, Mixpanel)"
      ],
      color: "from-green-500 to-teal-500"
    },
    {
      icon: Brain,
      title: "AI-Powered Transformations",
      description: "Smart data mapping and transformations using multiple AI providers.",
      features: [
        "Automatic data type detection",
        "Smart field mapping suggestions",
        "Anomaly detection",
        "Natural language queries"
      ],
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: PieChart,
      title: "Automated Reporting",
      description: "Generate beautiful reports and dashboards automatically.",
      features: [
        "Interactive dashboards",
        "Scheduled report delivery",
        "Mobile-responsive design",
        "White-label options"
      ],
      color: "from-orange-500 to-red-500"
    }
  ]

  const advancedFeatures = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "SOC 2 compliant with end-to-end encryption and enterprise-grade security.",
      details: [
        "End-to-end encryption",
        "SOC 2 Type II certified",
        "GDPR compliant",
        "SSO integration",
        "Role-based access control",
        "Audit logging"
      ]
    },
    {
      icon: Globe,
      title: "Global Scale",
      description: "Multi-region deployment with 99.5% uptime SLA and global availability.",
      details: [
        "Multi-region deployment",
        "99.5% uptime SLA",
        "Auto-scaling infrastructure",
        "CDN-powered delivery",
        "Disaster recovery",
        "24/7 monitoring"
      ]
    },
    {
      icon: RefreshCw,
      title: "Real-Time Processing",
      description: "Process data in real-time with streaming capabilities and instant updates.",
      details: [
        "Real-time data streaming",
        "Event-driven processing",
        "Instant notifications",
        "Live dashboard updates",
        "Webhook support",
        "API-first architecture"
      ]
    },
    {
      icon: Settings,
      title: "Advanced Customization",
      description: "Customize every aspect of your data workflows with advanced configuration options.",
      details: [
        "Custom transformation logic",
        "Flexible scheduling options",
        "Custom field mapping",
        "Advanced filtering",
        "Conditional workflows",
        "Custom integrations"
      ]
    }
  ]

  const integrationCategories = [
    {
      title: "CRM & Sales",
      tools: ["Salesforce", "HubSpot", "Pipedrive", "Zoho CRM", "Close", "Freshsales"],
      color: "bg-blue-50 border-blue-200"
    },
    {
      title: "E-commerce",
      tools: ["Shopify", "WooCommerce", "BigCommerce", "Magento", "Amazon", "eBay"],
      color: "bg-green-50 border-green-200"
    },
    {
      title: "Finance & Accounting",
      tools: ["QuickBooks", "Xero", "Stripe", "PayPal", "Square", "FreshBooks"],
      color: "bg-orange-50 border-orange-200"
    },
    {
      title: "Marketing",
      tools: ["Google Analytics", "Mailchimp", "Klaviyo", "Facebook Ads", "Google Ads", "Mixpanel"],
      color: "bg-purple-50 border-purple-200"
    },
    {
      title: "Productivity",
      tools: ["Google Sheets", "Airtable", "Notion", "Slack", "Microsoft 365", "Zapier"],
      color: "bg-pink-50 border-pink-200"
    },
    {
      title: "Databases",
      tools: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Snowflake", "BigQuery"],
      color: "bg-indigo-50 border-indigo-200"
    }
  ]

  const useCases = [
    {
      title: "Sales Pipeline Analytics",
      description: "Track leads from first contact to closing, with real-time insights into conversion rates and sales performance.",
      icon: Target,
      metrics: ["40% faster lead qualification", "25% higher conversion rates", "Real-time sales forecasting"]
    },
    {
      title: "Customer 360 View",
      description: "Unify customer data from all touchpoints to create comprehensive customer profiles and improve experiences.",
      icon: Users,
      metrics: ["Complete customer timeline", "Cross-channel behavior tracking", "Personalized experiences"]
    },
    {
      title: "Financial Reporting",
      description: "Automate financial reporting with real-time data from accounting, payment, and e-commerce systems.",
      icon: FileText,
      metrics: ["75% time saved on reporting", "Real-time financial insights", "Automated compliance reports"]
    },
    {
      title: "Inventory Optimization",
      description: "Optimize inventory levels by connecting sales, warehouse, and supplier data for better demand forecasting.",
      icon: Layers,
      metrics: ["30% reduction in stockouts", "20% lower carrying costs", "Predictive restocking alerts"]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium mb-6">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                All Features
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Everything You Need for
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Data Integration Success
                </span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                From simple data connections to advanced AI-powered transformations, 
                DReflowPro provides all the tools your business needs to turn data into insights.
              </p>
            </motion.div>
          </div>

          {/* Hero Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-16">
            {heroFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                  <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden sm:block absolute top-20 left-10 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="hidden sm:block absolute top-40 right-20 w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
      </section>

      {/* Core Features */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Core Features</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Powerful features designed specifically for small and medium enterprises.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {coreFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-lg border border-gray-100"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-base sm:text-lg text-gray-600 mb-6">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center text-sm sm:text-base text-gray-600">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Advanced Capabilities</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Enterprise-grade features that scale with your business growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {advancedFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
              >
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {feature.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                      {detail}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">50+ Pre-Built Integrations</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Connect to all your favorite business tools with one-click authentication and instant setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {integrationCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`${category.color} border p-6 rounded-2xl`}
              >
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{category.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {category.tools.map((tool) => (
                    <span
                      key={tool}
                      className="px-3 py-1 bg-white text-gray-700 text-sm rounded-full border border-gray-200"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Real-World Use Cases</h2>
            <p className="text-base sm:text-lg text-indigo-100 max-w-3xl mx-auto">
              See how DReflowPro transforms business operations across different scenarios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-white/20 to-white/10 rounded-xl flex items-center justify-center mb-6">
                  <useCase.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">{useCase.title}</h3>
                <p className="text-indigo-100 mb-6">{useCase.description}</p>
                <div className="space-y-2">
                  {useCase.metrics.map((metric, idx) => (
                    <div key={idx} className="flex items-center text-sm text-indigo-200">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-400 flex-shrink-0" />
                      {metric}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
              Ready to Experience All These Features?
            </h2>
            <p className="text-base sm:text-lg text-indigo-100 max-w-2xl mx-auto">
              Start your free trial today and see how DReflowPro can transform your data workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="/signup"
                className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                Start Free Trial
                <Zap className="w-5 h-5 ml-2" />
              </a>
              <a
                href="/contact"
                className="text-white hover:text-indigo-100 font-medium text-lg transition-colors flex items-center border-b-2 border-transparent hover:border-white"
              >
                Schedule a Demo
              </a>
            </div>
            <div className="flex items-center justify-center text-sm text-indigo-100 pt-4">
              <CheckCircle className="w-4 h-4 mr-2" />
              No credit card required • 5-minute setup • Cancel anytime
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}