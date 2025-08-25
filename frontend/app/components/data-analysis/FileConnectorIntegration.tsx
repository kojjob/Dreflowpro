'use client';

import React, { useState, useEffect } from 'react';
import { Database, Upload, FileText, CheckCircle, Plus, Settings } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  format: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  preview?: any[];
  schema?: {
    columns: Array<{
      name: string;
      type: 'string' | 'number' | 'date' | 'boolean';
      nullable: boolean;
      unique: boolean;
      samples: any[];
    }>;
    rowCount: number;
    encoding?: string;
  };
  error?: string;
  uploadedAt: string;
}

interface FileConnector {
  id: string;
  name: string;
  description: string;
  fileId: string;
  file: UploadedFile;
  connectionString: string;
  isActive: boolean;
  createdAt: string;
}

interface FileConnectorIntegrationProps {
  uploadedFiles: UploadedFile[];
  onConnectorCreated?: (connector: FileConnector) => void;
  onConnectorUpdated?: (connector: FileConnector) => void;
}

const FileConnectorIntegration: React.FC<FileConnectorIntegrationProps> = ({
  uploadedFiles,
  onConnectorCreated,
  onConnectorUpdated
}) => {
  const [connectors, setConnectors] = useState<FileConnector[]>([]);
  const [showCreateConnector, setShowCreateConnector] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [connectorName, setConnectorName] = useState('');
  const [connectorDescription, setConnectorDescription] = useState('');

  // Auto-create connectors for completed files
  useEffect(() => {
    uploadedFiles.forEach(file => {
      if (file.status === 'completed' && !connectors.find(c => c.fileId === file.id)) {
        createAutoConnector(file);
      }
    });
  }, [uploadedFiles]);

  const createAutoConnector = (file: UploadedFile) => {
    const connector: FileConnector = {
      id: `connector-${file.id}`,
      name: `${file.name} Connector`,
      description: `Auto-generated connector for ${file.name}`,
      fileId: file.id,
      file,
      connectionString: generateConnectionString(file),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setConnectors(prev => [...prev, connector]);
    onConnectorCreated?.(connector);
  };

  const generateConnectionString = (file: UploadedFile): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/v1/connectors/file/${file.id}`;
  };

  const createCustomConnector = () => {
    if (!selectedFile || !connectorName.trim()) return;

    const connector: FileConnector = {
      id: `connector-${Date.now()}`,
      name: connectorName.trim(),
      description: connectorDescription.trim() || `Custom connector for ${selectedFile.name}`,
      fileId: selectedFile.id,
      file: selectedFile,
      connectionString: generateConnectionString(selectedFile),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setConnectors(prev => [...prev, connector]);
    onConnectorCreated?.(connector);

    // Reset form
    setShowCreateConnector(false);
    setSelectedFile(null);
    setConnectorName('');
    setConnectorDescription('');
  };

  const toggleConnector = (connectorId: string) => {
    setConnectors(prev => prev.map(connector => {
      if (connector.id === connectorId) {
        const updated = { ...connector, isActive: !connector.isActive };
        onConnectorUpdated?.(updated);
        return updated;
      }
      return connector;
    }));
  };

  const getFileIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'csv':
      case 'txt':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'xlsx':
      case 'xls':
        return <Database className="w-5 h-5 text-emerald-600" />;
      case 'json':
        return <FileText className="w-5 h-5 text-yellow-600" />;
      case 'xml':
        return <FileText className="w-5 h-5 text-orange-600" />;
      case 'parquet':
        return <Database className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedFiles = uploadedFiles.filter(file => file.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">File Connectors</h3>
            <p className="text-gray-600">
              Create data connectors from uploaded files for use in ETL pipelines
            </p>
          </div>
          <button
            onClick={() => setShowCreateConnector(true)}
            disabled={completedFiles.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Create Connector</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Upload className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{uploadedFiles.length}</div>
                <div className="text-sm text-blue-700">Uploaded Files</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-600">{connectors.length}</div>
                <div className="text-sm text-green-700">Active Connectors</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-purple-600">{connectors.filter(c => c.isActive).length}</div>
                <div className="text-sm text-purple-700">Ready for Pipelines</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connectors List */}
      {connectors.length > 0 ? (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Available Connectors</h4>
          <div className="space-y-4">
            {connectors.map((connector) => (
              <div
                key={connector.id}
                className={`border rounded-lg p-4 ${
                  connector.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(connector.file.format)}
                    <div>
                      <h5 className="font-medium text-gray-900">{connector.name}</h5>
                      <p className="text-sm text-gray-600">{connector.description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>File: {connector.file.name}</span>
                        <span>Size: {formatFileSize(connector.file.size)}</span>
                        <span>Rows: {connector.file.schema?.rowCount.toLocaleString()}</span>
                        <span>Columns: {connector.file.schema?.columns.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      connector.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {connector.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleConnector(connector.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      {connector.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="mt-3 p-3 bg-white border rounded">
                  <div className="text-sm">
                    <div className="font-medium text-gray-700 mb-1">Connection String:</div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-800">
                      {connector.connectionString}
                    </code>
                  </div>
                  
                  {connector.file.schema && (
                    <div className="mt-3">
                      <div className="font-medium text-gray-700 mb-2">Schema Preview:</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {connector.file.schema.columns.slice(0, 8).map((column, index) => (
                          <div key={index} className="text-xs">
                            <span className="font-medium text-gray-700">{column.name}</span>
                            <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                              column.type === 'number' ? 'bg-blue-100 text-blue-700' :
                              column.type === 'date' ? 'bg-green-100 text-green-700' :
                              column.type === 'boolean' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {column.type}
                            </span>
                          </div>
                        ))}
                        {connector.file.schema.columns.length > 8 && (
                          <div className="text-xs text-gray-500">
                            +{connector.file.schema.columns.length - 8} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-8 text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No connectors created yet</h3>
          <p className="text-gray-600 mb-4">
            Upload files and create connectors to use them in your ETL pipelines
          </p>
          {completedFiles.length === 0 && (
            <p className="text-sm text-gray-500">
              Upload some files first to create connectors
            </p>
          )}
        </div>
      )}

      {/* Create Connector Modal */}
      {showCreateConnector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create File Connector</h3>
              <button
                onClick={() => setShowCreateConnector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* File Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {completedFiles.map((file) => (
                    <label
                      key={file.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                        selectedFile?.id === file.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="selectedFile"
                        checked={selectedFile?.id === file.id}
                        onChange={() => setSelectedFile(file)}
                        className="mr-3"
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        {getFileIcon(file.format)}
                        <div>
                          <div className="font-medium text-gray-900">{file.name}</div>
                          <div className="text-sm text-gray-600">
                            {formatFileSize(file.size)} • {file.schema?.rowCount.toLocaleString()} rows
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Connector Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Connector Name</label>
                <input
                  type="text"
                  value={connectorName}
                  onChange={(e) => setConnectorName(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Enter connector name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={connectorDescription}
                  onChange={(e) => setConnectorDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                  placeholder="Enter connector description"
                />
              </div>

              {/* Preview */}
              {selectedFile && (
                <div className="p-3 bg-gray-50 rounded">
                  <h5 className="font-medium text-gray-900 mb-2">Connection Preview</h5>
                  <div className="text-sm text-gray-600">
                    <div>Connection String: <code className="text-xs bg-white px-1 py-0.5 rounded">{generateConnectionString(selectedFile)}</code></div>
                    <div>Schema: {selectedFile.schema?.columns.length} columns, {selectedFile.schema?.rowCount.toLocaleString()} rows</div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateConnector(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createCustomConnector}
                disabled={!selectedFile || !connectorName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create Connector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integration Instructions */}
      {connectors.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Settings className="w-6 h-6 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Using File Connectors in Pipelines</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Navigate to the ETL Pipeline Builder</p>
                <p>• Click "Add Source" and select "File Connector"</p>
                <p>• Choose from your available file connectors</p>
                <p>• Configure transformations and destinations as needed</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileConnectorIntegration;
