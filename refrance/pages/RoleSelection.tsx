import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Shield, Crown, ArrowRight, Users, Building } from 'lucide-react';

interface RoleOption {
  id: 'student' | 'creator' | 'publisher' | 'admin';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  borderColor: string;
  permissions: string[];
  requirements: string[];
}

const roleOptions: RoleOption[] = [
  {
    id: 'student',
    title: 'Student',
    description: 'Access events, view schedules, and register for activities',
    icon: GraduationCap,
    color: 'bg-orange-50 hover:bg-orange-100',
    borderColor: 'border-orange-200 hover:border-orange-300',
    permissions: [
      'View all events',
      'Register for events',
      'View timetables',
      'Manage profile'
    ],
    requirements: [
      'Valid Student ID',
      'College email address',
      'Department selection'
    ]
  },
  {
    id: 'creator',
    title: 'Faculty Mentor (Creator)',
    description: 'Create and draft timetables for department review',
    icon: Shield,
    color: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-200 hover:border-green-300',
    permissions: [
      'Create timetables',
      'Draft schedules',
      'Submit for approval',
      'Manage department events'
    ],
    requirements: [
      'Faculty Employee ID',
      'Department assignment',
      'Creator authorization'
    ]
  },
  {
    id: 'publisher',
    title: 'Faculty Mentor (Publisher)',
    description: 'Review and approve timetables from creators',
    icon: Crown,
    color: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200 hover:border-blue-300',
    permissions: [
      'Review timetables',
      'Approve/reject schedules',
      'Publish final timetables',
      'Department oversight'
    ],
    requirements: [
      'Senior Faculty status',
      'Department authorization',
      'Publisher privileges'
    ]
  },
  {
    id: 'admin',
    title: 'Administrator',
    description: 'Full system access and management capabilities',
    icon: Crown,
    color: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200 hover:border-purple-300',
    permissions: [
      'Full system control',
      'Department management',
      'User management',
      'System settings'
    ],
    requirements: [
      'Administrative access',
      'System privileges',
      'Special authorization'
    ]
  }
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'student' | 'creator' | 'publisher' | 'admin' | null>(null);

  const handleRoleSelect = (roleId: 'student' | 'creator' | 'publisher' | 'admin') => {
    setSelectedRole(roleId);
  };

  const handleProceedToSignIn = () => {
    if (selectedRole) {
      // Navigate to sign-in with role pre-selected
      navigate(`/signin?role=${selectedRole}`);
    }
  };

  const handleProceedToRegister = () => {
    if (selectedRole) {
      // Navigate to registration with role pre-selected
      navigate(`/register?role=${selectedRole}`);
    }
  };

  const selectedRoleData = selectedRole ? roleOptions.find(r => r.id === selectedRole) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to The Academic Compass</h1>
          <p className="text-lg text-gray-600">College Event Management System</p>
          <p className="text-sm text-gray-500 mt-2">Please select your role to continue</p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {roleOptions.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all duration-200 ${role.color} ${role.borderColor} ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:scale-102'
                }`}
                onClick={() => handleRoleSelect(role.id)}
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      role.id === 'student' ? 'bg-orange-200' :
                      role.id === 'creator' ? 'bg-green-200' :
                      role.id === 'publisher' ? 'bg-blue-200' : 'bg-purple-200'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        role.id === 'student' ? 'text-orange-700' :
                        role.id === 'creator' ? 'text-green-700' :
                        role.id === 'publisher' ? 'text-blue-700' : 'text-purple-700'
                      }`} />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <CardDescription className="text-center">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Permissions:</h4>
                      <div className="space-y-1">
                        {role.permissions.map((permission, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-600">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Requirements:</h4>
                      <div className="space-y-1">
                        {role.requirements.map((requirement, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-600">
                            <Building className="w-3 h-3 mr-2" />
                            {requirement}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="mt-4 p-3 bg-white/50 rounded-lg">
                      <Badge className="w-full justify-center" variant="secondary">
                        ✓ Selected
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        {selectedRole && selectedRoleData && (
          <Card className="border-primary/20 bg-white/70">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Continue as {selectedRoleData.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedRoleData.description}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleProceedToSignIn}
                  variant="outline"
                  size="lg"
                  className="flex-1 max-w-xs"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button 
                  onClick={handleProceedToRegister}
                  size="lg"
                  className="flex-1 max-w-xs"
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Register as {selectedRoleData.title}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <button 
                  onClick={() => setSelectedRole(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Choose a different role
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedRole && (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              👆 Click on a role above to see available options
            </p>
          </div>
        )}
      </div>
    </div>
  );
}