// ============================================================================
// SUPABASE AUTHENTICATION SERVICE
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  RegistrationData, 
  LoginData, 
  AuthResponse, 
  UserAuthView, 
  DepartmentStats,
  Department,
  AUTH_ERRORS,
  AuthError,
  detectRoleFromUID,
  detectFacultyTypeFromUID,
  validateUID,
  validateEmail,
  validatePassword
} from '@shared/auth-types';

class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  // ============================================================================
  // REGISTRATION
  // ============================================================================

  async registerUser(data: RegistrationData): Promise<AuthResponse> {
    try {
      // Validate input data
      if (!validateUID(data.uid)) {
        return { success: false, error: 'Invalid UID format' };
      }

      if (!validateEmail(data.email)) {
        return { success: false, error: 'Invalid email format' };
      }

      if (!validatePassword(data.password)) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      // Check if UID or email already exists
      const { data: existingUsers, error: checkError } = await this.supabase
        .from('users_auth')
        .select('uid, email')
        .or(`uid.eq.${data.uid},email.eq.${data.email}`);

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.uid === data.uid) {
          return { success: false, error: AUTH_ERRORS.UID_ALREADY_EXISTS.message };
        }
        if (existingUser.email === data.email) {
          return { success: false, error: AUTH_ERRORS.EMAIL_ALREADY_EXISTS.message };
        }
      }

      // Verify department exists
      const { data: department } = await this.supabase
        .from('departments')
        .select('id')
        .eq('id', data.departmentId)
        .eq('is_active', true)
        .single();

      if (!department) {
        return { success: false, error: AUTH_ERRORS.INVALID_DEPARTMENT.message };
      }

      // Register user using the debug database function with detailed logging
      console.log('🔧 Attempting registration with data:', {
        uid: data.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        departmentId: data.departmentId,
        phoneNumber: data.phoneNumber
      });

      const { data: result, error } = await this.supabase.rpc('register_user_debug' as any, {
        p_uid: data.uid,
        p_email: data.email,
        p_password: data.password,
        p_first_name: data.firstName,
        p_last_name: data.lastName,
        p_department_id: data.departmentId,
        p_phone_number: data.phoneNumber || null
      });

      if (error) {
        console.error('❌ Registration RPC error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error: `Registration failed: ${error.message}` };
      }

      console.log('✅ Registration RPC result:', result);
      return result as AuthResponse;
    } catch (error) {
      console.error('Registration service error:', error);
      return { success: false, error: AUTH_ERRORS.REGISTRATION_FAILED.message };
    }
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async authenticateUser(data: LoginData): Promise<AuthResponse> {
    try {
      // Validate input
      if (!validateUID(data.uid)) {
        return { success: false, error: 'Invalid UID format' };
      }

      if (!validatePassword(data.password)) {
        return { success: false, error: 'Password is required' };
      }

      console.log('🔐 Attempting authentication with data:', {
        uid: data.uid,
        passwordLength: data.password.length
      });

      // Authenticate using debug database function with detailed logging
      const { data: result, error } = await this.supabase.rpc('authenticate_user_debug' as any, {
        p_uid: data.uid,
        p_password: data.password
      });

      if (error) {
        console.error('❌ Authentication RPC error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error: `Authentication failed: ${error.message}` };
      }

      console.log('✅ Authentication RPC result:', result);
      return result as AuthResponse;
    } catch (error) {
      console.error('❌ Authentication service error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  async getUserByUID(uid: string): Promise<UserAuthView | null> {
    try {
      const { data, error } = await this.supabase
        .from('users_auth_view')
        .select('*')
        .eq('uid', uid)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Get user error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get user service error:', error);
      return null;
    }
  }

  async getUserById(id: string): Promise<UserAuthView | null> {
    try {
      const { data, error } = await this.supabase
        .from('users_auth_view')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Get user by ID error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get user by ID service error:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, updates: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
  }): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users_auth')
        .update(updates as any)
        .eq('id', userId);

      if (error) {
        console.error('Update profile error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update profile service error:', error);
      return false;
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      if (!validatePassword(newPassword)) {
        return false;
      }

      // Use the hash_password function to securely hash the password
      const hashedResult = await this.supabase.rpc('hash_password' as any, {
        password_input: newPassword
      });
      
      if (!hashedResult.data) {
        throw new Error('Password hashing failed');
      }
      
      const { error } = await this.supabase
        .from('users_auth')
        .update({ password_hash: hashedResult.data } as any)
        .eq('id', userId);

      if (error) {
        console.error('Change password error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Change password service error:', error);
      return false;
    }
  }

  // ============================================================================
  // DEPARTMENT MANAGEMENT
  // ============================================================================

  async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Get departments error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get departments service error:', error);
      return [];
    }
  }

  async getDepartmentStats(): Promise<DepartmentStats[]> {
    try {
      const { data, error } = await this.supabase
        .from('department_stats')
        .select('*')
        .order('name');

      if (error) {
        console.error('Get department stats error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get department stats service error:', error);
      return [];
    }
  }

  async getUsersByDepartment(departmentId: string, role?: string): Promise<UserAuthView[]> {
    try {
      let query = this.supabase
        .from('users_auth_view')
        .select('*')
        .eq('department_id', departmentId);

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query.order('first_name');

      if (error) {
        console.error('Get users by department error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get users by department service error:', error);
      return [];
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async createSession(userId: string, deviceInfo?: any): Promise<string | null> {
    try {
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      const { error } = await this.supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          device_info: deviceInfo,
          expires_at: expiresAt.toISOString()
        } as any);

      if (error) {
        console.error('Create session error:', error);
        return null;
      }

      return sessionToken;
    } catch (error) {
      console.error('Create session service error:', error);
      return null;
    }
  }

  async validateSession(sessionToken: string): Promise<UserAuthView | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select(`
          user_id,
          expires_at,
          is_active,
          users_auth!inner(*)
        `)
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      // Update last activity
      await this.supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() } as any)
        .eq('session_token', sessionToken);

      // Return user data
      return await this.getUserById((data as any).user_id);
    } catch (error) {
      console.error('Validate session service error:', error);
      return null;
    }
  }

  async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ is_active: false } as any)
        .eq('session_token', sessionToken);

      return !error;
    } catch (error) {
      console.error('Invalidate session service error:', error);
      return false;
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({ is_active: false } as any)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Invalidate all sessions service error:', error);
      return false;
    }
  }

  // ============================================================================
  // SECURITY & MONITORING
  // ============================================================================

  async getRecentLoginAttempts(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('login_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Get login attempts error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get login attempts service error:', error);
      return [];
    }
  }

  async getFailedLoginsByUID(uid: string, hours: number = 24): Promise<number> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await this.supabase
        .from('login_attempts')
        .select('id')
        .eq('uid', uid)
        .eq('success', false)
        .gte('attempted_at', since.toISOString());

      if (error) {
        console.error('Get failed logins error:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Get failed logins service error:', error);
      return 0;
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  detectRoleFromUID(uid: string) {
    return detectRoleFromUID(uid);
  }

  detectFacultyTypeFromUID(uid: string) {
    return detectFacultyTypeFromUID(uid);
  }

  // ============================================================================
  // ADMIN FUNCTIONS
  // ============================================================================

  async getAllUsers(limit: number = 100, offset: number = 0): Promise<UserAuthView[]> {
    try {
      const { data, error } = await this.supabase
        .from('users_auth_view')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Get all users error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get all users service error:', error);
      return [];
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users_auth')
        .update({ is_active: false } as any)
        .eq('id', userId);

      if (!error) {
        // Also invalidate all sessions
        await this.invalidateAllUserSessions(userId);
      }

      return !error;
    } catch (error) {
      console.error('Deactivate user service error:', error);
      return false;
    }
  }

  async reactivateUser(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users_auth')
        .update({ is_active: true } as any)
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Reactivate user service error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;