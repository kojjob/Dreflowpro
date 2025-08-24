'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { UPLOAD_CONFIG, formatFileSize, isValidFileType } from '../../config/dataConfig';
import { apiService } from '../../services/api';

interface FileUploadProps {
  onFileUploaded: (result: any) => void;
  onError: (error: string) => void;
  maxSize?: number;
  acceptedTypes?: string[];
  previewRows?: number;
}

export default function FileUpload({ 
  onFileUploaded, 
  onError, 
  maxSize,
  acceptedTypes,
  previewRows
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [uploadConfig, setUploadConfig] = useState({
    maxSize: maxSize || UPLOAD_CONFIG.maxFileSize,
    acceptedTypes: acceptedTypes || UPLOAD_CONFIG.acceptedFileTypes,
    previewRows: previewRows || UPLOAD_CONFIG.defaultPreviewRows,
    mimeTypes: UPLOAD_CONFIG.acceptedMimeTypes
  });

  // Load dynamic upload configuration
  useEffect(() => {
    const loadUploadConfig = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const configResponse = await apiService.getUploadConfig();
          if (configResponse.success) {
            setUploadConfig(prev => ({
              ...prev,
              maxSize: maxSize || configResponse.config.max_file_size,
              acceptedTypes: acceptedTypes || Object.keys(configResponse.config.file_type_configs),
              previewRows: previewRows || configResponse.config.default_preview_rows
            }));
          }
        }
      } catch (error) {
        console.warn('Failed to load upload config, using defaults:', error);
      }
    };

    loadUploadConfig();
  }, [maxSize, acceptedTypes, previewRows]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    
    try {
      // Validate file using configuration
      if (!isValidFileType(file.name)) {
        throw new Error(`File type not supported. Accepted types: ${uploadConfig.acceptedTypes.join(', ')}`);
      }

      if (file.size > uploadConfig.maxSize) {
        throw new Error(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(uploadConfig.maxSize)})`);
      }

      const result = await apiService.uploadFile(file, uploadConfig.previewRows);
      
      setUploadedFile({
        ...result,
        fileName: file.name,
        fileSize: file.size,
      });
      onFileUploaded(result);
      
    } catch (error) {
      console.error('Upload error:', error);
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(({ errors }) => 
        errors.map(e => e.message).join(', ')
      ).join('; ');
      onError(`File rejected: ${errors}`);
      return;
    }

    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0]);
    }
  }, [onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: uploadConfig.mimeTypes,
    maxSize: uploadConfig.maxSize,
    multiple: false,
  });

  const clearFile = () => {
    setUploadedFile(null);
  };

  if (uploadedFile) {
    return (
      <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">{uploadedFile.fileName}</p>
              <p className="text-sm text-green-600">
                {formatFileSize(uploadedFile.fileSize)} • Uploaded successfully
              </p>
              <p className="text-xs text-green-600 mt-1">
                Rows: {uploadedFile.data_analysis?.data_info?.row_count || 'N/A'} • 
                Columns: {uploadedFile.data_analysis?.data_info?.column_count || 'N/A'}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFile}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-blue-400 bg-blue-50' 
          : uploading 
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
    >
      <input {...getInputProps()} disabled={uploading} />
      
      {uploading ? (
        <div className="space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Uploading and analyzing your file...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Upload className="h-12 w-12 text-gray-400 mx-auto" />
          
          {isDragActive ? (
            <p className="text-lg text-blue-600">Drop your file here...</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600 mb-2">
                Drag & drop your data file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-3">
                Supports CSV, Excel, JSON, and Text files (max {formatFileSize(uploadConfig.maxSize)})
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            {uploadConfig.acceptedTypes.map(type => (
              <span key={type} className="px-2 py-1 bg-gray-100 rounded">
                {type.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}