/**
 * Supabase Storage - Assignment Files
 * 
 * Utilities for handling assignment file uploads and downloads
 * - Faculty: Upload assignment reference materials/attachments
 * - Students: Upload submission files (essays, code, documents)
 */

import { supabaseBrowser } from '@/lib/supabase/client';

// Bucket names
const ASSIGNMENT_ATTACHMENTS_BUCKET = 'assignment-attachments';
const SUBMISSION_FILES_BUCKET = 'submission-files';

// File constraints
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB for faculty attachments
const MAX_SUBMISSION_SIZE = 5 * 1024 * 1024; // 5MB for student submissions
const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const ALLOWED_SUBMISSION_TYPES = [
  ...ALLOWED_ATTACHMENT_TYPES,
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

export interface UploadFileResult {
  success: boolean;
  url?: string;
  filePath?: string;
  error?: string;
}

/**
 * Upload assignment attachment (for faculty)
 */
export async function uploadAssignmentAttachment(
  assignmentId: string,
  file: File
): Promise<UploadFileResult> {
  try {
    // Validate file type
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only PDF, DOC, DOCX, and images are allowed.',
      };
    }

    // Validate file size
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Generate file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${assignmentId}/${timestamp}_${safeFileName}`;

    // Upload file
    const { data: uploadData, error: uploadError } = await supabaseBrowser.storage
      .from(ASSIGNMENT_ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseBrowser.storage
      .from(ASSIGNMENT_ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      filePath,
    };
  } catch (error) {
    console.error('Error uploading assignment attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload submission file (for students)
 */
export async function uploadSubmissionFile(
  submissionId: string,
  questionId: string,
  file: File
): Promise<UploadFileResult> {
  try {
    // Validate file type
    if (!ALLOWED_SUBMISSION_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type.',
      };
    }

    // Validate file size
    if (file.size > MAX_SUBMISSION_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_SUBMISSION_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Generate file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${submissionId}/${questionId}/${timestamp}_${safeFileName}`;

    // Upload file
    const { data: uploadData, error: uploadError } = await supabaseBrowser.storage
      .from(SUBMISSION_FILES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseBrowser.storage
      .from(SUBMISSION_FILES_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      filePath,
    };
  } catch (error) {
    console.error('Error uploading submission file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete assignment attachment
 */
export async function deleteAssignmentAttachment(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser.storage
      .from(ASSIGNMENT_ATTACHMENTS_BUCKET)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return false;
  }
}

/**
 * Delete submission file
 */
export async function deleteSubmissionFile(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser.storage
      .from(SUBMISSION_FILES_BUCKET)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting submission file:', error);
    return false;
  }
}

/**
 * Get signed URL for private file access (if needed)
 */
export async function getSignedUrl(
  bucket: 'assignment-attachments' | 'submission-files',
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  try {
    const { data, error } = await supabaseBrowser.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data?.signedUrl ?? null;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * List all attachments for an assignment
 */
export async function listAssignmentAttachments(assignmentId: string) {
  try {
    const { data, error } = await supabaseBrowser.storage
      .from(ASSIGNMENT_ATTACHMENTS_BUCKET)
      .list(assignmentId);

    if (error) throw error;
    
    return data.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      createdAt: file.created_at,
      url: supabaseBrowser.storage
        .from(ASSIGNMENT_ATTACHMENTS_BUCKET)
        .getPublicUrl(`${assignmentId}/${file.name}`).data.publicUrl,
    }));
  } catch (error) {
    console.error('Error listing attachments:', error);
    return [];
  }
}

/**
 * Download file as blob
 */
export async function downloadFile(
  bucket: 'assignment-attachments' | 'submission-files',
  filePath: string
): Promise<Blob | null> {
  try {
    const { data, error } = await supabaseBrowser.storage
      .from(bucket)
      .download(filePath);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}
