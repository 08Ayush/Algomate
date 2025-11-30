import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  college_id: string;
  college_name?: string;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No valid authorization header found');
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (!token) {
      console.error('No token found in authorization header');
      return null;
    }

    const supabase = createClient();

    // Method 1: Try direct token validation from admin_users table
    const { data: directUser, error: directError } = await supabase
      .from('admin_users')
      .select(`
        id,
        name,
        email,
        role,
        college_id,
        is_active,
        token,
        colleges (
          id,
          name
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (!directError && directUser) {
      console.log('Authentication successful via direct token match');
      return {
        id: directUser.id,
        email: directUser.email,
        name: directUser.name,
        role: directUser.role,
        college_id: directUser.college_id,
        college_name: directUser.colleges?.name
      };
    }

    // Method 2: Try decoding base64 token (fallback for admin dashboard)
    let userData;
    try {
      const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      userData = JSON.parse(decodedToken);
      console.log('Decoded token data (updated):', { hasId: !!userData.id, hasCollegeId: !!userData.college_id });
    } catch (decodeError) {
      console.error('Failed to decode token as base64:', decodeError instanceof Error ? decodeError.message : 'Unknown error');
      return null;
    }

    if (!userData || !userData.id) {
      console.error('Invalid user data in decoded token');
      return null;
    }

    // If user data doesn't have college_id, skip admin_users and go to fallback immediately
    if (!userData.college_id) {
      console.log('No college_id in token data, skipping admin_users check');
    } else {
      // Try admin_users table first
      const { data: decodedUser, error: decodedError } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          role,
          college_id,
          is_active,
          colleges (
            id,
            name
          )
        `)
        .eq('id', userData.id)
        .eq('college_id', userData.college_id)
        .eq('is_active', true)
        .single();

      if (!decodedError && decodedUser) {
        console.log('Authentication successful via decoded token (admin_users)');
        return {
          id: decodedUser.id,
          email: decodedUser.email,
          name: decodedUser.name,
          role: decodedUser.role,
          college_id: decodedUser.college_id,
          college_name: decodedUser.colleges?.name
        };
      }
    }

    // Fallback: Try users table for development
    console.log('Trying fallback authentication with users table');
    const { data: fallbackUser, error: fallbackError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        college_id,
        is_active,
        colleges (
          id,
          name
        )
      `)
      .eq('id', userData.id)
      .eq('is_active', true)
      .single();

    if (fallbackError) {
      console.error('Database error while validating user (fallback):', fallbackError);
      
      // If user doesn't have college_id in token, try to find any college and assign it temporarily
      if (!userData.college_id) {
        console.log('No college_id in token, getting first available college for development');
        const { data: firstCollege } = await supabase
          .from('colleges')
          .select('id, name')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (firstCollege) {
          console.log(`Using default college: ${firstCollege.name} (${firstCollege.id})`);
          return {
            id: userData.id,
            email: userData.email || 'unknown@email.com',
            name: userData.name || 'Unknown User',
            role: userData.role || 'admin',
            college_id: firstCollege.id,
            college_name: firstCollege.name
          };
        }
      }
      
      return null;
    }

    if (!fallbackUser) {
      console.error('No active user found for the decoded token data');
      return null;
    }

    console.log('Authentication successful via decoded token (users fallback)');
    return {
      id: fallbackUser.id,
      email: fallbackUser.email,
      name: `${fallbackUser.first_name} ${fallbackUser.last_name}`,
      role: fallbackUser.role,
      college_id: fallbackUser.college_id,
      college_name: fallbackUser.colleges?.name
    };

  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}