import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from '@/lib/navigation';
import Link from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, Shield, Crown, Users, GraduationCap, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Department } from '@/contexts/DepartmentContext';

export default function SignInPage() {
  const navigate = useNavigate();
  const { login, logout, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const preSelectedRole = searchParams.get('role');
  
  // Add comprehensive logging
  // Add comprehensive debugging
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  console.log('🔍 SignIn Page Rendered:', {
    isAuthenticated,
    authLoading,
    preSelectedRole,
    hasStoredUser: !!storedUser,
    hasStoredToken: !!storedToken,
    storedUserData: storedUser ? JSON.parse(storedUser).username : null,
    currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    timestamp: new Date().toISOString()
  });
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Available departments for selection
  const departments: Department[] = [
    { 
      id: '550e8400-e29b-41d4-a716-446655440001', 
      name: 'Computer Science & Engineering', 
      code: 'CSE',
      description: 'Advanced computing, software development, and emerging technologies',
      colorTheme: '#3B82F6',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { 
      id: '550e8400-e29b-41d4-a716-446655440002', 
      name: 'Mechanical Engineering', 
      code: 'MECH',
      description: 'Mechanical systems, manufacturing, and automation',
      colorTheme: '#10B981',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { 
      id: '550e8400-e29b-41d4-a716-446655440003', 
      name: 'Civil Engineering', 
      code: 'CIVIL',
      description: 'Infrastructure, construction, and environmental engineering',
      colorTheme: '#F59E0B',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { 
      id: '550e8400-e29b-41d4-a716-446655440004', 
      name: 'Electrical Engineering', 
      code: 'EEE',
      description: 'Electrical and electronics engineering',
      colorTheme: '#EF4444',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { 
      id: '550e8400-e29b-41d4-a716-446655440005', 
      name: 'Electronics & Telecommunication', 
      code: 'EXTC',
      description: 'Electronics and telecommunication engineering',
      colorTheme: '#8B5CF6',
      isActive: true,
      maxStudents: 60,
      maxMentors: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  // Pre-fill credentials based on role
  useEffect(() => {
    if (preSelectedRole === 'creator') {
      setUsername('Pygram2k25');
      setPassword('Pygram2k25');
    } else if (preSelectedRole === 'publisher') {
      setUsername('pygram2k25');
      setPassword('pygram2k25');
    } else if (preSelectedRole === 'admin') {
      setUsername('Admin');
      setPassword('Admin@123');
    }
  }, [preSelectedRole]);

  // Handle already authenticated users
  useEffect(() => {
    console.log('🔄 SignIn Authentication Check:', {
      isAuthenticated,
      authLoading,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, authLoading, navigate]);

  const getRoleDisplayInfo = () => {
    switch (preSelectedRole) {
      case 'creator':
        return {
          title: 'Faculty Mentor (Creator)',
          icon: Shield,
          description: 'Create and draft timetables',
          color: 'text-green-600'
        };
      case 'publisher':
        return {
          title: 'Faculty Mentor (Publisher)',
          icon: Crown,
          description: 'Review and approve timetables',
          color: 'text-blue-600'
        };
      case 'student':
        return {
          title: 'Student',
          icon: GraduationCap,
          description: 'Access events and view schedules',
          color: 'text-orange-600'
        };
      case 'admin':
        return {
          title: 'Administrator',
          icon: Crown,
          description: 'Full system management',
          color: 'text-purple-600'
        };
      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate department selection (skip for admin users)
    if (preSelectedRole !== 'admin' && !selectedDepartment) {
      setError('Please select your department to continue.');
      return;
    }

    setIsLoading(true);

    try {
      // Pass the role for Creator/Publisher/Admin handling
      const roleForLogin = preSelectedRole as 'admin' | 'creator' | 'publisher' | 'student' | undefined;
      const success = await login(username, password, roleForLogin);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid username or password. Please check your credentials and try again.');
      }
    } catch (error) {
      setError('An error occurred during sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleDisplayInfo();
  const RoleIcon = roleInfo?.icon || Users;

  // Handle already authenticated users
  if (isAuthenticated && user && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Already Signed In
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You are currently signed in as {user.first_name} {user.last_name}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <Shield className="h-5 w-5 mr-2 text-green-600" />
                Welcome Back!
              </CardTitle>
              <CardDescription className="text-center">
                Role: {user.role === 'mentor' ? `${user.mentor_type?.charAt(0).toUpperCase()}${user.mentor_type?.slice(1)} Mentor` : user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-3">
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  Go to Dashboard
                </Button>
                <Button onClick={() => {
                  logout();
                  setError('');
                  setUsername('');
                  setPassword('');
                }} variant="outline" className="w-full">
                  Sign Out & Sign In as Different User
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/role-selection" className="text-xs text-primary hover:underline">
              ← Back to Role Selection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to The Academic Compass
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Smart Timetable Scheduler system
          </p>
          {preSelectedRole && roleInfo && (
            <div className="mt-4">
              <Badge variant="default" className="text-sm px-3 py-1">
                Signing in as: {roleInfo.title}
              </Badge>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {roleInfo && <RoleIcon className={`h-5 w-5 mr-2 ${roleInfo.color}`} />}
              {roleInfo ? roleInfo.title : 'Sign in'}
            </CardTitle>
            {roleInfo && (
              <CardDescription>
                {roleInfo.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label htmlFor="username">UID</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your UID"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Department Selection - Hide for admin users */}
              {preSelectedRole !== 'admin' && (
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full bg-blue-500" 
                              data-color={dept.colorTheme}
                            />
                            <span className="font-medium">{dept.code}</span>
                            <span className="text-muted-foreground">- {dept.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDepartment && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center space-x-2 text-sm text-blue-800">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">Department Workspace:</span>
                        <span>{departments.find(d => d.id === selectedDepartment)?.name}</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        You will only see content from this department after signing in.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Show admin access notice */}
              {preSelectedRole === 'admin' && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center space-x-2 text-sm text-purple-800">
                    <Crown className="h-4 w-4" />
                    <span className="font-medium">Administrator Access:</span>
                    <span>All departments and system features</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    You have full access to all departments and administrative features.
                  </p>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            <div className="mt-4 flex items-center justify-between">
              <Link href="/role-selection" className="text-sm text-muted-foreground underline">
                Change Role
              </Link>
              <Link href="/register" className="text-sm text-muted-foreground underline">
                Create account
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Demo credentials */}
        {!preSelectedRole && (
          <Card className="bg-gray-50">
            <CardContent className="p-4 text-gray-900">
              <h4 className="font-medium text-gray-900 mb-3">Demo Accounts (Click to auto-fill):</h4>
              <div className="space-y-2 text-sm">
                <button 
                  onClick={() => {
                    setUsername('ADM001');
                    setPassword('Admin@123');
                    setSelectedDepartment('550e8400-e29b-41d4-a716-446655440001');
                  }}
                  className="w-full flex justify-between items-center p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                >
                  <span className="text-gray-700">Admin:</span>
                  <code className="text-xs bg-white px-2 py-1 rounded">ADM001 / Admin@123</code>
                </button>
                <button 
                  onClick={() => {
                    setUsername('FAC001CR');
                    setPassword('Pygram2k25');
                    setSelectedDepartment('550e8400-e29b-41d4-a716-446655440001');
                  }}
                  className="w-full flex justify-between items-center p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                >
                  <span className="text-gray-700">Creator:</span>
                  <code className="text-xs bg-white px-2 py-1 rounded">FAC001CR / Pygram2k25</code>
                </button>
                <button 
                  onClick={() => {
                    setUsername('FAC001PUB');
                    setPassword('pygram2k25');
                    setSelectedDepartment('550e8400-e29b-41d4-a716-446655440001');
                  }}
                  className="w-full flex justify-between items-center p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                >
                  <span className="text-gray-700">Publisher:</span>
                  <code className="text-xs bg-white px-2 py-1 rounded">FAC001PUB / pygram2k25</code>
                </button>
                <button 
                  onClick={() => {
                    setUsername('CSE2021001');
                    setPassword('student123');
                    setSelectedDepartment('550e8400-e29b-41d4-a716-446655440001');
                  }}
                  className="w-full flex justify-between items-center p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                >
                  <span className="text-gray-700">Student:</span>
                  <code className="text-xs bg-white px-2 py-1 rounded">CSE2021001 / student123</code>
                </button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500">
            This is a demonstration system. In production, use secure authentication.
          </p>
          
          {/* Debug button to clear localStorage */}
          <div className="flex justify-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                localStorage.clear();
                console.log('🧹 localStorage cleared');
                window.location.reload();
              }}
              className="text-xs"
            >
              Clear Cache & Reload
            </Button>
          </div>
          
          <Link href="/role-selection" className="text-xs text-primary hover:underline">
            ← Back to Role Selection
          </Link>
        </div>
      </div>
    </div>
  );
}
