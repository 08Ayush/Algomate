'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Users, Plus, Search, Trash2, Clock, Calendar } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  semester: number;
  academic_year: string;
  section: string;
  division?: string;
  expected_strength: number;
  actual_strength: number;
  max_hours_per_day: number;
  preferred_start_time: string;
  preferred_end_time: string;
  department_name: string;
  department_code: string;
  coordinator_name?: string;
  coordinator_email?: string;
}

export default function BatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [statistics, setStatistics] = useState({
    totalBatches: 0,
    totalStudents: 0,
    semesterGroups: {}
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBatch, setNewBatch] = useState({
    name: '',
    semester: 1,
    academic_year: '2025-26',
    section: 'A',
    division: '',
    expected_strength: 60,
    actual_strength: 60
  });

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

  // Fetch batches
  const fetchBatches = async () => {
    try {
      if (!user || !user.department_id) return;
      
      console.log('Fetching batches for department:', user.department_id);
      const response = await fetch(`/api/batches?department_id=${user.department_id}`);
      
      const result = await response.json();
      console.log('Batches API Result:', result);
      
      if (result.success) {
        setBatches(result.data || []);
        setStatistics(result.statistics || {
          totalBatches: 0,
          totalStudents: 0,
          semesterGroups: {}
        });
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [user]);

  // Handle add batch
  const handleAddBatch = async () => {
    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBatch,
          department_code: 'CSE'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Batch added successfully!');
        setShowAddModal(false);
        setNewBatch({
          name: '',
          semester: 1,
          academic_year: '2025-26',
          section: 'A',
          division: '',
          expected_strength: 60,
          actual_strength: 60
        });
        fetchBatches();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding batch:', error);
      alert('Failed to add batch');
    }
  };

  // Handle delete batch
  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`Are you sure you want to delete batch "${batchName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/batches?id=${batchId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Batch deleted successfully!');
        fetchBatches();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch');
    }
  };

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

  // Filter batches
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = searchQuery === '' ||
      batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.semester.toString().includes(searchQuery);
    
    return matchesSearch;
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Student Batches</h1>
                <p className="text-gray-600 dark:text-gray-300">Computer Science Engineering Department</p>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Batch
              </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Batches</h3>
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalBatches}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active batches</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</h3>
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalStudents}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enrolled students</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Academic Year</h3>
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">2025-26</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current session</p>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search batches by name, semester, or section..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Batches Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                All Batches
              </h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {filteredBatches.length} batches
              </span>
            </div>

            {/* Batches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No batches found</p>
                </div>
              ) : (
                filteredBatches.map((batch) => (
                  <div key={batch.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{batch.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Semester {batch.semester} - Section {batch.section}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBatch(batch.id, batch.name)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Students</span>
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <Users className="w-4 h-4 mr-1" />
                          <span className="font-medium">{batch.actual_strength}/{batch.expected_strength}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Academic Year</span>
                        <span className="font-medium text-gray-900 dark:text-white">{batch.academic_year}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Hours/Day</span>
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="font-medium">{batch.max_hours_per_day}</span>
                        </div>
                      </div>

                      {batch.coordinator_name && (
                        <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Class Coordinator:</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{batch.coordinator_name}</p>
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

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Batch</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={newBatch.name}
                  onChange={(e) => setNewBatch({...newBatch, name: e.target.value})}
                  placeholder="e.g., CSE-5A"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester
                  </label>
                  <select
                    value={newBatch.semester}
                    onChange={(e) => setNewBatch({...newBatch, semester: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <option key={sem} value={sem}>Sem {sem}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newBatch.section}
                    onChange={(e) => setNewBatch({...newBatch, section: e.target.value})}
                    placeholder="A"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={newBatch.academic_year}
                  onChange={(e) => setNewBatch({...newBatch, academic_year: e.target.value})}
                  placeholder="2025-26"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expected Strength
                  </label>
                  <input
                    type="number"
                    value={newBatch.expected_strength}
                    onChange={(e) => setNewBatch({...newBatch, expected_strength: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Actual Strength
                  </label>
                  <input
                    type="number"
                    value={newBatch.actual_strength}
                    onChange={(e) => setNewBatch({...newBatch, actual_strength: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBatch}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
