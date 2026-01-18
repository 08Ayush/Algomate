'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  ChevronRight,
  MapPin,
  GraduationCap,
  FileText,
  Sparkles,
  Building2,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentLayout from '@/components/student/StudentLayout';

interface TimetableClass {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  facultyName: string;
  classroomName: string;
  building: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface DashboardData {
  user: any;
  additionalData: {
    batch?: any;
    batchId?: string;
    facultyCount?: number;
  };
  events: any[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [todayClasses, setTodayClasses] = useState<TimetableClass[]>([]);
  const [upcomingClass, setUpcomingClass] = useState<TimetableClass | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'student') {
      router.push('/login');
      return;
    }
    setUser(parsedUser);
    fetchDashboardData(parsedUser);
  }, [router]);

  const fetchDashboardData = async (user: any) => {
    try {
      setLoading(true);

      // Fetch dashboard data
      const response = await fetch(`/api/student/dashboard?userId=${user.id}&role=${user.role}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard');

      const data = await response.json();
      setDashboardData(data);

      // Update localStorage with complete user data
      if (data.user) {
        const updatedUser = {
          ...user,
          college_uid: data.user.college_uid,
          current_semester: data.user.current_semester || data.additionalData?.batch?.semester,
          course: data.user.course,
          course_id: data.user.course_id
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      // Fetch published timetables
      if (data.additionalData?.batchId) {
        const timetablesRes = await fetch(
          `/api/student/published-timetables?courseId=${user.course_id}&semester=${data.additionalData.batch?.semester}`
        );

        if (timetablesRes.ok) {
          const ttData = await timetablesRes.json();
          const studentTimetable = ttData.timetables?.find(
            (tt: any) => tt.batches?.id === data.additionalData.batchId
          );

          if (studentTimetable) {
            // Fetch today's classes
            const classesRes = await fetch(`/api/student/timetable-classes?timetableId=${studentTimetable.id}`);
            if (classesRes.ok) {
              const classesData = await classesRes.json();
              const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
              const todaysClasses = classesData.classes?.filter((c: TimetableClass) => c.day === today) || [];
              setTodayClasses(todaysClasses);

              // Find upcoming class
              const now = new Date();
              const currentTime = now.toTimeString().slice(0, 5);
              const upcoming = todaysClasses.find((c: TimetableClass) => c.startTime > currentTime);
              setUpcomingClass(upcoming || null);
            }
          }
        }
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <StudentLayout activeTab="dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout activeTab="dashboard">
      <div className="space-y-6 pb-20 lg:pb-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#CDE8E5]/20 rounded-full translate-y-24 -translate-x-24 blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-sm lg:text-base flex items-center gap-2">
                  <Sparkles size={16} />
                  {getGreeting()}
                </p>
                <h1 className="text-2xl lg:text-4xl font-bold mt-1">
                  {user?.first_name || 'Student'}! 👋
                </h1>
                <p className="text-white/70 mt-2 text-sm lg:text-base">{today}</p>
              </div>
              <div className="hidden lg:block text-right">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4">
                  <p className="text-white/80 text-xs">Semester</p>
                  <p className="text-3xl font-bold">{dashboardData?.additionalData?.batch?.semester || user?.current_semester || '?'}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats - Mobile */}
            <div className="grid grid-cols-3 gap-3 mt-6 lg:hidden">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{dashboardData?.additionalData?.batch?.semester || '?'}</p>
                <p className="text-xs text-white/80">Semester</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{todayClasses.length}</p>
                <p className="text-xs text-white/80">Classes Today</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{dashboardData?.additionalData?.facultyCount || 0}</p>
                <p className="text-xs text-white/80">Faculty</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Info Cards - Desktop */}
        <div className="hidden lg:grid grid-cols-4 gap-4">
          {[
            {
              icon: BookOpen,
              label: 'Course',
              value: dashboardData?.user?.course?.code || 'N/A',
              bgColor: 'bg-blue-50',
              iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600'
            },
            {
              icon: Layers,
              label: 'Batch',
              value: `${dashboardData?.additionalData?.batch?.name || ''} - Sem ${dashboardData?.additionalData?.batch?.semester || '?'}`,
              bgColor: 'bg-purple-50',
              iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600'
            },
            {
              icon: Calendar,
              label: 'Academic Year',
              value: dashboardData?.additionalData?.batch?.academic_year || user?.academic_year || '2025-26',
              bgColor: 'bg-orange-50',
              iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600'
            },
            {
              icon: Users,
              label: 'Student UID',
              value: user?.college_uid || dashboardData?.user?.college_uid || 'N/A',
              bgColor: 'bg-green-50',
              iconBg: 'bg-gradient-to-br from-green-500 to-green-600'
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${item.bgColor} rounded-2xl p-5 border border-gray-100`}
            >
              <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center mb-3`}>
                <item.icon size={20} className="text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900 truncate">{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-5 lg:p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Today's Classes</h2>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
            </div>
            <button
              onClick={() => router.push('/student/timetable')}
              className="text-[#4D869C] text-sm font-medium flex items-center gap-1 hover:underline"
            >
              Full Timetable
              <ChevronRight size={16} />
            </button>
          </div>

          {todayClasses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No classes scheduled for today</p>
              <p className="text-gray-400 text-sm mt-1">Enjoy your free day! 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayClasses.map((cls, index) => {
                const now = new Date();
                const currentTime = now.toTimeString().slice(0, 5);
                const isPast = cls.endTime < currentTime;
                const isCurrent = cls.startTime <= currentTime && cls.endTime > currentTime;

                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 lg:p-5 flex items-start gap-4 ${isPast ? 'opacity-50' : ''} ${isCurrent ? 'bg-[#4D869C]/5' : ''}`}
                  >
                    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrent
                      ? 'bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] text-white'
                      : isPast
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                      <BookOpen size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 truncate">{cls.subjectName}</h4>
                          <p className="text-sm text-gray-500">{cls.subjectCode}</p>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-1 bg-[#4D869C] text-white text-xs font-semibold rounded-lg flex-shrink-0">
                            Now
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {cls.classroomName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{cls.facultyName}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
        >
          {[
            { icon: Calendar, label: 'Full Timetable', path: '/student/timetable', color: 'from-blue-500 to-blue-600' },
            { icon: BookOpen, label: 'My Subjects', path: '/student/subjects', color: 'from-purple-500 to-purple-600' },
            { icon: FileText, label: 'Assignments', path: '/student/assignments', color: 'from-orange-500 to-orange-600' },
            { icon: GraduationCap, label: 'NEP Selection', path: '/student/nep-selection', color: 'from-green-500 to-green-600' },
          ].map((item, index) => (
            <motion.button
              key={item.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(item.path)}
              className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left"
            >
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                <item.icon size={20} className="text-white" />
              </div>
              <p className="font-semibold text-gray-900 text-sm lg:text-base">{item.label}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* Events Section */}
        {dashboardData?.events && dashboardData.events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-5 lg:p-6 border-b border-gray-100">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Upcoming Events</h2>
              <p className="text-sm text-gray-500">Stay updated with college activities</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 lg:p-6">
              {dashboardData.events.slice(0, 6).map((event: any, index) => (
                <div key={event.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  {/* Event Type and Status Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${event.event_type === 'workshop' ? 'bg-blue-100 text-blue-700' :
                        event.event_type === 'seminar' ? 'bg-purple-100 text-purple-700' :
                          event.event_type === 'cultural' ? 'bg-pink-100 text-pink-700' :
                            event.event_type === 'sports' ? 'bg-orange-100 text-orange-700' :
                              event.event_type === 'academic' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                      }`}>
                      {event.event_type || 'event'}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${event.status === 'published' ? 'bg-green-100 text-green-700' :
                        event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                      }`}>
                      {event.status || 'upcoming'}
                    </span>
                  </div>

                  {/* Event Title & Description */}
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{event.title}</h4>
                  {event.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{event.description}</p>
                  )}

                  {/* Event Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {event.event_date && (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}
                    {(event.event_time || event.end_time) && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span>
                          {event.event_time?.slice(0, 5) || ''}
                          {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                        </span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  {event.creator && (
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        By: {event.creator.faculty_type === 'professor' ? 'Prof.' : event.creator.faculty_type === 'hod' ? 'HOD' : ''} {event.creator.first_name} {event.creator.last_name}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">creator</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </StudentLayout>
  );
}
