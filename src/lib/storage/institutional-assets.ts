/**
 * Supabase Storage - Institutional Branding
 * 
 * Utilities for handling college and department logos
 * - College logos for headers and reports
 * - Department logos for timetables and documents
 */

import { supabaseBrowser } from '@/lib/supabase/client';

const INSTITUTIONAL_ASSETS_BUCKET = 'institutional-assets';
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];

export interface UploadLogoResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload college logo
 */
export async function uploadCollegeLogo(
  collegeId: string,
  file: File
): Promise<UploadLogoResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, SVG, and WebP images are allowed.',
      };
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_LOGO_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `colleges/${collegeId}/logo.${fileExt}`;

    // Upload file
    const { error: uploadError } = await supabaseBrowser.storage
      .from(INSTITUTIONAL_ASSETS_BUCKET)
      .upload(fileName, file, {
        cacheControl: '86400', // 24 hours
        upsert: true, // Replace existing logo
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseBrowser.storage
      .from(INSTITUTIONAL_ASSETS_BUCKET)
      .getPublicUrl(fileName);

    // Update college logo URL in database
    const { error: updateError } = await (supabaseBrowser
      .from('colleges') as any)
      .update({ logo_url: urlData.publicUrl })
      .eq('id', collegeId);

    if (updateError) {
      console.warn('Failed to update college logo URL in database:', updateError);
    }

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading college logo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload department logo
 */
export async function uploadDepartmentLogo(
  departmentId: string,
  file: File
): Promise<UploadLogoResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, SVG, and WebP images are allowed.',
      };
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_LOGO_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `departments/${departmentId}/logo.${fileExt}`;

    // Upload file
    const { error: uploadError } = await supabaseBrowser.storage
      .from(INSTITUTIONAL_ASSETS_BUCKET)
      .upload(fileName, file, {
        cacheControl: '86400', // 24 hours
        upsert: true, // Replace existing logo
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseBrowser.storage
      .from(INSTITUTIONAL_ASSETS_BUCKET)
      .getPublicUrl(fileName);

    // Update department logo URL in database
    const { error: updateError } = await (supabaseBrowser
      .from('departments') as any)
      .update({ logo_url: urlData.publicUrl })
      .eq('id', departmentId);

    if (updateError) {
      console.warn('Failed to update department logo URL in database:', updateError);
    }

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading department logo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete college logo
 */
export async function deleteCollegeLogo(collegeId: string): Promise<boolean> {
  try {
    // List all files in college folder
    const { data: files, error: listError } = await supabaseBrowser.storage
      .from(INSTITUTIONAL_ASSETS_BUCKET)
      .list(`colleges/${collegeId}`);

    if (listError) throw listError;

    if (files && files.length > 0) {
      const filePaths = files.map(file => `colleges/${collegeId}/${file.name}`);
      const { error: deleteError } = await supabaseBrowser.storage
        .from(INSTITUTIONAL_ASSETS_BUCKET)
        .remove(filePaths);

      if (deleteError) throw deleteError;
    }

    // Update database to remove logo URL
    const { error: updateError } = await (supabaseBrowser
      .from('colleges') as any)
      .update({ logo_url: null })
      .eq('id', collegeId);

    if (updateError) {
      console.warn('Failed to update college logo URL in database:', updateError);
    }

    return true;
  } catch (error) {
    console.error('Error deleting college logo:', error);
    return false;
  }
}

/**
 * Delete department logo
 */
export async function deleteDepartmentLogo(departmentId: string): Promise<boolean> {
  try {
    // List all files in department folder
    const { data: files, error: listError } = await supabaseBrowser.storage
      .from(INSTITUTIONAL_ASSETS_BUCKET)
      .list(`departments/${departmentId}`);

    if (listError) throw listError;

    if (files && files.length > 0) {
      const filePaths = files.map(file => `departments/${departmentId}/${file.name}`);
      const { error: deleteError } = await supabaseBrowser.storage
        .from(INSTITUTIONAL_ASSETS_BUCKET)
        .remove(filePaths);

      if (deleteError) throw deleteError;
    }

    // Update database to remove logo URL
    const { error: updateError } = await (supabaseBrowser
      .from('departments') as any)
      .update({ logo_url: null })
      .eq('id', departmentId);

    if (updateError) {
      console.warn('Failed to update department logo URL in database:', updateError);
    }

    return true;
  } catch (error) {
    console.error('Error deleting department logo:', error);
    return false;
  }
}

/**
 * Get logo URL with fallback
 */
export function getLogoUrlWithFallback(logoUrl?: string | null, name?: string, type: 'college' | 'department' = 'college'): string {
  if (logoUrl) return logoUrl;

  // Use placeholder service
  const bgColor = type === 'college' ? '4D869C' : '7AB2B2';
  const initial = name?.charAt(0).toUpperCase() || 'A';
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${bgColor}&color=fff&size=256&font-size=0.4&bold=true&format=png`;
}
