'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, GraduationCap, Sparkles, Bell, LogOut, User, Crown, Shield, BookOpen } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
  role: 'admin' | 'college_admin' | 'faculty' | 'student';
  faculty_type?: 'creator' | 'publisher' | 'general' | 'guest';
  department_id?: string;
  course_id?: string;
  current_semester?: number;
  departments?: {
    name: string;
    code: string;
  };
  course?: {
    title: string;
    code: string;
  };
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const toggleTheme = () => {
    // Get the current effective theme
    let currentEffectiveTheme = theme;
    
    if (theme === 'system') {
      // If system theme, check what the system preference is
      if (typeof window !== 'undefined') {
        currentEffectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    }
    
    // Toggle to the opposite theme
    const newTheme = currentEffectiveTheme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme from', currentEffectiveTheme, 'to', newTheme);
    setTheme(newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
      case 'college_admin':
        return Crown;
      case 'faculty': return Shield;
      case 'student': return BookOpen;
      default: return User;
    }
  };

  const getRoleBadgeColor = (role: string, facultyType?: string) => {
    if (role === 'faculty' && facultyType) {
      if (facultyType === 'creator') return 'bg-green-500 text-white';
      if (facultyType === 'publisher') return 'bg-purple-500 text-white';
    }
    switch (role) {
      case 'admin':
      case 'college_admin':
        return 'bg-red-500 text-white';
      case 'faculty': return 'bg-blue-500 text-white';
      case 'student': return 'bg-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-dropdown') && !target.closest('.notification-dropdown')) {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left Side - Logo and Title */}
        <Link href={user ? (user.role === 'admin' || user.role === 'college_admin' ? '/admin/dashboard' : '/faculty/dashboard') : '/'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="relative">
            <GraduationCap className="h-8 w-8 text-primary" />
            <Sparkles className="h-3 w-3 text-accent absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground">
              Academic Compass
            </span>
            {user && (
              <span className="text-xs text-muted-foreground">
                Smart Timetable Scheduler
              </span>
            )}
          </div>
        </Link>

        {/* Right Side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Dark Mode Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' || (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'} mode`}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
          )}

          {user ? (
            <>
              {/* Notifications Bell */}
              <NotificationBell />

              {/* Profile Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu);
                    setShowNotifications(false);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                  aria-label="Profile menu"
                >
                  {getInitials(user.first_name, user.last_name)}
                </button>

                {/* Profile Menu Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-background shadow-lg">
                    {/* User Info */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-semibold text-lg flex items-center justify-center">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Role Badges */}
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(user.role, user.faculty_type)}`}>
                          {(() => {
                            const Icon = getRoleIcon(user.role);
                            return <Icon className="h-3 w-3" />;
                          })()}
                          {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                        </span>
                        {user.faculty_type && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-indigo-500 text-white">
                            <Crown className="h-3 w-3" />
                            {user.faculty_type ? user.faculty_type.charAt(0).toUpperCase() + user.faculty_type.slice(1) : ''}
                          </span>
                        )}
                      </div>

                      {/* College UID */}
                      <div className="mt-3 p-2 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground">College UID</p>
                        <p className="text-sm font-mono font-semibold">{user.college_uid}</p>
                      </div>

                      {/* Course Info - For Students */}
                      {user.role === 'student' && user.course && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                          <p className="text-xs text-muted-foreground">Course</p>
                          <p className="text-sm font-semibold">{user.course.title}</p>
                          <p className="text-xs text-muted-foreground">{user.course.code}</p>
                        </div>
                      )}

                      {/* Semester Info - For Students */}
                      {user.role === 'student' && user.current_semester && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                          <p className="text-xs text-muted-foreground">Current Semester</p>
                          <p className="text-sm font-semibold">Semester {user.current_semester}</p>
                        </div>
                      )}

                      {/* Department Info - Only show for non-admin, non-student users */}
                      {user.role !== 'admin' && user.role !== 'college_admin' && user.role !== 'student' && user.departments && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="text-sm font-semibold">{user.departments.name}</p>
                          <p className="text-xs text-muted-foreground">{user.departments.code}</p>
                        </div>
                      )}
                    </div>

                    {/* Logout Button */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Non-authenticated user buttons */}
              <Link 
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/demo"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary to-blue-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:from-primary/90 hover:to-blue-600/90 transition-all shadow-md hover:shadow-lg"
              >
                Request Demo
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
