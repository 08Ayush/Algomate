'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';

interface User {
  role: string;
  faculty_type?: string;
}

export default function FacultyDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'faculty') {
        router.push('/login');
        return;
      }
      
      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  // Check if user is a publisher
  const isPublisher = user?.faculty_type === 'publisher';
  const isCreator = user?.faculty_type === 'creator';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 p-8 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        {/* Hero Section with Gradient Background */}
        <div className="mb-10 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-3xl p-10 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110 hover:rotate-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl font-extrabold text-blue-600 dark:text-blue-400 mb-3 tracking-tight">
            Welcome to Academic Compass
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl leading-relaxed">
            {isPublisher 
              ? 'Review and publish timetables. Ensure quality and approve schedules for distribution.'
              : 'Revolutionary Automated timetable generation with stylish interface. Create, review, and publish optimized schedules through intelligent workflows.'}
          </p>
          
          <div className="flex flex-wrap gap-3">
            {isCreator && (
              <>
                <button 
                  onClick={() => router.push('/faculty/ai-timetable-creator')}
                  className="group bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                  </svg>
                  <span>Create with AI Assistant</span>
                </button>
                
                <button 
                  onClick={() => router.push('/faculty/hybrid-scheduler')}
                  className="group bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
                  </svg>
                  <span>Advanced Hybrid Scheduler</span>
                </button>
              </>
            )}
            
            {isPublisher && (
              <button 
                onClick={() => router.push('/faculty/review-queue')}
                className="group bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <span>Review Queue</span>
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">2</span>
              </button>
            )}
            
            <button 
              onClick={() => router.push('/faculty/timetables')}
              className="group bg-white text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center space-x-2 shadow-md hover:shadow-lg border border-gray-200 transform hover:scale-105 hover:-translate-y-1"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              <span>View Timetables</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - Updated with modern design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Active Timetables */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">8</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Timetables</div>
            </div>
          </div>

          {/* Quality Score */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">94%</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score</div>
            </div>
          </div>

          {/* Faculty Members */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">15</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Faculty Members</div>
            </div>
          </div>

          {/* Avg. Generation Time */}
          <div className="group bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-2xl border border-gray-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">5.2s</div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Generation Time</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Recent Timetables */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-xl border border-gray-100 dark:border-slate-700 transition-all duration-300">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Recent Timetables</h3>
            <div className="space-y-4">
              <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] cursor-pointer">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Computer Science - Semester 3</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Generated 2 hours ago</div>
                </div>
                <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Active
                </span>
              </div>
              
              <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] cursor-pointer">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Data Science - Semester 1</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Generated 1 day ago</div>
                </div>
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Published
                </span>
              </div>
              
              <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] cursor-pointer">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Information Technology - Semester 2</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Generated 3 days ago</div>
                </div>
                <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Draft
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-xl border border-gray-100 dark:border-slate-700 transition-all duration-300">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Statistics</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Total Classes Scheduled</span>
                <span className="font-bold text-gray-900 dark:text-white text-xl">247</span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Conflict Resolution Rate</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-xl">98.5%</span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Room Utilization</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-xl">87%</span>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 cursor-pointer group">
                <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Faculty Satisfaction</span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-xl">4.8/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - Enhanced Design */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-md hover:shadow-xl border border-gray-100 dark:border-slate-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
            <button className="group text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 transform hover:scale-105">
              View All →
            </button>
          </div>
          
          <div className="space-y-5">
            <div className="group flex items-start space-x-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                  <span className="font-bold text-green-600 dark:text-green-400">Computer Science Semester 3</span> timetable was successfully generated and published
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 hours ago</p>
              </div>
            </div>
            
            <div className="group flex items-start space-x-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Prof. Sarah Johnson</span> requested schedule modification for Data Science course
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">5 hours ago</p>
              </div>
            </div>
            
            <div className="group flex items-start space-x-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-300 cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                  AI optimization completed for <span className="font-bold text-purple-600 dark:text-purple-400">Information Technology Semester 2</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </>
  );
}