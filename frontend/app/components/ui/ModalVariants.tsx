"use client"

import * as React from "react"
import { Modal } from "./Modal"
import { Button } from "./Button"
import { Input } from "./Input"
import { Textarea } from "./Textarea"
import { Label } from "./Label"
import { Zap, Database, Upload, Settings, BarChart3, Plus, Save, X } from "lucide-react"
import { toast } from "sonner"

// Pipeline Creation Modal
interface PipelineModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (data: { name: string; description: string }) => void
}

export function PipelineCreationModal({ isOpen, onClose, onSubmit }: PipelineModalProps) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Pipeline name is required")
      return
    }

    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      onSubmit?.({ name: name.trim(), description: description.trim() })
      toast.success("Pipeline created successfully!")
      setName("")
      setDescription("")
      onClose()
    } catch (error) {
      toast.error("Failed to create pipeline")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Pipeline"
      description="Set up a new data processing pipeline"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="pipeline-name">Pipeline Name</Label>
            <Input
              id="pipeline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter pipeline name..."
              className="mt-1"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="pipeline-description">Description</Label>
            <Textarea
              id="pipeline-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this pipeline does..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Create Pipeline</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Data Source Modal
interface DataSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (data: { type: string; name: string; config: any }) => void
}

export function DataSourceModal({ isOpen, onClose, onSubmit }: DataSourceModalProps) {
  const [selectedType, setSelectedType] = React.useState<string>("")
  const [name, setName] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const dataSourceTypes = [
    { id: "postgresql", name: "PostgreSQL", icon: "🐘", description: "Connect to PostgreSQL database" },
    { id: "mysql", name: "MySQL", icon: "🐬", description: "Connect to MySQL database" },
    { id: "csv", name: "CSV File", icon: "📄", description: "Upload CSV files" },
    { id: "api", name: "REST API", icon: "🔗", description: "Connect to REST API endpoint" }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !name.trim()) {
      toast.error("Please select a data source type and enter a name")
      return
    }

    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      onSubmit?.({ type: selectedType, name: name.trim(), config: {} })
      toast.success("Data source added successfully!")
      setSelectedType("")
      setName("")
      onClose()
    } catch (error) {
      toast.error("Failed to add data source")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Data Source"
      description="Connect a new data source to your pipeline"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Data Source Type</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {dataSourceTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 border rounded-xl text-left transition-all duration-200 ${
                    selectedType === type.id
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{type.name}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="source-name">Connection Name</Label>
            <Input
              id="source-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter connection name..."
              className="mt-1"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Add Source</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// File Upload Modal
interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload?: (files: FileList) => void
}

export function FileUploadModal({ isOpen, onClose, onUpload }: FileUploadModalProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [files, setFiles] = React.useState<FileList | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(e.target.files)
    }
  }

  const handleUpload = async () => {
    if (!files) {
      toast.error("Please select files to upload")
      return
    }

    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      onUpload?.(files)
      toast.success(`${files.length} file(s) uploaded successfully!`)
      setFiles(null)
      onClose()
    } catch (error) {
      toast.error("Failed to upload files")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Data Files"
      description="Upload CSV, Excel, or JSON files for processing"
      size="lg"
    >
      <div className="p-6 space-y-6">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports CSV, Excel (.xlsx), and JSON files up to 100MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
          >
            Browse Files
          </Button>
        </div>

        {files && (
          <div className="space-y-2">
            <Label>Selected Files:</Label>
            <div className="space-y-2">
              {Array.from(files).map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {file.name.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setFiles(null)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isLoading || !files}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Files</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Pipeline Details Modal
interface PipelineDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  pipeline?: {
    id: string
    name: string
    description: string
    status: string
    steps: any[]
    lastRun?: string
    recordsProcessed?: string
    runtime?: string
  }
}

export function PipelineDetailsModal({ isOpen, onClose, pipeline }: PipelineDetailsModalProps) {
  if (!pipeline) return null

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pipeline.name}
      description="Pipeline details and configuration"
      size="xl"
    >
      <div className="p-6 space-y-6">
        {/* Status and Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(pipeline.status)}`}>
              {pipeline.status}
            </span>
          </div>
          {pipeline.recordsProcessed && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Records Processed</div>
              <div className="text-lg font-semibold text-gray-900">{pipeline.recordsProcessed}</div>
            </div>
          )}
          {pipeline.runtime && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Runtime</div>
              <div className="text-lg font-semibold text-gray-900">{pipeline.runtime}</div>
            </div>
          )}
        </div>

        {/* Description */}
        {pipeline.description && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
            <p className="text-gray-600">{pipeline.description}</p>
          </div>
        )}

        {/* Pipeline Steps */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Pipeline Steps</h4>
          <div className="space-y-3">
            {pipeline.steps.map((step, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{step.name || step.type}</div>
                  <div className="text-sm text-gray-600">{step.description || 'No description'}</div>
                </div>
                <div className="text-sm text-gray-500">{step.type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Run Pipeline</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Connector Details Modal
interface ConnectorDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  connector?: {
    id: string
    name: string
    type: string
    status: string
    config: any
    lastSync?: string
    recordCount?: number
  }
}

export function ConnectorDetailsModal({ isOpen, onClose, connector }: ConnectorDetailsModalProps) {
  if (!connector) return null

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200'
      case 'disconnected': return 'bg-red-100 text-red-800 border-red-200'
      case 'syncing': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={connector.name}
      description={`${connector.type} connector details`}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Status and Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(connector.status)}`}>
              {connector.status}
            </span>
          </div>
          {connector.recordCount && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-600 mb-1">Records</div>
              <div className="text-lg font-semibold text-gray-900">{connector.recordCount.toLocaleString()}</div>
            </div>
          )}
        </div>

        {/* Configuration */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Configuration</h4>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type:</span>
                <span className="text-sm font-medium text-gray-900">{connector.type}</span>
              </div>
              {connector.lastSync && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Sync:</span>
                  <span className="text-sm font-medium text-gray-900">{connector.lastSync}</span>
                </div>
              )}
              {Object.entries(connector.config || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm text-gray-600">{key}:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Test Connection</span>
          </Button>
          <Button className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Edit Connector</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
