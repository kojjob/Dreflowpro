import { Metadata } from 'next'
import { generateMetadata, generateStructuredData, generateBreadcrumbSchema } from '../utils/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Pricing - Affordable ETL Platform Plans Starting Free',
  description: 'Transparent ETL platform pricing for SMEs. Start free with 2 pipelines and 10K records. Pro plans from $49/month. No hidden fees, cancel anytime.',
  keywords: [
    'ETL platform pricing',
    'affordable data integration',
    'SME pricing plans',
    'free ETL trial',
    'data pipeline costs',
    'business intelligence pricing',
    'no hidden fees',
    'monthly subscription',
    'startup friendly pricing'
  ],
  url: '/pricing',
})

const breadcrumbSchema = generateBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'Pricing', url: '/pricing' }
])

const pricingSchema = generateStructuredData('Product', {
  name: 'DreflowPro ETL Platform',
  description: 'No-code ETL platform for small and medium enterprises',
  brand: {
    '@type': 'Brand',
    name: 'DreflowPro'
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Free Plan',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      description: '2 pipelines, 10K records/month, community support',
      eligibleQuantity: {
        '@type': 'QuantitativeValue',
        value: 1
      }
    },
    {
      '@type': 'Offer',
      name: 'Pro Plan',
      price: '49',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '49',
        priceCurrency: 'USD',
        billingIncrement: 'P1M'
      },
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      description: '10 pipelines, 100K records/month, priority support'
    },
    {
      '@type': 'Offer',
      name: 'Business Plan',
      price: '149',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '149',
        priceCurrency: 'USD',
        billingIncrement: 'P1M'
      },
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      description: 'Unlimited pipelines, 1M records/month, dedicated support'
    }
  ]
})

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbSchema }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pricingSchema }}
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
                  <li><span className="text-gray-900 font-medium">Pricing</span></li>
                </ol>
              </nav>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Simple, Transparent <span className="text-indigo-600">Pricing</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Start free and scale as you grow. No hidden fees, no setup costs, 
                no long-term contracts. Cancel anytime.
              </p>
              <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">💸 Save 20% with annual billing</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Free Plan */}
              <div className="bg-white rounded-2xl shadow-sm border p-8 relative">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-600 mb-6">Perfect for getting started</p>
                  
                  <ul className="text-left space-y-3 mb-8">
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      2 active pipelines
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      10K records per month
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Basic connectors
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Community support
                    </li>
                  </ul>
                  
                  <button className="w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                    Start Free
                  </button>
                </div>
              </div>

              {/* Pro Plan - Most Popular */}
              <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-500 p-8 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">$49</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-600 mb-6">For growing businesses</p>
                  
                  <ul className="text-left space-y-3 mb-8">
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      10 active pipelines
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      100K records per month
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      All premium connectors
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      AI-powered insights
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Priority email support
                    </li>
                  </ul>
                  
                  <button className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                    Start Pro Trial
                  </button>
                </div>
              </div>

              {/* Business Plan */}
              <div className="bg-white rounded-2xl shadow-sm border p-8 relative">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Business</h3>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">$149</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-gray-600 mb-6">For scaling enterprises</p>
                  
                  <ul className="text-left space-y-3 mb-8">
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Unlimited pipelines
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      1M records per month
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Enterprise connectors
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Advanced AI features
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      Dedicated support
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      SLA guarantee
                    </li>
                  </ul>
                  
                  <button className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                    Contact Sales
                  </button>
                </div>
              </div>
              
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
