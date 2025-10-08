import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Building, Settings, BarChart3, UserCheck, UserX, Crown, 
  ShieldCheck, GraduationCap, Plus, Edit, Trash2, AlertTriangle, Bot 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const departments = [
  { id: '1', name: 'Computer Engineering', code: 'COMP' },
  { id: '2', name: 'Mechanical Engineering', code: 'MECH' },
  { id: '3', name: 'Civil Engineering', code: 'CIVIL' },
  { id: '4', name: 'Electrical Engineering', code: 'ELEC' },
  { id: '5', name: 'Electronics & Telecommunication', code: 'E&TC' }
];

export default function Admin() {
  const { hasPermission, user, getDepartmentQuota, getDepartmentUsers } = useAuth();
  const [departmentQuotas, setDepartmentQuotas] = useState<Record<string, any>>({});
  const [departmentUsers, setDepartmentUsers] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  // Load department data
  useEffect(() => {
    const loadDepartmentData = async () => {
      const quotas: Record<string, any> = {};
      const users: Record<string, any[]> = {};
      
      for (const dept of departments) {
        quotas[dept.id] = getDepartmentQuota(dept.id);
        users[dept.id] = getDepartmentUsers(dept.id);
      }
      
      setDepartmentQuotas(quotas);
      setDepartmentUsers(users);
      setLoading(false);
    };

    loadDepartmentData();
  }, [getDepartmentQuota, getDepartmentUsers]);

  // Check if user has admin permissions
  if (!hasPermission('manage_system')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const totalUsers = Object.values(departmentUsers).reduce((total, users) => total + users.length, 0);
  const totalCapacity = departments.length * 62; // 60 students + 2 mentors per dept

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage departments, users, and system settings</p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {totalCapacity - totalUsers} slots remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground">
                Engineering departments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Capacity</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round((totalUsers / totalCapacity) * 100)}%</div>
              <Progress value={(totalUsers / totalCapacity) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(departmentUsers).filter(users => users.length > 0).length}
              </div>
              <p className="text-xs text-muted-foreground">
                With registered users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="departments">Department Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="telegram">Telegram Bot</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          {/* Department Management */}
          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Department Overview</CardTitle>
                <CardDescription>
                  Monitor department capacity and user distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments.map(dept => {
                    const quota = departmentQuotas[dept.id] || { studentCount: 0, mentorCount: 0 };
                    const users = departmentUsers[dept.id] || [];
                    const students = users.filter(u => u.role === 'student').length;
                    const mentors = users.filter(u => u.role === 'mentor').length;
                    const studentUtilization = (students / 60) * 100;
                    const mentorUtilization = (mentors / 2) * 100;

                    return (
                      <Card key={dept.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{dept.name}</h3>
                              <p className="text-sm text-muted-foreground">{dept.code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant={studentUtilization > 90 ? "destructive" : studentUtilization > 70 ? "secondary" : "outline"}>
                              {students}/60 Students
                            </Badge>
                            <Badge variant={mentorUtilization > 90 ? "destructive" : mentorUtilization > 50 ? "secondary" : "outline"}>
                              {mentors}/2 Mentors
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Student Capacity</span>
                              <span>{students}/60 ({Math.round(studentUtilization)}%)</span>
                            </div>
                            <Progress value={studentUtilization} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Mentor Capacity</span>
                              <span>{mentors}/2 ({Math.round(mentorUtilization)}%)</span>
                            </div>
                            <Progress value={mentorUtilization} className="h-2" />
                          </div>
                        </div>

                        {(studentUtilization > 90 || mentorUtilization > 90) && (
                          <Alert className="mt-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              This department is near capacity. Consider reviewing quotas or managing registrations.
                            </AlertDescription>
                          </Alert>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage users across all departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments.map(dept => {
                    const users = departmentUsers[dept.id] || [];
                    const students = users.filter(u => u.role === 'student');
                    const mentors = users.filter(u => u.role === 'mentor');

                    return (
                      <Card key={dept.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {dept.name}
                          </h3>
                          <Badge variant="outline">
                            {users.length} Total Users
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Students */}
                          <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                              <GraduationCap className="h-4 w-4" />
                              Students ({students.length}/60)
                            </h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {students.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No students registered</p>
                              ) : (
                                students.map(student => (
                                  <div key={student.id} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                                    <span>{student.firstName} {student.lastName}</span>
                                    <span className="text-muted-foreground">{student.username}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Mentors */}
                          <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                              <ShieldCheck className="h-4 w-4" />
                              Mentors ({mentors.length}/2)
                            </h4>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {mentors.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No mentors assigned</p>
                              ) : (
                                mentors.map(mentor => (
                                  <div key={mentor.id} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                                    <span>{mentor.firstName} {mentor.lastName}</span>
                                    <span className="text-muted-foreground">{mentor.username}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Telegram Bot */}
          <TabsContent value="telegram" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>Telegram Bot Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure and manage the Telegram bot for principal communication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Bot Status</h4>
                      <p className="text-sm text-muted-foreground">Current bot connection status</p>
                    </div>
                    <Badge variant="outline">Online</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Messages Sent</h4>
                      <p className="text-sm text-muted-foreground">Total messages sent to principal</p>
                    </div>
                    <Badge variant="secondary">-</Badge>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button asChild>
                    <Link to="/telegram-setup">
                      <Bot className="h-4 w-4 mr-2" />
                      Configure Bot
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <a href="/api/telegram/status" target="_blank" rel="noopener noreferrer">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Check Status
                    </a>
                  </Button>
                </div>

                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    The Telegram bot allows publishers to send messages directly to the principal. 
                    Complete the setup in the configuration page to activate this feature.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure department-centric platform settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Department Configuration</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="studentQuota">Default Student Quota per Department</Label>
                        <Input id="studentQuota" type="number" defaultValue={60} />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum number of students allowed per department
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="mentorQuota">Default Mentor Quota per Department</Label>
                        <Input id="mentorQuota" type="number" defaultValue={2} />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum number of mentors allowed per department
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Data Segregation</h3>
                    
                    <div className="space-y-3">
                      <Alert>
                        <Settings className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Department-Centric Architecture:</strong><br />
                          • Users only see content from their own department<br />
                          • Strict quota enforcement (60 students + 2 mentors)<br />
                          • Admin has global oversight across all departments
                        </AlertDescription>
                      </Alert>
                      
                      <div className="pt-4">
                        <Button className="w-full">
                          Update System Configuration
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}