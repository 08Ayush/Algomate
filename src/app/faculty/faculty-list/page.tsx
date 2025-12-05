'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Users, Search, Plus, Mail, Phone } from 'lucide-react';

interface User {
  role: string;
  faculty_type: string;
  department_id: string;
  department_code?: string;
  department_name?: string;
}

export default function FacultyListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [search, setSearch] = useState('');

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
      const facultyType = parsedUser.faculty_type;
      if (facultyType !== 'creator' && facultyType !== 'publisher') {
        router.push('/student/dashboard');
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

  // Fetch faculty list across all departments (creator/publisher can view all)
  useEffect(() => {
    async function fetchFaculty() {
      try {
        // Only fetch after user is loaded
        if (!user) return;
        
        // Use admin API for cross-department access
        const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
        const response = await fetch('/api/admin/faculty', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('API Result:', result);
        
        if (result.faculty && Array.isArray(result.faculty)) {
          console.log(`Found ${result.faculty.length} faculty members`);
          setFacultyList(result.faculty);
        } else {
          console.error('Failed to fetch faculty or no data:', result);
          setFacultyList([]);
        }
      } catch (error) {
        console.error('Error fetching faculty:', error);
        setFacultyList([]);
      }
    }
    fetchFaculty();
  }, [user]);

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
        <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Faculty Directory</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  All Departments - Faculty Members {facultyList.length > 0 && `(${facultyList.length})`}
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search faculty by name, email..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Faculty Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facultyList
                .filter(faculty => {
                  const q = search.toLowerCase();
                  return (
                    faculty.first_name.toLowerCase().includes(q) ||
                    faculty.last_name.toLowerCase().includes(q) ||
                    faculty.email.toLowerCase().includes(q)
                  );
                })
                .map(faculty => (
                  <div key={faculty.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {faculty.first_name[0]}{faculty.last_name[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{faculty.title ? faculty.title + ' ' : ''}{faculty.first_name} {faculty.last_name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {faculty.departments?.name || 'No Department Assigned'}
                          {faculty.faculty_type && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {faculty.faculty_type.charAt(0).toUpperCase() + faculty.faculty_type.slice(1)}
                            </span>
                          )}
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4 mr-2" />
                            {faculty.email}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4 mr-2" />
                            {faculty.phone || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {facultyList.length === 0 && (
                <div className="col-span-3 text-center text-gray-500 dark:text-gray-400 py-12">
                  No faculty found for your department.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
