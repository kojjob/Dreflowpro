import { Metadata } from 'next'
import { generateMetadata, generateBreadcrumbSchema } from '../utils/seo'

export const metadata: Metadata = generateMetadata({
  title: 'No-Code ETL Platform for SMEs - 5-Minute Setup',
  description: 'Connect 50+ business tools with our no-code ETL platform. Build data pipelines in 5 minutes, get AI insights, and transform your SME with automated reporting. Start free today.',
  keywords: [
    'no-code ETL platform',
    'SME data integration',
    '5-minute setup',
    'business tool connectors',
    'automated reporting',
    'QuickBooks integration',
    'Shopify data sync',
    'Salesforce ETL',
    'small business analytics',
    'data pipeline automation',
    'AI business insights',
    'real-time data sync',
    'enterprise data tools for SME',
    'affordable ETL solution'
  ],
  url: '/',
  type: 'website'
})

export const dynamic = 'force-static'
export const revalidate = 86400 // 24 hours