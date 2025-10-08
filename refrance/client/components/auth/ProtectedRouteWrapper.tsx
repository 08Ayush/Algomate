import React from 'react';
import { DepartmentRouter } from '@/components/routing/DepartmentRouter';
import { ProtectedRoute, UserRole } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';

interface ProtectedRouteWrapperProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
  departmentId?: string;
  requiresAppLayout?: boolean;
}

/**
 * Simplified wrapper for protected routes that combines
 * DepartmentRouter, ProtectedRoute, and optionally AppLayout
 */
export function ProtectedRouteWrapper({ 
  children, 
  requiredRole, 
  requiredPermission, 
  departmentId,
  requiresAppLayout = true 
}: ProtectedRouteWrapperProps) {
  const content = requiresAppLayout ? (
    <AppLayout>{children}</AppLayout>
  ) : (
    children
  );

  return (
    <DepartmentRouter>
      <ProtectedRoute 
        requiredRole={requiredRole}
        requiredPermission={requiredPermission}
        departmentId={departmentId}
      >
        {content}
      </ProtectedRoute>
    </DepartmentRouter>
  );
}