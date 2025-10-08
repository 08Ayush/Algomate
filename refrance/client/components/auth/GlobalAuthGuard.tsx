import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/lib/navigation';

/**
 * Global Authentication Guard
 * This component manages global authentication state and determines
 * what content should be displayed based on authentication status
 */

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/signin',
  '/register', 
  '/role-selection'
];

interface GlobalAuthGuardProps {
  children: React.ReactNode;
}

export function GlobalAuthGuard({ children }: GlobalAuthGuardProps) {
  const { isLoading } = useAuth();
  const location = useLocation();
  
  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Smart Classroom System...</p>
        </div>
      </div>
    );
  }
  
  // For public routes, always render the content without any auth checks
  if (PUBLIC_ROUTES.includes(location.pathname)) {
    return <>{children}</>;
  }
  
  // For all other routes, the content will handle its own authentication
  // This allows for more granular control per route
  return <>{children}</>;
}

/**
 * Hook to check if current route is public
 */
export function useIsPublicRoute() {
  const location = useLocation();
  return PUBLIC_ROUTES.includes(location.pathname);
}