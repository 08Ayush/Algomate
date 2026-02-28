/**
 * Supabase Storage - Avatar Utilities
 * 
 * Utilities for handling user avatar uploads, updates, and retrieval
 */

import { supabaseBrowser } from '@/lib/supabase/client';

const AVATAR_BUCKET = 'avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface UploadAvatarOptions {
  userId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export interface UploadAvatarResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload user avatar to Supabase Storage
 */
export async function uploadAvatar({ 
  userId, 
  file, 
  onProgress 
}: UploadAvatarOptions): Promise<UploadAvatarResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      };
    }

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    // Upload file
    const { data: uploadData, error: uploadError } = await supabaseBrowser.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Replace existing avatar
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseBrowser.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update user profile with avatar URL
    const { error: updateError } = await (supabaseBrowser
      .from('users') as any)
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload avatar',
    };
  }
}

/**
 * Get avatar URL for a user
 */
export async function getAvatarUrl(userId: string): Promise<string | null> {
  try {
    const { data, error } = await (supabaseBrowser
      .from('users') as any)
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (error || !data?.avatar_url) return null;

    return data.avatar_url;
  } catch (error) {
    console.error('Error fetching avatar URL:', error);
    return null;
  }
}

/**
 * Delete user avatar
 */
export async function deleteAvatar(userId: string): Promise<boolean> {
  try {
    // List all files in user's avatar folder
    const { data: files, error: listError } = await supabaseBrowser.storage
      .from(AVATAR_BUCKET)
      .list(userId);

    if (listError) throw listError;

    if (files && files.length > 0) {
      // Delete all avatar files
      const filePaths = files.map(file => `${userId}/${file.name}`);
      const { error: deleteError } = await supabaseBrowser.storage
        .from(AVATAR_BUCKET)
        .remove(filePaths);

      if (deleteError) throw deleteError;
    }

    // Update user profile to remove avatar URL
    const { error: updateError } = await (supabaseBrowser
      .from('users') as any)
      .update({ avatar_url: null })
      .eq('id', userId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return false;
  }
}

/**
 * Get avatar URL with fallback to default
 */
export function getAvatarUrlWithFallback(avatarUrl?: string | null, userName?: string): string {
  if (avatarUrl) return avatarUrl;

  // Generate default avatar using UI Avatars service
  const name = userName || 'User';
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4D869C&color=fff&size=128&font-size=0.5&bold=true&format=png`;
}
