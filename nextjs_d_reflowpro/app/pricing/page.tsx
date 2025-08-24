"use client"

import { useState } from 'react'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { 
  Check, 
  X, 
  Star,
  Users,
  Database,
  Zap,
  Shield,
  Headphones,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses getting started with data automation",
      monthlyPrice: 49,
      annualPrice: 490, // ~17% discount
      features: [
        "Up to 5 data sources",
        "10GB data processing/month",
        "Basic pipeline templates",
        "Email support",
        "Data transformation tools",
        "Real-time monitoring",
        "Basic reporting dashboard"
      ],
      limitations: [
        "No custom integrations",
        "Limited to 10 active pipelines",
        "Standard support only"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      description: "Ideal for growing businesses with complex data needs",
      monthlyPrice: 149,
      annualPrice: 1490, // ~17% discount
      features: [
        "Up to 25 data sources",
        "100GB data processing/month",
        "Advanced pipeline builder",
        "Priority email + chat support",
        "Custom transformations",
        "Advanced scheduling",
        "Detailed analytics",
        "API access",
        "Data quality monitoring",
        "Team collaboration (5 users)",
        "Custom connectors"
      ],
      limitations: [
        "Limited to 50 active pipelines",
        "Standard SLA"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      description: "For large organizations requiring maximum scalability and control",
      monthlyPrice: 499,
      annualPrice: 4990, // ~17% discount
      features: [
        "Unlimited data sources",
        "1TB+ data processing/month",
        "White-label solutions",
        "24/7 phone + priority support",
        "Advanced security & compliance",
        "Dedicated success manager",
        "Custom integration development",
        "On-premise deployment option",
        "Advanced monitoring & alerting",
        "Unlimited users",
        "SLA guarantee (99.9% uptime)",
        "Custom training sessions",
        "Priority feature requests"
      ],
      limitations: [],
      popular: false,
      cta: "Contact Sales"
    }
  ]

  const addOns = [
    {
      name: "Additional Data Processing",
      description: "Extra GB of data processing capacity",
      price: "$0.10/GB"
    },
    {
      name: "Premium Support",
      description: "24/7 phone support with 1-hour response time",
      price: "$199/month"
    },
    {
      name: "Custom Integration",
      description: "Dedicated development for unique data sources",
      price: "From $2,999"
    },
    {
      name: "Professional Services",
      description: "Implementation and training services",
      price: "From $1,999"
    }
  ]

  const faqs = [
    {
      question: "What's included in the free trial?",
      answer: "All free trials include full access to Starter or Professional plan features for 14 days, with up to 5GB of data processing. No credit card required to start."
    },
    {
      question: "Can I change plans anytime?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
    },
    {
      question: "What happens if I exceed my data processing limit?",
      answer: "We'll notify you when you approach your limit. You can either upgrade your plan or purchase additional processing capacity as needed."
    },
    {
      question: "Do you offer annual discounts?",
      answer: "Yes! Annual billing saves you approximately 17% compared to monthly billing. Plus, you get priority support and early access to new features."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade encryption, SOC2 compliance, and follow industry best practices. Your data never leaves your control, and we offer on-premise deployment for Enterprise customers."
    },
    {
      question: "Can I integrate custom data sources?",
      answer: "Professional and Enterprise plans include API access and custom connector capabilities. Enterprise customers get dedicated integration development support."
    },
    {
      question: "What kind of support do you provide?",
      answer: "Support varies by plan: Starter gets email support, Professional adds chat support, and Enterprise includes 24/7 phone support with a dedicated success manager."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, we'll provide a full refund, no questions asked."
    }
  ]

  const getPrice = (plan: typeof plans[0]) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.annualPrice / 12)
  }

  const getSavings = (plan: typeof plans[0]) => {
    if (billingCycle === 'annually') {
      const yearlySavings = (plan.monthlyPrice * 12) - plan.annualPrice
      return Math.round((yearlySavings / (plan.monthlyPrice * 12)) * 100)
    }
    return 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-12">
            Choose the perfect plan for your data automation needs. 
            All plans include a 14-day free trial and 30-day money-back guarantee.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-16">
            <span className={`mr-3 ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annually' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'annually' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${billingCycle === 'annually' ? 'text-gray-900' : 'text-gray-500'}`}>
              Annually
            </span>
            {billingCycle === 'annually' && (
              <span className="ml-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                Save up to 17%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 shadow-xl ${
                  plan.popular
                    ? 'bg-gradient-to-br from-brand-600 to-brand-400 text-white transform scale-105'
                    : 'bg-white'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-400 to-pink-400 px-4 py-2 text-sm font-medium text-white shadow-lg">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-base mb-4 ${plan.popular ? 'text-indigo-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                  <div className="flex items-baseline">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      ${getPrice(plan)}
                    </span>
                    <span className={`ml-2 ${plan.popular ? 'text-indigo-100' : 'text-gray-600'}`}>
                      /month
                    </span>
                  </div>
                  {billingCycle === 'annually' && getSavings(plan) > 0 && (
                    <p className={`text-sm mt-1 ${plan.popular ? 'text-indigo-100' : 'text-green-600'}`}>
                      Save {getSavings(plan)}% with annual billing
                    </p>
                  )}
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className={`w-5 h-5 mr-3 mt-0.5 ${plan.popular ? 'text-indigo-200' : 'text-green-500'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-indigo-50' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, limitIndex) => (
                    <li key={`limit-${limitIndex}`} className="flex items-start">
                      <X className={`w-5 h-5 mr-3 mt-0.5 ${plan.popular ? 'text-indigo-300' : 'text-gray-400'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {limitation}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-center transition-all duration-300 flex items-center justify-center ${
                    plan.popular
                      ? 'bg-white text-indigo-600 hover:bg-gray-50 hover:shadow-lg'
                      : 'bg-gradient-to-r from-brand-600 to-brand-400 text-white hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Add-ons & Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Enhance your plan with additional features and professional services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOns.map((addon, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {addon.name}
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  {addon.description}
                </p>
                <div className="text-lg font-bold text-indigo-600">
                  {addon.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Enterprise?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get enterprise-grade features, security, and support for mission-critical data operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Advanced Security",
                description: "SOC2 compliance, end-to-end encryption, and on-premise deployment options"
              },
              {
                icon: Users,
                title: "Dedicated Support",
                description: "24/7 phone support, dedicated success manager, and custom training sessions"
              },
              {
                icon: Database,
                title: "Unlimited Scale",
                description: "Process terabytes of data with unlimited sources and custom integrations"
              },
              {
                icon: Zap,
                title: "99.9% SLA",
                description: "Enterprise-grade uptime guarantee with priority infrastructure"
              },
              {
                icon: Headphones,
                title: "White-label Solutions",
                description: "Fully customizable platform that matches your brand and requirements"
              },
              {
                icon: Star,
                title: "Priority Features",
                description: "Influence our roadmap and get early access to new capabilities"
              }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-600 to-brand-400 rounded-2xl mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button className="bg-gradient-to-r from-brand-600 to-brand-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all duration-300 flex items-center mx-auto">
              Schedule Enterprise Demo
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-brand-600 to-brand-400">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Data Operations?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Start your free 14-day trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button className="border border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-indigo-600 transition-all duration-300 flex items-center justify-center">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}