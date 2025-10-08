import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Shield,
  Bell,
  BarChart3,
  Clock,
  UserCheck,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Globe,
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartment, DepartmentThemed } from '@/contexts/DepartmentContext';
import MessageToPrincipal from '@/components/communication/MessageToPrincipal';

// ============================================================================
// DEPARTMENT DASHBOARD COMPONENT
// ============================================================================

/**
 * Department-specific dashboard that showcases complete data isolation
 * This component demonstrates how each department has its own workspace
 */
export default function DepartmentDashboard() {
  const { user } = useAuth();
  const { 
    activeDepartment, 
    userDepartments, 
    departmentStats,
    getDepartmentUsers,
    switchDepartment 
  } = useDepartment();

  const [isolationDemoVisible, setIsolationDemoVisible] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    recentActivity: [],
    quickStats: {
      totalStudents: 0,
      totalFaculty: 0,
      activeTimetables: 0,
      upcomingEvents: 0,
      completionRate: 0
    },
    notifications: [],
    upcomingEvents: [],
    departmentHighlights: []
  });

  useEffect(() => {
    if (activeDepartment) {
      loadDepartmentDashboardData();
    }
  }, [activeDepartment]);

  const loadDepartmentDashboardData = async () => {
    if (!activeDepartment) return;

    // Department-specific data based on the active department
    const departmentSpecificData = getDepartmentSpecificData(activeDepartment.code);
    
    setDashboardData(departmentSpecificData);
  };

  // Generate department-specific content
  const getDepartmentSpecificData = (departmentCode: string) => {
    const baseStats = {
      totalStudents: departmentStats[activeDepartment?.id || '']?.studentCount || 45,
      totalFaculty: departmentStats[activeDepartment?.id || '']?.mentorCount || 2,
      activeTimetables: 3,
      upcomingEvents: 5,
      completionRate: 87
    };

    switch (departmentCode) {
      case 'CSE':
        return {
          recentActivity: [
            {
              id: 1,
              type: 'project_submission',
              description: 'Final Year Project presentations scheduled for next week',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Academic'
            },
            {
              id: 2,
              type: 'tech_event',
              description: 'Hackathon 2025 registration now open - 48 hours of coding',
              timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Event'
            },
            {
              id: 3,
              type: 'lab_update',
              description: 'New GPU cluster installed in AI/ML lab for research',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Infrastructure'
            }
          ],
          quickStats: baseStats,
          departmentHighlights: [
            { title: 'AI/ML Research Lab', status: 'Active', color: 'blue' },
            { title: 'Software Development Projects', status: '12 Ongoing', color: 'green' },
            { title: 'Industry Partnerships', status: '8 Companies', color: 'purple' }
          ],
          notifications: [
            {
              id: 1,
              title: 'Code Review Session',
              message: 'Weekly code review session scheduled for Friday',
              priority: 'medium',
              departmentSpecific: true
            },
            {
              id: 2,
              title: 'AI Lab Access',
              message: 'New students can now access the AI/ML lab',
              priority: 'low',
              departmentSpecific: true
            }
          ],
          upcomingEvents: [
            { id: 1, title: 'Tech Symposium 2025', date: '2025-09-25', type: 'Conference', attendees: 150 },
            { id: 2, title: 'Coding Competition', date: '2025-09-30', type: 'Competition', attendees: 80 },
            { id: 3, title: 'Industry Visit - Google', date: '2025-10-05', type: 'Visit', attendees: 45 }
          ]
        };

      case 'MECH':
        return {
          recentActivity: [
            {
              id: 1,
              type: 'workshop',
              description: 'Advanced CAD/CAM workshop scheduled for mechanical students',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Workshop'
            },
            {
              id: 2,
              type: 'lab_maintenance',
              description: 'Manufacturing lab equipment maintenance completed',
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Maintenance'
            },
            {
              id: 3,
              type: 'industry_project',
              description: 'New automation project collaboration with Tata Motors',
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Industry'
            }
          ],
          quickStats: { ...baseStats, totalStudents: 52, activeTimetables: 4 },
          departmentHighlights: [
            { title: 'Manufacturing Lab', status: 'Operational', color: 'green' },
            { title: 'Thermal Engineering Projects', status: '8 Active', color: 'orange' },
            { title: 'Industry Collaborations', status: '5 Partners', color: 'blue' }
          ],
          notifications: [
            {
              id: 1,
              title: 'Lab Safety Training',
              message: 'Mandatory safety training for all mechanical lab users',
              priority: 'high',
              departmentSpecific: true
            },
            {
              id: 2,
              title: 'Equipment Upgrade',
              message: 'New CNC machines will be installed next month',
              priority: 'medium',
              departmentSpecific: true
            }
          ],
          upcomingEvents: [
            { id: 1, title: 'Mechanical Engineering Expo', date: '2025-09-28', type: 'Exhibition', attendees: 120 },
            { id: 2, title: 'Robotics Workshop', date: '2025-10-02', type: 'Workshop', attendees: 60 },
            { id: 3, title: 'Industry Expert Lecture', date: '2025-10-08', type: 'Lecture', attendees: 75 }
          ]
        };

      case 'CIVIL':
        return {
          recentActivity: [
            {
              id: 1,
              type: 'site_visit',
              description: 'Construction site visit to Mumbai Metro project scheduled',
              timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Field Visit'
            },
            {
              id: 2,
              type: 'research',
              description: 'Earthquake simulation lab research project approved',
              timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Research'
            },
            {
              id: 3,
              type: 'seminar',
              description: 'Sustainable construction materials seminar next Friday',
              timestamp: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Academic'
            }
          ],
          quickStats: { ...baseStats, totalStudents: 48, activeTimetables: 3, upcomingEvents: 7 },
          departmentHighlights: [
            { title: 'Structural Testing Lab', status: 'Active', color: 'orange' },
            { title: 'Environmental Projects', status: '6 Running', color: 'green' },
            { title: 'Government Projects', status: '3 Ongoing', color: 'blue' }
          ],
          notifications: [
            {
              id: 1,
              title: 'Site Visit Permission',
              message: 'Permission slips required for Mumbai Metro site visit',
              priority: 'high',
              departmentSpecific: true
            },
            {
              id: 2,
              title: 'Research Grant',
              message: 'New research grant approved for earthquake simulation',
              priority: 'medium',
              departmentSpecific: true
            }
          ],
          upcomingEvents: [
            { id: 1, title: 'Civil Engineering Summit', date: '2025-09-26', type: 'Summit', attendees: 100 },
            { id: 2, title: 'Infrastructure Design Contest', date: '2025-10-01', type: 'Competition', attendees: 50 },
            { id: 3, title: 'Smart City Planning Workshop', date: '2025-10-07', type: 'Workshop', attendees: 70 }
          ]
        };

      case 'EEE':
        return {
          recentActivity: [
            {
              id: 1,
              type: 'project',
              description: 'Smart Grid research project receives funding approval',
              timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Research'
            },
            {
              id: 2,
              type: 'equipment',
              description: 'New oscilloscopes and signal generators installed',
              timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Equipment'
            },
            {
              id: 3,
              type: 'placement',
              description: 'Power Grid Corporation campus recruitment next month',
              timestamp: new Date(Date.now() - 6.5 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Placement'
            }
          ],
          quickStats: { ...baseStats, totalStudents: 55, totalFaculty: 3, activeTimetables: 5 },
          departmentHighlights: [
            { title: 'Power Electronics Lab', status: 'Upgraded', color: 'yellow' },
            { title: 'Renewable Energy Projects', status: '4 Active', color: 'green' },
            { title: 'Industry Tie-ups', status: '7 Companies', color: 'purple' }
          ],
          notifications: [
            {
              id: 1,
              title: 'Lab Equipment Training',
              message: 'Training session for new lab equipment this Thursday',
              priority: 'medium',
              departmentSpecific: true
            },
            {
              id: 2,
              title: 'Placement Drive',
              message: 'Power Grid Corporation recruitment starts next week',
              priority: 'high',
              departmentSpecific: true
            }
          ],
          upcomingEvents: [
            { id: 1, title: 'Power Systems Conference', date: '2025-09-29', type: 'Conference', attendees: 90 },
            { id: 2, title: 'Circuit Design Competition', date: '2025-10-03', type: 'Competition', attendees: 65 },
            { id: 3, title: 'Renewable Energy Seminar', date: '2025-10-10', type: 'Seminar', attendees: 85 }
          ]
        };

      case 'EXTC':
        return {
          recentActivity: [
            {
              id: 1,
              type: 'innovation',
              description: '5G communication lab setup completed successfully',
              timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Innovation'
            },
            {
              id: 2,
              type: 'internship',
              description: 'Summer internship program with Qualcomm announced',
              timestamp: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Internship'
            },
            {
              id: 3,
              type: 'research',
              description: 'IoT research project wins national level competition',
              timestamp: new Date(Date.now() - 5.8 * 60 * 60 * 1000).toISOString(),
              departmentSpecific: true,
              category: 'Achievement'
            }
          ],
          quickStats: { ...baseStats, totalStudents: 50, activeTimetables: 4, completionRate: 92 },
          departmentHighlights: [
            { title: 'Communication Systems Lab', status: '5G Ready', color: 'blue' },
            { title: 'IoT Development Projects', status: '10 Active', color: 'purple' },
            { title: 'Research Publications', status: '15 This Year', color: 'green' }
          ],
          notifications: [
            {
              id: 1,
              title: '5G Lab Access',
              message: 'Final year students can now access the 5G communication lab',
              priority: 'medium',
              departmentSpecific: true
            },
            {
              id: 2,
              title: 'Internship Applications',
              message: 'Qualcomm internship applications due by Friday',
              priority: 'high',
              departmentSpecific: true
            }
          ],
          upcomingEvents: [
            { id: 1, title: 'Electronics Innovation Fair', date: '2025-09-27', type: 'Fair', attendees: 110 },
            { id: 2, title: 'Wireless Technology Workshop', date: '2025-10-04', type: 'Workshop', attendees: 55 },
            { id: 3, title: 'Telecom Industry Meet', date: '2025-10-09', type: 'Industry Meet', attendees: 95 }
          ]
        };

      default:
        return {
          recentActivity: [],
          quickStats: baseStats,
          departmentHighlights: [],
          notifications: [],
          upcomingEvents: []
        };
    }
  };

  if (!activeDepartment) {
    return (
      <div className="p-6">
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Please select a department to view the dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <DepartmentThemed className="p-6 space-y-6">
      {/* Department Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div 
            className="w-12 h-12 rounded-full dept-color-indicator flex items-center justify-center"
            data-color={activeDepartment.colorTheme}
          >
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{activeDepartment.name}</h1>
            <p className="text-muted-foreground">{activeDepartment.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="department-isolated">
            Isolated Workspace
          </Badge>
          <Badge 
            className="dept-themed-badge"
            data-color={activeDepartment.colorTheme}
          >
            {activeDepartment.code}
          </Badge>
        </div>
      </div>

      {/* Department Isolation Demo */}
      {isolationDemoVisible && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-900">Department Isolation Active</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsolationDemoVisible(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <p className="text-sm text-blue-800">
                You are currently viewing data exclusively from the <strong>{activeDepartment.name}</strong> department. 
                All content, users, and activities shown below are isolated to this department only.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-blue-700">Your department data</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-blue-700">Other departments hidden</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-blue-700">Privacy protected</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{dashboardData.quickStats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Faculty</p>
                <p className="text-2xl font-bold">{dashboardData.quickStats.totalFaculty}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Timetables</p>
                <p className="text-2xl font-bold">{dashboardData.quickStats.activeTimetables}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Events</p>
                <p className="text-2xl font-bold">{dashboardData.quickStats.upcomingEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-sm text-muted-foreground">Completion</p>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold">{dashboardData.quickStats.completionRate}%</p>
                <Progress value={dashboardData.quickStats.completionRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department-Specific Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>{activeDepartment?.name} Highlights</span>
            </CardTitle>
            <CardDescription>
              Key activities and achievements in {activeDepartment?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.departmentHighlights?.map((highlight, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      highlight.color === 'blue' ? 'bg-blue-500' :
                      highlight.color === 'green' ? 'bg-green-500' :
                      highlight.color === 'orange' ? 'bg-orange-500' :
                      highlight.color === 'purple' ? 'bg-purple-500' :
                      highlight.color === 'yellow' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{highlight.title}</p>
                      <p className="text-xs text-muted-foreground">{activeDepartment?.name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{highlight.status}</Badge>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground">No highlights available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>{activeDepartment?.name} Recent Activity</span>
              <Badge variant="outline" className="ml-2">
                Department Only
              </Badge>
            </CardTitle>
            <CardDescription>
              Latest activities within the {activeDepartment.name} department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.category === 'Academic' ? 'bg-blue-100 text-blue-600' :
                      activity.category === 'Event' ? 'bg-green-100 text-green-600' :
                      activity.category === 'Infrastructure' ? 'bg-purple-100 text-purple-600' :
                      activity.category === 'Workshop' ? 'bg-orange-100 text-orange-600' :
                      activity.category === 'Research' ? 'bg-indigo-100 text-indigo-600' :
                      activity.category === 'Industry' ? 'bg-teal-100 text-teal-600' :
                      activity.category === 'Field Visit' ? 'bg-yellow-100 text-yellow-600' :
                      activity.category === 'Equipment' ? 'bg-pink-100 text-pink-600' :
                      activity.category === 'Placement' ? 'bg-red-100 text-red-600' :
                      activity.category === 'Innovation' ? 'bg-cyan-100 text-cyan-600' :
                      activity.category === 'Achievement' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.category === 'Academic' && <BookOpen className="h-4 w-4" />}
                      {activity.category === 'Event' && <Calendar className="h-4 w-4" />}
                      {activity.category === 'Infrastructure' && <Building2 className="h-4 w-4" />}
                      {activity.category === 'Workshop' && <Users className="h-4 w-4" />}
                      {activity.category === 'Research' && <BarChart3 className="h-4 w-4" />}
                      {activity.category === 'Industry' && <Shield className="h-4 w-4" />}
                      {!activity.category && <Activity className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <Badge 
                        variant="outline" 
                        className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {activeDepartment?.name} Only
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleTimeString()} - {activity.category || 'General'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>{activeDepartment?.name} Notifications</span>
            </CardTitle>
            <CardDescription>
              Department-specific alerts and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.notifications.map((notification) => (
                <div key={notification.id} className="p-3 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <Badge 
                      variant={notification.priority === 'high' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {notification.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{activeDepartment?.name} Upcoming Events</span>
            <Badge variant="outline">
              Department Only
            </Badge>
          </CardTitle>
          <CardDescription>
            Events organized within the {activeDepartment.name} department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.upcomingEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{event.attendees} attendees</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message to Principal - Publisher Only */}
      <MessageToPrincipal />

      {/* Department Context Info */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Active Department Context</p>
                <p className="text-xs text-muted-foreground">
                  All data shown is filtered for {activeDepartment.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Isolation: ON</Badge>
              {userDepartments.length > 1 && (
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Switch Department
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </DepartmentThemed>
  );
}

// ============================================================================
// DEPARTMENT COMPARISON DEMO COMPONENT
// ============================================================================

/**
 * Component to demonstrate data isolation between departments
 * This would typically be admin-only to show the isolation concept
 */
export function DepartmentIsolationDemo() {
  const { user } = useAuth();
  const { userDepartments, activeDepartment } = useDepartment();
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  // Only show to admins or for demo purposes
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <Card className="border-2 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-yellow-800">
          <Shield className="h-5 w-5" />
          <span>Department Isolation Demonstration</span>
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Admin view: This demonstrates how data is isolated between departments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userDepartments.map((dept) => (
              <Card key={dept.id} className="border-2 hover:border-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full dept-color-indicator"
                        data-color={dept.colorTheme}
                      />
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-sm text-muted-foreground">{dept.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Data Count</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(Math.random() * 100) + 50} records
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    🔒 Only {dept.code} users can see this data
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Each department's data is completely isolated. Students and faculty from 
              Civil Engineering cannot access Computer Science data, and vice versa.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}