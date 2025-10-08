import Link from "@/lib/navigation";
import { useNavigate } from "@/lib/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationComponents";
import useTheme from "@/hooks/use-theme";
import { useAuth, RoleGate, PermissionGate } from "@/contexts/AuthContext";
import { DepartmentSwitcher, DepartmentBreadcrumb } from "@/components/routing/DepartmentRouter";
import { Crown, Shield, GraduationCap, LogOut, User, Settings, Plus, Eye, Moon, Sun, Sparkles, Bot } from 'lucide-react';

function LogoImage() {
  const [ok, setOk] = useState(true);
  const src = "/logo.jpg";
  
  if (ok) {
    return (
      <img
        src={src}
        alt="The Academic Compass logo"
        className="h-8 w-8 rounded-xl object-cover shadow-sm"
        onError={() => {
          console.log('Logo failed to load, using fallback');
          setOk(false);
        }}
        onLoad={() => {
          console.log('Logo loaded successfully');
        }}
      />
    );
  }
  return (
    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-sm flex items-center justify-center">
      <span className="text-white font-bold text-xs">AC</span>
    </div>
  );
}

export default function Header() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 ${
      isActive 
        ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-md" 
        : "text-foreground/70 hover:bg-card hover:text-foreground hover:shadow-sm"
    }`;

  const { theme, toggle } = useTheme();
  const { user, logout, isAuthenticated, isCreatorMentor, isPublisherMentor } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'mentor': return Shield;
      case 'student': return GraduationCap;
      default: return User;
    }
  };

  const getRoleColor = (role: string, mentorType?: string) => {
    if (role === 'mentor' && mentorType) {
      return mentorType === 'creator' 
        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
    }
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-pink-600 text-white';
      case 'mentor': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
      case 'student': return 'bg-gradient-to-r from-orange-500 to-red-600 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/signin" className="flex items-center gap-3 hover:scale-105 transition-transform">
            <LogoImage />
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                The Academic Compass
              </span>
              <span className="text-xs text-muted-foreground font-medium">AI-Powered Timetables</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="rounded-xl h-10 w-10 hover:bg-accent/60"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button asChild className="rounded-xl font-medium gradient-primary hover:scale-105 transition-transform">
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-3 hover:scale-105 transition-transform">
          <LogoImage />
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              The Academic Compass
            </span>
            <span className="text-xs text-muted-foreground font-medium">Smart Timetable Scheduler</span>
          </div>
        </Link>

        {/* Department Breadcrumb - shows active department context */}
        <div className="hidden lg:flex items-center flex-1 justify-center">
          <DepartmentBreadcrumb />
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="rounded-xl h-10 w-10 hover:bg-accent/60"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Department Switcher - for non-admin users with multiple departments */}
          <DepartmentSwitcher />

          {/* Notification Bell */}
          <NotificationBell onTimetableClick={(id) => navigate(`/timetables/${id}/edit`)} />



          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-xl hover:scale-105 transition-transform">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-semibold">
                      {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 rounded-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-semibold text-lg">
                          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-none">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${getRoleColor(user.role, user.mentor_type)} rounded-lg px-3 py-1`}>
                        {(() => {
                          const Icon = getRoleIcon(user.role);
                          return <Icon className="h-3 w-3 mr-1" />;
                        })()}
                        {user.role}
                      </Badge>
                      {user.mentor_type && (
                        <Badge className="rounded-lg px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                          <Crown className="h-3 w-3 mr-1" />
                          {user.mentor_type === 'creator' ? 'Creator' : 'Publisher'}
                        </Badge>
                      )}
                    </div>
                    
                    {user.role !== 'admin' && user.departments.length > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                        <span className="font-medium">Departments: </span>
                        {user.departments.map(dept => dept.code).join(', ')}
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="rounded-lg mx-2 my-1 hover:bg-red-50 text-red-600 hover:text-red-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
