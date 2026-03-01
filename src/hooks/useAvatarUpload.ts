/**
 * useAvatarUpload Hook
 * 
 * Hook for handling avatar uploads with progress tracking
 */

'use client';

import { useState, useCallback } from 'react';
import { uploadAvatar, deleteAvatar, type UploadAvatarResult } from '@/lib/storage/avatars';

export function useAvatarUpload(userId: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadAvatarResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadAvatar({
        userId,
        file,
        onProgress: (p) => setProgress(p),
      });

      if (!result.success) {
        setError(result.error || 'Upload failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [userId]);

  const remove = useCallback(async (): Promise<boolean> => {
    setUploading(true);
    setError(null);

    try {
      const success = await deleteAvatar(userId);
      
      if (!success) {
        setError('Failed to delete avatar');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      return false;
    } finally {
      setUploading(false);
    }
  }, [userId]);

  return {
    upload,
    remove,
    uploading,
    progress,
    error,
  };
}
