/**
 * AvatarUpload Component
 * 
 * UI component for avatar upload with drag-and-drop support
 */

'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Camera, Trash2 } from 'lucide-react';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { getAvatarUrlWithFallback } from '@/lib/storage/avatars';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName?: string;
  onUploadSuccess?: (url: string) => void;
  onDeleteSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
};

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
  onUploadSuccess,
  onDeleteSuccess,
  size = 'md',
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const { upload, remove, uploading, progress, error } = useAvatarUpload(userId);

  const avatarUrl = previewUrl || getAvatarUrlWithFallback(currentAvatarUrl, userName);

  const handleFileSelect = async (file: File) => {
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    const result = await upload(file);
    
    if (result.success && result.url) {
      onUploadSuccess?.(result.url);
    } else {
      // Revert preview on error
      setPreviewUrl(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDelete = async () => {
    const success = await remove();
    if (success) {
      setPreviewUrl(null);
      onDeleteSuccess?.();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-gray-100 ${
          dragOver ? 'ring-4 ring-primary' : ''
        } ${!uploading ? 'cursor-pointer group' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!uploading ? handleClick : undefined}
      >
        <Image
          src={avatarUrl}
          alt={userName || 'User avatar'}
          fill
          className="object-cover"
          unoptimized={avatarUrl.includes('ui-avatars.com')}
        />
        
        {/* Upload Overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white" />
          </div>
        )}

        {/* Progress Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-white text-sm">{Math.round(progress)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <label htmlFor="avatar-upload" className="hidden">
        Upload Avatar
      </label>
      <input
        id="avatar-upload"
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleClick}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Photo'}
        </button>

        {currentAvatarUrl && (
          <button
            onClick={handleDelete}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Help Text */}
      <p className="text-sm text-gray-500 text-center">
        JPG, PNG or WebP. Max size 2MB.
      </p>
    </div>
  );
}
