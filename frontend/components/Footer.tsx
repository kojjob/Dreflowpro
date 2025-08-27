"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Mail, 
  Phone, 
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Youtube,
  Instagram,
  Facebook,
  ExternalLink,
  ArrowRight
} from 'lucide-react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [isSubscribing, setIsSubscribing] = useState(false)

  const currentYear = new Date().getFullYear()

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubscribing(true)
    
    // Simulate newsletter subscription
    setTimeout(() => {
      setIsSubscribing(false)
      setEmail('')
      // You could add toast notification here
    }, 1500)
  }

  const navigationLinks = {
    product: [
      { name: 'Features', href: '/features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'API Documentation', href: '/docs' },
      { name: 'Integrations', href: '/integrations' },
      { name: 'Security', href: '/security' },
      { name: 'Changelog', href: '/changelog' }
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press Kit', href: '/press' },
      { name: 'Partners', href: '/partners' },
      { name: 'Contact', href: '/contact' },
      { name: 'Blog', href: '/blog' }
    ],
    resources: [
      { name: 'Help Center', href: '/help' },
      { name: 'Community', href: '/community' },
      { name: 'Tutorials', href: '/tutorials' },
      { name: 'Webinars', href: '/webinars' },
      { name: 'Case Studies', href: '/case-studies' },
      { name: 'Templates', href: '/templates' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'GDPR', href: '/gdpr' },
      { name: 'Compliance', href: '/compliance' },
      { name: 'DPA', href: '/dpa' }
    ]
  }

  const socialLinks = [
    { 
      name: 'Twitter', 
      href: 'https://twitter.com/datareflow', 
      icon: Twitter,
      color: 'hover:text-blue-400'
    },
    { 
      name: 'LinkedIn', 
      href: 'https://linkedin.com/company/datareflow', 
      icon: Linkedin,
      color: 'hover:text-blue-600'
    },
    { 
      name: 'GitHub', 
      href: 'https://github.com/datareflow', 
      icon: Github,
      color: 'hover:text-gray-300'
    },
    { 
      name: 'YouTube', 
      href: 'https://youtube.com/@datareflow', 
      icon: Youtube,
      color: 'hover:text-red-500'
    },
    { 
      name: 'Instagram', 
      href: 'https://instagram.com/datareflow', 
      icon: Instagram,
      color: 'hover:text-pink-400'
    }
  ]

  const contactInfo = {
    email: 'hello@datareflow.com',
    phone: '+1 (555) 123-4567',
    address: '123 Data Street, Analytics City, CA 94105'
  }

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Company Info & Newsletter */}
          <div className="lg:col-span-2">
            {/* Logo & Description */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 relative">
                <Image
                  src="/datareflow-logo.png"
                  alt="DataReflow Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
                DataReflow
              </span>
            </div>
            
            <p className="text-gray-300 mb-6 text-lg leading-relaxed">
              Empowering SMEs with enterprise-grade ETL/ELT data automation. 
              Transform your business with the power of automated data workflows.
            </p>

            {/* Contact Information */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center space-x-3 text-gray-300">
                <Mail className="w-5 h-5 text-brand-400" />
                <a href={`mailto:${contactInfo.email}`} className="hover:text-brand-400 transition-colors">
                  {contactInfo.email}
                </a>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Phone className="w-5 h-5 text-brand-400" />
                <a href={`tel:${contactInfo.phone}`} className="hover:text-brand-400 transition-colors">
                  {contactInfo.phone}
                </a>
              </div>
              <div className="flex items-start space-x-3 text-gray-300">
                <MapPin className="w-5 h-5 text-brand-400 mt-0.5" />
                <span>{contactInfo.address}</span>
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 text-white">Stay Updated</h3>
              <p className="text-gray-400 mb-4">
                Get the latest DataReflow news, product updates, and data insights.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-6 py-3 rounded-lg font-medium hover:from-brand-700 hover:to-brand-600 transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                >
                  {isSubscribing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Follow Us</h3>
              <div className="flex space-x-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 bg-gray-800 rounded-lg text-gray-400 ${social.color} transition-all duration-200 hover:bg-gray-700 hover:scale-105`}
                      aria-label={`Follow us on ${social.name}`}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              
              {/* Product Links */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Product</h3>
                <ul className="space-y-3">
                  {navigationLinks.product.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-brand-400 transition-colors flex items-center group"
                      >
                        <span>{link.name}</span>
                        <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Links */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Company</h3>
                <ul className="space-y-3">
                  {navigationLinks.company.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-brand-400 transition-colors flex items-center group"
                      >
                        <span>{link.name}</span>
                        {link.href.startsWith('http') && (
                          <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources Links */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Resources</h3>
                <ul className="space-y-3">
                  {navigationLinks.resources.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-brand-400 transition-colors flex items-center group"
                      >
                        <span>{link.name}</span>
                        <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Links */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Legal</h3>
                <ul className="space-y-3">
                  {navigationLinks.legal.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-brand-400 transition-colors flex items-center group"
                      >
                        <span>{link.name}</span>
                        <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            
            {/* Copyright */}
            <div className="text-gray-400 text-sm">
              © {currentYear} DataReflow, Inc. All rights reserved.
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center space-x-6 text-sm">
              <Link href="/status" className="text-gray-400 hover:text-brand-400 transition-colors flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                System Status
              </Link>
              <Link href="/security" className="text-gray-400 hover:text-brand-400 transition-colors">
                Security
              </Link>
              <Link href="/api" className="text-gray-400 hover:text-brand-400 transition-colors">
                API
              </Link>
              <div className="text-gray-500">
                Version 2.1.0
              </div>
            </div>

          </div>
        </div>
      </div>
    </footer>
  )
}