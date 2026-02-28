/**
 * useAssignmentFileUpload Hook
 * 
 * Hook for handling assignment attachment uploads (faculty)
 */

'use client';

import { useState, useCallback } from 'react';
import { uploadAssignmentAttachment, deleteAssignmentAttachment, type UploadFileResult } from '@/lib/storage/assignments';

export function useAssignmentFileUpload(assignmentId: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; filePath: string; name: string }>>([]);

  const upload = useCallback(async (file: File): Promise<UploadFileResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadAssignmentAttachment(assignmentId, file);

      if (!result.success) {
        setError(result.error || 'Upload failed');
      } else if (result.url && result.filePath) {
        setUploadedFiles(prev => [...prev, {
          url: result.url!,
          filePath: result.filePath!,
          name: file.name,
        }]);
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
  }, [assignmentId]);

  const remove = useCallback(async (filePath: string): Promise<boolean> => {
    setUploading(true);
    setError(null);

    try {
      const success = await deleteAssignmentAttachment(filePath);
      
      if (!success) {
        setError('Failed to delete file');
      } else {
        setUploadedFiles(prev => prev.filter(f => f.filePath !== filePath));
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      return false;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadMultiple = useCallback(async (files: FileList | File[]): Promise<UploadFileResult[]> => {
    setUploading(true);
    setError(null);

    const results: UploadFileResult[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      setProgress(Math.round(((i + 1) / fileArray.length) * 100));
      const result = await uploadAssignmentAttachment(assignmentId, fileArray[i]);
      results.push(result);

      if (result.success && result.url && result.filePath) {
        setUploadedFiles(prev => [...prev, {
url: result.url!,
          filePath: result.filePath!,
          name: fileArray[i].name,
        }]);
      }
    }

    setUploading(false);
    setProgress(0);
    return results;
  }, [assignmentId]);

  return {
    upload,
    uploadMultiple,
    remove,
    uploading,
    progress,
    error,
    uploadedFiles,
  };
}
