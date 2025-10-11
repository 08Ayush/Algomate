'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { 
  Calendar, 
  Clock, 
  MapPin,
  BookOpen,
  GraduationCap,
  Building,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Loader2
} from "lucide-react";

// Types
interface DashboardData {
  user: any;
  additionalData: {
    batch?: any;
    batchId?: string;
    facultyCount?: number;
  };
  events: any[];
}

interface PublishedTimetable {
  id: string;
  title: string;
  academic_year: string;
  semester: number;
  fitness_score: number;
  batches: {
    id: string;
    name: string;
    section: string;
    semester: number;
  };
}

interface TimetableClass {
  id: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  facultyName: string;
  classroomName: string;
  building: string;
  day: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  isLunch: boolean;
  isLab: boolean;
  isContinuation: boolean;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [publishedTimetables, setPublishedTimetables] = useState<PublishedTimetable[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<PublishedTimetable | null>(null);
  const [timetableClasses, setTimetableClasses] = useState<TimetableClass[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [days] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Allow students and general/guest faculty to access this dashboard
    const isStudent = parsedUser.role === 'student';
    const isGeneralFaculty = parsedUser.role === 'faculty' && 
                            (parsedUser.faculty_type === 'general' || 
                             parsedUser.faculty_type === 'guest' || 
                             !parsedUser.faculty_type);
    
    if (!isStudent && !isGeneralFaculty) {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
    fetchDashboardData(parsedUser);
  }, [router]);

  const fetchDashboardData = async (user: any) => {
    try {
      setLoading(true);
      
      // Fetch user profile and events
      const response = await fetch(
        `/api/student/dashboard?userId=${user.id}&role=${user.role}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);

      // Fetch published timetables for the department
      const timetablesResponse = await fetch(
        `/api/student/published-timetables?departmentId=${user.department_id}${user.role === 'student' && data.additionalData.batch ? `&semester=${data.additionalData.batch.semester}` : ''}`
      );
      
      if (timetablesResponse.ok) {
        const timetablesData = await timetablesResponse.json();
        setPublishedTimetables(timetablesData.timetables || []);
        setAvailableBatches(timetablesData.batches || []);
        
        // Auto-select student's own timetable or first available
        if (user.role === 'student' && data.additionalData.batchId) {
          const studentTimetable = timetablesData.timetables.find(
            (tt: PublishedTimetable) => tt.batches?.id === data.additionalData.batchId
          );
          if (studentTimetable) {
            setSelectedTimetable(studentTimetable);
            fetchTimetableClasses(studentTimetable.id);
          }
        } else if (timetablesData.timetables.length > 0) {
          setSelectedTimetable(timetablesData.timetables[0]);
          fetchTimetableClasses(timetablesData.timetables[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetableClasses = async (timetableId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await fetch(
        `/api/student/timetable-classes?timetableId=${timetableId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch timetable classes');
      }
      
      const data = await response.json();
      setTimetableClasses(data.classes || []);
      setTimeSlots(data.timeSlots || []);
    } catch (error) {
      console.error('Error fetching timetable classes:', error);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const handleTimetableChange = (timetable: PublishedTimetable) => {
    setSelectedTimetable(timetable);
    fetchTimetableClasses(timetable.id);
  };

  const getClassForSlot = (day: string, timeSlot: string): TimetableClass | undefined => {
    const [startTime] = timeSlot.split('-');
    const normalizeTime = (time: string) => time.substring(0, 5);
    
    return timetableClasses.find(
      cls => cls.day === day && normalizeTime(cls.startTime) === normalizeTime(startTime)
    );
  };

  const getClassColor = (subjectType: string, index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800',
      'bg-teal-100 text-teal-800',
      'bg-pink-100 text-pink-800',
    ];
    
    if (subjectType === 'LAB') {
      return 'bg-indigo-100 text-indigo-800';
    }
    
    return colors[index % colors.length];
  };

  // Export to PDF function
  const exportToPDF = () => {
    if (!selectedTimetable) return;
    
    let htmlContent = `
      <html>
        <head>
          <title>Class Timetable - ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .subject-cell { background-color: #f8f9fa; padding: 8px; }
            .break-cell { background-color: #e9ecef; font-style: italic; }
            .course-code { font-weight: bold; font-size: 0.9em; }
            .course-title { font-size: 0.8em; margin: 2px 0; }
            .faculty { font-size: 0.7em; color: #666; }
            .room { font-size: 0.7em; color: #888; }
          </style>
        </head>
        <body>
          <h1>Weekly Class Schedule</h1>
          <p style="text-align: center; margin-bottom: 20px;">
            ${dashboardData?.user.department?.name} • Batch ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section} • ${selectedTimetable.academic_year}
          </p>
          <table>
            <thead>
              <tr>
                <th>Time / Day</th>`;
    
    days.forEach(day => {
      htmlContent += `<th>${day}</th>`;
    });
    
    htmlContent += `</tr></thead><tbody>`;
    
    timeSlots.forEach(timeSlot => {
      htmlContent += `<tr><td style="font-weight: bold; background-color: #f5f5f5;">${timeSlot}</td>`;
      
      days.forEach(day => {
        const slot = getClassForSlot(day, timeSlot);
        if (!slot) {
          htmlContent += '<td>-</td>';
        } else if (slot.isBreak || slot.isLunch) {
          htmlContent += `<td class="break-cell">${slot.isLunch ? 'Lunch Break' : 'Break'}</td>`;
        } else {
          htmlContent += `
            <td class="subject-cell">
              <div class="course-code">${slot.subjectCode}</div>
              <div class="course-title">${slot.subjectName}</div>
              <div class="faculty">${slot.facultyName}</div>
              <div class="room">${slot.classroomName}</div>
            </td>
          `;
        }
      });
      
      htmlContent += '</tr>';
    });
    
    htmlContent += `</tbody></table></body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timetable-${selectedTimetable.batches?.name}-${selectedTimetable.batches?.section}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    if (!selectedTimetable) return;
    
    let csvContent = `Weekly Class Schedule - ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section}\n`;
    csvContent += `${dashboardData?.user.department?.name} • ${selectedTimetable.academic_year}\n\n`;
    
    csvContent += 'Time / Day,' + days.join(',') + '\n';
    
    timeSlots.forEach(timeSlot => {
      let row = timeSlot;
      days.forEach(day => {
        const slot = getClassForSlot(day, timeSlot);
        if (!slot) {
          row += ',-';
        } else if (slot.isBreak || slot.isLunch) {
          row += `,"${slot.isLunch ? 'Lunch Break' : 'Break'}"`;
        } else {
          row += `,"${slot.subjectCode} - ${slot.subjectName} (${slot.facultyName}, ${slot.classroomName})"`;
        }
      });
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timetable-${selectedTimetable.batches?.name}-${selectedTimetable.batches?.section}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'workshop': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'event': return 'bg-green-100 text-green-800 border-green-200';
      case 'seminar': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'academic': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="space-y-6 p-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Welcome back, {user?.first_name || user?.name || (user?.role === 'faculty' ? 'Faculty' : 'Student')}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {user?.role === 'faculty' 
                ? 'View your teaching schedule and department information'
                : 'Ready to explore your Computer Science Engineering dashboard'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Your Department</div>
            <Badge className="bg-blue-500 text-white mt-1">
              {dashboardData?.user.department?.code || 'N/A'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Department Info Card */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            {dashboardData?.user.department?.name || 'Department'}
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {dashboardData?.user.college?.name || 'College'}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {user?.role === 'student' && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData?.additionalData.batch?.semester || user.current_semester || '-'}
                  </div>
                  <div className="text-sm text-gray-500">Current Semester</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData?.additionalData.batch?.name && dashboardData?.additionalData.batch?.section 
                      ? `${dashboardData.additionalData.batch.name} ${dashboardData.additionalData.batch.section}`
                      : '-'}
                  </div>
                  <div className="text-sm text-gray-500">Batch</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {user.email?.split('@')[0]?.toUpperCase() || '-'}
                  </div>
                  <div className="text-sm text-gray-500">UID</div>
                </div>
              </>
            )}
            {user?.role === 'faculty' && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {user.email?.split('@')[0]?.toUpperCase() || '-'}
                  </div>
                  <div className="text-sm text-gray-500">UID</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {user.faculty_type?.toUpperCase() || 'GENERAL'}
                  </div>
                  <div className="text-sm text-gray-500">Faculty Type</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData?.user.departments?.code || '-'}
                  </div>
                  <div className="text-sm text-gray-500">Department Code</div>
                </div>
              </>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {dashboardData?.additionalData.facultyCount || 0}
              </div>
              <div className="text-sm text-gray-500">Faculty Members</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events & Workshops
            <Badge variant="secondary" className="ml-auto">
              {dashboardData?.events.length || 0} Events
            </Badge>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Important upcoming activities and events in {dashboardData?.user.department?.name}
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData?.events && dashboardData.events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardData.events.map((event: any) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getEventTypeColor(event.event_type || 'other')}>
                          {event.event_type || 'Event'}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          {event.status || 'Published'}
                        </Badge>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(event.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{event.start_time?.substring(0, 5)} - {event.end_time?.substring(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{event.venue || 'TBA'}</span>
                        </div>
                      </div>
                      
                      {event.creator && (
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          By: {event.creator.first_name} {event.creator.last_name}
                          {event.creator.faculty_type && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {event.creator.faculty_type}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming events available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Timetable Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Published Timetables
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTimetable 
                  ? `${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section} • ${selectedTimetable.academic_year}`
                  : 'Select a batch to view timetable'}
              </p>
            </div>
            
            {/* Batch Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              {publishedTimetables.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedTimetable?.id || ''}
                    onChange={(e) => {
                      const selected = publishedTimetables.find(tt => tt.id === e.target.value);
                      if (selected) handleTimetableChange(selected);
                    }}
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm appearance-none bg-white dark:bg-gray-800 dark:border-gray-600 cursor-pointer"
                  >
                    {publishedTimetables.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        Batch {tt.batches?.name} {tt.batches?.section} (Sem {tt.semester})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none" />
                </div>
              )}
              
              {selectedTimetable && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportToPDF}
                    disabled={loadingTimetable}
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportToExcel}
                    disabled={loadingTimetable}
                    className="flex items-center gap-1"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Badge variant="secondary">
                    {timetableClasses.filter(c => !c.isBreak && !c.isLunch).length} classes
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTimetable ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Loading timetable...</p>
            </div>
          ) : !selectedTimetable ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No published timetables available</p>
              <p className="text-sm mt-1">Timetables will appear here once published by faculty</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-medium min-w-[120px] text-gray-900 dark:text-gray-100">
                      Time / Day
                    </th>
                    {days.map((day: string) => (
                      <th key={day} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-medium min-w-[160px] text-gray-900 dark:text-gray-100">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot: string, slotIndex: number) => (
                    <tr key={timeSlot} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        {timeSlot}
                      </td>
                      {days.map((day: string) => {
                        const slot = getClassForSlot(day, timeSlot);
                        return (
                          <td key={`${day}-${timeSlot}`} className="border border-gray-300 dark:border-gray-600 p-2">
                            {slot ? (
                              slot.isBreak || slot.isLunch ? (
                                <div className="text-center py-2 text-gray-500 dark:text-gray-400 italic bg-gray-100 dark:bg-gray-800 rounded">
                                  {slot.isLunch ? '🍽️ Lunch Break' : '☕ Break'}
                                </div>
                              ) : (
                                <div className={`p-3 rounded-md text-center ${getClassColor(slot.subjectType, slotIndex)}`}>
                                  <div className="font-semibold text-sm flex items-center justify-center gap-1">
                                    {slot.subjectCode}
                                    {slot.isLab && <Badge variant="secondary" className="text-xs">LAB</Badge>}
                                  </div>
                                  <div className="text-xs mt-1 line-clamp-1">{slot.subjectName}</div>
                                  <div className="text-xs mt-1 opacity-75">{slot.facultyName}</div>
                                  <div className="text-xs mt-1 flex items-center justify-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {slot.classroomName}
                                  </div>
                                </div>
                              )
                            ) : (
                              <div className="text-center py-6 text-gray-400 dark:text-gray-500">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assignment Deadlines
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upcoming assignments and submission deadlines
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-blue-900">Database Design and Implementation</h4>
                  <p className="text-sm text-blue-700">Database Management Systems</p>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-300">Due Soon</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Due Date:</span>
                  <p className="text-blue-700">October 15, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Due Time:</span>
                  <p className="text-blue-700">11:59 PM</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Maximum Marks:</span>
                  <p className="text-blue-700">100 points</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Description:</span> Describe the assignment requirements, objectives, and guidelines. Include what students need to accomplish, learning outcomes, and any specific requirements.
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Submission Format:</span> PDF document with code snippets, ZIP file containing source code and report
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-green-900">Data Structures Implementation</h4>
                  <p className="text-sm text-green-700">Data Structures and Algorithms</p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Upcoming</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-green-800">Due Date:</span>
                  <p className="text-green-700">October 22, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-green-800">Due Time:</span>
                  <p className="text-green-700">5:00 PM</p>
                </div>
                <div>
                  <span className="font-medium text-green-800">Maximum Marks:</span>
                  <p className="text-green-700">80 points</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Description:</span> Implement various data structures including linked lists, stacks, queues, trees, and graphs with proper documentation.
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Submission Format:</span> Source code with documentation, test cases, and performance analysis report
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Examination Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Examination Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upcoming examinations and important details
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-red-900">Mid-term Examination</h4>
                  <p className="text-sm text-red-700">Data Structures and Algorithms</p>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-300">Upcoming</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-red-800">Exam Date:</span>
                  <p className="text-red-700">October 18, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-red-800">Start Time:</span>
                  <p className="text-red-700">10:00 AM</p>
                </div>
                <div>
                  <span className="font-medium text-red-800">Duration:</span>
                  <p className="text-red-700">90 minutes</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Topics/Syllabus Coverage:</span> List the topics that will be covered in the exam (e.g., Arrays, Linked Lists, Stacks, Queues, Trees, Graphs)
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Instructions & Guidelines:</span> Special instructions for students (e.g., Bring calculator, No mobile phones allowed, Open book exam, etc.)
                </p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-purple-900">Final Examination</h4>
                  <p className="text-sm text-purple-700">Database Management Systems</p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">Scheduled</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-purple-800">Exam Date:</span>
                  <p className="text-purple-700">November 25, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-purple-800">Start Time:</span>
                  <p className="text-purple-700">2:00 PM</p>
                </div>
                <div>
                  <span className="font-medium text-purple-800">Duration:</span>
                  <p className="text-purple-700">3 hours</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-purple-700">
                  <span className="font-medium">Topics/Syllabus Coverage:</span> Comprehensive coverage including SQL queries, database design, normalization, transactions, and advanced topics
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-purple-700">
                  <span className="font-medium">Instructions & Guidelines:</span> Closed book examination, scientific calculator permitted, no electronic devices allowed
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
