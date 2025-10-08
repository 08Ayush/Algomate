import Link, { useNavigate } from "@/lib/navigation";
import { useRouter } from 'next/router';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, RoleGate, PermissionGate, UserRole } from "@/contexts/AuthContext";
import { 
  Home, 
  Calendar, 
  AlertCircle, 
  Users, 
  BookOpen, 
  MapPin, 
  GraduationCap, 
  CalendarDays,
  Building2,
  Crown,
  Sparkles,
  Bot,
  Eye,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  Menu,
  X,
  Zap
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  permission?: string;
  role?: UserRole;
  roles?: UserRole[];
  badge?: boolean;
}

export default function LeftSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, isCreatorMentor, isPublisherMentor } = useAuth();
  const navigate = useNavigate();

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
  }, [navigate]);

  // Define all navigation items
  const allNavItems: NavItem[] = [
    { to: "/dashboard", icon: Home, label: "Dashboard" },
    { to: "/events", icon: Calendar, label: "Events", permission: "view_public_events" },
    { to: "/conflict-resolution", icon: AlertCircle, label: "Queue", permission: "view_event_queue" },
    { to: "/faculty", icon: Users, label: "Faculty", permission: "view_department_data" },
    { to: "/subjects", icon: BookOpen, label: "Subjects", permission: "view_department_data" },
    { to: "/classrooms", icon: MapPin, label: "Classrooms", permission: "view_department_data" },
    { to: "/batches", icon: GraduationCap, label: "Batches", permission: "view_department_data" },
    { to: "/timetables", icon: CalendarDays, label: "Timetables", permission: "view_timetables" },
    { to: "/departments", icon: Building2, label: "Departments", role: "admin" as UserRole },
    { to: "/admin", icon: Crown, label: "Admin", role: "admin" as UserRole },
  ];

  // Filter navigation items based on user role
  const navItems = user?.role === 'admin' 
    ? allNavItems.filter(item => item.to === "/departments")
    : user?.role === 'student'
    ? allNavItems.filter(item => item.to === "/dashboard") // Students only see Dashboard
    : allNavItems;

  const actionItems: NavItem[] = [
    { to: "/generate", icon: Sparkles, label: "Generate", role: "admin" as UserRole },
    { to: "/ai-timetable-creator", icon: Bot, label: "AI Creator", permission: "create_timetable_drafts" },
    { to: "/hybrid-scheduler", icon: Zap, label: "Hybrid Scheduler", permission: "create_timetable_drafts" },
    { to: "/timetables/review", icon: Eye, label: "Review Queue", permission: "publish_timetables" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
  ];

  const NavItemComponent = ({ item, isAction = false }: { item: NavItem; isAction?: boolean }) => {
    const router = useRouter();
    const isActive = router.pathname === item.to;
    
    const content = (
      <Link
        href={item.to}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${isActive ? 'bg-accent text-foreground' : 'text-foreground/70 hover:bg-accent hover:text-foreground hover:shadow-sm'} ${isCollapsed && !isMobileOpen ? 'justify-center w-10 h-10' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      >
        <item.icon className={`h-5 w-5 ${isAction ? 'text-primary' : ''} ${isCollapsed && !isMobileOpen ? 'mx-auto flex-shrink-0' : 'flex-shrink-0'}`} />
        {(!isCollapsed || isMobileOpen) && (
          <span className={isAction ? 'text-primary font-semibold' : ''}>{item.label}</span>
        )}
      </Link>
    );

    if (isCollapsed && !isMobileOpen) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const renderNavItem = (item: NavItem, isAction = false) => {
    if (item.permission) {
      return (
        <PermissionGate key={item.to} permission={item.permission}>
          <NavItemComponent item={item} isAction={isAction} />
        </PermissionGate>
      );
    }

    if (item.role) {
      return (
        <RoleGate key={item.to} allowedRoles={[item.role]}>
          <NavItemComponent item={item} isAction={isAction} />
        </RoleGate>
      );
    }

    if (item.roles) {
      return (
        <RoleGate key={item.to} allowedRoles={item.roles}>
          <NavItemComponent item={item} isAction={isAction} />
        </RoleGate>
      );
    }

    return <NavItemComponent key={item.to} item={item} isAction={isAction} />;
  };

  // Filter action items based on user permissions
  // For admin users, show no action items (only departments in navigation)
  // For students, show no action items (only dashboard)
  const visibleActionItems = user?.role === 'admin' 
    ? [] 
    : user?.role === 'student'
    ? [] // Students see no action items
    : actionItems.filter(item => {
        if (item.to === '/timetables/create') return user && isCreatorMentor();
        if (item.to === '/timetables/review') return user && isPublisherMentor();
        if (item.to === '/ai-timetable-creator') return user && isCreatorMentor(); // Only creators see AI Creator
        if (item.to === '/generate') return user?.role === 'admin';
        if (item.to === '/notifications') return true; // Everyone sees notifications
        return true;
      });

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-xl h-10 w-10 hover:bg-accent/60"
      >
        <Menu className="h-5 w-5" />
      </Button>

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
          ? 'w-64 translate-x-0 lg:translate-x-0' 
          : isCollapsed 
            ? 'w-16 -translate-x-full lg:translate-x-0' 
            : 'w-64 -translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header with Close/Collapse Toggle */}
          <div className="flex justify-between items-center p-2 border-b border-border/20">
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden h-8 w-8 rounded-lg hover:bg-accent/60"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Desktop Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex h-8 w-8 rounded-lg hover:bg-accent/60 ml-auto"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Main Navigation */}
          <nav className={`flex-1 p-3 space-y-1 overflow-y-auto ${isCollapsed && !isMobileOpen ? 'px-2' : ''}`}>
            {(!isCollapsed || isMobileOpen) && (
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                Navigation
              </div>
            )}
            
            {navItems.map(item => renderNavItem(item))}

            {/* Quick Actions Section */}
            {visibleActionItems.length > 0 && (
              <>
                <div className={`border-t border-border/20 ${isCollapsed && !isMobileOpen ? 'my-2 mx-2' : 'my-4'}`} />
                {(!isCollapsed || isMobileOpen) && (
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                    Quick Actions
                  </div>
                )}
                
                {visibleActionItems.map(item => renderNavItem(item, true))}
              </>
            )}
          </nav>

          {/* Settings at Bottom */}
          <div className="p-3 border-t border-border/20">
            {isCollapsed && !isMobileOpen ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 justify-center rounded-xl hover:bg-accent/60"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Settings
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl hover:bg-accent/60"
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}