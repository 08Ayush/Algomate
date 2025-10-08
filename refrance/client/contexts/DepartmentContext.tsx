import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  colorTheme: string;
  logoUrl?: string;
  isActive: boolean;
  maxStudents: number;
  maxMentors: number;
  headOfDepartment?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentStats {
  studentCount: number;
  mentorCount: number;
  maxStudents: number;
  maxMentors: number;
  availableStudentSeats: number;
  availableMentorSeats: number;
}

export interface DepartmentMembership {
  id: string;
  userId: string;
  departmentId: string;
  role: 'admin' | 'mentor' | 'student';
  mentorType?: 'creator' | 'publisher' | 'general';
  isPrimary: boolean;
  joinedAt: string;
}

export interface DepartmentUserPreferences {
  id: string;
  userId: string;
  departmentId: string;
  preferences: Record<string, any>;
  dashboardLayout?: Record<string, any>;
  notificationSettings?: Record<string, any>;
  themePreferences?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentContextType {
  // Current department state
  activeDepartment: Department | null;
  userDepartments: Department[];
  departmentMemberships: DepartmentMembership[];
  departmentStats: Record<string, DepartmentStats>;
  
  // Department management
  switchDepartment: (departmentId: string) => Promise<boolean>;
  refreshDepartmentData: () => Promise<void>;
  getDepartmentById: (departmentId: string) => Department | null;
  
  // Permission checks
  canAccessDepartment: (departmentId: string) => boolean;
  isUserInDepartment: (departmentId: string, userId?: string) => boolean;
  getUserRoleInDepartment: (departmentId: string, userId?: string) => string | null;
  canManageDepartment: (departmentId: string) => boolean;
  
  // Data filtering
  filterDataByDepartment: <T extends { departmentId?: string }>(data: T[]) => T[];
  getDepartmentUsers: (departmentId?: string, role?: string) => any[];
  
  // User preferences
  getUserPreferences: () => DepartmentUserPreferences | null;
  updateUserPreferences: (preferences: Partial<DepartmentUserPreferences>) => Promise<boolean>;
  
  // Loading states
  isLoading: boolean;
  isChangingDepartment: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Department isolation enforcement
  enforceDepartmentIsolation: boolean;
  setEnforceDepartmentIsolation: (enforce: boolean) => void;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface DepartmentProviderProps {
  children: ReactNode;
}

export function DepartmentProvider({ children }: DepartmentProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(null);
  const [userDepartments, setUserDepartments] = useState<Department[]>([]);
  const [departmentMemberships, setDepartmentMemberships] = useState<DepartmentMembership[]>([]);
  const [departmentStats, setDepartmentStats] = useState<Record<string, DepartmentStats>>({});
  const [userPreferences, setUserPreferences] = useState<DepartmentUserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingDepartment, setIsChangingDepartment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enforceDepartmentIsolation, setEnforceDepartmentIsolation] = useState(true);

  // Mock departments data (replace with API calls in production)
  const mockDepartments: Department[] = [
    {
      id: 'dept-1',
      name: 'Computer Science Engineering',
      code: 'CSE',
      description: 'Computer Science and Engineering Department',
      colorTheme: '#3B82F6',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      headOfDepartment: 'Dr. John Smith',
      contactEmail: 'cse@college.edu',
      contactPhone: '+1-234-567-8900',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dept-2',
      name: 'Mechanical Engineering',
      code: 'MECH',
      description: 'Mechanical Engineering Department',
      colorTheme: '#10B981',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      headOfDepartment: 'Prof. Sarah Johnson',
      contactEmail: 'mech@college.edu',
      contactPhone: '+1-234-567-8901',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dept-3',
      name: 'Civil Engineering',
      code: 'CIVIL',
      description: 'Civil Engineering Department',
      colorTheme: '#F59E0B',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      headOfDepartment: 'Dr. Michael Brown',
      contactEmail: 'civil@college.edu',
      contactPhone: '+1-234-567-8902',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dept-4',
      name: 'Electrical Engineering',
      code: 'EEE',
      description: 'Electrical and Electronics Engineering Department',
      colorTheme: '#EF4444',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      headOfDepartment: 'Dr. Lisa Wilson',
      contactEmail: 'eee@college.edu',
      contactPhone: '+1-234-567-8903',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'dept-5',
      name: 'Electronics & Telecommunication Engineering',
      code: 'EXTC',
      description: 'Electronics and Telecommunication Engineering Department',
      colorTheme: '#8B5CF6',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      headOfDepartment: 'Prof. David Garcia',
      contactEmail: 'extc@college.edu',
      contactPhone: '+1-234-567-8904',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Mock department memberships (replace with API calls)
  const mockMemberships: DepartmentMembership[] = [
    {
      id: 'mem-1',
      userId: user?.id || '',
      departmentId: 'dept-1',
      role: user?.role || 'student',
      mentorType: user?.mentor_type,
      isPrimary: true,
      joinedAt: new Date().toISOString(),
    },
  ];

  // ============================================================================
  // EFFECT HOOKS
  // ============================================================================

  // Initialize department data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeDepartmentData();
    } else {
      resetDepartmentState();
    }
  }, [isAuthenticated, user]);

  // Load user preferences when active department changes
  useEffect(() => {
    if (activeDepartment && user) {
      loadUserPreferences();
    }
  }, [activeDepartment, user]);

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  const initializeDepartmentData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In production, these would be API calls
      await Promise.all([
        loadUserDepartments(),
        loadDepartmentMemberships(),
        loadDepartmentStats(),
      ]);
      
      // Set active department (user's primary department or first available)
      const primaryDept = getUserPrimaryDepartment();
      if (primaryDept) {
        setActiveDepartment(primaryDept);
      }
      
    } catch (err) {
      setError('Failed to load department data');
      console.error('Department initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDepartments = async () => {
    // Mock API call - replace with actual API
    const userDeptIds = user?.departments?.map(d => d.id) || [];
    const departments = mockDepartments.filter(dept => 
      user?.role === 'admin' || userDeptIds.includes(dept.id)
    );
    setUserDepartments(departments);
  };

  const loadDepartmentMemberships = async () => {
    // Mock API call - replace with actual API
    if (user?.role === 'admin') {
      // Admins can see all memberships
      setDepartmentMemberships(mockMemberships);
    } else {
      // Regular users only see their own memberships
      const userMemberships = mockMemberships.filter(mem => mem.userId === user?.id);
      setDepartmentMemberships(userMemberships);
    }
  };

  const loadDepartmentStats = async () => {
    // Mock API call - replace with actual API
    const stats: Record<string, DepartmentStats> = {};
    
    for (const dept of userDepartments) {
      stats[dept.id] = {
        studentCount: Math.floor(Math.random() * 50) + 10,
        mentorCount: Math.floor(Math.random() * 2) + 1,
        maxStudents: dept.maxStudents,
        maxMentors: dept.maxMentors,
        availableStudentSeats: 0,
        availableMentorSeats: 0,
      };
      
      // Calculate available seats
      stats[dept.id].availableStudentSeats = stats[dept.id].maxStudents - stats[dept.id].studentCount;
      stats[dept.id].availableMentorSeats = stats[dept.id].maxMentors - stats[dept.id].mentorCount;
    }
    
    setDepartmentStats(stats);
  };

  const loadUserPreferences = async () => {
    if (!activeDepartment || !user) return;
    
    // Mock API call - replace with actual API
    const mockPreferences: DepartmentUserPreferences = {
      id: 'pref-1',
      userId: user.id,
      departmentId: activeDepartment.id,
      preferences: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
      },
      dashboardLayout: {
        widgets: ['calendar', 'notifications', 'recent-activity'],
        layout: 'grid',
      },
      notificationSettings: {
        email: true,
        push: true,
        sms: false,
      },
      themePreferences: {
        colorScheme: 'light',
        accentColor: activeDepartment.colorTheme,
      },
    };
    
    setUserPreferences(mockPreferences);
  };

  const getUserPrimaryDepartment = (): Department | null => {
    if (!user) return null;
    
    // Find user's primary department
    const primaryDeptId = user.departments?.find(d => d.assignment_type === 'member')?.id ||
                         user.departments?.[0]?.id;
    
    return userDepartments.find(dept => dept.id === primaryDeptId) || userDepartments[0] || null;
  };

  const resetDepartmentState = () => {
    setActiveDepartment(null);
    setUserDepartments([]);
    setDepartmentMemberships([]);
    setDepartmentStats({});
    setUserPreferences(null);
    setIsLoading(false);
    setError(null);
  };

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  const switchDepartment = async (departmentId: string): Promise<boolean> => {
    if (!canAccessDepartment(departmentId)) {
      setError('You do not have access to this department');
      return false;
    }
    
    setIsChangingDepartment(true);
    setError(null);
    
    try {
      const department = getDepartmentById(departmentId);
      if (!department) {
        throw new Error('Department not found');
      }
      
      // Simulate API call to switch department context
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setActiveDepartment(department);
      
      // Log department access
      console.log(`User ${user?.username} switched to department: ${department.name}`);
      
      return true;
    } catch (err) {
      setError('Failed to switch department');
      console.error('Department switch error:', err);
      return false;
    } finally {
      setIsChangingDepartment(false);
    }
  };

  const refreshDepartmentData = async (): Promise<void> => {
    if (isAuthenticated && user) {
      await initializeDepartmentData();
    }
  };

  const getDepartmentById = (departmentId: string): Department | null => {
    return userDepartments.find(dept => dept.id === departmentId) || null;
  };

  const canAccessDepartment = (departmentId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    return userDepartments.some(dept => dept.id === departmentId);
  };

  const isUserInDepartment = (departmentId: string, userId?: string): boolean => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return false;
    
    return departmentMemberships.some(
      mem => mem.userId === targetUserId && mem.departmentId === departmentId
    );
  };

  const getUserRoleInDepartment = (departmentId: string, userId?: string): string | null => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return null;
    
    const membership = departmentMemberships.find(
      mem => mem.userId === targetUserId && mem.departmentId === departmentId
    );
    
    return membership?.role || null;
  };

  const canManageDepartment = (departmentId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const userRole = getUserRoleInDepartment(departmentId);
    return userRole === 'mentor' && (user.mentor_type === 'creator' || user.mentor_type === 'publisher');
  };

  const filterDataByDepartment = <T extends { departmentId?: string }>(data: T[]): T[] => {
    if (!enforceDepartmentIsolation || user?.role === 'admin') {
      return data;
    }
    
    if (!activeDepartment) {
      return [];
    }
    
    return data.filter(item => item.departmentId === activeDepartment.id);
  };

  const getDepartmentUsers = (departmentId?: string, role?: string): any[] => {
    const targetDeptId = departmentId || activeDepartment?.id;
    if (!targetDeptId) return [];
    
    // Mock implementation - replace with actual API call
    const mockUsers = [
      {
        id: 'user-1',
        username: 'john.doe',
        email: 'john@college.edu',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
        departmentId: targetDeptId,
      },
      {
        id: 'user-2',
        username: 'jane.smith',
        email: 'jane@college.edu',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'mentor',
        mentorType: 'creator',
        departmentId: targetDeptId,
      },
    ];
    
    let filteredUsers = mockUsers.filter(u => u.departmentId === targetDeptId);
    
    if (role) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }
    
    return filteredUsers;
  };

  const getUserPreferences = (): DepartmentUserPreferences | null => {
    return userPreferences;
  };

  const updateUserPreferences = async (preferences: Partial<DepartmentUserPreferences>): Promise<boolean> => {
    if (!activeDepartment || !user) return false;
    
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedPreferences: DepartmentUserPreferences = {
        ...userPreferences!,
        ...preferences,
        updatedAt: new Date().toISOString(),
      };
      
      setUserPreferences(updatedPreferences);
      return true;
    } catch (err) {
      setError('Failed to update preferences');
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: DepartmentContextType = {
    // Current department state
    activeDepartment,
    userDepartments,
    departmentMemberships,
    departmentStats,
    
    // Department management
    switchDepartment,
    refreshDepartmentData,
    getDepartmentById,
    
    // Permission checks
    canAccessDepartment,
    isUserInDepartment,
    getUserRoleInDepartment,
    canManageDepartment,
    
    // Data filtering
    filterDataByDepartment,
    getDepartmentUsers,
    
    // User preferences
    getUserPreferences,
    updateUserPreferences,
    
    // Loading states
    isLoading,
    isChangingDepartment,
    
    // Error handling
    error,
    clearError,
    
    // Department isolation enforcement
    enforceDepartmentIsolation,
    setEnforceDepartmentIsolation,
  };

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
}

// Hook for department-specific data filtering
export function useDepartmentData<T extends { departmentId?: string }>(data: T[]) {
  const { filterDataByDepartment } = useDepartment();
  return filterDataByDepartment(data);
}

// Hook for checking department permissions
export function useDepartmentPermissions(departmentId?: string) {
  const { 
    canAccessDepartment, 
    canManageDepartment, 
    getUserRoleInDepartment,
    activeDepartment 
  } = useDepartment();
  
  const targetDeptId = departmentId || activeDepartment?.id;
  
  return {
    canAccess: targetDeptId ? canAccessDepartment(targetDeptId) : false,
    canManage: targetDeptId ? canManageDepartment(targetDeptId) : false,
    userRole: targetDeptId ? getUserRoleInDepartment(targetDeptId) : null,
    isCreator: getUserRoleInDepartment(targetDeptId || '') === 'mentor',
    isPublisher: getUserRoleInDepartment(targetDeptId || '') === 'mentor',
  };
}

// Hook for department switching
export function useDepartmentSwitcher() {
  const { 
    userDepartments, 
    activeDepartment, 
    switchDepartment, 
    isChangingDepartment 
  } = useDepartment();
  
  return {
    availableDepartments: userDepartments,
    currentDepartment: activeDepartment,
    switchTo: switchDepartment,
    isChanging: isChangingDepartment,
  };
}

// ============================================================================
// HIGHER-ORDER COMPONENTS
// ============================================================================

interface DepartmentGuardProps {
  children: ReactNode;
  requiredDepartment?: string;
  requireManagePermission?: boolean;
  fallback?: ReactNode;
}

export function DepartmentGuard({ 
  children, 
  requiredDepartment, 
  requireManagePermission = false,
  fallback 
}: DepartmentGuardProps) {
  const { canAccessDepartment, canManageDepartment, activeDepartment } = useDepartment();
  
  const targetDeptId = requiredDepartment || activeDepartment?.id;
  
  if (!targetDeptId) {
    return fallback || <div>No department selected</div>;
  }
  
  if (!canAccessDepartment(targetDeptId)) {
    return fallback || <div>Department access denied</div>;
  }
  
  if (requireManagePermission && !canManageDepartment(targetDeptId)) {
    return fallback || <div>Department management permission required</div>;
  }
  
  return <>{children}</>;
}

// Component for department-specific styling
interface DepartmentThemedProps {
  children: ReactNode;
  className?: string;
}

export function DepartmentThemed({ children, className = '' }: DepartmentThemedProps) {
  const { activeDepartment } = useDepartment();
  
  if (!activeDepartment) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <div 
      className={`${className} department-themed`}
      data-department-color={activeDepartment.colorTheme}
      data-department-name={activeDepartment.name}
    >
      {children}
    </div>
  );
}