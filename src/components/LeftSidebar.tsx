'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Home, 
  Calendar, 
  AlertCircle, 
  Users, 
  BookOpen, 
  MapPin, 
  GraduationCap, 
  CalendarDays,
  Bot,
  Eye,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  Menu,
  X,
  Zap,
  Sparkles
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: string;
  facultyTypes?: string[]; // Which faculty types can see this
}

export default function LeftSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Define navigation items
  const navigationItems: NavItem[] = [
    { 
      href: '/faculty/dashboard', 
      icon: Home, 
      label: 'Dashboard',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/events', 
      icon: Calendar, 
      label: 'Events',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/conflict-resolution', 
      icon: AlertCircle, 
      label: 'Queue',
      badge: '3',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/faculty-list', 
      icon: Users, 
      label: 'Faculty',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/qualifications', 
      icon: Sparkles, 
      label: 'Qualifications',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/subjects', 
      icon: BookOpen, 
      label: 'Subjects',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/classrooms', 
      icon: MapPin, 
      label: 'Classrooms',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/batches', 
      icon: GraduationCap, 
      label: 'Batches',
      facultyTypes: ['creator', 'publisher']
    },
    { 
      href: '/faculty/timetables', 
      icon: CalendarDays, 
      label: 'Timetables',
      facultyTypes: ['creator', 'publisher']
    },
  ];

  const actionItems: NavItem[] = [
    { 
      href: '/faculty/ai-timetable-creator', 
      icon: Bot, 
      label: 'AI Creator',
      facultyTypes: ['creator']
    },
    { 
      href: '/faculty/hybrid-scheduler', 
      icon: Zap, 
      label: 'Hybrid Scheduler',
      facultyTypes: ['creator']
    },
    { 
      href: '/faculty/review-queue', 
      icon: Eye, 
      label: 'Review Queue',
      badge: '2',
      facultyTypes: ['publisher']
    }
  ];

  // Filter items based on faculty type
  const filterItemsByFacultyType = (items: NavItem[]) => {
    if (!user || !user.faculty_type) return items;
    return items.filter(item => 
      !item.facultyTypes || item.facultyTypes.includes(user.faculty_type)
    );
  };

  const visibleNavItems = filterItemsByFacultyType(navigationItems);
  const visibleActionItems = filterItemsByFacultyType(actionItems);

  const NavItemComponent = ({ item, isAction = false }: { item: NavItem; isAction?: boolean }) => {
    const isActive = pathname === item.href;
    
    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
          isActive 
            ? 'bg-primary text-primary-foreground shadow-sm' 
            : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm'
        } ${isCollapsed && !isMobileOpen ? 'justify-center w-10 h-10' : ''}`}
      >
        <item.icon className={`h-5 w-5 ${isAction && !isActive ? 'text-primary' : ''} flex-shrink-0`} />
        {(!isCollapsed || isMobileOpen) && (
          <>
            <span className={`flex-1 ${isAction && !isActive ? 'text-primary font-semibold' : ''}`}>
              {item.label}
            </span>
            {item.badge && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                isActive 
                  ? 'bg-primary-foreground/20 text-primary-foreground' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {item.badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && !isMobileOpen && item.badge && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-20 left-4 z-50 lg:hidden rounded-xl h-10 w-10 bg-background border border-border hover:bg-accent transition-colors flex items-center justify-center"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background/95 backdrop-blur-xl border-r border-border/40 transition-all duration-300 z-50 ${
        isMobileOpen 
          ? 'w-64 translate-x-0' 
          : isCollapsed 
            ? 'w-16 -translate-x-full lg:translate-x-0' 
            : 'w-64 -translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header with Close/Collapse Toggle */}
          <div className="flex justify-between items-center p-2 border-b border-border/20">
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden h-8 w-8 rounded-lg hover:bg-accent/60 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex h-8 w-8 rounded-lg hover:bg-accent/60 ml-auto items-center justify-center transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Main Navigation */}
          <nav className={`flex-1 p-3 space-y-1 overflow-y-auto ${isCollapsed && !isMobileOpen ? 'px-2' : ''}`}>
            {(!isCollapsed || isMobileOpen) && (
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                Navigation
              </div>
            )}
            
            {visibleNavItems.map(item => (
              <NavItemComponent key={item.href} item={item} />
            ))}

            {/* Quick Actions Section */}
            {visibleActionItems.length > 0 && (
              <>
                <div className={`border-t border-border/20 ${isCollapsed && !isMobileOpen ? 'my-2 mx-2' : 'my-4'}`} />
                {(!isCollapsed || isMobileOpen) && (
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                    Quick Actions
                  </div>
                )}
                
                {visibleActionItems.map(item => (
                  <NavItemComponent key={item.href} item={item} isAction />
                ))}
              </>
            )}
          </nav>

          {/* Settings at Bottom */}
          <div className="p-3 border-t border-border/20">
            <Link
              href="/faculty/settings"
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${
                isCollapsed && !isMobileOpen ? 'justify-center w-10 h-10' : ''
              }`}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>Settings</span>}
            </Link>
          </div>
        </div>
      </aside>

      {/* Spacer for collapsed sidebar on desktop */}
      <div className={`hidden lg:block transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`} />
    </>
  );
}
