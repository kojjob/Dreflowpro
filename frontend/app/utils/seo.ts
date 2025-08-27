import { Metadata } from 'next'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  category?: string
  noIndex?: boolean
  canonical?: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dreflowpro.com'
const siteName = 'DreflowPro'
const defaultTitle = 'DreflowPro - AI-Powered ETL Platform for SMEs'
const defaultDescription = 'Transform your business data with our no-code ETL platform. Connect 50+ integrations, build pipelines in 5 minutes, and get AI-powered insights. Perfect for SMEs.'
const defaultImage = `${baseUrl}/images/og-image.jpg`

export function generateMetadata({
  title,
  description = defaultDescription,
  keywords = [],
  image = defaultImage,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  category,
  noIndex = false,
  canonical,
}: SEOProps = {}): Metadata {
  const pageTitle = title ? `${title} | ${siteName}` : defaultTitle
  const pageUrl = url ? `${baseUrl}${url}` : baseUrl
  const canonicalUrl = canonical || pageUrl

  const defaultKeywords = [
    'ETL platform',
    'data integration',
    'business intelligence',
    'data pipeline',
    'SME data tools',
    'no-code ETL',
    'AI-powered analytics',
    'data transformation',
    'business automation',
    'data connectors'
  ]

  const allKeywords = [...defaultKeywords, ...keywords]

  const metadata: Metadata = {
    title: pageTitle,
    description,
    keywords: allKeywords.join(', '),
    authors: [{ name: author || 'DreflowPro Team' }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type,
      title: pageTitle,
      description,
      url: pageUrl,
      siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title || defaultTitle,
        }
      ],
      locale: 'en_US',
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(author && { authors: [author] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [image],
      creator: '@dreflowpro',
      site: '@dreflowpro',
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    ...(category && {
      category,
    }),
  }

  return metadata
}

export function generateStructuredData(type: string, data: any) {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  }

  return JSON.stringify(baseStructuredData)
}

// Specific structured data generators
export function generateOrganizationSchema() {
  return generateStructuredData('Organization', {
    name: siteName,
    url: baseUrl,
    logo: `${baseUrl}/images/logo.png`,
    description: defaultDescription,
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/dreflowpro',
      'https://linkedin.com/company/dreflowpro',
      'https://github.com/dreflowpro'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-0123',
      contactType: 'customer service',
      availableLanguage: ['English']
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US'
    }
  })
}

export function generateSoftwareApplicationSchema() {
  return generateStructuredData('SoftwareApplication', {
    name: siteName,
    description: defaultDescription,
    url: baseUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      priceValidUntil: '2025-12-31',
      availability: 'https://schema.org/InStock'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1'
    },
    featureList: [
      'No-code data pipeline builder',
      '50+ pre-built connectors',
      'AI-powered data insights',
      'Real-time data synchronization',
      'Advanced analytics dashboard',
      'Enterprise-grade security'
    ]
  })
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return generateStructuredData('BreadcrumbList', {
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`
    }))
  })
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return generateStructuredData('FAQPage', {
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  })
}

export function generateArticleSchema({
  headline,
  description,
  author,
  publishedDate,
  modifiedDate,
  image,
  url
}: {
  headline: string
  description: string
  author: string
  publishedDate: string
  modifiedDate?: string
  image: string
  url: string
}) {
  return generateStructuredData('Article', {
    headline,
    description,
    author: {
      '@type': 'Person',
      name: author
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/logo.png`
      }
    },
    datePublished: publishedDate,
    dateModified: modifiedDate || publishedDate,
    image,
    url: `${baseUrl}${url}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}${url}`
    }
  })
}