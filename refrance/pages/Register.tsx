import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, UserPlus, Crown, Shield, GraduationCap, Users, Building, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Department } from '@/contexts/DepartmentContext';

// Enhanced departments with department isolation features
const departments: Department[] = [
  { 
    id: 'dept-1', 
    name: 'Computer Science & Engineering', 
    code: 'CSE',
    description: 'Advanced computing, software development, and emerging technologies',
    colorTheme: '#3B82F6',
    isActive: true,
    maxStudents: 60,
    maxMentors: 2,
    headOfDepartment: 'Dr. John Smith',
    contactEmail: 'cse@college.edu',
    contactPhone: '+1-234-567-8900',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: 'dept-2', 
    name: 'Mechanical Engineering', 
    code: 'MECH',
    description: 'Mechanical systems, manufacturing, and automation',
    colorTheme: '#10B981',
    isActive: true,
    maxStudents: 60,
    maxMentors: 2,
    headOfDepartment: 'Prof. Sarah Johnson',
    contactEmail: 'mech@college.edu',
    contactPhone: '+1-234-567-8901',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: 'dept-3', 
    name: 'Civil Engineering', 
    code: 'CIVIL',
    description: 'Infrastructure, construction, and environmental engineering',
    colorTheme: '#F59E0B',
    isActive: true,
    maxStudents: 60,
    maxMentors: 2,
    headOfDepartment: 'Dr. Michael Brown',
    contactEmail: 'civil@college.edu',
    contactPhone: '+1-234-567-8902',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: 'dept-4', 
    name: 'Electrical Engineering', 
    code: 'EEE',
    description: 'Power systems, electronics, and electrical design',
    colorTheme: '#EF4444',
    isActive: true,
    maxStudents: 60,
    maxMentors: 2,
    headOfDepartment: 'Dr. Lisa Wilson',
    contactEmail: 'eee@college.edu',
    contactPhone: '+1-234-567-8903',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: 'dept-5', 
    name: 'Electronics & Telecommunication', 
    code: 'EXTC',
    description: 'Communication systems, signal processing, and networking',
    colorTheme: '#8B5CF6',
    isActive: true,
    maxStudents: 60,
    maxMentors: 2,
    headOfDepartment: 'Prof. David Garcia',
    contactEmail: 'extc@college.edu',
    contactPhone: '+1-234-567-8904',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const roleDescriptions = {
  admin: {
    title: 'Administrator',
    description: 'Full system access - Manage departments, approve events, system settings',
    icon: Crown,
    color: 'bg-purple-100 text-purple-800',
    permissions: ['Full system control', 'Department management', 'Event approval', 'User management']
  },
  creator: {
    title: 'Faculty Mentor (Creator)',
    description: 'Create and draft timetables for department review',
    icon: Shield,
    color: 'bg-green-100 text-green-800',
    permissions: ['Create timetables', 'Draft schedules', 'Submit for approval', 'Manage department events']
  },
  publisher: {
    title: 'Faculty Mentor (Publisher)',
    description: 'Review and approve timetables from creators',
    icon: Crown,
    color: 'bg-blue-100 text-blue-800',
    permissions: ['Review timetables', 'Approve/reject schedules', 'Publish final timetables', 'Department oversight']
  },
  student: {
    title: 'Student',
    description: 'View and participate - Access events, register, view schedules',
    icon: GraduationCap,
    color: 'bg-orange-100 text-orange-800',
    permissions: ['View events', 'Register for events', 'View schedules', 'Profile management']
  }
};

export default function Register() {
  const { register: registerUser, canRegisterInDepartment, getDepartmentQuota } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departmentQuotas, setDepartmentQuotas] = useState<Record<string, any>>({});
  const [lastQuotaUpdate, setLastQuotaUpdate] = useState<Date>(new Date());
  
  // Get role from URL params if navigated from role selection
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const preSelectedRole = searchParams.get('role');
  const errorParam = searchParams.get('error');

  // Get role options based on pre-selected role or show all
  const roleOptions = preSelectedRole 
    ? [preSelectedRole] 
    : ['student', 'creator', 'publisher', 'admin'];

  // Check if user was redirected here due to missing department
  const needsDepartment = errorParam === 'no-department';

  // State for form fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: preSelectedRole || '',
    departmentId: '',
    studentId: '', // For students
    employeeId: '', // For faculty
    phone: ''
  });

  // Load department quotas when component mounts and refresh periodically for real-time updates
  useEffect(() => {
    const loadQuotas = async () => {
      const quotas: Record<string, any> = {};
      for (const dept of departments) {
        quotas[dept.id] = getDepartmentQuota(dept.id);
      }
      setDepartmentQuotas(quotas);
      setLastQuotaUpdate(new Date());
    };
    
    // Load quotas initially
    loadQuotas();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadQuotas, 30000);
    
    // Also update when window regains focus
    const handleFocus = () => loadQuotas();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [getDepartmentQuota]);

  // Refresh quotas when role changes to show accurate data
  useEffect(() => {
    if (formData.role) {
      const loadQuotas = async () => {
        const quotas: Record<string, any> = {};
        for (const dept of departments) {
          quotas[dept.id] = getDepartmentQuota(dept.id);
        }
        setDepartmentQuotas(quotas);
        setLastQuotaUpdate(new Date());
      };
      loadQuotas();
    }
  }, [formData.role, getDepartmentQuota]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.username.trim()) return 'Username is required';
    if (formData.username.length < 3) return 'Username must be at least 3 characters';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.role) return 'Please select a role';
    if (!formData.departmentId) return 'Please select a department - Department selection is mandatory for all users';
    if (formData.role === 'student' && !formData.studentId.trim()) return 'Student ID is required';
    if (formData.role === 'mentor' && !formData.employeeId.trim()) return 'Employee ID is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address';
    
    // Quota validation for department registration
    if (formData.role !== 'admin' && formData.departmentId) {
      if (!canRegisterInDepartment(formData.departmentId, formData.role as 'student' | 'mentor')) {
        const quota = departmentQuotas[formData.departmentId];
        if (quota) {
          const maxUsers = formData.role === 'student' ? 60 : 2;
          const currentUsers = formData.role === 'student' ? quota.studentCount : quota.mentorCount;
          return `Department ${formData.role} quota exceeded. Maximum ${maxUsers} ${formData.role}s allowed (currently ${currentUsers}/${maxUsers}).`;
        }
        return `Registration not available for ${formData.role} role in this department.`;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate registration API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock registration success
      const success = await registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role as 'admin' | 'mentor' | 'student',
        departmentId: formData.departmentId,
        studentId: formData.studentId,
        employeeId: formData.employeeId,
        phone: formData.phone
      });

      if (success) {
        // Registration successful, redirect to dashboard
        navigate('/');
      } else {
        setError('Registration failed. Username or email may already be taken.');
      }
    } catch (error) {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = formData.role ? roleDescriptions[formData.role as keyof typeof roleDescriptions] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Join The Academic Compass</CardTitle>
          <CardDescription>
            Create your account to access the college event management system
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {needsDepartment && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Department Selection Required:</strong> You need to select a department to continue. 
                  Department selection is mandatory for all users to ensure proper workspace isolation.
                </AlertDescription>
              </Alert>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john.doe@college.edu"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1-234-567-8900"
                />
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
              
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="johndoe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Selection with Enhanced Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building className="h-5 w-5" />
                Department Selection
              </h3>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Department Isolation Notice</p>
                    <p className="text-blue-700 mt-1">
                      Each department operates as an independent workspace. You will only see content, 
                      users, and activities from your selected department. This ensures privacy and 
                      organization tailored to your specific field of study.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="role">Select Your Role</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your role in the system" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleDescriptions).map(([role, info]) => {
                      const Icon = info.icon;
                      return (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{info.title}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Enhanced Role Description */}
              {selectedRole && (
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Badge className={selectedRole.color}>
                        <selectedRole.icon className="h-3 w-3 mr-1" />
                        {selectedRole.title}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{selectedRole.description}</p>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Within your department workspace, you can:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedRole.permissions.map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Department Selection */}
              {formData.role && formData.role !== 'admin' && (
                <div>
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Choose Your Department Workspace
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    This will be your primary workspace. You'll only see content from this department.
                  </p>
                  <Select value={formData.departmentId} onValueChange={(value) => handleInputChange('departmentId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => {
                        const quota = departmentQuotas[dept.id];
                        const canRegister = canRegisterInDepartment(dept.id, formData.role as 'student' | 'mentor');
                        const isStudent = formData.role === 'student';
                        const currentCount = quota ? (isStudent ? quota.students : quota.mentors) : 0;
                        const maxCount = isStudent ? dept.maxStudents : dept.maxMentors;
                        
                        return (
                          <SelectItem key={dept.id} value={dept.id} disabled={!canRegister}>
                            <div className="flex flex-col w-full">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    data-color={dept.colorTheme}
                                  />
                                  <span className="font-medium">{dept.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {dept.code}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <span className={`text-xs ${canRegister ? 'text-green-600' : 'text-red-600'}`}>
                                    {currentCount}/{maxCount} {formData.role}s
                                  </span>
                                  {canRegister && (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {dept.description}
                              </p>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  
                  {/* Enhanced quota info for selected department */}
                  {formData.departmentId && (
                    <div className="mt-2">
                      {(() => {
                        const selectedDept = departments.find(d => d.id === formData.departmentId);
                        const quota = departmentQuotas[formData.departmentId];
                        
                        if (!selectedDept || !quota) return null;
                        
                        return (
                          <Card 
                            className="border-l-4 dept-themed-card"
                            data-dept-color={selectedDept.colorTheme}
                          >
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-4 h-4 rounded-full dept-color-indicator" 
                                      data-color={selectedDept.colorTheme}
                                    />
                                    <span className="font-medium">{selectedDept.name}</span>
                                  </div>
                                  <Badge variant="outline">{selectedDept.code}</Badge>
                                </div>
                                
                                <p className="text-sm text-muted-foreground">
                                  {selectedDept.description}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="space-y-1">
                                    <div className="font-medium">Head of Department</div>
                                    <div className="text-muted-foreground">{selectedDept.headOfDepartment}</div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="font-medium">Contact</div>
                                    <div className="text-muted-foreground">{selectedDept.contactEmail}</div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="font-medium text-sm">Department Capacity Status:</div>
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Students:</span>
                                      <span className="font-medium">
                                        {quota.students}/{selectedDept.maxStudents}
                                        <span className="text-green-600 ml-1">
                                          ({selectedDept.maxStudents - quota.students} available)
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Mentors:</span>
                                      <span className="font-medium">
                                        {quota.mentors}/{selectedDept.maxMentors}
                                        <span className="text-green-600 ml-1">
                                          ({selectedDept.maxMentors - quota.mentors} available)
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground flex items-center justify-between">
                                  <span>Last updated: {lastQuotaUpdate.toLocaleTimeString()}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Isolated Workspace
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Role-specific ID fields */}
              {formData.role === 'student' && (
                <div>
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={formData.studentId}
                    onChange={(e) => handleInputChange('studentId', e.target.value)}
                    placeholder="e.g., CSE2021001"
                    required
                  />
                </div>
              )}

              {formData.role === 'mentor' && (
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => handleInputChange('employeeId', e.target.value)}
                    placeholder="e.g., FAC001"
                    required
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <div>
                  Already have an account?{' '}
                  <Link to="/signin" className="text-primary hover:underline font-medium">
                    Sign in here
                  </Link>
                </div>
                <div>
                  <Link to="/role-selection" className="text-xs text-primary hover:underline">
                    ← Back to Role Selection
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
