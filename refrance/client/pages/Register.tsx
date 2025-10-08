import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, UserPlus, Crown, Shield, GraduationCap, Users, Building, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Department } from '@/contexts/DepartmentContext';
import { authServiceAdapter } from '@/services/AuthServiceAdapter';

// Enhanced departments with department isolation features - Using Supabase UUIDs
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
    headOfDepartment: 'Dr. John Smith',
    contactEmail: 'cse@college.edu',
    contactPhone: '+1-234-567-8900',
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
    headOfDepartment: 'Prof. Sarah Johnson',
    contactEmail: 'mech@college.edu',
    contactPhone: '+1-234-567-8901',
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
    headOfDepartment: 'Dr. Michael Brown',
    contactEmail: 'civil@college.edu',
    contactPhone: '+1-234-567-8902',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: '550e8400-e29b-41d4-a716-446655440004', 
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
    id: '550e8400-e29b-41d4-a716-446655440005', 
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

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  
  // Get error param if user was redirected here due to missing department
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const errorParam = searchParams.get('error');
  const needsDepartment = errorParam === 'no-department';

  // State for form fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '', // This will be the College Student ID that determines role
    password: '',
    confirmPassword: '',
    departmentId: '',
    phone: ''
  });



  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.username.trim()) return 'College Student ID is required';
    if (formData.username.length < 3) return 'College Student ID must be at least 3 characters';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.departmentId) return 'Please select a department - Department selection is mandatory for all users';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address';
    
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
      
      // Determine role from UID format (you can customize this logic)
      const determineRoleFromUID = (uid: string): UserRole => {
        // Example logic: 
        // - UIDs starting with 'FAC' or containing 'PROF' are faculty (mentors)
        // - UIDs starting with 'ADM' are admin
        // - Everything else is student
        const upperUID = uid.toUpperCase();
        if (upperUID.startsWith('FAC') || upperUID.includes('PROF')) {
          return 'mentor';
        } else if (upperUID.startsWith('ADM')) {
          return 'admin';
        } else {
          return 'student';
        }
      };

      const detectedRole = determineRoleFromUID(formData.username);
      
      // Register with detected role using Supabase
      console.log('📝 Registering user with Supabase:', {
        uid: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        departmentId: formData.departmentId,
        phone: formData.phone
      });

      const success = await authServiceAdapter.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: detectedRole,
        departmentId: formData.departmentId,
        phone: formData.phone
      });

      if (success) {
        // Registration successful, redirect to dashboard
        navigate('/dashboard');
      } else {
        setError('Registration failed. Username or email may already be taken.');
      }
    } catch (error) {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



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
            Create your account to access the smart timetable scheduler system
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
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
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
                <Label htmlFor="email">College Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john.doe@stvincentngp.edu.in"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Use your official college email address</p>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+91-9876543210"
                />
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
              
              <div>
                <Label htmlFor="username">UID *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="e.g., CSE2021001"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">This will be your username for login</p>
                {formData.username && (
                  <p className="text-xs text-blue-600 mt-1">
                    Detected role: {(() => {
                      const upperUID = formData.username.toUpperCase();
                      if (upperUID.startsWith('FAC') || upperUID.includes('PROF')) {
                        return 'Faculty';
                      } else if (upperUID.startsWith('ADM')) {
                        return 'Administrator';
                      } else {
                        return 'Student';
                      }
                    })()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
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
                  <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
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



            {/* Department Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building className="h-5 w-5" />
                Department Selection
              </h3>
              
              <div>
                <Label htmlFor="department" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Choose Your Department *
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select the department you belong to
                </p>
                  <Select value={formData.departmentId} onValueChange={(value) => handleInputChange('departmentId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: dept.colorTheme }}
                              />
                              <span className="font-medium">{dept.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {dept.code}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {dept.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Link href="/signin" className="text-primary hover:underline font-medium">
                    Sign in here
                  </Link>
                </div>
                <div>
                  <Link href="/role-selection" className="text-xs text-primary hover:underline">
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
