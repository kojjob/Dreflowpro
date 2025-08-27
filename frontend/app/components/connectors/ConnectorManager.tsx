'use client';

import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import Logger from '../../utils/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  Cloud,
  Server,
  Globe,
  Settings,
  Plus,
  Edit,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Search,
  Filter,
  Grid3X3,
  List,
  RefreshCw,
  MoreVertical,
  Activity,
  Clock,
  Link2,
  Shield,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface Connector {
  id: string;
  name: string;
  description?: string;
  type: 'database' | 'api' | 'file' | 'cloud' | 'file_upload' | 'webhook' | 'csv' | 'excel' | 'json';
  status: 'active' | 'inactive' | 'error' | 'testing';
  created_at: string;
  updated_at: string;
  last_tested?: string | null;
  last_used?: string | null;
  connection_config: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl_mode?: string;
    base_url?: string;
    api_key?: string;
    file_path?: string;
    encoding?: string;
    delimiter?: string;
    has_header?: boolean;
    sheet_name?: string;
    [key: string]: any;
  } | null;
  schema_info?: {
    version?: string;
    schema_count?: number;
    table_count?: number;
    test_results?: any;
    error_message?: string;
  };
}

interface ConnectorTemplate {
  type: string;
  provider: string;
  name: string;
  description: string;
  icon: React.ElementType;
  config_schema: {
    field: string;
    label: string;
    type: 'text' | 'number' | 'password' | 'select' | 'boolean';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }[];
}

const ConnectorManager: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ConnectorTemplate | null>(null);
  
  // New state for enhanced UI
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Form state for creating new connectors
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'database' as const,
    connection_config: {} as Record<string, any>
  });

  // Connector templates for different data sources
  const connectorTemplates: ConnectorTemplate[] = [
    {
      type: 'database',
      provider: 'postgresql',
      name: 'PostgreSQL',
      description: 'Connect to PostgreSQL database',
      icon: Database,
      config_schema: [
        { field: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
        { field: 'port', label: 'Port', type: 'number', required: true, placeholder: '5432' },
        { field: 'database', label: 'Database', type: 'text', required: true },
        { field: 'username', label: 'Username', type: 'text', required: true },
        { field: 'password', label: 'Password', type: 'password', required: true },
        { field: 'ssl', label: 'Enable SSL', type: 'boolean', required: false }
      ]
    },
    {
      type: 'database',
      provider: 'mysql',
      name: 'MySQL',
      description: 'Connect to MySQL database',
      icon: Database,
      config_schema: [
        { field: 'host', label: 'Host', type: 'text', required: true, placeholder: 'localhost' },
        { field: 'port', label: 'Port', type: 'number', required: true, placeholder: '3306' },
        { field: 'database', label: 'Database', type: 'text', required: true },
        { field: 'username', label: 'Username', type: 'text', required: true },
        { field: 'password', label: 'Password', type: 'password', required: true }
      ]
    },
    {
      type: 'api',
      provider: 'rest',
      name: 'REST API',
      description: 'Connect to REST API endpoint',
      icon: Globe,
      config_schema: [
        { field: 'api_endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: 'https://api.example.com' },
        { field: 'api_key', label: 'API Key', type: 'password', required: false },
        { field: 'auth_type', label: 'Authentication', type: 'select', required: true, options: ['none', 'api_key', 'bearer_token', 'basic_auth'] }
      ]
    },
    {
      type: 'cloud',
      provider: 'aws_s3',
      name: 'AWS S3',
      description: 'Connect to Amazon S3 bucket',
      icon: Cloud,
      config_schema: [
        { field: 'bucket_name', label: 'Bucket Name', type: 'text', required: true },
        { field: 'aws_region', label: 'AWS Region', type: 'select', required: true, options: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'] },
        { field: 'access_key_id', label: 'Access Key ID', type: 'text', required: true },
        { field: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true }
      ]
    }
  ];

  const fetchConnectors = async () => {
    try {
      setError(null);
      const response = await apiService.getConnectors();
      const connectorData = response.connectors || [];
      setConnectors(connectorData);
    } catch (err: any) {
      Logger.error('Connector fetch error:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : (err && typeof err === 'object' && err.message)
          ? String(err.message)
          : String(err) || 'Failed to load connectors';
      setError(errorMessage);
      setConnectors([]); // Ensure connectors is always an array
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConnectors();
  };

  // Filter connectors based on search and filter criteria
  const filteredConnectors = connectors.filter(connector => {
    const matchesSearch = connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          connector.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || connector.type === filterType;
    const matchesStatus = filterStatus === 'all' || connector.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  useEffect(() => {
    fetchConnectors();
    
    // Auto-refresh every 2 minutes - reduced from 30s to improve performance
    const interval = setInterval(fetchConnectors, 120000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'testing':
        return 'text-blue-600 bg-blue-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'testing':
        return <TestTube className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'database':
        return <Database className="w-6 h-6 text-blue-600" />;
      case 'api':
        return <Globe className="w-6 h-6 text-green-600" />;
      case 'cloud':
        return <Cloud className="w-6 h-6 text-purple-600" />;
      case 'file':
      case 'csv':
      case 'excel':
      case 'json':
        return <Server className="w-6 h-6 text-orange-600" />;
      default:
        return <Settings className="w-6 h-6 text-gray-600" />;
    }
  };

  const getProviderName = (connector: Connector): string => {
    if (connector.type === 'database' && connector.connection_config?.type) {
      return connector.connection_config.type;
    }
    if (connector.type === 'api') {
      return 'REST API';
    }
    if (connector.type === 'cloud' && connector.connection_config?.provider) {
      return connector.connection_config.provider;
    }
    return connector.type;
  };

  const testConnector = async (connectorId: string) => {
    try {
      const result = await apiService.testConnector(connectorId);
      setTestResults(prev => ({
        ...prev,
        [connectorId]: result
      }));
      
      // Refresh connectors to update status
      await fetchConnectors();
    } catch (err: any) {
      Logger.error('Connector test error:', err);
      setError(err.message || 'Failed to test connector');
    }
  };

  const previewConnectorData = async (connectorId: string) => {
    try {
      setError(null); // Clear any previous errors
      const data = await apiService.previewConnectorData(connectorId, 10);
      setPreviewData(prev => ({
        ...prev,
        [connectorId]: data
      }));
    } catch (err: any) {
      Logger.error('Data preview error:', err);

      // Provide more specific error messages
      let errorMessage = 'Failed to preview data';
      if (err.message) {
        if (err.message.includes('No sample data available')) {
          errorMessage = 'This connector has no sample data available. The connection is working, but the data source appears to be empty or inaccessible.';
        } else if (err.message.includes('No data preview available')) {
          errorMessage = 'No data preview available. Try testing the connector first to generate sample data.';
        } else if (err.message.includes('not found')) {
          errorMessage = 'Connector not found. Please refresh the page and try again.';
        } else if (err.message.includes('Failed to generate preview')) {
          errorMessage = 'Unable to generate data preview. Please check your connector configuration and try testing the connection.';
        } else if (err.message.includes('Connector test failed')) {
          errorMessage = 'The connector test failed. Please check your connection settings and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    }
  };

  const deleteConnector = async (connectorId: string) => {
    if (!confirm('Are you sure you want to delete this connector?')) return;

    try {
      await apiService.deleteConnector(connectorId);
      await fetchConnectors();
    } catch (err: any) {
      Logger.error('Connector deletion error:', err);
      setError(err.message || 'Failed to delete connector');
    }
  };

  // Form handling functions
  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await apiService.createConnector(formData);
      await fetchConnectors();
      setShowCreateForm(false);
      resetForm();
    } catch (err: any) {
      Logger.error('Connector creation error:', err);
      setError(err.message || 'Failed to create connector');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'database',
      connection_config: {}
    });
    setSelectedTemplate(null);
  };

  const handleTemplateSelect = (template: ConnectorTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: '',
      description: '',
      type: template.type as any,
      connection_config: {}
    });
  };

  const updateFormField = (field: string, value: any) => {
    if (field.startsWith('connection_config.')) {
      const configField = field.replace('connection_config.', '');
      setFormData(prev => ({
        ...prev,
        connection_config: {
          ...prev.connection_config,
          [configField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">Loading connectors...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" title="Connector Error">
          {error}
        </Alert>
      )}

      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold flex items-center space-x-3">
              <Database className="w-8 h-8" />
              <span>Data Connectors</span>
            </h2>
            <p className="text-blue-100 mt-2">Connect, manage, and monitor your data sources in one place</p>
          </div>
          <motion.button
            onClick={() => setShowCreateForm(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>New Connector</span>
          </motion.button>
        </div>
      </div>

      {/* Stats Overview with Gradient Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-900">{connectors.length}</div>
                <div className="text-sm text-blue-600 font-medium mt-1">Total Connectors</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-900">
                  {connectors.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-green-600 font-medium mt-1">Active</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="p-5 bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-900">
                  {connectors.filter(c => c.status === 'error').length}
                </div>
                <div className="text-sm text-red-600 font-medium mt-1">Errors</div>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-purple-900">
                  {new Set(connectors.map(c => c.type)).size}
                </div>
                <div className="text-sm text-purple-600 font-medium mt-1">Types</div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search connectors by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex gap-2">
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Types</option>
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="cloud">Cloud</option>
              <option value="file">File</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="error">Error</option>
              <option value="testing">Testing</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''} transition-all`}
              >
                <Grid3X3 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''} transition-all`}
              >
                <List className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Refresh Button */}
            <motion.button
              onClick={handleRefresh}
              disabled={refreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || filterType !== 'all' || filterStatus !== 'all') && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                Search: {searchQuery}
              </span>
            )}
            {filterType !== 'all' && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Type: {filterType}
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                Status: {filterStatus}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterStatus('all');
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Connector Templates (when no connectors exist) */}
      {filteredConnectors.length === 0 && connectors.length === 0 && !loading && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose a Connector Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {connectorTemplates.map((template) => (
              <div
                key={`${template.type}-${template.provider}`}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer"
                onClick={() => setShowCreateForm(true)}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <template.icon className="w-6 h-6 text-blue-600" />
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                </div>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Connector List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
        {filteredConnectors.map((connector, index) => (
          <Card key={connector.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                {getTypeIcon(connector.type)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{connector.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{getProviderName(connector)} ({connector.type})</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(connector.status)}
                <span className={`text-sm font-medium px-2 py-1 rounded ${getStatusColor(connector.status)}`}>
                  {connector.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Connection Details */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 space-y-1">
                {connector.type === 'database' && connector.connection_config && (
                  <>
                    <div>Host: {connector.connection_config.host}:{connector.connection_config.port}</div>
                    <div>Database: {connector.connection_config.database}</div>
                    <div>Username: {connector.connection_config.username}</div>
                  </>
                )}
                {connector.type === 'api' && connector.connection_config && (
                  <>
                    <div>Endpoint: {connector.connection_config.base_url}</div>
                    <div>Auth: {connector.connection_config.api_key ? 'API Key' : 'none'}</div>
                  </>
                )}
                {connector.type === 'cloud' && connector.connection_config && (
                  <>
                    <div>Provider: {connector.connection_config.provider || 'Unknown'}</div>
                    <div>Region: {connector.connection_config.aws_region || connector.connection_config.cloud_region}</div>
                    {connector.connection_config.bucket_name && <div>Bucket: {connector.connection_config.bucket_name}</div>}
                  </>
                )}
                {(connector.type === 'file' || connector.type === 'csv') && connector.connection_config && (
                  <>
                    <div>File: {connector.connection_config.file_path}</div>
                    <div>Encoding: {connector.connection_config.encoding}</div>
                    {connector.connection_config.delimiter && <div>Delimiter: {connector.connection_config.delimiter}</div>}
                  </>
                )}
              </div>
            </div>

            {/* Connector Stats */}
            {connector.schema_info && (
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {connector.schema_info.table_count || connector.schema_info.schema_count || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {connector.type === 'database' ? 'Tables' : 'Objects'}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {connector.schema_info.version || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Version</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {connector.last_tested 
                      ? new Date(connector.last_tested).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                  <div className="text-xs text-gray-500">Last Tested</div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {connector.status === 'error' && connector.schema_info?.error_message && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {connector.schema_info.error_message}
              </div>
            )}

            {/* Test Results */}
            {testResults[connector.id] && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Test Results</h4>
                <pre className="text-xs text-blue-800 overflow-auto">
                  {JSON.stringify(testResults[connector.id], null, 2)}
                </pre>
              </div>
            )}

            {/* Preview Data */}
            {previewData[connector.id] && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="text-sm font-medium text-green-900 mb-2">Data Preview</h4>
                <div className="overflow-auto max-h-32">
                  {previewData[connector.id].preview_data && previewData[connector.id].preview_data.length > 0 ? (
                    <pre className="text-xs text-green-800">
                      {JSON.stringify(previewData[connector.id], null, 2)}
                    </pre>
                  ) : (
                    <div className="text-xs text-green-700 italic">
                      No sample data available. The connector is working but the data source appears to be empty.
                      {previewData[connector.id].column_info && (
                        <div className="mt-2">
                          <strong>Schema Info:</strong>
                          <pre className="text-xs text-green-800 mt-1">
                            {JSON.stringify(previewData[connector.id].column_info, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => testConnector(connector.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <TestTube className="w-3 h-3" />
                  <span>Test</span>
                </button>
                <button
                  onClick={() => previewConnectorData(connector.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => setSelectedConnector(connector.id)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
              <button
                onClick={() => deleteConnector(connector.id)}
                className="text-red-600 hover:text-red-800 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {connectors.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Connectors Found</h3>
          <p className="text-gray-600 mb-4">Connect to your data sources to start building ETL pipelines.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Your First Connector
          </button>
        </Card>
      )}

      {/* Create Connector Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedTemplate ? `Create ${selectedTemplate.name} Connector` : 'Create New Connector'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {!selectedTemplate ? (
              // Template Selection
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose a Connector Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {connectorTemplates.map((template) => (
                    <div
                      key={`${template.type}-${template.provider}`}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <template.icon className="w-6 h-6 text-blue-600" />
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Connector Form
              <form onSubmit={handleCreateConnector} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connector Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`My ${selectedTemplate.name} Connector`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe this connector..."
                  />
                </div>

                {/* Dynamic Configuration Fields */}
                {selectedTemplate.config_schema.map((field) => (
                  <div key={field.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData.connection_config[field.field] || ''}
                        onChange={(e) => updateFormField(`connection_config.${field.field}`, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.connection_config[field.field] || false}
                          onChange={(e) => updateFormField(`connection_config.${field.field}`, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-600">Enable {field.label}</span>
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        value={formData.connection_config[field.field] || ''}
                        onChange={(e) => updateFormField(`connection_config.${field.field}`,
                          field.type === 'number' ? parseInt(e.target.value) || '' : e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}

                <div className="flex justify-between space-x-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        resetForm();
                      }}
                      className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Connector'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectorManager;