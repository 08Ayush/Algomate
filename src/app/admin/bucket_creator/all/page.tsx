'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';
import { Header } from '@/components/Header';
import { ArrowLeft, Search, Filter, BookOpen, Users, Calendar, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Subject {
  id: string;
  code: string;
  name: string;
  credit_value: number;
  lecture_hours: number;
  tutorial_hours: number;
  practical_hours: number;
  nep_category: string;
}

interface BatchInfo {
  id: string;
  name: string;
  semester: number;
  college_id: string;
  academic_year: string;
  course_id?: string;
  department_id?: string;
  courses?: {
    id: string;
    title: string;
    code: string;
  };
  departments?: {
    id: string;
    name: string;
  };
}

interface Bucket {
  id: string;
  bucket_name: string;
  bucket_type: string;
  min_selection: number;
  max_selection: number;
  is_common_slot: boolean;
  batch_id: string;
  created_at: string;
  updated_at: string;
  batch_info: BatchInfo;
  subjects: Subject[];
}

interface User {
  id: string;
  role: string;
  college_id: string;
  first_name: string;
  last_name: string;
}

export default function AllBucketsPage() {
  const router = useRouter();
  const { showConfirm } = useConfirm();
  const [user, setUser] = useState<User | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [filteredBuckets, setFilteredBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  
  // Filters
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    filterBuckets();
  }, [buckets, searchQuery, selectedCourse, selectedSemester, selectedDepartment]);

  async function checkAuthAndFetchData() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login?message=Please login to access this page');
        return;
      }

      const parsedUser: User = JSON.parse(userData);

      if (parsedUser.role !== 'college_admin' && parsedUser.role !== 'admin') {
        router.push('/login?message=Access denied. Only College Admins can access this page');
        return;
      }

      setUser(parsedUser);
      await fetchAllBuckets(parsedUser);
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push('/login');
    }
  }

  async function fetchAllBuckets(currentUser: User) {
    try {
      setLoading(true);
      setError(null);

      const authToken = Buffer.from(JSON.stringify(currentUser)).toString('base64');
      
      // Use the new fetchAll=true parameter to get all buckets for the college
      const response = await fetch('/api/nep/buckets?fetchAll=true', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch buckets');
      }

      const data = await response.json();
      setBuckets(data);
      setFilteredBuckets(data);
    } catch (err) {
      console.error('Error fetching buckets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load buckets');
    } finally {
      setLoading(false);
    }
  }

  function filterBuckets() {
    let filtered = [...buckets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bucket => 
        bucket.bucket_name.toLowerCase().includes(query) ||
        bucket.batch_info?.name?.toLowerCase().includes(query) ||
        bucket.batch_info?.courses?.title?.toLowerCase().includes(query) ||
        bucket.subjects.some(s => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query))
      );
    }

    // Course filter
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(bucket => bucket.batch_info?.courses?.id === selectedCourse);
    }

    // Semester filter
    if (selectedSemester !== 'all') {
      filtered = filtered.filter(bucket => bucket.batch_info?.semester === parseInt(selectedSemester));
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(bucket => bucket.batch_info?.departments?.id === selectedDepartment);
    }

    setFilteredBuckets(filtered);
  }

  // Get unique values for filters
  const uniqueCourses = Array.from(new Set(buckets.map(b => b.batch_info?.courses?.id).filter(Boolean)));
  const uniqueSemesters = Array.from(new Set(buckets.map(b => b.batch_info?.semester).filter(Boolean))).sort((a, b) => (a || 0) - (b || 0));
  const uniqueDepartments = Array.from(new Set(buckets.map(b => b.batch_info?.departments?.id).filter(Boolean)));

  const toggleBucketExpand = (bucketId: string) => {
    setExpandedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(bucketId)) {
        next.delete(bucketId);
      } else {
        next.add(bucketId);
      }
      return next;
    });
  };

  async function handleDeleteBucket(bucketId: string, bucketName: string) {
    showConfirm({
      title: 'Delete Elective Bucket',
      message: `Are you sure you want to delete the bucket "${bucketName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const userData = localStorage.getItem('user');
          if (!userData) return;

          const authToken = Buffer.from(userData).toString('base64');
          const response = await fetch(`/api/nep/buckets/${bucketId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete bucket');
          }

          // Remove from local state
          setBuckets(prev => prev.filter(b => b.id !== bucketId));
          alert('Bucket deleted successfully!');
        } catch (error) {
          console.error('Error deleting bucket:', error);
          alert(`Failed to delete bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });
  }

  if (loading) {
    return <PageLoader message="Loading All Buckets" subMessage="Fetching elective bucket list..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button and Page Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back to Admin Dashboard</span>
            </button>
            
            <div className="bg-white border-b border-gray-200 shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">All Elective Buckets</h1>
                  <p className="text-gray-600 mt-1">
                    View and manage all elective buckets across your college
                  </p>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => router.push('/admin/bucket_creator')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    + Create New Bucket
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search buckets, subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Course Filter */}
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Filter buckets by course"
              >
                <option value="all">All Courses</option>
                {uniqueCourses.map(courseId => {
                  const bucket = buckets.find(b => b.batch_info?.courses?.id === courseId);
                  return (
                    <option key={courseId} value={courseId}>
                      {bucket?.batch_info?.courses?.title || courseId}
                    </option>
                  );
                })}
              </select>

              {/* Semester Filter */}
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Filter buckets by semester"
              >
                <option value="all">All Semesters</option>
                {uniqueSemesters.map(sem => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Filter buckets by department"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map(deptId => {
                  const bucket = buckets.find(b => b.batch_info?.departments?.id === deptId);
                  return (
                    <option key={deptId} value={deptId}>
                      {bucket?.batch_info?.departments?.name || deptId}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-500">Total Buckets</p>
                  <p className="text-2xl font-bold text-gray-900">{buckets.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-500">Total Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {buckets.reduce((sum, b) => sum + b.subjects.length, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-500">Common Slot Buckets</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {buckets.filter(b => b.is_common_slot).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <Filter className="w-8 h-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-500">Filtered Results</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredBuckets.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => user && fetchAllBuckets(user)}
                className="mt-2 text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          )}

          {/* Buckets List */}
          <div className="space-y-4">
            {filteredBuckets.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Buckets Found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || selectedCourse !== 'all' || selectedSemester !== 'all' || selectedDepartment !== 'all'
                    ? 'No buckets match your current filters.'
                    : 'No elective buckets have been created yet.'}
                </p>
                <button
                  onClick={() => router.push('/admin/bucket_creator')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Bucket
                </button>
              </div>
            ) : (
              filteredBuckets.map((bucket) => (
                <div 
                  key={bucket.id} 
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Bucket Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleBucketExpand(bucket.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">{bucket.bucket_name}</h3>
                          {bucket.is_common_slot && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                              Common Slot
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            {bucket.bucket_type || 'GENERAL'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                          <span className="bg-blue-50 px-2 py-0.5 rounded">
                            📚 {bucket.batch_info?.courses?.title || 'N/A'}
                          </span>
                          <span className="bg-green-50 px-2 py-0.5 rounded">
                            📅 Semester {bucket.batch_info?.semester}
                          </span>
                          <span className="bg-yellow-50 px-2 py-0.5 rounded">
                            🏢 {bucket.batch_info?.departments?.name || 'N/A'}
                          </span>
                          <span className="bg-purple-50 px-2 py-0.5 rounded">
                            📖 {bucket.subjects.length} subjects
                          </span>
                          <span className="bg-orange-50 px-2 py-0.5 rounded">
                            Selection: {bucket.min_selection}-{bucket.max_selection}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBucket(bucket.id, bucket.bucket_name);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Bucket"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {expandedBuckets.has(bucket.id) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content - Subjects List */}
                  {expandedBuckets.has(bucket.id) && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {bucket.subjects.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No subjects in this bucket yet</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {bucket.subjects.map((subject) => (
                            <div 
                              key={subject.id}
                              className="bg-white border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">{subject.name}</p>
                                  <p className="text-xs text-gray-500">{subject.code}</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {subject.credit_value} credits
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                L: {subject.lecture_hours} | T: {subject.tutorial_hours} | P: {subject.practical_hours}
                              </div>
                              {subject.nep_category && (
                                <span className="inline-block mt-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                  {subject.nep_category}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

