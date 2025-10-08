// ============================================================================
// COMPATIBILITY ADAPTER FOR AUTH SERVICE
// Bridges the new Supabase AuthService with existing AuthContext
// ============================================================================

import { authService } from './AuthService';
import { UserRole, RegistrationData as OldRegistrationData } from '@/contexts/AuthContext';
import { RegistrationData, LoginData, detectRoleFromUID } from '@shared/auth-types';

class AuthServiceAdapter {
  
  // Convert old registration data to new format
  private convertRegistrationData(oldData: OldRegistrationData): RegistrationData {
    return {
      uid: oldData.username, // Username becomes UID
      email: oldData.email,
      password: oldData.password,
      firstName: oldData.firstName,
      lastName: oldData.lastName,
      phoneNumber: oldData.phone,
      departmentId: oldData.departmentId!
    };
  }

  // Convert new user role to old format
  private convertRole(newRole: 'student' | 'faculty' | 'admin'): UserRole {
    if (newRole === 'faculty') {
      return 'mentor'; // Faculty becomes mentor in old system
    }
    return newRole as UserRole;
  }

  // Register user using new service
  async register(userData: OldRegistrationData): Promise<boolean> {
    try {
      const newData = this.convertRegistrationData(userData);
      const result = await authService.registerUser(newData);
      
      if (result.success) {
        console.log('Registration successful:', result);
        return true;
      } else {
        console.error('Registration failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Registration adapter error:', error);
      return false;
    }
  }

  // Login user using new service
  async login(username: string, password: string, role?: UserRole | 'creator' | 'publisher'): Promise<boolean> {
    try {
      const loginData: LoginData = {
        uid: username,
        password: password
      };

      const result = await authService.authenticateUser(loginData);
      
      if (result.success && result.user) {
        // Store user data in localStorage for compatibility
        const userData = {
          id: result.user.id,
          username: result.user.uid,
          email: result.user.email,
          role: this.convertRole(result.user.role),
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          is_active: result.user.is_active,
          mentor_type: result.user.faculty_type,
          departments: [{
            id: result.user.department_id,
            name: result.user.department_name,
            code: result.user.department_code,
            assignment_type: 'member' as const
          }]
        };

        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_token', 'authenticated'); // Simple token for compatibility
        
        console.log('Login successful:', userData);
        return true;
      } else {
        console.error('Login failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Login adapter error:', error);
      return false;
    }
  }

  // Get current user from localStorage
  getCurrentUser() {
    try {
      const userData = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');
      
      if (userData && token) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // Logout user
  logout(): void {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }

  // Detect role from UID
  detectRoleFromUID(uid: string): UserRole {
    const role = detectRoleFromUID(uid);
    return this.convertRole(role);
  }

  // Get departments from new service
  async getDepartments() {
    try {
      return await authService.getDepartments();
    } catch (error) {
      console.error('Get departments error:', error);
      return [];
    }
  }

  // Get department stats
  async getDepartmentStats() {
    try {
      return await authService.getDepartmentStats();
    } catch (error) {
      console.error('Get department stats error:', error);
      return [];
    }
  }

  // Mock functions for compatibility with existing AuthContext
  hasPermission(permission: string, departmentId?: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Simple permission logic
    if (user.role === 'admin') return true;
    if (user.role === 'mentor' && departmentId) {
      return user.departments.some((d: any) => d.id === departmentId);
    }
    return false;
  }

  canCreateEvent(departmentId: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'mentor';
  }

  isMentorInDepartment(departmentId: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'mentor' && 
           user?.departments.some((d: any) => d.id === departmentId);
  }

  isAdminOrMentor(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'mentor';
  }

  getDepartmentQuota(departmentId: string) {
    // Mock quota data for compatibility
    return {
      students: 25,
      mentors: 1,
      maxStudents: 60,
      maxMentors: 2
    };
  }

  canRegisterInDepartment(departmentId: string, role: UserRole): boolean {
    // Always allow registration for now
    return true;
  }

  getDepartmentUsers(departmentId: string, role?: UserRole) {
    // Mock empty array for compatibility
    return [];
  }
}

// Export singleton instance
export const authServiceAdapter = new AuthServiceAdapter();
export default authServiceAdapter;