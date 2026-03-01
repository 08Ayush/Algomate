/**
 * Supabase Storage - Course Materials
 * 
 * Utilities for handling course materials uploaded by faculty
 * - Lecture notes, PDFs, presentations
 * - Accessible to students enrolled in the course
 */

import { supabaseBrowser } from '@/lib/supabase/client';

const COURSE_MATERIALS_BUCKET = 'course-materials';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for course materials
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'application/vnd.ms-powerpoint', // PPT
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/zip',
];

export interface UploadMaterialResult {
  success: boolean;
  url?: string;
  filePath?: string;
  error?: string;
}

export interface CourseMaterial {
  name: string;
  url: string;
  filePath: string;
  size: number;
  createdAt: string;
  type: 'pdf' | 'doc' | 'ppt' | 'image' | 'other';
}

/**
 * Upload course material
 */
export async function uploadCourseMaterial(
  subjectId: string,
  file: File,
  category?: string
): Promise<UploadMaterialResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, images, ZIP.',
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Generate file path
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const categoryPath = category ? `${category}/` : '';
    const filePath = `${subjectId}/${categoryPath}${timestamp}_${safeFileName}`;

    // Upload file
    const { error: uploadError } = await supabaseBrowser.storage
      .from(COURSE_MATERIALS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseBrowser.storage
      .from(COURSE_MATERIALS_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      filePath,
    };
  } catch (error) {
    console.error('Error uploading course material:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete course material
 */
export async function deleteCourseMaterial(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser.storage
      .from(COURSE_MATERIALS_BUCKET)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting course material:', error);
    return false;
  }
}

/**
 * List all materials for a subject
 */
export async function listCourseMaterials(
  subjectId: string,
  category?: string
): Promise<CourseMaterial[]> {
  try {
    const path = category ? `${subjectId}/${category}` : subjectId;
    
    const { data, error } = await supabaseBrowser.storage
      .from(COURSE_MATERIALS_BUCKET)
      .list(path, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;

    return data.map(file => {
      const fileName = file.name;
      const ext = fileName.split('.').pop()?.toLowerCase();
      
      let type: 'pdf' | 'doc' | 'ppt' | 'image' | 'other' = 'other';
      if (ext === 'pdf') type = 'pdf';
      else if (['doc', 'docx'].includes(ext || '')) type = 'doc';
      else if (['ppt', 'pptx'].includes(ext || '')) type = 'ppt';
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) type = 'image';

      const fullPath = category ? `${subjectId}/${category}/${fileName}` : `${subjectId}/${fileName}`;

      return {
        name: fileName,
        url: supabaseBrowser.storage
          .from(COURSE_MATERIALS_BUCKET)
          .getPublicUrl(fullPath).data.publicUrl,
        filePath: fullPath,
        size: file.metadata?.size || 0,
        createdAt: file.created_at || '',
        type,
      };
    });
  } catch (error) {
    console.error('Error listing course materials:', error);
    return [];
  }
}

/**
 * List all categories for a subject
 */
export async function listMaterialCategories(subjectId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseBrowser.storage
      .from(COURSE_MATERIALS_BUCKET)
      .list(subjectId);

    if (error) throw error;

    // Filter folders (categories)
    const folders = data
      .filter(item => item.id === null) // Folders have null id in Supabase
      .map(item => item.name);

    return folders;
  } catch (error) {
    console.error('Error listing categories:', error);
    return [];
  }
}

/**
 * Download material as blob
 */
export async function downloadCourseMaterial(filePath: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabaseBrowser.storage
      .from(COURSE_MATERIALS_BUCKET)
      .download(filePath);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error downloading material:', error);
    return null;
  }
}

/**
 * Get material file type icon helper
 */
export function getMaterialTypeIcon(type: CourseMaterial['type']): {
  icon: string;
  color: string;
} {
  switch (type) {
    case 'pdf':
      return { icon: 'FileText', color: 'text-red-500' };
    case 'doc':
      return { icon: 'FileText', color: 'text-blue-600' };
    case 'ppt':
      return { icon: 'Presentation', color: 'text-orange-500' };
    case 'image':
      return { icon: 'Image', color: 'text-green-500' };
    default:
      return { icon: 'File', color: 'text-gray-500' };
  }
}

/**
 * Format file size for display
 */
export function formatMaterialSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
