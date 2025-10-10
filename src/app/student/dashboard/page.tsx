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
  FileSpreadsheet
} from "lucide-react";

// Mock student data - replace with actual user data
interface Student {
  semester: number;
  batch: string;
  department: string;
  rollNumber: string;
}

// Mock events data
const mockEvents = [
  {
    id: 1,
    title: "AI/ML Workshop - Machine Learning Fundamentals",
    type: "Workshop",
    date: "2025-09-24",
    time: "10:00 AM",
    location: "Lab-A",
    status: "Upcoming",
    color: "blue"
  },
  {
    id: 2,
    title: "Technical Symposium - Code Fest 2025",
    type: "Event", 
    date: "2025-09-27",
    time: "9:00 AM",
    location: "Auditorium",
    status: "Upcoming",
    color: "green"
  },
  {
    id: 3,
    title: "Industry Expert Seminar - Web Development Trends",
    type: "Seminar",
    date: "2025-09-29", 
    time: "2:00 PM",
    location: "BF-01",
    status: "Upcoming",
    color: "purple"
  },
  {
    id: 4,
    title: "Final Year Project Review - Phase 1 Submissions",
    type: "Academic",
    date: "2025-10-02",
    time: "11:00 AM", 
    location: "Conference Hall",
    status: "Upcoming",
    color: "orange"
  }
];

// Hybrid-style timetable structure
const getHybridTimetableData = (semester: number) => {
  const timeSlots = [
    '9:00-10:00', '10:00-11:00', '11:15-12:15', '12:15-1:15', 
    '2:15-3:15', '3:15-4:15', '4:30-5:30'
  ];
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const timetable: any = {
    Monday: {
      '9:00-10:00': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
      '10:00-11:00': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
      '11:15-12:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
      '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
      '2:15-3:15': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
      '3:15-4:15': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
      '4:30-5:30': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' }
    },
    Tuesday: {
      '9:00-10:00': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
      '10:00-11:00': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
      '11:15-12:15': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' },
      '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
      '2:15-3:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
      '3:15-4:15': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
      '4:30-5:30': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' }
    },
    Wednesday: {
      '9:00-10:00': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
      '10:00-11:00': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' },
      '11:15-12:15': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
      '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
      '2:15-3:15': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
      '3:15-4:15': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
      '4:30-5:30': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' }
    },
    Thursday: {
      '9:00-10:00': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
      '10:00-11:00': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
      '11:15-12:15': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
      '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
      '2:15-3:15': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' },
      '3:15-4:15': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
      '4:30-5:30': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' }
    },
    Friday: {
      '9:00-10:00': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
      '10:00-11:00': { course_code: '25CE304T', course_title: 'Digital Logic Design', faculty: 'Mr. Dhiraj R. Gupta', room: 'BF-01', color: 'bg-orange-100 text-orange-800' },
      '11:15-12:15': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' },
      '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
      '2:15-3:15': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
      '3:15-4:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
      '4:30-5:30': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' }
    },
    Saturday: {
      '9:00-10:00': { course_code: '25CE302T', course_title: 'Data Structure & Problem Solving', faculty: 'Dr. Sunil M. Wanjari', room: 'BF-02', color: 'bg-green-100 text-green-800' },
      '10:00-11:00': { course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', faculty: 'Dr. Manoj V. Bramhe', room: 'BF-01', color: 'bg-blue-100 text-blue-800' },
      '11:15-12:15': { course_code: '25CE303T', course_title: 'Object Oriented Programming', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-purple-100 text-purple-800' },
      '12:15-1:15': { type: 'break', course_title: 'Lunch Break' },
      '2:15-3:15': { course_code: '25CE305T', course_title: 'Environmental Studies', faculty: 'Dr. Yogesh G. Golhar', room: 'BF-02', color: 'bg-red-100 text-red-800' },
      '3:15-4:15': { course_code: '25CE306P', course_title: 'Data Structure Lab', faculty: 'Dr. Sunil M. Wanjari', room: 'LAB-B', color: 'bg-indigo-100 text-indigo-800' },
      '4:30-5:30': { course_code: '25CE307P', course_title: 'Programming Lab', faculty: 'Prof. Priya S. Ghuge', room: 'LAB-A', color: 'bg-teal-100 text-teal-800' }
    }
  };

  return { timeSlots, days, timetable };
};

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [studentData] = useState<Student>({
    semester: 3,
    batch: "A1",
    department: "Computer Science Engineering",
    rollNumber: "22CSE001"
  });

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
  }, [router]);

  const hybridTimetable = getHybridTimetableData(studentData.semester);

  // Export to PDF function
  const exportToPDF = () => {
    let htmlContent = `
      <html>
        <head>
          <title>Class Timetable - Semester ${studentData.semester}</title>
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
            Department of Computer Engineering • Semester ${studentData.semester} • Academic Year 2024-25
          </p>
          <table>
            <thead>
              <tr>
                <th>Time / Day</th>`;
    
    hybridTimetable.days.forEach(day => {
      htmlContent += `<th>${day}</th>`;
    });
    
    htmlContent += `</tr></thead><tbody>`;
    
    hybridTimetable.timeSlots.forEach(timeSlot => {
      htmlContent += `<tr><td style="font-weight: bold; background-color: #f5f5f5;">${timeSlot}</td>`;
      
      hybridTimetable.days.forEach(day => {
        const slot = hybridTimetable.timetable[day][timeSlot];
        if (!slot) {
          htmlContent += '<td>-</td>';
        } else if (slot.type === 'break') {
          htmlContent += `<td class="break-cell">${slot.course_title}</td>`;
        } else {
          htmlContent += `
            <td class="subject-cell">
              <div class="course-code">${slot.course_code}</div>
              <div class="course-title">${slot.course_title}</div>
              <div class="faculty">${slot.faculty}</div>
              <div class="room">${slot.room}</div>
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
    link.download = `timetable-semester-${studentData.semester}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    let csvContent = `Weekly Class Schedule - Semester ${studentData.semester}\n`;
    csvContent += `Department of Computer Engineering • Academic Year 2024-25\n\n`;
    
    csvContent += 'Time / Day,' + hybridTimetable.days.join(',') + '\n';
    
    hybridTimetable.timeSlots.forEach(timeSlot => {
      let row = timeSlot;
      hybridTimetable.days.forEach(day => {
        const slot = hybridTimetable.timetable[day][timeSlot];
        if (!slot) {
          row += ',-';
        } else if (slot.type === 'break') {
          row += `,"${slot.course_title}"`;
        } else {
          row += `,"${slot.course_code} - ${slot.course_title} (${slot.faculty}, ${slot.room})"`;
        }
      });
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timetable-semester-${studentData.semester}.csv`;
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
            <Badge className="bg-blue-500 text-white mt-1">CSE</Badge>
          </div>
        </div>
      </div>

      {/* Department Info Card */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Computer Science Engineering
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Computer Science and Engineering Department
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{studentData.semester}</div>
              <div className="text-sm text-gray-500">Current Semester</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{studentData.batch}</div>
              <div className="text-sm text-gray-500">Batch</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{studentData.rollNumber}</div>
              <div className="text-sm text-gray-500">Roll Number</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">15</div>
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
            <Badge variant="secondary" className="ml-auto">CSE Only</Badge>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Important upcoming activities and events in Computer Science Engineering
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockEvents.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getEventTypeColor(event.type)}>
                        {event.type}
                      </Badge>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {event.status}
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Timetable Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Class Schedule
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Department of Computer Engineering • Academic Year 2024-25
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToPDF()}
                className="flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToExcel()}
                className="flex items-center gap-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Badge variant="secondary">25 classes</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-medium min-w-[120px] text-gray-900 dark:text-gray-100">
                    Time / Day
                  </th>
                  {hybridTimetable.days.map((day: string) => (
                    <th key={day} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-medium min-w-[160px] text-gray-900 dark:text-gray-100">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hybridTimetable.timeSlots.map((timeSlot: string) => (
                  <tr key={timeSlot} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {timeSlot}
                    </td>
                    {hybridTimetable.days.map((day: string) => {
                      const slot = hybridTimetable.timetable[day][timeSlot];
                      return (
                        <td key={`${day}-${timeSlot}`} className="border border-gray-300 dark:border-gray-600 p-2">
                          {slot ? (
                            slot.type === 'break' ? (
                              <div className="text-center py-2 text-gray-500 dark:text-gray-400 italic">
                                {slot.course_title}
                              </div>
                            ) : (
                              <div className={`p-3 rounded-md text-center ${slot.color}`}>
                                <div className="font-semibold text-sm">{slot.course_code}</div>
                                <div className="text-xs mt-1">{slot.course_title}</div>
                                <div className="text-xs mt-1 opacity-75">{slot.faculty}</div>
                                <div className="text-xs mt-1 flex items-center justify-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {slot.room}
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
