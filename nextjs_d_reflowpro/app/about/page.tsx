"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { 
  Target, 
  Users, 
  Globe, 
  Lightbulb,
  Heart,
  Shield,
  TrendingUp,
  CheckCircle,
  Sparkles
} from "lucide-react"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export default function About() {
  const values = [
    {
      icon: Users,
      title: "Customer First",
      description: "Every decision we make starts with how it benefits our SME customers.",
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We constantly push the boundaries of what's possible in data integration.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Shield,
      title: "Security & Trust",
      description: "Your data security is our top priority. SOC 2 compliant with enterprise-grade encryption.",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: Heart,
      title: "Simplicity",
      description: "Complex problems deserve simple solutions. We make data integration effortless.",
      color: "from-pink-500 to-rose-500"
    }
  ]

  const team = [
    {
      name: "Sarah Chen",
      role: "CEO & Co-Founder",
      background: "Former VP of Data at TechCorp. 15+ years in enterprise data solutions.",
      initials: "SC"
    },
    {
      name: "Michael Rodriguez",
      role: "CTO & Co-Founder", 
      background: "Ex-Google Cloud architect. Built data platforms serving millions of users.",
      initials: "MR"
    },
    {
      name: "Emily Johnson",
      role: "Head of Product",
      background: "Former Salesforce PM. Expert in SME workflows and user experience design.",
      initials: "EJ"
    },
    {
      name: "David Kim",
      role: "Head of Engineering",
      background: "Former Amazon senior engineer. Specialized in scalable AI systems.",
      initials: "DK"
    }
  ]

  const milestones = [
    {
      year: "2023",
      title: "Founded",
      description: "DataReflow was born from the frustration of seeing SMEs struggle with expensive, complex data tools."
    },
    {
      year: "2023",
      title: "First Customers",
      description: "Onboarded our first 100 SME customers, validating the 5-minute setup promise."
    },
    {
      year: "2024",
      title: "AI Integration",
      description: "Launched AI-agnostic platform supporting Claude, GPT, Gemini, and local models."
    },
    {
      year: "2024",
      title: "Scale",
      description: "Now serving 10,000+ businesses across 50+ countries with 99.5% uptime."
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
                Our Story
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Democratizing Data Analytics for
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Small & Medium Enterprises
                </span>
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                We believe every business, regardless of size, deserves access to enterprise-grade data tools. 
                That&rsquo;s why we built DataReflow - the first AI-agnostic ETL/ELT platform designed specifically for SMEs.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden sm:block absolute top-20 left-10 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="hidden sm:block absolute top-40 right-20 w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse delay-1000"></div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                To eliminate the technical barriers that prevent small and medium enterprises from 
                leveraging their data for growth. We're building the "Canva for Data Integration" - 
                making complex data workflows as simple as drag and drop.
              </p>
              <div className="space-y-3">
                <div className="flex items-center text-sm sm:text-base text-gray-600">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-indigo-500 flex-shrink-0" />
                  Enterprise features at SME pricing
                </div>
                <div className="flex items-center text-sm sm:text-base text-gray-600">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-indigo-500 flex-shrink-0" />
                  5-minute setup, no technical expertise required
                </div>
                <div className="flex items-center text-sm sm:text-base text-gray-600">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-indigo-500 flex-shrink-0" />
                  AI-agnostic platform avoiding vendor lock-in
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                A world where every business can compete on equal footing, powered by data-driven insights. 
                We envision SMEs with the same analytical capabilities as Fortune 500 companies, 
                democratizing business intelligence globally.
              </p>
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-2xl border border-green-100">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">10K+</div>
                    <div className="text-xs sm:text-sm text-gray-600">Businesses Served</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1">50+</div>
                    <div className="text-xs sm:text-sm text-gray-600">Countries</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              The principles that guide every decision we make and every feature we build.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${value.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <value.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Leadership Team</h2>
            <p className="text-base sm:text-lg text-indigo-100 max-w-3xl mx-auto">
              Experienced leaders from top tech companies, united by a passion for democratizing data analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg sm:text-xl font-bold text-white">{member.initials}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-sm sm:text-base text-indigo-300 mb-3">{member.role}</p>
                <p className="text-xs sm:text-sm text-indigo-100">{member.background}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Our Journey</h2>
            <p className="text-base sm:text-lg text-gray-600">
              From frustration to solution - the story of DataReflow's growth.
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500"></div>

            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.year}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative pl-12 sm:pl-20 pb-8 sm:pb-12"
              >
                <div className="absolute left-2 sm:left-6 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full border-4 border-white shadow-lg"></div>
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100">
                  <div className="flex items-center mb-3">
                    <span className="bg-gradient-to-r from-brand-600 to-brand-400 text-white px-3 py-1 rounded-full text-sm font-semibold mr-3">
                      {milestone.year}
                    </span>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{milestone.title}</h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600">{milestone.description}</p>
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
              Ready to Join Our Mission?
            </h2>
            <p className="text-base sm:text-lg text-indigo-100 max-w-2xl mx-auto">
              Be part of the data democratization movement. Start transforming your business with DataReflow today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="/signup"
                className="bg-white text-indigo-600 px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                Start Free Trial
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </a>
              <a
                href="/contact"
                className="text-white hover:text-indigo-100 font-medium text-base sm:text-lg transition-colors flex items-center border-b-2 border-transparent hover:border-white"
              >
                Get in Touch
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}