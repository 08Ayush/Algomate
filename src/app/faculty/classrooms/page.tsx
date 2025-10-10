'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { MapPin, Search, Users, MonitorPlay, Wind, Computer, FlaskConical } from 'lucide-react';

interface Classroom {
  id: string;
  name: string;
  building: string;
  floor_number: number;
  capacity: number;
  type: string;
  has_projector: boolean;
  has_ac: boolean;
  has_computers: boolean;
  has_lab_equipment: boolean;
  is_smart_classroom: boolean;
  facilities: string[];
  location_notes?: string;
  department_name: string;
  department_code: string;
}

export default function ClassroomsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [statistics, setStatistics] = useState({
    totalClassrooms: 0,
    lectureHalls: 0,
    labs: 0,
    smartClassrooms: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

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

  // Fetch classrooms
  useEffect(() => {
    async function fetchClassrooms() {
      try {
        if (!user) return;
        
        console.log('Fetching classrooms for CSE department...');
        const departmentCode = 'CSE';
        const response = await fetch(`/api/classrooms?department_code=${departmentCode}`);
        
        const result = await response.json();
        console.log('Classrooms API Result:', result);
        
        if (result.success) {
          setClassrooms(result.data || []);
          setStatistics(result.statistics || {
            totalClassrooms: 0,
            lectureHalls: 0,
            labs: 0,
            smartClassrooms: 0
          });
        }
      } catch (error) {
        console.error('Error fetching classrooms:', error);
      }
    }
    fetchClassrooms();
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

  // Filter classrooms
  const filteredClassrooms = classrooms.filter(classroom => {
    const matchesType = selectedType === 'all' || classroom.type === selectedType;
    const matchesSearch = searchQuery === '' ||
      classroom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classroom.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classroom.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });

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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Classrooms & Venues</h1>
                <p className="text-gray-600 dark:text-gray-300">Computer Science Engineering Department</p>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Classrooms</h3>
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalClassrooms}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Available rooms</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Lecture Halls</h3>
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.lectureHalls}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Theory rooms</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Lab Rooms</h3>
                  <FlaskConical className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.labs}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Practical labs</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Smart Classrooms</h3>
                  <MonitorPlay className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.smartClassrooms}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tech-enabled</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search classrooms by name, building, or type..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="Lecture Hall">Lecture Hall</option>
                  <option value="Lab">Lab</option>
                  <option value="Seminar Room">Seminar Room</option>
                  <option value="Tutorial Room">Tutorial Room</option>
                  <option value="Auditorium">Auditorium</option>
                </select>
              </div>
            </div>

            {/* Classrooms Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                All Classrooms
              </h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {filteredClassrooms.length} classrooms
              </span>
            </div>

            {/* Classrooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClassrooms.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No classrooms found</p>
                </div>
              ) : (
                filteredClassrooms.map((classroom) => (
                  <div key={classroom.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{classroom.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {classroom.building && `${classroom.building} - `}Floor {classroom.floor_number}
                        </p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        classroom.type === 'Lab'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {classroom.type}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Capacity</span>
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <Users className="w-4 h-4 mr-1" />
                          <span className="font-medium">{classroom.capacity}</span>
                        </div>
                      </div>

                      {/* Facilities */}
                      <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Facilities:</p>
                        <div className="flex flex-wrap gap-2">
                          {classroom.has_projector && (
                            <div className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                              <MonitorPlay className="w-3 h-3 mr-1" />
                              Projector
                            </div>
                          )}
                          {classroom.has_ac && (
                            <div className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                              <Wind className="w-3 h-3 mr-1" />
                              AC
                            </div>
                          )}
                          {classroom.has_computers && (
                            <div className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                              <Computer className="w-3 h-3 mr-1" />
                              Computers
                            </div>
                          )}
                          {classroom.has_lab_equipment && (
                            <div className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                              <FlaskConical className="w-3 h-3 mr-1" />
                              Lab Equipment
                            </div>
                          )}
                          {classroom.is_smart_classroom && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
                              Smart
                            </span>
                          )}
                        </div>
                      </div>

                      {classroom.location_notes && (
                        <div className="pt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{classroom.location_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
