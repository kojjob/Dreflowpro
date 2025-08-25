"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
  HeadphonesIcon,
  Globe,
  Sparkles
} from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
      setFormData({ name: '', email: '', company: '', subject: '', message: '' })
    }, 2000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      details: "support@dreflowpro.com",
      description: "Send us an email anytime",
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: MessageSquare,
      title: "Live Chat",
      details: "24/7 Support",
      description: "Chat with our support team",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: Phone,
      title: "Phone",
      details: "+1 (555) 123-4567",
      description: "Mon-Fri 9AM-6PM EST",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: MapPin,
      title: "Office",
      details: "San Francisco, CA",
      description: "Visit us in the Bay Area",
      color: "from-purple-500 to-pink-500"
    }
  ]

  const faqItems = [
    {
      question: "How quickly can I get started?",
      answer: "You can have your first data pipeline running in under 5 minutes with our guided setup process."
    },
    {
      question: "Do you offer custom integrations?",
      answer: "Yes! We can build custom connectors for your specific business tools within 2-4 weeks."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We're SOC 2 compliant with enterprise-grade encryption and security measures."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees."
    }
  ]

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-lg mx-auto px-4"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Message Sent!</h2>
            <p className="text-base sm:text-lg text-gray-600 mb-8">
              Thank you for reaching out. Our team will get back to you within 24 hours.
            </p>
            <button
              onClick={() => setIsSubmitted(false)}
              className="bg-gradient-to-r from-brand-600 to-brand-400 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
            >
              Send Another Message
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

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
                Get in Touch
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                We're Here to
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Help You Succeed
                </span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Have questions about DReflowPro? Need help getting started? 
                Our team of experts is ready to support your data integration journey.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden sm:block absolute top-20 left-10 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="hidden sm:block absolute top-40 right-20 w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {contactInfo.map((info, index) => (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${info.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <info.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{info.title}</h3>
                <p className="text-sm sm:text-base font-medium text-indigo-600 mb-1">{info.details}</p>
                <p className="text-xs sm:text-sm text-gray-500">{info.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & FAQ */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        placeholder="your@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      placeholder="Your company name"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select a subject</option>
                      <option value="sales">Sales Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="demo">Request a Demo</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-brand-600 to-brand-400 hover:shadow-lg'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* FAQ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600">
                    Quick answers to common questions about DReflowPro.
                  </p>
                </div>

                <div className="space-y-6">
                  {faqItems.map((item, index) => (
                    <motion.div
                      key={item.question}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.question}</h3>
                      <p className="text-gray-600">{item.answer}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <HeadphonesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Immediate Help?</h3>
                      <p className="text-gray-600 mb-4">
                        Our support team is available 24/7 to help you with any questions or technical issues.
                      </p>
                      <a
                        href="mailto:support@dreflowpro.com"
                        className="inline-flex items-center bg-gradient-to-r from-brand-600 to-brand-400 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                      >
                        Contact Support
                        <Mail className="w-4 h-4 ml-2" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}