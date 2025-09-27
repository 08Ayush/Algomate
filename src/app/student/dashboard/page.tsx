'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [departmentData, setDepartmentData] = useState<any>(null);

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
    
    // Fetch student and department data
    fetchStudentData(parsedUser.id);
  }, [router]);

  const fetchStudentData = async (userId: string) => {
    try {
      const response = await fetch(`/api/student/profile?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStudentData(data.student);
        setDepartmentData(data.department);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-full bg-white shadow-lg border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">PG</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Py-Gram</span>
          </div>
          
          <nav className="space-y-2">
            <a href="#" className="flex items-center space-x-3 px-3 py-2 bg-blue-600 text-white rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              <span>Dashboard</span>
            </a>
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-red-700 hover:bg-red-50 rounded-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 01-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'Student'}! 👋</h1>
                <p className="text-gray-600 mt-1">
                  Ready to explore your {departmentData?.name || 'Computer Science Engineering'} dashboard
                </p>
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Your Department</p>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {departmentData?.code || 'CSE'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2L3 9h4v9h6v-9h4l-7-7z"/>
                  </svg>
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd"/>
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-900">{user?.name || 'Student'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Department Information Card */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-8 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{departmentData?.name || 'Computer Science Engineering'}</h2>
                    <p className="text-blue-100">{departmentData?.description || 'Computer Science and Engineering Department'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 mb-2">
                    <span className="text-sm font-medium block">🔒 Isolated Workspace</span>
                    <span className="text-xs text-blue-100">{departmentData?.code || 'CSE'}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          My Courses
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          6 Active
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Today's Classes
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          4 Scheduled
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Attendance
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          85%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-sm rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h4a2 2 0 002-2V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Assignments
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          3 Pending
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Information Section */}
            <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Department Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
                  <p className="text-lg font-semibold text-gray-900">{departmentData?.name || 'Computer Science Engineering'}</p>
                  <p className="text-sm text-gray-600">{departmentData?.description || 'Computer Science and Engineering Department'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Head of Department</h4>
                  <p className="text-lg font-semibold text-gray-900">Dr. John Smith</p>
                  <p className="text-sm text-gray-600">cse@college.edu</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Statistics</h4>
                  <div className="flex space-x-4">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">45</p>
                      <p className="text-sm text-gray-600">Students</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">2</p>
                      <p className="text-sm text-gray-600">Faculty</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Events & Workshops */}
            <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Events & Workshops</h3>
                </div>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CSE Only</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">Important upcoming activities and events in Computer Science Engineering</p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded-full font-medium">Workshop</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">AI/ML Workshop - Machine Learning Fundamentals</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📅 2025-09-24</p>
                    <p>🕘 10:00 AM</p>
                    <p className="text-xs text-green-600 font-medium">Status: Upcoming</p>
                  </div>
                </div>

                <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded-full font-medium">Event</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Technical Symposium - Code Fest 2025</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📅 2025-09-27</p>
                    <p>🕘 9:00 AM</p>
                    <p className="text-xs text-green-600 font-medium">Status: Upcoming</p>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs text-purple-600 bg-purple-200 px-2 py-1 rounded-full font-medium">Seminar</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Industry Expert Seminar - Web Development Trends</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📅 2025-09-29</p>
                    <p>🕘 2:00 PM</p>
                    <p className="text-xs text-green-600 font-medium">Status: Upcoming</p>
                  </div>
                </div>

                <div className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h4a2 2 0 002-2V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs text-orange-600 bg-orange-200 px-2 py-1 rounded-full font-medium">Academic</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Final Year Project Review - Phase 1 Submissions</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>📅 2025-10-02</p>
                    <p>🕘 11:00 AM</p>
                    <p className="text-xs text-green-600 font-medium">Status: Upcoming</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Timetable */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Weekly Timetable</h3>
                </div>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CSE</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">Your weekly class schedule from Monday to Saturday</p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monday</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tuesday</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wednesday</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thursday</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Friday</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saturday</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">09:00 - 10:00</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-green-100 p-2 rounded text-sm">
                          <div className="font-medium text-green-800">Computer Networks</div>
                          <div className="text-green-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-green-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-blue-100 p-2 rounded text-sm">
                          <div className="font-medium text-blue-800">Operating Systems</div>
                          <div className="text-blue-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-blue-600 text-xs">📍 A101</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-purple-100 p-2 rounded text-sm">
                          <div className="font-medium text-purple-800">Algorithm Analysis</div>
                          <div className="text-purple-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-purple-600 text-xs">📍 B201</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-orange-100 p-2 rounded text-sm">
                          <div className="font-medium text-orange-800">Data Structures</div>
                          <div className="text-orange-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-orange-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-green-100 p-2 rounded text-sm">
                          <div className="font-medium text-green-800">Computer Networks</div>
                          <div className="text-green-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-green-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-orange-100 p-2 rounded text-sm">
                          <div className="font-medium text-orange-800">Data Structures</div>
                          <div className="text-orange-600 text-xs">👨‍🏫 Dr. Rajesh</div>
                          <div className="text-orange-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">10:00 - 11:00</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-blue-100 p-2 rounded text-sm">
                          <div className="font-medium text-blue-800">Operating Systems</div>
                          <div className="text-blue-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-blue-600 text-xs">📍 A101</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-orange-100 p-2 rounded text-sm">
                          <div className="font-medium text-orange-800">Data Structures</div>
                          <div className="text-orange-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-orange-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-cyan-100 p-2 rounded text-sm">
                          <div className="font-medium text-cyan-800">Web Development</div>
                          <div className="text-cyan-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-cyan-600 text-xs">📍 B202</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-purple-100 p-2 rounded text-sm">
                          <div className="font-medium text-purple-800">Algorithm Analysis</div>
                          <div className="text-purple-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-purple-600 text-xs">📍 B201</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-blue-100 p-2 rounded text-sm">
                          <div className="font-medium text-blue-800">Operating Systems</div>
                          <div className="text-blue-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-blue-600 text-xs">📍 A101</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-purple-100 p-2 rounded text-sm">
                          <div className="font-medium text-purple-800">Algorithm Analysis</div>
                          <div className="text-purple-600 text-xs">👨‍🏫 Prof. Priya</div>
                          <div className="text-purple-600 text-xs">📍 B201</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">11:00 - 12:00</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-orange-100 p-2 rounded text-sm">
                          <div className="font-medium text-orange-800">Data Structures</div>
                          <div className="text-orange-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-orange-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-purple-100 p-2 rounded text-sm">
                          <div className="font-medium text-purple-800">Algorithm Analysis</div>
                          <div className="text-purple-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-purple-600 text-xs">📍 B201</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-yellow-100 p-2 rounded text-sm">
                          <div className="font-medium text-yellow-800">Database Systems</div>
                          <div className="text-yellow-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-yellow-600 text-xs">📍 Lab-1</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-cyan-100 p-2 rounded text-sm">
                          <div className="font-medium text-cyan-800">Web Development</div>
                          <div className="text-cyan-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-cyan-600 text-xs">📍 B202</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-orange-100 p-2 rounded text-sm">
                          <div className="font-medium text-orange-800">Data Structures</div>
                          <div className="text-orange-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-orange-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-cyan-100 p-2 rounded text-sm">
                          <div className="font-medium text-cyan-800">Web Development</div>
                          <div className="text-cyan-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-cyan-600 text-xs">📍 B202</div>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-orange-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">12:00 - 01:00</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-orange-600 font-medium">LUNCH BREAK</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-orange-600 font-medium">LUNCH BREAK</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-orange-600 font-medium">LUNCH BREAK</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-orange-600 font-medium">LUNCH BREAK</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-orange-600 font-medium">LUNCH BREAK</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-orange-600 font-medium">LUNCH BREAK</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">01:00 - 02:00</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-cyan-100 p-2 rounded text-sm">
                          <div className="font-medium text-cyan-800">Web Development</div>
                          <div className="text-cyan-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-cyan-600 text-xs">📍 B202</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-yellow-100 p-2 rounded text-sm">
                          <div className="font-medium text-yellow-800">Database Systems</div>
                          <div className="text-yellow-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-yellow-600 text-xs">📍 Lab-1</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-indigo-100 p-2 rounded text-sm">
                          <div className="font-medium text-indigo-800">Software Engineering</div>
                          <div className="text-indigo-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-indigo-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-pink-100 p-2 rounded text-sm">
                          <div className="font-medium text-pink-800">AI/ML Lab</div>
                          <div className="text-pink-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-pink-600 text-xs">📍 Lab-2</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-cyan-100 p-2 rounded text-sm">
                          <div className="font-medium text-cyan-800">Web Development</div>
                          <div className="text-cyan-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-cyan-600 text-xs">📍 B202</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-pink-100 p-2 rounded text-sm">
                          <div className="font-medium text-pink-800">AI/ML Lab</div>
                          <div className="text-pink-600 text-xs">👨‍🏫 Dr. Rajesh</div>
                          <div className="text-pink-600 text-xs">📍 Lab-2</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">02:00 - 03:00</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-yellow-100 p-2 rounded text-sm">
                          <div className="font-medium text-yellow-800">Database Systems</div>
                          <div className="text-yellow-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-yellow-600 text-xs">📍 Lab-1</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-pink-100 p-2 rounded text-sm">
                          <div className="font-medium text-pink-800">AI/ML Lab</div>
                          <div className="text-pink-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-pink-600 text-xs">📍 Lab-2</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-green-100 p-2 rounded text-sm">
                          <div className="font-medium text-green-800">Computer Networks</div>
                          <div className="text-green-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-green-600 text-xs">📍 A101</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-indigo-100 p-2 rounded text-sm">
                          <div className="font-medium text-indigo-800">Software Engineering</div>
                          <div className="text-indigo-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-indigo-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-yellow-100 p-2 rounded text-sm">
                          <div className="font-medium text-yellow-800">Database Systems</div>
                          <div className="text-yellow-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-yellow-600 text-xs">📍 Lab-1</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-indigo-100 p-2 rounded text-sm">
                          <div className="font-medium text-indigo-800">Software Engineering</div>
                          <div className="text-indigo-600 text-xs">👨‍🏫 Prof. Priya</div>
                          <div className="text-indigo-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">03:00 - 04:00</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-pink-100 p-2 rounded text-sm">
                          <div className="font-medium text-pink-800">AI/ML Lab</div>
                          <div className="text-pink-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-pink-600 text-xs">📍 Lab-2</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-indigo-100 p-2 rounded text-sm">
                          <div className="font-medium text-indigo-800">Software Engineering</div>
                          <div className="text-indigo-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-indigo-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-blue-100 p-2 rounded text-sm">
                          <div className="font-medium text-blue-800">Operating Systems</div>
                          <div className="text-blue-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-blue-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-green-100 p-2 rounded text-sm">
                          <div className="font-medium text-green-800">Computer Networks</div>
                          <div className="text-green-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-green-600 text-xs">📍 A101</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-pink-100 p-2 rounded text-sm">
                          <div className="font-medium text-pink-800">AI/ML Lab</div>
                          <div className="text-pink-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-pink-600 text-xs">📍 Lab-2</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-green-100 p-2 rounded text-sm">
                          <div className="font-medium text-green-800">Computer Networks</div>
                          <div className="text-green-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-green-600 text-xs">📍 A101</div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">04:00 - 05:00</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-indigo-100 p-2 rounded text-sm">
                          <div className="font-medium text-indigo-800">Software Engineering</div>
                          <div className="text-indigo-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-indigo-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-green-100 p-2 rounded text-sm">
                          <div className="font-medium text-green-800">Computer Networks</div>
                          <div className="text-green-600 text-xs">👨‍🏫 Dr. Amit Patel</div>
                          <div className="text-green-600 text-xs">📍 A101</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-orange-100 p-2 rounded text-sm">
                          <div className="font-medium text-orange-800">Data Structures</div>
                          <div className="text-orange-600 text-xs">👨‍🏫 Dr. Rajesh Kumar</div>
                          <div className="text-orange-600 text-xs">📍 B201</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-blue-100 p-2 rounded text-sm">
                          <div className="font-medium text-blue-800">Operating Systems</div>
                          <div className="text-blue-600 text-xs">👨‍🏫 Prof. Sneha Gupta</div>
                          <div className="text-blue-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-indigo-100 p-2 rounded text-sm">
                          <div className="font-medium text-indigo-800">Software Engineering</div>
                          <div className="text-indigo-600 text-xs">👨‍🏫 Prof. Priya Sharma</div>
                          <div className="text-indigo-600 text-xs">📍 Lab-3</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="bg-blue-100 p-2 rounded text-sm">
                          <div className="font-medium text-blue-800">Operating Systems</div>
                          <div className="text-blue-600 text-xs">👨‍🏫 Prof. Sneha</div>
                          <div className="text-blue-600 text-xs">📍 A102</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}