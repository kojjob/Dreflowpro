'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Database, Cloud, Server, Globe, Settings, Plus, Edit, Trash2, TestTube, 
  CheckCircle, XCircle, AlertCircle, Eye, Search, Filter, ArrowRight,
  Zap, Target, Sparkles, TrendingUp, FileText, Activity, Bell, Info,
  User, Calendar, Share2, BookOpen, HelpCircle, Bookmark, Shield,
  Lock, Unlock, RotateCcw, Play, Pause, AlertTriangle, Clock, Wifi, WifiOff,
  Copy, ExternalLink, RefreshCcw, Download, Upload, Hash, Link2, Grid3X3,
  List, MoreVertical, Layers, BarChart3, PieChart, GitBranch, Workflow
} from 'lucide-react';
import { API_CONFIG } from '../config/dataConfig';
import Logger from '../utils/logger';

interface Connector {
  id: string
  name: string
  description?: string
  type: string
  status: 'active' | 'inactive' | 'error'
  connection_config: any
  created_at: string
  updated_at?: string
  last_tested?: string
}

interface CreateConnectorForm {
  name: string
  description: string
  type: 'database'
  connection_config: {
    type: 'postgresql' | 'mysql'
    host: string
    port: number
    database: string
    username: string
    password: string
  }
}

// Notification System
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [connectionTest, setConnectionTest] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'error'>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState({ active: 0, inactive: 0, error: 0, total: 0 })
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'created' | 'updated'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const router = useRouter()

  // Enhanced notification system
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString()
    const newNotification = { ...notification, id }
    setNotifications(prev => [...prev, newNotification])
    
    // Auto-remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, notification.duration || 5000)
    }
  }, [])

  const [form, setForm] = useState<CreateConnectorForm>({
    name: '',
    description: '',
    type: 'database',
    connection_config: {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: '',
      username: '',
      password: ''
    }
  })

  // Enhanced load connectors with stats calculation
  const loadConnectors = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/connectors/`)
      
      if (response.ok) {
        const data = await response.json()
        const connectorList = data.connectors || []
        setConnectors(connectorList)
        
        // Calculate stats
        const active = connectorList.filter((c: Connector) => c.status === 'active').length
        const inactive = connectorList.filter((c: Connector) => c.status === 'inactive').length
        const error = connectorList.filter((c: Connector) => c.status === 'error').length
        const total = connectorList.length
        
        setStats({ active, inactive, error, total })
      } else {
        addNotification({
          type: 'error',
          title: 'Load Failed',
          message: 'Unable to load connectors. Please try again.'
        })
      }
    } catch (error) {
      Logger.error('Failed to load connectors:', error)
      
      // Check if it's a network error (backend not running)
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        addNotification({
          type: 'warning',
          title: 'Backend Not Available',
          message: 'Backend server appears to be offline. Loading demo data.'
        })
        
        // Load demo/mock data when backend is not available
        setConnectors([
          {
            id: '1',
            name: 'PostgreSQL Production',
            description: 'Main production database connection',
            type: 'database',
            status: 'active',
            connection_config: {
              type: 'postgresql',
              host: 'prod-db.example.com',
              port: 5432,
              database: 'production',
              username: 'app_user'
            },
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            last_tested: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            name: 'MySQL Analytics',
            description: 'Analytics database for reporting',
            type: 'database',
            status: 'inactive',
            connection_config: {
              type: 'mysql',
              host: 'analytics-db.example.com',
              port: 3306,
              database: 'analytics',
              username: 'readonly_user'
            },
            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            name: 'Redis Cache',
            description: 'Redis caching layer connection',
            type: 'cache',
            status: 'error',
            connection_config: {
              type: 'redis',
              host: 'cache.example.com',
              port: 6379,
              database: '0'
            },
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            last_tested: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          }
        ])
        
        setStats({
          active: 1,
          inactive: 1, 
          error: 1,
          total: 3
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Connection Error',
          message: 'Network error while loading connectors.'
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (!token && !isDevelopment) {
      router.push('/login')
      return
    }

    // Load connectors when component mounts
    loadConnectors()
  }, [router, loadConnectors])

  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/connectors/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form)
      })
      
      if (response.ok) {
        await loadConnectors()
        setShowCreateForm(false)
        setForm({
          name: '',
          description: '',
          type: 'database',
          connection_config: {
            type: 'postgresql',
            host: 'localhost',
            port: 5432,
            database: '',
            username: '',
            password: ''
          }
        })
        
        addNotification({
          type: 'success',
          title: 'Connector Created',
          message: `Successfully created connector "${form.name}"`
        })
      } else {
        const errorData = await response.json()
        addNotification({
          type: 'error',
          title: 'Creation Failed',
          message: errorData.message || 'Failed to create connector'
        })
      }
    } catch (error) {
      Logger.error('Failed to create connector:', error)
      addNotification({
        type: 'error',
        title: 'Creation Error',
        message: 'Network error while creating connector'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleTestConnection = async (connector: Connector) => {
    setTesting(connector.id)
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/connectors/${connector.id}/test`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        setConnectionTest({ ...result, connectorId: connector.id })
        await loadConnectors() // Refresh to see updated status
        
        addNotification({
          type: result.success ? 'success' : 'error',
          title: 'Connection Test',
          message: result.message || (result.success ? 'Connection successful' : 'Connection failed')
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Test Failed',
          message: 'Unable to test connection'
        })
      }
    } catch (error) {
      Logger.error('Connection test failed:', error)
      addNotification({
        type: 'error',
        title: 'Test Error',
        message: 'Network error during connection test'
      })
    } finally {
      setTesting(null)
    }
  }

  const handleDeleteConnector = async (connectorId: string, connectorName: string) => {
    if (!confirm(`Are you sure you want to delete "${connectorName}"? This action cannot be undone.`)) return
    
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/connectors/${connectorId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadConnectors()
        addNotification({
          type: 'success',
          title: 'Connector Deleted',
          message: `Successfully deleted "${connectorName}"`
        })
      } else {
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: 'Unable to delete connector'
        })
      }
    } catch (error) {
      Logger.error('Failed to delete connector:', error)
      addNotification({
        type: 'error',
        title: 'Delete Error',
        message: 'Network error while deleting connector'
      })
    }
  }

  const handleUpdateForm = (field: string, value: any) => {
    if (field.startsWith('connection_config.')) {
      const configField = field.split('.')[1]
      setForm(prev => ({
        ...prev,
        connection_config: {
          ...prev.connection_config,
          [configField]: value
        }
      }))
    } else {
      setForm(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  // Filter, search, and sort functionality
  const filteredAndSortedConnectors = connectors
    .filter(connector => {
      const matchesSearch = connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           connector.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterStatus === 'all' || connector.status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'created':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case 'updated':
          aValue = new Date(a.updated_at || a.created_at)
          bValue = new Date(b.updated_at || b.created_at)
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  // Export functionality
  const exportConnectors = (format: 'json' | 'csv' | 'excel') => {
    const connectorsToExport = selectedConnectors.length > 0 
      ? connectors.filter(c => selectedConnectors.includes(c.id))
      : filteredAndSortedConnectors

    if (connectorsToExport.length === 0) {
      addNotification({
        type: 'warning',
        title: 'No Data to Export',
        message: 'Please select connectors or ensure there are connectors to export'
      })
      return
    }

    const exportData = connectorsToExport.map(connector => ({
      name: connector.name,
      type: connector.type,
      status: connector.status,
      description: connector.description || '',
      host: connector.connection_config?.host || '',
      database: connector.connection_config?.database || '',
      created_at: connector.created_at,
      updated_at: connector.updated_at
    }))

    if (format === 'json') {
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const downloadUrl = URL.createObjectURL(jsonBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.download = `connectors-${new Date().toISOString().split('T')[0]}.json`
      downloadLink.click()
      URL.revokeObjectURL(downloadUrl)
    } else if (format === 'csv') {
      const csvHeaders = Object.keys(exportData[0] || {}).join(',')
      const csvContent = [
        csvHeaders,
        ...exportData.map(dataRow => Object.values(dataRow).map(cellValue => `"${cellValue || ''}"`).join(','))
      ].join('\n')
      
      const csvBlob = new Blob([csvContent], { type: 'text/csv' })
      const downloadUrl = URL.createObjectURL(csvBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.download = `connectors-${new Date().toISOString().split('T')[0]}.csv`
      downloadLink.click()
      URL.revokeObjectURL(downloadUrl)
    }

    addNotification({
      type: 'success',
      title: 'Export Complete',
      message: `Successfully exported ${connectorsToExport.length} connector${connectorsToExport.length > 1 ? 's' : ''} as ${format.toUpperCase()}`
    })
    
    setShowExportModal(false)
  }

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConnectors(filteredAndSortedConnectors.map(c => c.id))
    } else {
      setSelectedConnectors([])
    }
  }

  const handleSelectConnector = (connectorId: string, checked: boolean) => {
    if (checked) {
      setSelectedConnectors(prev => [...prev, connectorId])
    } else {
      setSelectedConnectors(prev => prev.filter(id => id !== connectorId))
    }
  }

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'postgresql':
      case 'mysql':
        return Database
      case 'api':
        return Globe
      case 'file':
        return FileText
      default:
        return Server
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'inactive':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Grid Card Component
  const ConnectorGridCard = ({ 
    connector, 
    index, 
    selected, 
    onSelect, 
    onTest, 
    onDelete, 
    testing 
  }: {
    connector: Connector
    index: number
    selected: boolean
    onSelect: (id: string, checked: boolean) => void
    onTest: (connector: Connector) => void
    onDelete: (id: string, name: string) => void
    testing: string | null
  }) => {
    const IconComponent = getConnectorIcon(connector.connection_config?.type || connector.type)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`border rounded-lg p-4 hover:shadow-md transition-all ${
          selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(connector.id, e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
            />
          </label>
          <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connector.status)}`}>
            {connector.status === 'active' && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
            {connector.status === 'error' && <AlertTriangle className="w-3 h-3" />}
            {connector.status === 'inactive' && <Clock className="w-3 h-3" />}
            <span className="capitalize">{connector.status}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            connector.status === 'active' ? 'bg-emerald-100' :
            connector.status === 'error' ? 'bg-red-100' :
            'bg-gray-100'
          }`}>
            <IconComponent className={`w-5 h-5 ${
              connector.status === 'active' ? 'text-emerald-600' :
              connector.status === 'error' ? 'text-red-600' :
              'text-gray-600'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{connector.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{connector.connection_config?.type || connector.type}</p>
          </div>
        </div>

        {connector.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{connector.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Created {new Date(connector.created_at).toLocaleDateString()}</span>
          {connector.last_tested && (
            <span>Tested {new Date(connector.last_tested).toLocaleDateString()}</span>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onTest(connector)}
            disabled={testing === connector.id}
            className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm rounded-md transition-colors flex items-center justify-center space-x-1"
          >
            {testing === connector.id ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCcw className="w-3 h-3" />
                </motion.div>
                <span>Testing...</span>
              </>
            ) : (
              <>
                <TestTube className="w-3 h-3" />
                <span>Test</span>
              </>
            )}
          </button>
          <button
            onClick={() => onDelete(connector.id, connector.name)}
            className="px-3 py-1.5 border border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50 text-sm rounded-md transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    )
  }

  // List Item Component
  const ConnectorListItem = ({ 
    connector, 
    index, 
    selected, 
    onSelect, 
    onTest, 
    onDelete, 
    testing 
  }: {
    connector: Connector
    index: number
    selected: boolean
    onSelect: (id: string, checked: boolean) => void
    onTest: (connector: Connector) => void
    onDelete: (id: string, name: string) => void
    testing: string | null
  }) => {
    const IconComponent = getConnectorIcon(connector.connection_config?.type || connector.type)
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`p-4 hover:bg-gray-50 transition-colors ${
          selected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect(connector.id, e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
              />
            </label>

            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              connector.status === 'active' ? 'bg-emerald-100' :
              connector.status === 'error' ? 'bg-red-100' :
              'bg-gray-100'
            }`}>
              <IconComponent className={`w-5 h-5 ${
                connector.status === 'active' ? 'text-emerald-600' :
                connector.status === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h3 className="font-medium text-gray-900">{connector.name}</h3>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connector.status)}`}>
                  {connector.status === 'active' && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
                  {connector.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                  {connector.status === 'inactive' && <Clock className="w-3 h-3" />}
                  <span className="capitalize">{connector.status}</span>
                </div>
              </div>
              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                <span className="capitalize">{connector.connection_config?.type || connector.type}</span>
                {connector.connection_config && (
                  <span>{connector.connection_config.host}:{connector.connection_config.port}</span>
                )}
                <span>Created {new Date(connector.created_at).toLocaleDateString()}</span>
              </div>
              {connector.description && (
                <p className="mt-1 text-sm text-gray-600">{connector.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onTest(connector)}
              disabled={testing === connector.id}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm rounded-md transition-colors flex items-center space-x-1"
            >
              {testing === connector.id ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCcw className="w-3 h-3" />
                  </motion.div>
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-3 h-3" />
                  <span>Test</span>
                </>
              )}
            </button>
            <button
              onClick={() => onDelete(connector.id, connector.name)}
              className="p-1.5 border border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // Table Component
  const ConnectorTable = ({ 
    connectors, 
    selectedConnectors, 
    onSelect, 
    onSelectAll, 
    onTest, 
    onDelete, 
    testing,
    sortBy,
    sortOrder,
    onSort
  }: {
    connectors: Connector[]
    selectedConnectors: string[]
    onSelect: (id: string, checked: boolean) => void
    onSelectAll: (checked: boolean) => void
    onTest: (connector: Connector) => void
    onDelete: (id: string, name: string) => void
    testing: string | null
    sortBy: string
    sortOrder: 'asc' | 'desc'
    onSort: (field: string) => void
  }) => {
    const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
      <button
        onClick={() => onSort(field)}
        className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-indigo-600 transition-colors"
      >
        <span>{children}</span>
        {sortBy === field && (
          <span className="text-indigo-600">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    )

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedConnectors.length === connectors.length && connectors.length > 0}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="name">Name</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="status">Status</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Connection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="created">Created</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {connectors.map((connector, index) => {
              const IconComponent = getConnectorIcon(connector.connection_config?.type || connector.type)
              return (
                <motion.tr
                  key={connector.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`hover:bg-gray-50 ${
                    selectedConnectors.includes(connector.id) ? 'bg-indigo-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedConnectors.includes(connector.id)}
                      onChange={(e) => onSelect(connector.id, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                        connector.status === 'active' ? 'bg-emerald-100' :
                        connector.status === 'error' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-4 h-4 ${
                          connector.status === 'active' ? 'text-emerald-600' :
                          connector.status === 'error' ? 'text-red-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{connector.name}</div>
                        {connector.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{connector.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {connector.connection_config?.type || connector.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connector.status)}`}>
                      {connector.status === 'active' && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
                      {connector.status === 'error' && <AlertTriangle className="w-3 h-3" />}
                      {connector.status === 'inactive' && <Clock className="w-3 h-3" />}
                      <span className="capitalize">{connector.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {connector.connection_config ? (
                      <div>
                        <div>{connector.connection_config.host}:{connector.connection_config.port}</div>
                        <div className="text-xs text-gray-500">{connector.connection_config.database}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(connector.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onTest(connector)}
                        disabled={testing === connector.id}
                        className="text-indigo-600 hover:text-indigo-900 disabled:text-indigo-400 transition-colors"
                      >
                        {testing === connector.id ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onDelete(connector.id, connector.name)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification System */}
      <AnimatePresence>
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 300, scale: 0.3 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 300, scale: 0.3 }}
                className={`backdrop-blur-md bg-white/90 rounded-xl shadow-lg border p-4 max-w-sm ${
                  notification.type === 'success' ? 'border-emerald-200' :
                  notification.type === 'error' ? 'border-red-200' :
                  notification.type === 'warning' ? 'border-amber-200' :
                  'border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      notification.type === 'success' ? 'bg-emerald-100' :
                      notification.type === 'error' ? 'bg-red-100' :
                      notification.type === 'warning' ? 'bg-amber-100' :
                      'bg-blue-100'
                    }`}>
                      {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      {notification.type === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                      {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                      {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span className="font-medium">Dashboard</span>
              </button>
              <div className="w-px h-6 bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Data Connectors</h1>
            </div>
            
            <motion.button
              onClick={() => setShowCreateForm(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Connector</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Dashboard Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Connectors</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-3xl font-bold text-amber-600">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-3xl font-bold text-red-600">{stats.error}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Toolbar */}
        {connectors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
              {/* Left Side - Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search connectors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="error">Error</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                  <option value="created">Sort by Created</option>
                  <option value="updated">Sort by Updated</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Right Side - View Controls and Actions */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={loadConnectors}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Selection Info */}
            {selectedConnectors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {selectedConnectors.length} connector{selectedConnectors.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedConnectors([])}
                    className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Clear selection
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
                  >
                    Export Selected
                  </button>
                  
                  <button
                    onClick={() => {
                      selectedConnectors.forEach(id => {
                        const connector = connectors.find(c => c.id === id);
                        if (connector) handleTestConnection(connector);
                      });
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    Test Selected
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${selectedConnectors.length} connector${selectedConnectors.length > 1 ? 's' : ''}?`)) {
                        selectedConnectors.forEach(id => {
                          const connector = connectors.find(c => c.id === id);
                          if (connector) handleDeleteConnector(connector.id, connector.name);
                        });
                        setSelectedConnectors([]);
                      }
                    }}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div
                className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="mt-4 text-gray-600">Loading connectors...</p>
            </div>
          ) : filteredAndSortedConnectors.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {connectors.length === 0 ? 'No connectors yet' : 'No matching connectors'}
              </h3>
              <p className="text-gray-500 mb-6">
                {connectors.length === 0 
                  ? 'Get started by creating your first data connector.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {connectors.length === 0 && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Connector</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Select All Header */}
              <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedConnectors.length === filteredAndSortedConnectors.length && filteredAndSortedConnectors.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    Select all ({filteredAndSortedConnectors.length} connectors)
                  </span>
                </label>
              </div>

              {/* Content Views */}
              {viewMode === 'grid' && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedConnectors.map((connector, index) => (
                      <ConnectorGridCard 
                        key={connector.id} 
                        connector={connector} 
                        index={index}
                        selected={selectedConnectors.includes(connector.id)}
                        onSelect={handleSelectConnector}
                        onTest={handleTestConnection}
                        onDelete={handleDeleteConnector}
                        testing={testing}
                      />
                    ))}
                  </div>
                </div>
              )}

              {viewMode === 'list' && (
                <div className="divide-y divide-gray-200">
                  {filteredAndSortedConnectors.map((connector, index) => (
                    <ConnectorListItem 
                      key={connector.id} 
                      connector={connector} 
                      index={index}
                      selected={selectedConnectors.includes(connector.id)}
                      onSelect={handleSelectConnector}
                      onTest={handleTestConnection}
                      onDelete={handleDeleteConnector}
                      testing={testing}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <ConnectorTable 
                  connectors={filteredAndSortedConnectors}
                  selectedConnectors={selectedConnectors}
                  onSelect={handleSelectConnector}
                  onSelectAll={handleSelectAll}
                  onTest={handleTestConnection}
                  onDelete={handleDeleteConnector}
                  testing={testing}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={(field) => {
                    if (field === sortBy) {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy(field)
                      setSortOrder('asc')
                    }
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Create Form Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="backdrop-blur-xl bg-white/95 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/50"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 bg-clip-text text-transparent">
                          Create New Connector
                        </h2>
                        <p className="text-sm text-gray-600">Connect to your data sources with secure authentication</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setShowCreateForm(false)}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <form onSubmit={handleCreateConnector} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <User className="w-4 h-4 text-indigo-500" />
                          <span>Connector Name</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => handleUpdateForm('name', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all backdrop-blur-sm"
                          placeholder="e.g., Production Database, Analytics DB"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <span>Description</span>
                        </label>
                        <textarea
                          value={form.description}
                          onChange={(e) => handleUpdateForm('description', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all backdrop-blur-sm resize-none"
                          placeholder="Brief description of this data connector"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <span>Database Type</span>
                      </label>
                      <select
                        value={form.connection_config.type}
                        onChange={(e) => handleUpdateForm('connection_config.type', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all backdrop-blur-sm"
                      >
                        <option value="postgresql">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                      </select>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <Server className="w-4 h-4 text-blue-500" />
                        <span>Connection Details</span>
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span>Host</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={form.connection_config.host}
                            onChange={(e) => handleUpdateForm('connection_config.host', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="localhost"
                          />
                        </div>

                        <div>
                          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                            <Hash className="w-4 h-4 text-blue-500" />
                            <span>Port</span>
                          </label>
                          <input
                            type="number"
                            required
                            value={form.connection_config.port}
                            onChange={(e) => handleUpdateForm('connection_config.port', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                          <Database className="w-4 h-4 text-blue-500" />
                          <span>Database Name</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.connection_config.database}
                          onChange={(e) => handleUpdateForm('connection_config.database', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="my_database"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span>Username</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={form.connection_config.username}
                            onChange={(e) => handleUpdateForm('connection_config.username', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>

                        <div>
                          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                            <Lock className="w-4 h-4 text-blue-500" />
                            <span>Password</span>
                          </label>
                          <input
                            type="password"
                            required
                            value={form.connection_config.password}
                            onChange={(e) => handleUpdateForm('connection_config.password', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200/50 rounded-xl bg-white/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                      <motion.button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        type="submit"
                        disabled={creating}
                        whileHover={{ scale: creating ? 1 : 1.02 }}
                        whileTap={{ scale: creating ? 1 : 0.98 }}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center space-x-2"
                      >
                        {creating ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </motion.div>
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Create Connector</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modern Connection Test Result */}
        <AnimatePresence>
          {connectionTest && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-8"
            >
              <div className={`backdrop-blur-md rounded-2xl shadow-lg border p-6 ${
                connectionTest.success 
                  ? 'bg-emerald-50/80 border-emerald-200/50' 
                  : 'bg-red-50/80 border-red-200/50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                      connectionTest.success 
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' 
                        : 'bg-gradient-to-br from-red-400 to-red-600'
                    }`}>
                      {connectionTest.success ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <XCircle className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold text-lg ${
                        connectionTest.success ? 'text-emerald-800' : 'text-red-800'
                      }`}>
                        {connectionTest.success ? 'Connection Successful!' : 'Connection Failed'}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        connectionTest.success ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {connectionTest.message}
                      </p>
                      
                      {connectionTest.success && connectionTest.schema_preview && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-emerald-200/30">
                            <div className="flex items-center space-x-2">
                              <Database className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-800">Database</span>
                            </div>
                            <p className="text-sm text-emerald-700 mt-1">{connectionTest.schema_preview.database}</p>
                          </div>
                          
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-emerald-200/30">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-800">Tables Found</span>
                            </div>
                            <p className="text-sm text-emerald-700 mt-1">{connectionTest.schema_preview.table_count}</p>
                          </div>
                          
                          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-emerald-200/30">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-800">Response Time</span>
                            </div>
                            <p className="text-sm text-emerald-700 mt-1">{connectionTest.connection_time_ms?.toFixed(1)}ms</p>
                          </div>
                        </div>
                      )}
                      
                      {connectionTest.success && connectionTest.schema_preview?.tables && (
                        <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-emerald-200/30">
                          <div className="flex items-center space-x-2 mb-2">
                            <Activity className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-800">Sample Tables</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {connectionTest.schema_preview.tables.slice(0, 5).map((table: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-emerald-100/80 text-emerald-700 text-xs rounded-lg font-mono">
                                {table}
                              </span>
                            ))}
                            {connectionTest.schema_preview.tables.length > 5 && (
                              <span className="px-2 py-1 bg-emerald-100/80 text-emerald-700 text-xs rounded-lg">
                                +{connectionTest.schema_preview.tables.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={() => setConnectionTest(null)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/60 hover:bg-white/80 transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-gray-500" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Export Modal */}
        <AnimatePresence>
          {showExportModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-8 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 bg-clip-text text-transparent">
                        Export Connectors
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {selectedConnectors.length > 0 
                          ? `Export ${selectedConnectors.length} selected connector${selectedConnectors.length > 1 ? 's' : ''}` 
                          : `Export all ${filteredAndSortedConnectors.length} connector${filteredAndSortedConnectors.length > 1 ? 's' : ''}`
                        }
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setShowExportModal(false)}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100/80 hover:bg-gray-200/80 transition-colors"
                    >
                      <XCircle className="w-5 h-5 text-gray-500" />
                    </motion.button>
                  </div>
                </div>

                {/* Export Options */}
                <div className="px-8 pb-8">
                  <div className="space-y-4">
                    <motion.button
                      onClick={() => exportConnectors('json')}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl transition-all border border-blue-200/50"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-gray-900">JSON Format</h4>
                        <p className="text-sm text-gray-600">Developer-friendly structured data</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-blue-600" />
                    </motion.button>

                    <motion.button
                      onClick={() => exportConnectors('csv')}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center space-x-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 rounded-2xl transition-all border border-emerald-200/50"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                        <Download className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-gray-900">CSV Format</h4>
                        <p className="text-sm text-gray-600">Spreadsheet-compatible format</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-emerald-600" />
                    </motion.button>
                  </div>

                  {/* Preview */}
                  <div className="mt-6 p-4 bg-gray-50/80 rounded-2xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Export includes:</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>• Connector name and type</div>
                      <div>• Connection status and details</div>
                      <div>• Creation and update dates</div>
                      <div>• Host and database information</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}