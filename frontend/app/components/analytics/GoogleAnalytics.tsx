'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    // Load Google Analytics script
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.async = true
    document.head.appendChild(script)

    // Initialize gtag
    window.gtag = function() {
      // eslint-disable-next-line prefer-rest-params
      (window as any).dataLayer = (window as any).dataLayer || []
      // eslint-disable-next-line prefer-rest-params
      ;(window as any).dataLayer.push(arguments)
    }

    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    })
  }, [GA_MEASUREMENT_ID])

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !window.gtag) return

    const url = pathname + searchParams.toString()
    
    // Track page views
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: document.title,
    })

    // Track Core Web Vitals
    if ('web-vital' in window) {
      // This would integrate with web-vitals library
      // trackWebVitals()
    }
  }, [pathname, searchParams, GA_MEASUREMENT_ID])

  return null
}

export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...parameters,
      event_category: 'engagement',
      event_label: parameters?.label || '',
      value: parameters?.value || 0,
    })
  }
}

// SEO-specific tracking events
export const SEOEvents = {
  signupStart: () => trackEvent('signup_start', { event_category: 'conversion' }),
  signupComplete: () => trackEvent('signup_complete', { event_category: 'conversion' }),
  pricingView: (plan: string) => trackEvent('pricing_view', { plan, event_category: 'engagement' }),
  featureClick: (feature: string) => trackEvent('feature_click', { feature, event_category: 'engagement' }),
  demoRequest: () => trackEvent('demo_request', { event_category: 'lead' }),
  integrationView: (connector: string) => trackEvent('integration_view', { connector, event_category: 'product' }),
  pipelineCreate: () => trackEvent('pipeline_create', { event_category: 'product' }),
  searchQuery: (query: string) => trackEvent('search', { search_term: query, event_category: 'site_search' }),
}

// Performance monitoring for SEO
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Measure and report Core Web Vitals
    if ('performance' in window) {
      // Largest Contentful Paint (LCP)
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            trackEvent('web_vital_lcp', { 
              value: Math.round(entry.startTime),
              event_category: 'performance' 
            })
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        // Fallback for browsers that don't support the observer
      }

      // First Input Delay (FID) - approximation
      let firstInputDelay: number | null = null
      
      const measureFID = (event: Event) => {
        if (firstInputDelay === null) {
          firstInputDelay = performance.now() - (event as any).timeStamp
          trackEvent('web_vital_fid', { 
            value: Math.round(firstInputDelay),
            event_category: 'performance' 
          })
          
          // Remove listener after first measurement
          document.removeEventListener('click', measureFID, true)
          document.removeEventListener('keydown', measureFID, true)
        }
      }
      
      document.addEventListener('click', measureFID, true)
      document.addEventListener('keydown', measureFID, true)

      // Cumulative Layout Shift (CLS) - basic implementation
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
      })
      
      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        
        // Report CLS after page load
        window.addEventListener('beforeunload', () => {
          trackEvent('web_vital_cls', { 
            value: Math.round(clsValue * 1000),
            event_category: 'performance' 
          })
        })
      } catch (e) {
        // Fallback for browsers that don't support layout-shift
      }
    }
  }, [])
}