'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Plus, Trash2, RotateCw, Copy, Check, Eye, EyeOff, 
  Shield, Clock, Globe, Wifi, AlertTriangle 
} from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  type: string;
  scopes: string[];
  rate_limit: number;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

export default function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/security/api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAPIKey = async (keyData: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/security/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(keyData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewKey(data.key);
        setShowCreateModal(false);
        fetchAPIKeys();
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/security/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        fetchAPIKeys();
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const rotateAPIKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will be invalidated.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/security/api-keys/${keyId}/rotate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewKey(data.key);
        fetchAPIKeys();
      }
    } catch (error) {
      console.error('Failed to rotate API key:', error);
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  API Keys
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage your API keys for programmatic access
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Key
            </button>
          </div>
        </div>

        {/* New Key Display */}
        {newKey && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                  New API Key Created
                </h3>
                <p className="text-xs text-green-600 dark:text-green-400 mb-3">
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded text-sm font-mono text-gray-900 dark:text-white">
                    {newKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey, 'new')}
                    className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors"
                  >
                    {copiedKey === 'new' ? (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="ml-4 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* API Keys List */}
        <div className="p-6">
          {loading && !apiKeys.length ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No API keys created yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Create your first API key to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {key.name}
                        </h3>
                        <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full
                          ${key.type === 'admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            key.type === 'service' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                            key.type === 'private' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}
                        `}>
                          {key.type.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Rate Limit:</span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {key.rate_limit.toLocaleString()}/hour
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Created:</span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {new Date(key.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Last Used:</span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </div>

                      {key.scopes.length > 0 && (
                        <div className="mt-3 flex items-center flex-wrap gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Scopes:</span>
                          {key.scopes.map((scope, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-xs rounded text-gray-700 dark:text-gray-300"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => rotateAPIKey(key.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        title="Rotate Key"
                      >
                        <RotateCw className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => revokeAPIKey(key.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        title="Revoke Key"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateAPIKeyModal
            onClose={() => setShowCreateModal(false)}
            onCreate={createAPIKey}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Create API Key Modal Component
function CreateAPIKeyModal({ onClose, onCreate, loading }: any) {
  const [keyData, setKeyData] = useState({
    name: '',
    key_type: 'private',
    scopes: [],
    expires_in_days: '',
    allowed_origins: '',
    allowed_ips: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...keyData,
      expires_in_days: keyData.expires_in_days ? parseInt(keyData.expires_in_days) : null,
      allowed_origins: keyData.allowed_origins ? keyData.allowed_origins.split(',').map(s => s.trim()) : null,
      allowed_ips: keyData.allowed_ips ? keyData.allowed_ips.split(',').map(s => s.trim()) : null
    };
    onCreate(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Create API Key
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Key Name
            </label>
            <input
              type="text"
              required
              value={keyData.name}
              onChange={(e) => setKeyData({ ...keyData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Production API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Key Type
            </label>
            <select
              value={keyData.key_type}
              onChange={(e) => setKeyData({ ...keyData, key_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="public">Public (100 req/hour)</option>
              <option value="private">Private (1,000 req/hour)</option>
              <option value="admin">Admin (10,000 req/hour)</option>
              <option value="service">Service (50,000 req/hour)</option>
              <option value="webhook">Webhook (5,000 req/hour)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expires In (days)
            </label>
            <input
              type="number"
              value={keyData.expires_in_days}
              onChange={(e) => setKeyData({ ...keyData, expires_in_days: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Leave empty for no expiration"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed Origins (comma-separated)
            </label>
            <input
              type="text"
              value={keyData.allowed_origins}
              onChange={(e) => setKeyData({ ...keyData, allowed_origins: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., https://app.example.com, https://api.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed IPs (comma-separated)
            </label>
            <input
              type="text"
              value={keyData.allowed_ips}
              onChange={(e) => setKeyData({ ...keyData, allowed_ips: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 192.168.1.1, 10.0.0.1"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}