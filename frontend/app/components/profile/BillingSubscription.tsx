'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Crown, 
  Zap, 
  Check, 
  X, 
  Download, 
  Plus, 
  Trash2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Database,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    pipelines: number;
    dataProcessing: number;
    apiCalls: number;
    users: number;
  };
  popular?: boolean;
}

const BillingSubscription: React.FC = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [showAddCard, setShowAddCard] = useState(false);

  const pricingTiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'month',
      features: [
        '3 pipelines',
        '1GB data processing',
        '1,000 API calls',
        'Basic support',
        'Community access'
      ],
      limits: {
        pipelines: 3,
        dataProcessing: 1,
        apiCalls: 1000,
        users: 1
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: billingInterval === 'month' ? 29 : 290,
      interval: billingInterval,
      features: [
        'Unlimited pipelines',
        '100GB data processing',
        '100,000 API calls',
        'Priority support',
        'Advanced analytics',
        'Custom integrations',
        'Team collaboration'
      ],
      limits: {
        pipelines: -1,
        dataProcessing: 100,
        apiCalls: 100000,
        users: 10
      },
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingInterval === 'month' ? 99 : 990,
      interval: billingInterval,
      features: [
        'Everything in Pro',
        'Unlimited data processing',
        'Unlimited API calls',
        'Dedicated support',
        'Custom deployment',
        'SLA guarantee',
        'Advanced security',
        'Unlimited users'
      ],
      limits: {
        pipelines: -1,
        dataProcessing: -1,
        apiCalls: -1,
        users: -1
      }
    }
  ];

  const usageData = [
    {
      metric: 'Pipelines',
      current: 8,
      limit: user?.subscription.limits.pipelines || 0,
      icon: Zap,
      color: 'blue'
    },
    {
      metric: 'Data Processing',
      current: 45,
      limit: user?.subscription.limits.dataProcessing || 0,
      unit: 'GB',
      icon: Database,
      color: 'green'
    },
    {
      metric: 'API Calls',
      current: 23450,
      limit: user?.subscription.limits.apiCalls || 0,
      icon: BarChart3,
      color: 'purple'
    },
    {
      metric: 'Team Members',
      current: 3,
      limit: user?.subscription.limits.users || 0,
      icon: Users,
      color: 'orange'
    }
  ];

  const billingHistory = [
    {
      id: 'inv_001',
      date: '2024-01-01',
      amount: 29.00,
      status: 'paid',
      description: 'Pro Plan - Monthly'
    },
    {
      id: 'inv_002',
      date: '2023-12-01',
      amount: 29.00,
      status: 'paid',
      description: 'Pro Plan - Monthly'
    },
    {
      id: 'inv_003',
      date: '2023-11-01',
      amount: 29.00,
      status: 'paid',
      description: 'Pro Plan - Monthly'
    }
  ];

  const paymentMethods = [
    {
      id: 'card_001',
      type: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true
    }
  ];

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    toast.info(`Selected ${pricingTiers.find(p => p.id === planId)?.name} plan`);
  };

  const handleUpgrade = () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }
    toast.success('Redirecting to payment...');
    // Implement payment flow
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent mb-2">
          Billing & Subscription
        </h1>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </motion.div>

      {/* Current Plan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              {user?.subscription.name === 'Enterprise' ? (
                <Crown className="w-8 h-8" />
              ) : user?.subscription.name === 'Pro' ? (
                <Zap className="w-8 h-8" />
              ) : (
                <Users className="w-8 h-8" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.subscription.name} Plan</h2>
              <p className="text-blue-100">
                {user?.subscription.tier === 'free' ? 'Free forever' : 
                 user?.subscription.expiresAt ? `Renews on ${new Date(user.subscription.expiresAt).toLocaleDateString()}` : 
                 'Active subscription'}
              </p>
            </div>
          </div>
          
          {user?.subscription.canUpgrade && (
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Upgrade Plan
            </button>
          )}
        </div>
      </motion.div>

      {/* Usage Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Usage Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {usageData.map((usage, index) => {
            const percentage = getUsagePercentage(usage.current, usage.limit);
            const isUnlimited = usage.limit === -1;
            
            return (
              <div key={index} className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <usage.icon className={`w-6 h-6 text-${usage.color}-600`} />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isUnlimited ? 'bg-green-100 text-green-800' : getUsageColor(percentage)
                  }`}>
                    {isUnlimited ? 'Unlimited' : `${percentage.toFixed(0)}%`}
                  </span>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{usage.metric}</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {usage.current.toLocaleString()}{usage.unit && ` ${usage.unit}`}
                    </span>
                    <span className="text-gray-600">
                      {isUnlimited ? '∞' : `${usage.limit.toLocaleString()}${usage.unit && ` ${usage.unit}`}`}
                    </span>
                  </div>
                  
                  {!isUnlimited && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-${usage.color}-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Pricing Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Available Plans</h2>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Billing cycle:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingInterval === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingInterval === 'year'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs text-green-600 font-semibold">Save 17%</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-xl border-2 p-6 transition-all ${
                tier.popular
                  ? 'border-blue-500 bg-blue-50'
                  : selectedPlan === tier.id
                  ? 'border-blue-300 bg-blue-25'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                  <span className="text-gray-600">/{tier.interval}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanChange(tier.id)}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  user?.subscription.name.toLowerCase() === tier.name.toLowerCase()
                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
                disabled={user?.subscription.name.toLowerCase() === tier.name.toLowerCase()}
              >
                {user?.subscription.name.toLowerCase() === tier.name.toLowerCase()
                  ? 'Current Plan'
                  : tier.id === 'free'
                  ? 'Downgrade'
                  : 'Upgrade'
                }
              </button>
            </div>
          ))}
        </div>

        {selectedPlan && selectedPlan !== user?.subscription.name.toLowerCase() && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900">
                  Ready to {selectedPlan === 'free' ? 'downgrade' : 'upgrade'} to {pricingTiers.find(p => p.id === selectedPlan)?.name}?
                </h4>
                <p className="text-sm text-blue-700">
                  Changes will take effect immediately.
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
          </div>
          <button
            onClick={() => setShowAddCard(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Card</span>
          </button>
        </div>

        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    •••• •••• •••• {method.last4}
                  </div>
                  <div className="text-sm text-gray-600">
                    Expires {method.expiryMonth}/{method.expiryYear}
                    {method.isDefault && <span className="ml-2 text-blue-600 font-medium">Default</span>}
                  </div>
                </div>
              </div>
              <button className="text-red-600 hover:text-red-800 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Billing History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Billing History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-900">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{invoice.description}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">
                    ${invoice.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default BillingSubscription;
