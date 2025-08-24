"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { API_CONFIG } from "../config/dataConfig"

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

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [connectionTest, setConnectionTest] = useState<any>(null)
  const router = useRouter()

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

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    // Redirect to dashboard with connectors tab active
    router.push('/dashboard?tab=connectors')
  }, [router])

  const loadConnectors = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/connectors/`)
      if (response.ok) {
        const data = await response.json()
        setConnectors(data.connectors || [])
      }
    } catch (error) {
      console.error('Failed to load connectors:', error)
    } finally {
      setLoading(false)
    }
  }

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
      }
    } catch (error) {
      console.error('Failed to create connector:', error)
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
      }
    } catch (error) {
      console.error('Connection test failed:', error)
    } finally {
      setTesting(null)
    }
  }

  const handleDeleteConnector = async (connectorId: string) => {
    if (!confirm('Are you sure you want to delete this connector?')) return
    
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/connectors/${connectorId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadConnectors()
      }
    } catch (error) {
      console.error('Failed to delete connector:', error)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white via-indigo-50 to-blue-50 shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-500 hover:text-indigo-600 transition-colors duration-200 bg-white/50 px-3 py-2 rounded-lg hover:bg-white/80"
              >
                <span>←</span>
                <span className="font-medium">Back to Dashboard</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🔌</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 bg-clip-text text-transparent">
                    Data Connectors
                  </h1>
                  <p className="text-sm text-gray-600">Seamless data source integration</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-lg border border-blue-200">
                  📊 {connectors.length} Active Connectors
                </span>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <span className="text-lg">+</span>
                <span>New Connector</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Connector</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateConnector} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connector Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => handleUpdateForm('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="My Database Connector"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleUpdateForm('description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Description of this connector"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Type
                  </label>
                  <select
                    value={form.connection_config.type}
                    onChange={(e) => handleUpdateForm('connection_config.type', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Host
                    </label>
                    <input
                      type="text"
                      required
                      value={form.connection_config.host}
                      onChange={(e) => handleUpdateForm('connection_config.host', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="localhost"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      required
                      value={form.connection_config.port}
                      onChange={(e) => handleUpdateForm('connection_config.port', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Database Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.connection_config.database}
                    onChange={(e) => handleUpdateForm('connection_config.database', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="my_database"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={form.connection_config.username}
                      onChange={(e) => handleUpdateForm('connection_config.username', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={form.connection_config.password}
                      onChange={(e) => handleUpdateForm('connection_config.password', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Connector'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Connection Test Result */}
        {connectionTest && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              connectionTest.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={connectionTest.success ? 'text-green-600' : 'text-red-600'}>
                  {connectionTest.success ? '✅' : '❌'}
                </span>
                <p className={`font-medium ${connectionTest.success ? 'text-green-800' : 'text-red-800'}`}>
                  Connection Test: {connectionTest.message}
                </p>
              </div>
              <button
                onClick={() => setConnectionTest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            {connectionTest.success && connectionTest.schema_preview && (
              <div className="mt-2 text-sm text-green-700">
                <p>Database: {connectionTest.schema_preview.database}</p>
                <p>Tables found: {connectionTest.schema_preview.table_count}</p>
                <p>Connection time: {connectionTest.connection_time_ms?.toFixed(1)}ms</p>
                {connectionTest.schema_preview.tables && (
                  <p>Sample tables: {connectionTest.schema_preview.tables.slice(0, 3).join(', ')}</p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Connectors List */}
        <div className="bg-white rounded-xl shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : connectors.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-12 max-w-2xl mx-auto border border-indigo-100">
                <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-5xl">🔌</span>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 bg-clip-text text-transparent mb-4">
                  No connectors yet
                </h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  Create your first data connector to get started with ETL operations.
                  Connect to databases, APIs, and file systems with just a few clicks.
                </p>

                {/* Feature highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white/70 rounded-xl p-4 border border-white/50">
                    <div className="text-2xl mb-2">🚀</div>
                    <div className="text-sm font-medium text-gray-700">Quick Setup</div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4 border border-white/50">
                    <div className="text-2xl mb-2">🔒</div>
                    <div className="text-sm font-medium text-gray-700">Secure</div>
                  </div>
                  <div className="bg-white/70 rounded-xl p-4 border border-white/50">
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="text-sm font-medium text-gray-700">High Performance</div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🚀 Create Your First Connector
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Connectors</h3>
                <p className="text-sm text-gray-600">{connectors.length} total connectors</p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {connectors.map((connector) => (
                  <motion.div
                    key={connector.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          connector.status === 'active' ? 'bg-green-400' : 
                          connector.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                        }`}></div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900">{connector.name}</h4>
                          <p className="text-sm text-gray-600">{connector.description}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                              {connector.connection_config?.type || connector.type}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded capitalize ${
                              connector.status === 'active' ? 'bg-green-100 text-green-800' :
                              connector.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {connector.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              Created {new Date(connector.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleTestConnection(connector)}
                          disabled={testing === connector.id}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {testing === connector.id ? 'Testing...' : 'Test Connection'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteConnector(connector.id)}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {connector.connection_config && (
                      <div className="mt-4 text-sm text-gray-600">
                        <p>
                          <strong>Connection:</strong> {connector.connection_config.host}:{connector.connection_config.port}/{connector.connection_config.database}
                        </p>
                        {connector.last_tested && (
                          <p>
                            <strong>Last tested:</strong> {new Date(connector.last_tested).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}