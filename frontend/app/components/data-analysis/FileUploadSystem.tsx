'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, FileText, Database, BarChart3 } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  format: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  preview?: any[];
  schema?: FileSchema;
  error?: string;
  uploadedAt: string;
}

interface FileSchema {
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    nullable: boolean;
    unique: boolean;
    samples: any[];
  }>;
  rowCount: number;
  encoding?: string;
}

const SUPPORTED_FORMATS = {
  'text/csv': { ext: 'csv', icon: FileText, color: 'text-green-600' },
  'text/plain': { ext: 'txt', icon: FileText, color: 'text-blue-600' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', icon: Database, color: 'text-emerald-600' },
  'application/vnd.ms-excel': { ext: 'xls', icon: Database, color: 'text-emerald-600' },
  'application/json': { ext: 'json', icon: FileText, color: 'text-yellow-600' },
  'application/xml': { ext: 'xml', icon: FileText, color: 'text-orange-600' },
  'text/xml': { ext: 'xml', icon: FileText, color: 'text-orange-600' },
  'application/octet-stream': { ext: 'parquet', icon: Database, color: 'text-purple-600' }
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface FileUploadSystemProps {
  onFileUploaded?: (file: UploadedFile) => void;
  onFileAnalyzed?: (file: UploadedFile) => void;
}

const FileUploadSystem: React.FC<FileUploadSystemProps> = ({
  onFileUploaded,
  onFileAnalyzed
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const validateFile = (file: File): { valid: boolean; error?: string; format?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds 100MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)` };
    }

    // Check file format
    let format = SUPPORTED_FORMATS[file.type as keyof typeof SUPPORTED_FORMATS];
    
    // Handle special cases for file extensions
    if (!format) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'parquet') {
        format = SUPPORTED_FORMATS['application/octet-stream'];
      } else if (extension === 'csv') {
        format = SUPPORTED_FORMATS['text/csv'];
      } else if (extension === 'txt') {
        format = SUPPORTED_FORMATS['text/plain'];
      }
    }

    if (!format) {
      return { 
        valid: false, 
        error: `Unsupported file format. Supported formats: CSV, TXT, Excel (.xlsx, .xls), JSON, XML, Parquet` 
      };
    }

    return { valid: true, format: format.ext };
  };

  const detectEncoding = async (file: File): Promise<string> => {
    // Simple encoding detection - in production, use a proper library
    const buffer = await file.slice(0, 1024).arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    
    try {
      decoder.decode(buffer);
      return 'UTF-8';
    } catch {
      return 'ASCII';
    }
  };

  const parseFileContent = async (file: File, format: string): Promise<{ preview: any[]; schema: FileSchema }> => {
    const content = await file.text();
    
    switch (format) {
      case 'csv':
        return parseCSV(content);
      case 'txt':
        return parseTXT(content);
      case 'json':
        return parseJSON(content);
      case 'xml':
        return parseXML(content);
      case 'xlsx':
      case 'xls':
        return parseExcel(file);
      case 'parquet':
        return parseParquet(file);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  };

  const parseCSV = (content: string): { preview: any[]; schema: FileSchema } => {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1, 11).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      return row;
    });

    const schema: FileSchema = {
      columns: headers.map(header => {
        const values = rows.map(row => row[header]).filter(v => v !== null && v !== '');
        const type = inferDataType(values);
        return {
          name: header,
          type,
          nullable: values.length < rows.length,
          unique: new Set(values).size === values.length,
          samples: values.slice(0, 5)
        };
      }),
      rowCount: lines.length - 1,
      encoding: 'UTF-8'
    };

    return { preview: rows, schema };
  };

  const parseTXT = (content: string): { preview: any[]; schema: FileSchema } => {
    const lines = content.split('\n').filter(line => line.trim()).slice(0, 10);
    const preview = lines.map((line, index) => ({ line_number: index + 1, content: line }));
    
    const schema: FileSchema = {
      columns: [
        { name: 'line_number', type: 'number', nullable: false, unique: true, samples: [1, 2, 3, 4, 5] },
        { name: 'content', type: 'string', nullable: false, unique: false, samples: lines.slice(0, 5) }
      ],
      rowCount: content.split('\n').length,
      encoding: 'UTF-8'
    };

    return { preview, schema };
  };

  const parseJSON = (content: string): { preview: any[]; schema: FileSchema } => {
    try {
      const data = JSON.parse(content);
      const array = Array.isArray(data) ? data : [data];
      const preview = array.slice(0, 10);
      
      // Infer schema from first few objects
      const allKeys = new Set<string>();
      preview.forEach(obj => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => allKeys.add(key));
        }
      });

      const schema: FileSchema = {
        columns: Array.from(allKeys).map(key => {
          const values = preview.map(obj => obj[key]).filter(v => v !== undefined);
          return {
            name: key,
            type: inferDataType(values),
            nullable: values.length < preview.length,
            unique: new Set(values).size === values.length,
            samples: values.slice(0, 5)
          };
        }),
        rowCount: array.length
      };

      return { preview, schema };
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  const parseXML = (content: string): { preview: any[]; schema: FileSchema } => {
    // Simple XML parsing - in production, use DOMParser or xml2js
    const preview = [{ xml_content: content.substring(0, 500) + '...' }];
    const schema: FileSchema = {
      columns: [
        { name: 'xml_content', type: 'string', nullable: false, unique: true, samples: [preview[0].xml_content] }
      ],
      rowCount: 1
    };
    return { preview, schema };
  };

  const parseExcel = async (file: File): Promise<{ preview: any[]; schema: FileSchema }> => {
    // Mock Excel parsing - in production, use SheetJS or similar
    const preview = [
      { Sheet: 'Sheet1', Note: 'Excel parsing requires SheetJS library' },
      { Sheet: 'Sheet1', Note: 'This is a mock preview' }
    ];
    
    const schema: FileSchema = {
      columns: [
        { name: 'Sheet', type: 'string', nullable: false, unique: false, samples: ['Sheet1'] },
        { name: 'Note', type: 'string', nullable: false, unique: false, samples: ['Excel parsing requires SheetJS library'] }
      ],
      rowCount: 2
    };

    return { preview, schema };
  };

  const parseParquet = async (file: File): Promise<{ preview: any[]; schema: FileSchema }> => {
    // Mock Parquet parsing - in production, use parquet-wasm or similar
    const preview = [{ note: 'Parquet parsing requires specialized library', file_size: file.size }];
    const schema: FileSchema = {
      columns: [
        { name: 'note', type: 'string', nullable: false, unique: true, samples: ['Parquet parsing requires specialized library'] },
        { name: 'file_size', type: 'number', nullable: false, unique: true, samples: [file.size] }
      ],
      rowCount: 1
    };
    return { preview, schema };
  };

  const inferDataType = (values: any[]): 'string' | 'number' | 'date' | 'boolean' => {
    if (values.length === 0) return 'string';
    
    // Check for boolean
    const booleanValues = values.filter(v => v === 'true' || v === 'false' || v === true || v === false);
    if (booleanValues.length === values.length) return 'boolean';
    
    // Check for number
    const numberValues = values.filter(v => !isNaN(Number(v)) && v !== '');
    if (numberValues.length === values.length) return 'number';
    
    // Check for date
    const dateValues = values.filter(v => !isNaN(Date.parse(v)));
    if (dateValues.length === values.length && values.some(v => v.includes('-') || v.includes('/'))) return 'date';
    
    return 'string';
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    
    for (const file of files) {
      const validation = validateFile(file);
      
      if (!validation.valid) {
        // Add error file to list
        const errorFile: UploadedFile = {
          id: `error-${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          format: 'unknown',
          status: 'error',
          progress: 0,
          error: validation.error,
          uploadedAt: new Date().toISOString()
        };
        
        setUploadedFiles(prev => [...prev, errorFile]);
        continue;
      }

      // Create upload entry
      const uploadFile: UploadedFile = {
        id: `upload-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        format: validation.format!,
        status: 'uploading',
        progress: 0,
        uploadedAt: new Date().toISOString()
      };

      setUploadedFiles(prev => [...prev, uploadFile]);

      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, progress } : f
          ));
        }

        // Process file
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'processing' } : f
        ));

        const encoding = await detectEncoding(file);
        const { preview, schema } = await parseFileContent(file, validation.format!);

        // Complete upload
        const completedFile: UploadedFile = {
          ...uploadFile,
          status: 'completed',
          progress: 100,
          preview,
          schema: { ...schema, encoding }
        };

        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? completedFile : f
        ));

        onFileUploaded?.(completedFile);

      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Processing failed' 
          } : f
        ));
      }
    }
    
    setIsUploading(false);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'uploading':
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload your data files
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supported formats: CSV, TXT, Excel (.xlsx, .xls), JSON, XML, Parquet
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Maximum file size: 100MB
        </p>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Choose Files'}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.txt,.xlsx,.xls,.json,.xml,.parquet"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
          
          {uploadedFiles.map((file) => {
            const formatInfo = SUPPORTED_FORMATS[file.type as keyof typeof SUPPORTED_FORMATS] || 
                              { icon: File, color: 'text-gray-600' };
            const IconComponent = formatInfo.icon;
            
            return (
              <div key={file.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <IconComponent className={`w-6 h-6 ${formatInfo.color}`} />
                    <div>
                      <h4 className="font-medium text-gray-900">{file.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(file.size)} • {file.format.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(file.status)}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {(file.status === 'uploading' || file.status === 'processing') && (
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{file.status === 'uploading' ? 'Uploading...' : 'Processing...'}</span>
                      <span>{file.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Error Message */}
                {file.status === 'error' && file.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
                    <p className="text-sm text-red-700">{file.error}</p>
                  </div>
                )}
                
                {/* Schema Preview */}
                {file.status === 'completed' && file.schema && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium text-gray-900">Schema Preview</h5>
                      <span className="text-sm text-gray-600">
                        {file.schema.rowCount.toLocaleString()} rows, {file.schema.columns.length} columns
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {file.schema.columns.slice(0, 6).map((column, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-gray-700">{column.name}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            column.type === 'number' ? 'bg-blue-100 text-blue-700' :
                            column.type === 'date' ? 'bg-green-100 text-green-700' :
                            column.type === 'boolean' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {column.type}
                          </span>
                        </div>
                      ))}
                      {file.schema.columns.length > 6 && (
                        <div className="text-sm text-gray-500">
                          +{file.schema.columns.length - 6} more columns
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUploadSystem;
