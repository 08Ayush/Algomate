/**
 * useSubmissionFileUpload Hook
 * 
 * Hook for handling submission file uploads (students)
 */

'use client';

import { useState, useCallback } from 'react';
import { uploadSubmissionFile, deleteSubmissionFile, type UploadFileResult } from '@/lib/storage/assignments';

export function useSubmissionFileUpload(submissionId: string, questionId: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; filePath: string; name: string } | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadFileResult> => {
    setUploading(true);
    setError(null);

    try {
      const result = await uploadSubmissionFile(submissionId, questionId, file);

      if (!result.success) {
        setError(result.error || 'Upload failed');
      } else if (result.url && result.filePath) {
        setUploadedFile({
          url: result.url,
          filePath: result.filePath,
          name: file.name,
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [submissionId, questionId]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!uploadedFile) return false;

    setUploading(true);
    setError(null);

    try {
      const success = await deleteSubmissionFile(uploadedFile.filePath);
      
      if (!success) {
        setError('Failed to delete file');
      } else {
        setUploadedFile(null);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      return false;
    } finally {
      setUploading(false);
    }
  }, [uploadedFile]);

  return {
    upload,
    remove,
    uploading,
    error,
    uploadedFile,
  };
}
