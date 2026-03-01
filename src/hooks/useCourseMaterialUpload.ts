/**
 * useCourseMaterialUpload Hook
 * 
 * Hook for handling course material uploads (faculty)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  uploadCourseMaterial,
  deleteCourseMaterial,
  listCourseMaterials,
  type UploadMaterialResult,
  type CourseMaterial,
} from '@/lib/storage/course-materials';

export function useCourseMaterialUpload(subjectId: string, category?: string) {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);

  // Load existing materials
  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listCourseMaterials(subjectId, category);
      setMaterials(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load materials';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [subjectId, category]);

  // Auto-load on mount
  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const upload = useCallback(async (file: File): Promise<UploadMaterialResult> => {
    setUploading(true);
    setError(null);

    try {
      const result = await uploadCourseMaterial(subjectId, file, category);

      if (!result.success) {
        setError(result.error || 'Upload failed');
      } else {
        // Refresh materials list
        await loadMaterials();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [subjectId, category, loadMaterials]);

  const uploadMultiple = useCallback(async (files: FileList | File[]): Promise<UploadMaterialResult[]> => {
    setUploading(true);
    setError(null);

    const results: UploadMaterialResult[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const result = await uploadCourseMaterial(subjectId, file, category);
      results.push(result);
    }

    // Refresh materials list
    await loadMaterials();

    setUploading(false);
    return results;
  }, [subjectId, category, loadMaterials]);

  const remove = useCallback(async (filePath: string): Promise<boolean> => {
    setUploading(true);
    setError(null);

    try {
      const success = await deleteCourseMaterial(filePath);

      if (!success) {
        setError('Failed to delete material');
      } else {
        // Remove from local state
        setMaterials(prev => prev.filter(m => m.filePath !== filePath));
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

  return {
    upload,
    uploadMultiple,
    remove,
    refresh: loadMaterials,
    uploading,
    loading,
    error,
    materials,
  };
}
