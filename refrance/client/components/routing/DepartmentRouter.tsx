import React, { useEffect } from 'react';
import { useNavigate, useLocation } from '@/lib/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Loader2, Building2, Users, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================================
// DEPARTMENT ROUTER COMPONENT
// ============================================================================

/**
 * DepartmentRouter - Routes users to their department workspace after authentication
 * This component ensures that users are automatically directed to their department
 * context and provides department switching capabilities
 */
export function DepartmentRouter({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    activeDepartment, 
    userDepartments, 
    isLoading: deptLoading, 
    switchDepartment,
    isChangingDepartment 
  } = useDepartment();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoading = authLoading || deptLoading;

  // Auto-route logic for department isolation
  useEffect(() => {
    if (!isAuthenticated || !user || isLoading) return;

    // Skip department routing for public pages
    const publicPaths = ['/', '/signin', '/register', '/role-selection'];
    if (publicPaths.includes(location.pathname)) return;

    // Admin users don't need department routing (they have access to all)
    if (user.role === 'admin') return;

    // If user has departments but no active department, set the first one
    if (userDepartments.length > 0 && !activeDepartment) {
      const primaryDepartment = userDepartments.find(dept => 
        user.departments?.some(userDept => 
          userDept.id === dept.id
        )
      ) || userDepartments[0];

      if (primaryDepartment) {
        switchDepartment(primaryDepartment.id);
      }
    }

    // If user has no departments and not on registration, redirect to register
    if (userDepartments.length === 0 && (user.role === 'student' || user.role === 'mentor') && !user.departments?.length && location.pathname !== '/register') {
      navigate('/register?error=no-department');
    }
  }, [
    isAuthenticated, 
    user, 
    userDepartments, 
    activeDepartment, 
    location.pathname, 
    navigate, 
    switchDepartment,
    isLoading
  ]);

  // Show loading state during department initialization
  if (isLoading || isChangingDepartment) {
    return <DepartmentLoadingScreen />;
  }

  // Show department selection if user has multiple departments
  if (isAuthenticated && user && user.role !== 'admin' && userDepartments.length > 1 && !activeDepartment) {
    return <DepartmentSelectionScreen />;
  }

  return <>{children}</>;
}

// ============================================================================
// LOADING SCREEN COMPONENT
// ============================================================================

function DepartmentLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Building2 className="h-12 w-12 text-primary" />
              <Loader2 className="h-6 w-6 text-primary animate-spin absolute -bottom-1 -right-1" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Loading Department Workspace</h3>
              <p className="text-sm text-muted-foreground">
                Setting up your departmental environment...
              </p>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// DEPARTMENT SELECTION SCREEN
// ============================================================================

function DepartmentSelectionScreen() {
  const { user } = useAuth();
  const { userDepartments, switchDepartment } = useDepartment();

  const handleDepartmentSelect = async (departmentId: string) => {
    await switchDepartment(departmentId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Choose Your Department</CardTitle>
          <CardDescription>
            Select the department workspace you want to access. Each department is isolated for privacy and organization.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* User Role Badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge variant="outline" className="flex items-center gap-1">
                {user?.role === 'mentor' && <Shield className="h-3 w-3" />}
                {user?.role === 'student' && <Users className="h-3 w-3" />}
                {user?.role === 'mentor' ? (
                  `${user.mentor_type?.charAt(0).toUpperCase()}${user.mentor_type?.slice(1)} Mentor`
                ) : (
                  user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)
                )}
              </Badge>
            </div>

            {/* Department Cards */}
            <div className="grid gap-4">
              {userDepartments.map((department) => (
                <Card 
                  key={department.id} 
                  className="border-2 hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
                  onClick={() => handleDepartmentSelect(department.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full dept-color-indicator" 
                          data-color={department.colorTheme}
                        />
                        <div>
                          <h3 className="font-semibold">{department.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {department.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant="outline">{department.code}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {department.headOfDepartment}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Information Notice */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">🔒 Department Isolation</p>
                <p>
                  Each department operates as an independent workspace. You will only see content, 
                  users, and activities from your selected department. This ensures privacy and 
                  organization tailored to your specific field.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// DEPARTMENT SWITCHER COMPONENT
// ============================================================================

/**
 * DepartmentSwitcher - Allows users to switch between their assigned departments
 * This component is typically used in the navigation or header
 */
export function DepartmentSwitcher() {
  const { user } = useAuth();
  const { 
    activeDepartment, 
    userDepartments, 
    switchDepartment, 
    isChangingDepartment 
  } = useDepartment();

  // Don't show switcher for admins or single department users
  if (!user || user.role === 'admin' || userDepartments.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <select
        title="Select Department"
        value={activeDepartment?.id || ''}
        onChange={(e) => switchDepartment(e.target.value)}
        disabled={isChangingDepartment}
        className="appearance-none bg-background border border-border rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        {userDepartments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.code} - {dept.name}
          </option>
        ))}
      </select>
      
      {isChangingDepartment && (
        <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
      )}
    </div>
  );
}

// ============================================================================
// DEPARTMENT BREADCRUMB COMPONENT
// ============================================================================

/**
 * DepartmentBreadcrumb - Shows current department context
 */
export function DepartmentBreadcrumb() {
  const { user } = useAuth();
  const { activeDepartment } = useDepartment();

  if (!activeDepartment || user?.role === 'admin') {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Building2 className="h-4 w-4" />
      <span>{activeDepartment.code}</span>
      <span className="text-muted-foreground/50">•</span>
      <span>{activeDepartment.name}</span>
    </div>
  );
}

// ============================================================================
// DEPARTMENT GUARD HOC
// ============================================================================

/**
 * withDepartmentGuard - HOC to protect components with department access control
 */
export function withDepartmentGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requiredDepartment?: string;
    requireManagePermission?: boolean;
    fallback?: React.ComponentType;
  } = {}
) {
  return function DepartmentGuardedComponent(props: P) {
    const { user } = useAuth();
    const { activeDepartment, canAccessDepartment, canManageDepartment } = useDepartment();

    const targetDeptId = options.requiredDepartment || activeDepartment?.id;
    const Fallback = options.fallback || (() => <div>Access Denied</div>);

    // Admin bypass
    if (user?.role === 'admin') {
      return <Component {...props} />;
    }

    // Check department access
    if (!targetDeptId || !canAccessDepartment(targetDeptId)) {
      return <Fallback />;
    }

    // Check management permission if required
    if (options.requireManagePermission && !canManageDepartment(targetDeptId)) {
      return <Fallback />;
    }

    return <Component {...props} />;
  };
}