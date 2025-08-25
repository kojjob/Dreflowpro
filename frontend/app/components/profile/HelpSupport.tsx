'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Book, 
  Video, 
  MessageCircle, 
  Mail, 
  Phone, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  FileText,
  Lightbulb,
  Star,
  Activity,
  Zap,
  Database,
  Settings,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

interface SupportTicket {
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  email: string;
}

interface FeatureRequest {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  email: string;
}

const HelpSupport: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'faq' | 'docs' | 'videos' | 'contact' | 'status' | 'feature-request'>('faq');
  const [supportTicket, setSupportTicket] = useState<SupportTicket>({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general',
    email: ''
  });
  const [featureRequest, setFeatureRequest] = useState<FeatureRequest>({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    email: ''
  });

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'How do I create my first data pipeline?',
      answer: 'To create your first pipeline, navigate to the Pipelines tab and click "Create New Pipeline". Follow the step-by-step wizard to configure your data sources, transformations, and destinations.',
      category: 'Getting Started',
      tags: ['pipeline', 'beginner', 'setup']
    },
    {
      id: '2',
      question: 'What data sources are supported?',
      answer: 'DreflowPro supports over 50+ data sources including databases (MySQL, PostgreSQL, MongoDB), cloud storage (AWS S3, Google Cloud), APIs, CSV files, and more.',
      category: 'Data Sources',
      tags: ['connectors', 'integration', 'sources']
    },
    {
      id: '3',
      question: 'How do I troubleshoot failed pipeline executions?',
      answer: 'Check the execution logs in the Pipeline Monitor. Look for error messages, verify your connection settings, and ensure your data sources are accessible.',
      category: 'Troubleshooting',
      tags: ['errors', 'debugging', 'logs']
    },
    {
      id: '4',
      question: 'Can I schedule automated pipeline runs?',
      answer: 'Yes! You can schedule pipelines to run automatically using cron expressions or simple intervals like hourly, daily, or weekly.',
      category: 'Automation',
      tags: ['scheduling', 'automation', 'cron']
    },
    {
      id: '5',
      question: 'What are the subscription plan limits?',
      answer: 'Free plan includes 3 pipelines and 1GB processing. Pro plan offers unlimited pipelines and 100GB processing. Enterprise provides unlimited everything with dedicated support.',
      category: 'Billing',
      tags: ['pricing', 'limits', 'subscription']
    },
    {
      id: '6',
      question: 'How do I upgrade my subscription?',
      answer: 'Go to Billing & Subscription in your profile menu, select your desired plan, and follow the payment process. Upgrades take effect immediately.',
      category: 'Billing',
      tags: ['upgrade', 'payment', 'subscription']
    }
  ];

  const documentationCategories = [
    {
      title: 'Getting Started',
      icon: Zap,
      links: [
        { title: 'Quick Start Guide', url: '/docs/quick-start' },
        { title: 'First Pipeline Tutorial', url: '/docs/first-pipeline' },
        { title: 'Account Setup', url: '/docs/account-setup' }
      ]
    },
    {
      title: 'Data Sources & Connectors',
      icon: Database,
      links: [
        { title: 'Supported Data Sources', url: '/docs/data-sources' },
        { title: 'Database Connections', url: '/docs/database-connections' },
        { title: 'API Integrations', url: '/docs/api-integrations' },
        { title: 'File Upload Guide', url: '/docs/file-uploads' }
      ]
    },
    {
      title: 'Pipeline Management',
      icon: Settings,
      links: [
        { title: 'Pipeline Builder', url: '/docs/pipeline-builder' },
        { title: 'Data Transformations', url: '/docs/transformations' },
        { title: 'Scheduling & Automation', url: '/docs/scheduling' },
        { title: 'Monitoring & Alerts', url: '/docs/monitoring' }
      ]
    },
    {
      title: 'Security & Compliance',
      icon: Shield,
      links: [
        { title: 'Data Security', url: '/docs/security' },
        { title: 'Access Control', url: '/docs/access-control' },
        { title: 'Compliance Standards', url: '/docs/compliance' },
        { title: 'Audit Logs', url: '/docs/audit-logs' }
      ]
    }
  ];

  const videoTutorials = [
    {
      title: 'Getting Started with DreflowPro',
      duration: '5:30',
      thumbnail: '/videos/getting-started.jpg',
      url: '/videos/getting-started'
    },
    {
      title: 'Building Your First Pipeline',
      duration: '12:45',
      thumbnail: '/videos/first-pipeline.jpg',
      url: '/videos/first-pipeline'
    },
    {
      title: 'Advanced Data Transformations',
      duration: '18:20',
      thumbnail: '/videos/transformations.jpg',
      url: '/videos/transformations'
    },
    {
      title: 'Monitoring and Troubleshooting',
      duration: '8:15',
      thumbnail: '/videos/monitoring.jpg',
      url: '/videos/monitoring'
    }
  ];

  const systemStatus = {
    overall: 'operational',
    services: [
      { name: 'API Gateway', status: 'operational', uptime: '99.9%' },
      { name: 'Pipeline Engine', status: 'operational', uptime: '99.8%' },
      { name: 'Data Processing', status: 'operational', uptime: '99.9%' },
      { name: 'Web Dashboard', status: 'operational', uptime: '100%' },
      { name: 'Notification Service', status: 'maintenance', uptime: '98.5%' }
    ],
    incidents: [
      {
        title: 'Scheduled Maintenance - Notification Service',
        status: 'ongoing',
        time: '2 hours ago',
        description: 'Routine maintenance to improve notification delivery performance.'
      }
    ]
  };

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSupportTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportTicket.subject || !supportTicket.description || !supportTicket.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Support ticket submitted successfully! We\'ll get back to you within 24 hours.');
      setSupportTicket({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'general',
        email: ''
      });
    } catch (error) {
      toast.error('Failed to submit support ticket. Please try again.');
    }
  };

  const handleFeatureRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureRequest.title || !featureRequest.description || !featureRequest.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Feature request submitted successfully! Thank you for your feedback.');
      setFeatureRequest({
        title: '',
        description: '',
        category: 'general',
        priority: 'medium',
        email: ''
      });
    } catch (error) {
      toast.error('Failed to submit feature request. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'degraded': return 'text-orange-600 bg-orange-100';
      case 'outage': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const tabs = [
    { id: 'faq', label: 'FAQ', icon: MessageCircle },
    { id: 'docs', label: 'Documentation', icon: Book },
    { id: 'videos', label: 'Video Tutorials', icon: Video },
    { id: 'contact', label: 'Contact Support', icon: Mail },
    { id: 'status', label: 'System Status', icon: Activity },
    { id: 'feature-request', label: 'Feature Requests', icon: Lightbulb }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent mb-2">
          Help & Support
        </h1>
        <p className="text-gray-600">Get help, find answers, and connect with our support team</p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-2"
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        {/* FAQ Section */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* FAQ Items */}
            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{faq.question}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {faq.category}
                        </span>
                      </div>
                    </div>
                    {expandedFAQ === faq.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {expandedFAQ === faq.id && (
                    <div className="px-4 pb-4 text-gray-700 border-t border-gray-100">
                      <p className="mt-3">{faq.answer}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {faq.tags.map((tag) => (
                          <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredFAQs.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
                <p className="text-gray-600">Try adjusting your search terms or browse all categories.</p>
              </div>
            )}
          </div>
        )}

        {/* Documentation Section */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Book className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Documentation</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documentationCategories.map((category, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <category.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{category.title}</h3>
                  </div>
                  <div className="space-y-2">
                    {category.links.map((link, linkIndex) => (
                      <a
                        key={linkIndex}
                        href={link.url}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{link.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Tutorials Section */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Video className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Video Tutorials</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videoTutorials.map((video, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-gray-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{video.title}</h3>
                    <button className="text-blue-600 hover:text-blue-800 transition-colors">
                      Watch Tutorial →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Support Section */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Mail className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Contact Support</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Form */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit a Support Ticket</h3>
                <form onSubmit={handleSupportTicketSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={supportTicket.email}
                      onChange={(e) => setSupportTicket(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      required
                      value={supportTicket.subject}
                      onChange={(e) => setSupportTicket(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={supportTicket.category}
                        onChange={(e) => setSupportTicket(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="general">General</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing</option>
                        <option value="feature">Feature Request</option>
                        <option value="bug">Bug Report</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={supportTicket.priority}
                        onChange={(e) => setSupportTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      required
                      rows={6}
                      value={supportTicket.description}
                      onChange={(e) => setSupportTicket(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Please provide detailed information about your issue..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Ticket</span>
                  </button>
                </form>
              </div>

              {/* Contact Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Ways to Reach Us</h3>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">Email Support</div>
                        <div className="text-sm text-gray-600">support@dreflowpro.com</div>
                        <div className="text-xs text-gray-500">Response within 24 hours</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">Phone Support</div>
                        <div className="text-sm text-gray-600">+1 (555) 123-4567</div>
                        <div className="text-xs text-gray-500">Mon-Fri, 9AM-6PM EST</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">Live Chat</div>
                        <div className="text-sm text-gray-600">Available on website</div>
                        <div className="text-xs text-gray-500">Mon-Fri, 9AM-6PM EST</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Community</h3>
                  <div className="space-y-3">
                    <a href="/community" className="flex items-center space-x-3 text-blue-600 hover:text-blue-800 transition-colors">
                      <Users className="w-5 h-5" />
                      <span>Community Forum</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <a href="/discord" className="flex items-center space-x-3 text-blue-600 hover:text-blue-800 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span>Discord Community</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Status Section */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Activity className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">System Status</h2>
            </div>

            {/* Overall Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">All Systems Operational</h3>
                  <p className="text-green-700">All services are running normally</p>
                </div>
              </div>
            </div>

            {/* Service Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
              <div className="space-y-3">
                {systemStatus.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'operational' ? 'bg-green-500' :
                        service.status === 'maintenance' ? 'bg-yellow-500' :
                        service.status === 'degraded' ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium text-gray-900">{service.name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-600">{service.uptime} uptime</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Incidents */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
              <div className="space-y-3">
                {systemStatus.incidents.map((incident, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{incident.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">{incident.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feature Request Section */}
        {activeTab === 'feature-request' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Feature Requests</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Feature Request Form */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit a Feature Request</h3>
                <form onSubmit={handleFeatureRequestSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={featureRequest.email}
                      onChange={(e) => setFeatureRequest(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Feature Title</label>
                    <input
                      type="text"
                      required
                      value={featureRequest.title}
                      onChange={(e) => setFeatureRequest(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief title for your feature request"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={featureRequest.category}
                        onChange={(e) => setFeatureRequest(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="general">General</option>
                        <option value="ui-ux">UI/UX</option>
                        <option value="integrations">Integrations</option>
                        <option value="performance">Performance</option>
                        <option value="security">Security</option>
                        <option value="analytics">Analytics</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={featureRequest.priority}
                        onChange={(e) => setFeatureRequest(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Nice to Have</option>
                        <option value="medium">Would be Helpful</option>
                        <option value="high">Really Need This</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      required
                      rows={6}
                      value={featureRequest.description}
                      onChange={(e) => setFeatureRequest(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Describe the feature you'd like to see, how it would help you, and any specific requirements..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>Submit Feature Request</span>
                  </button>
                </form>
              </div>

              {/* Popular Requests */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Requests</h3>
                <div className="space-y-4">
                  {[
                    { title: 'Advanced Data Visualization', votes: 45, category: 'Analytics' },
                    { title: 'Slack Integration', votes: 38, category: 'Integrations' },
                    { title: 'Custom Dashboard Widgets', votes: 32, category: 'UI/UX' },
                    { title: 'API Rate Limiting Controls', votes: 28, category: 'Performance' },
                    { title: 'Advanced User Permissions', votes: 24, category: 'Security' }
                  ].map((request, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{request.title}</h4>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {request.category}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-600">{request.votes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HelpSupport;
