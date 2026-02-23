'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import Sidebar from './Sidebar';
import DashboardFooter from './DashboardFooter';

interface DashboardLayoutProps {
  user: any;
  facultyRole: string;
  currentPath?: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function DashboardLayout({ 
  user, 
  facultyRole, 
  currentPath = '/faculty/dashboard',
  onLogout, 
  children 
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex transition-all duration-500">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={handleToggleSidebar}
        facultyRole={facultyRole}
        currentPath={currentPath}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        !isMobile ? (isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16') : ''
      }`}>
        {/* Header */}
        <DashboardHeader 
          user={user} 
          onLogout={onLogout}
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
}