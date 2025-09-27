'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'admin') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Academic Compass Management Portal</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Users
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        1,240
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🏫</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Departments
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        12
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📚</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Courses
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        156
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Timetables
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        45
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Management Tools */}
          <div className="mb-8">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Management Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="bg-white border border-gray-200 hover:border-blue-300 p-6 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">👤</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">User Management</h4>
                    <p className="text-sm text-gray-500">Manage students, faculty, and admins</p>
                  </div>
                </div>
              </button>

              <button className="bg-white border border-gray-200 hover:border-green-300 p-6 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">🏫</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Departments</h4>
                    <p className="text-sm text-gray-500">Configure academic departments</p>
                  </div>
                </div>
              </button>

              <button className="bg-white border border-gray-200 hover:border-purple-300 p-6 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">📚</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Course Management</h4>
                    <p className="text-sm text-gray-500">Add and manage subjects</p>
                  </div>
                </div>
              </button>

              <button className="bg-white border border-gray-200 hover:border-orange-300 p-6 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-lg">🏛️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Classrooms</h4>
                    <p className="text-sm text-gray-500">Manage classroom resources</p>
                  </div>
                </div>
              </button>

              <button className="bg-white border border-gray-200 hover:border-red-300 p-6 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-lg">📅</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Timetable System</h4>
                    <p className="text-sm text-gray-500">Configure scheduling parameters</p>
                  </div>
                </div>
              </button>

              <button className="bg-white border border-gray-200 hover:border-indigo-300 p-6 rounded-lg text-left transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 text-lg">📊</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Reports & Analytics</h4>
                    <p className="text-sm text-gray-500">System usage and performance</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent System Activity
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Latest user registrations and system changes.
                </p>
              </div>
              <ul className="border-t border-gray-200 divide-y divide-gray-200">
                <li className="px-4 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✅</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        New faculty member registered: Dr. Sarah Johnson
                      </p>
                      <p className="text-sm text-gray-500">
                        Computer Science Department • 5 minutes ago
                      </p>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">👥</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Bulk student registration completed
                      </p>
                      <p className="text-sm text-gray-500">
                        45 new students • Information Technology • 1 hour ago
                      </p>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 text-sm">📅</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Timetable published for Fall 2025
                      </p>
                      <p className="text-sm text-gray-500">
                        CSE 3rd Semester • 2 hours ago
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}