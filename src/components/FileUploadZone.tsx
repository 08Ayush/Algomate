/**
 * FileUploadZone Component
 * 
 * Reusable file upload component with drag-and-drop for assignments
 */

'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, File, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  uploading?: boolean;
  uploadedFiles?: Array<{ url: string; filePath: string; name: string }>;
  onFileRemove?: (filePath: string) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  error?: string | null;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
    return <ImageIcon className="w-6 h-6 text-blue-500" />;
  } else if (['pdf'].includes(ext || '')) {
    return <FileText className="w-6 h-6 text-red-500" />;
  } else if (['doc', 'docx'].includes(ext || '')) {
    return <FileText className="w-6 h-6 text-blue-600" />;
  } else {
    return <File className="w-6 h-6 text-gray-500" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function FileUploadZone({
  onFilesSelected,
  uploading = false,
  uploadedFiles = [],
  onFileRemove,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp',
  maxSize = 10,
  multiple = true,
  disabled = false,
  error = null,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFilesSelected(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled || uploading) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
          aria-label="File upload input"
          title="Upload file"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${dragOver ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}
          `}>
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              {dragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {accept.split(',').join(', ')} (max {maxSize}MB)
            </p>
          </div>

          {uploading && (
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-full bg-primary animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <X className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              {getFileIcon(file.name)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View file
                </a>
              </div>

              {onFileRemove && !disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove(file.filePath);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
