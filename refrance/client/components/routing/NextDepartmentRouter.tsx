import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Loader2, Building2, Users, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================================================
// NEXT.JS DEPARTMENT ROUTER COMPONENT
// ============================================================================

/**
 * NextDepartmentRouter - Routes users to their department workspace after authentication
 * This component ensures that users are automatically directed to their department
 * context and provides department switching capabilities
 */
export function NextDepartmentRouter({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    activeDepartment, 
    userDepartments, 
    isLoading: deptLoading, 
    switchDepartment,
    isChangingDepartment 
  } = useDepartment();
  const router = useRouter();

  // ============================================================================
  // AUTHENTICATION & ROUTING LOGIC
  // ============================================================================

  useEffect(() => {
    console.log('🏢 NextDepartmentRouter Check:', {
      pathname: router.pathname,
      isAuthenticated,
      authLoading,
      deptLoading,
      user: user?.username,
      userRole: user?.role,
      userDepartments: userDepartments?.length,
      activeDepartment: activeDepartment?.id,
      timestamp: new Date().toISOString()
    });

    if (authLoading || deptLoading) {
      console.log('⏳ Waiting for auth/dept loading to complete');
      return;
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/signin', '/register', '/role-selection', '/'];
    const isPublicRoute = publicRoutes.includes(router.pathname);
    
    // Skip automatic redirects if user is on sign-in related pages
    const isSignInFlow = router.pathname === '/signin' || router.pathname === '/role-selection';
    const hasRoleParam = router.query.role;

    console.log('🔍 Route Analysis:', {
      pathname: router.pathname,
      isPublicRoute,
      publicRoutes
    });

    // If not authenticated and not on a public route, redirect to signin
    if (!isAuthenticated && !isPublicRoute) {
      console.log('🚨 Redirecting to signin - not authenticated');
      router.push('/signin');
      return;
    }

    // Skip routing logic if on public routes
    if (isPublicRoute) {
      return;
    }

    // Skip automatic redirects if user is in sign-in flow
    if (isSignInFlow && isAuthenticated) {
      console.log('🔐 User in sign-in flow - allowing manual navigation');
      return;
    }

    // If authenticated user is admin, let them access everything without department constraints  
    if (isAuthenticated && user?.role === 'admin' && !isSignInFlow) {
      console.log('👑 Admin user - bypassing department routing');
      return;
    }

    // For authenticated non-admin users, check department assignment
    if (isAuthenticated && user) {
      // Check if user has departments assigned in their profile
      const hasUserDepartments = user.departments && user.departments.length > 0;
      const hasContextDepartments = userDepartments && userDepartments.length > 0;

      console.log('🏢 Department Status:', {
        hasUserDepartments,
        hasContextDepartments,
        userDepartments: user.departments?.length || 0,
        contextDepartments: userDepartments?.length || 0,
        userRole: user.role
      });

      // If user has departments in their profile but context is still loading, wait
      if (hasUserDepartments && !hasContextDepartments && !deptLoading) {
        console.log('⏳ User has departments but context is still loading, waiting...');
        return;
      }

      // If user has no departments at all, redirect based on role
      if (!hasUserDepartments && !hasContextDepartments) {
        console.log('🚨 No departments found - redirecting based on role');
        
        // Students and mentors should go to register to select departments
        if (user.role === 'student' || user.role === 'mentor') {
          console.log('📋 Redirecting to register for department selection');
          router.push('/register?step=department-selection');
          return;
        }
      }

      // If user has departments but no active department is selected
      if ((hasUserDepartments || hasContextDepartments) && !activeDepartment) {
        // Auto-select first department if only one available
        if (userDepartments && userDepartments.length === 1) {
          console.log('🎯 Auto-selecting single department:', userDepartments[0].name);
          switchDepartment(userDepartments[0].id);
          return;
        }
        // If multiple departments, let user choose (they'll see department selector below)
        console.log('🎯 Multiple departments available, showing selector');
      }

      // Route authenticated users to appropriate dashboard if they land on root path
      if (router.pathname === '/' && isAuthenticated) {
        const roleRoutes = {
          admin: '/departments', // Admin goes to departments management
          mentor: user.mentor_type === 'creator' ? '/ai-timetable-creator' : '/hod-review',
          student: '/dashboard'
        };
        
        // Admin doesn't need activeDepartment to access their pages
        if (user.role === 'admin' || activeDepartment) {
          const targetRoute = roleRoutes[user.role] || '/dashboard';
          console.log(`🎯 Redirecting ${user.role} from root to ${targetRoute}`);
          router.push(targetRoute);
          return;
        }
      }

      // Route authenticated users from /dashboard to their specific dashboard
      if (router.pathname === '/dashboard' && isAuthenticated && user.role !== 'student') {
        const roleRoutes = {
          admin: '/departments', // Admin goes to departments management
          mentor: user.mentor_type === 'creator' ? '/ai-timetable-creator' : '/hod-review'
        };
        
        // Admin doesn't need activeDepartment to access their pages
        if (user.role === 'admin' || activeDepartment) {
          const targetRoute = roleRoutes[user.role];
          if (targetRoute) {
            console.log(`🎯 Redirecting ${user.role} from dashboard to ${targetRoute}`);
            router.push(targetRoute);
            return;
          }
        }
      }
    }

  }, [isAuthenticated, user, userDepartments, activeDepartment, authLoading, deptLoading, router, switchDepartment]);

  // ============================================================================
  // LOADING STATES
  // ============================================================================

  if (authLoading || deptLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Loading your workspace...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // DEPARTMENT SELECTION UI
  // ============================================================================

  // Show department selector if user has multiple departments but none selected (skip for admin)
  if (isAuthenticated && user?.role !== 'admin' && userDepartments && userDepartments.length > 1 && !activeDepartment && !isChangingDepartment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Select Your Department</CardTitle>
            <CardDescription>
              You have access to multiple departments. Please choose which department you'd like to work with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {userDepartments.map((dept) => (
                <Card 
                  key={dept.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-200"
                  onClick={() => switchDepartment(dept.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{dept.name}</h3>
                          <p className="text-sm text-muted-foreground">{dept.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{user?.role || 'Member'}</span>
                        </Badge>
                        {user?.role === 'admin' && (
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <Shield className="h-3 w-3" />
                            <span>Admin</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Need access to a different department?
              </p>
              <Button variant="outline" onClick={() => router.push('/role-selection')}>
                Request Department Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // DEPARTMENT SWITCHING LOADING
  // ============================================================================

  if (isChangingDepartment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">Switching department...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER CHILDREN
  // ============================================================================

  return <>{children}</>;
}

export default NextDepartmentRouter;