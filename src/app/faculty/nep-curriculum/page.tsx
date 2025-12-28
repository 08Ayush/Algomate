'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { 
  ArrowLeft, BookOpen, Plus, Minus, RefreshCw, CheckCircle, 
  AlertCircle, Info, ChevronDown, ChevronUp, Layers, GraduationCap,
  Building2, Calendar
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
// Note: Most operations now use API routes to bypass RLS

interface User {
  id: string;
  role: string;
  faculty_type: string;
  college_id: string;
  department_id: string;
  first_name: string;
  last_name: string;
}

interface Course {
  id: string;
  title: string;
  code: string;
  nature_of_course?: string;
  intake: number;
  duration_years?: number;
  college_id: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  credits_per_week: number;
  semester?: number;
  subject_type: string;
  nep_category?: string;
  course_group_id?: string | null;
}

interface Bucket {
  id: string;
  bucket_name: string;
  is_common_slot: boolean;
  min_selection: number;
  max_selection: number;
  batch_id: string;
  created_at?: string;
  batches?: {
    id: string;
    name: string;
    semester: number;
    section: string;
    academic_year: string;
    course_id?: string;
    department_id?: string;
    is_active?: boolean;
    courses?: {
      id: string;
      title: string;
      code: string;
    } | null;
    departments?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
  subjects?: Subject[];
}

export default function NEPCurriculumPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userDepartment, setUserDepartment] = useState<Department | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [allBuckets, setAllBuckets] = useState<Bucket[]>([]); // All buckets from API
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [savingBucket, setSavingBucket] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Note: supabase client kept for potential direct queries, but API routes used for main operations
  // to bypass RLS restrictions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createClient();

  // Get semesters based on selected course
  const getAvailableSemesters = useCallback(() => {
    const selectedCourseObj = courses.find(c => c.id === selectedCourse);
    const duration = selectedCourseObj?.duration_years || 4;
    const totalSemesters = duration * 2;
    return Array.from({ length: totalSemesters }, (_, i) => i + 1);
  }, [courses, selectedCourse]);

  const semesters = getAvailableSemesters();

  // Fetch courses for the college using API route (bypasses RLS)
  const fetchCourses = useCallback(async (collegeId: string, userId: string) => {
    if (!collegeId) {
      console.error('No college ID provided');
      setDebugInfo(prev => prev + `\nNo college_id in user data`);
      return;
    }
    
    try {
      console.log('Fetching courses via API for college:', collegeId);
      setDebugInfo(prev => prev + `\nFetching courses via API...`);
      
      // Create auth token from user data
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';
      
      const response = await fetch(`/api/admin/courses?college_id=${collegeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        setDebugInfo(prev => prev + `\nAPI Error: ${errorData.error || response.statusText}`);
        return;
      }
      
      const { courses: data } = await response.json();
      console.log('Courses fetched via API:', data);
      setDebugInfo(prev => prev + `\nCourses found: ${data?.length || 0}`);

      if (data && data.length > 0) {
        const coursesData = data as Course[];
        setCourses(coursesData);
        setSelectedCourse(coursesData[0].id);
        setDebugInfo(prev => prev + `\nFirst course: ${coursesData[0].title}`);
      } else {
        setDebugInfo(prev => prev + `\nNo courses found for college`);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setDebugInfo(prev => prev + `\nCatch error: ${error}`);
    }
  }, []);

  // Fetch user's department info using API route (bypasses RLS)
  const fetchUserDepartment = useCallback(async (departmentId: string, collegeId: string) => {
    if (!departmentId) {
      console.error('No department ID provided');
      setDebugInfo(prev => prev + `\nNo department_id in user data`);
      return;
    }
    
    try {
      console.log('Fetching department via API:', departmentId);
      setDebugInfo(prev => prev + `\nFetching department via API...`);
      
      // Create auth token from user data
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';
      
      const response = await fetch(`/api/admin/departments?college_id=${collegeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        setDebugInfo(prev => prev + `\nDepartment API Error: ${errorData.error || response.statusText}`);
        return;
      }
      
      const { departments } = await response.json();
      console.log('Departments fetched:', departments);
      
      // Find the user's department from the list
      const deptData = departments?.find((d: Department) => d.id === departmentId);
      
      if (deptData) {
        console.log('User department found:', deptData);
        setUserDepartment(deptData);
        setDebugInfo(prev => prev + `\nDepartment: ${deptData.name} (${deptData.code})`);
      } else {
        setDebugInfo(prev => prev + `\nNo department found for ID: ${departmentId}`);
      }
    } catch (error) {
      console.error('Error fetching department:', error);
      setDebugInfo(prev => prev + `\nDepartment catch error: ${error}`);
    }
  }, []);

  // Fetch all buckets and subjects using API routes (bypasses RLS)
  const fetchBucketsAndSubjects = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    setDebugInfo('');
    
    try {
      console.log('Fetching buckets via API for department:', { 
        college: user.college_id, 
        department: user.department_id
      });
      setDebugInfo(prev => prev + `\nFetching buckets via API...`);

      // Create auth token from user data
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';

      // Fetch buckets via API - use courseId and semester for filtering
      const bucketParams = new URLSearchParams();
      if (selectedCourse) bucketParams.set('courseId', selectedCourse);
      if (selectedSemester) bucketParams.set('semester', selectedSemester.toString());
      bucketParams.set('departmentId', user.department_id);
      
      const bucketsResponse = await fetch(`/api/nep/buckets?${bucketParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!bucketsResponse.ok) {
        const errorData = await bucketsResponse.json();
        console.error('Buckets API error:', errorData);
        setDebugInfo(prev => prev + `\nBuckets API Error: ${errorData.error || bucketsResponse.statusText}`);
        setRefreshing(false);
        return;
      }

      const bucketsData = await bucketsResponse.json();
      console.log('Buckets fetched via API:', bucketsData);
      setDebugInfo(prev => prev + `\nBuckets found: ${bucketsData?.length || 0}`);

      // Map API response to our Bucket format
      const mappedBuckets: Bucket[] = (bucketsData || []).map((b: any) => ({
        id: b.id,
        bucket_name: b.bucket_name,
        is_common_slot: b.is_common_slot,
        min_selection: b.min_selection,
        max_selection: b.max_selection,
        batch_id: b.batch_id,
        created_at: b.created_at,
        batches: b.batch_info || b.batches,
        subjects: b.subjects || []
      }));

      setAllBuckets(mappedBuckets);
      setBuckets(mappedBuckets);

      // Fetch available subjects from user's department via API
      const subjectsResponse = await fetch(`/api/admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!subjectsResponse.ok) {
        const errorData = await subjectsResponse.json();
        console.error('Subjects API error:', errorData);
        setDebugInfo(prev => prev + `\nSubjects API Error: ${errorData.error || subjectsResponse.statusText}`);
      } else {
        const { subjects: allSubjects } = await subjectsResponse.json();
        console.log('Subjects fetched via API:', allSubjects?.length);
        
        // Filter to only show subjects not assigned to any bucket
        let availableSubjects = (allSubjects || []).filter((s: Subject) => !s.course_group_id);
        
        // Optionally filter by semester
        if (selectedSemester && availableSubjects.length > 0) {
          availableSubjects = availableSubjects.filter((s: Subject) => s.semester === selectedSemester);
        }
        
        setAvailableSubjects(availableSubjects);
        setDebugInfo(prev => prev + `\nAvailable subjects: ${availableSubjects.length}`);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setDebugInfo(prev => prev + `\nError: ${error}`);
    } finally {
      setRefreshing(false);
    }
  }, [user, selectedCourse, selectedSemester]);

  // Check auth and role on mount
  useEffect(() => {
    async function checkAuthAndRole() {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          router.push('/login?message=Please login to access this page');
          return;
        }

        const parsedUser: User = JSON.parse(userData);
        console.log('Parsed user from localStorage:', parsedUser);
        console.log('college_id:', parsedUser.college_id);
        console.log('department_id:', parsedUser.department_id);
        
        setDebugInfo(`User: ${parsedUser.first_name} (${parsedUser.role}/${parsedUser.faculty_type})\ncollege_id: ${parsedUser.college_id}\ndepartment_id: ${parsedUser.department_id}`);

        // Allow creator faculty
        if (parsedUser.role !== 'faculty' || parsedUser.faculty_type !== 'creator') {
          router.push('/login?message=Access denied. Only Creator Faculty can access this page');
          return;
        }

        if (!parsedUser.department_id) {
          setError('No department assigned to your account. Please contact admin.');
          setLoading(false);
          return;
        }
        
        if (!parsedUser.college_id) {
          setError('No college assigned to your account. Please contact admin.');
          setLoading(false);
          return;
        }

        setUser(parsedUser);
        
        // Fetch courses and department in parallel
        console.log('Starting parallel fetch for courses and department...');
        await Promise.all([
          fetchCourses(parsedUser.college_id, parsedUser.id),
          fetchUserDepartment(parsedUser.department_id, parsedUser.college_id)
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/login');
      }
    }
    
    checkAuthAndRole();
  }, [router, fetchCourses, fetchUserDepartment]);

  // Fetch data when course/semester changes
  useEffect(() => {
    if (user && selectedCourse && selectedSemester) {
      fetchBucketsAndSubjects();
    }
  }, [user, selectedCourse, selectedSemester, fetchBucketsAndSubjects]);

  // Add subject to bucket (using API route)
  async function addSubjectToBucket(bucketId: string, subjectId: string) {
    setSavingBucket(bucketId);
    try {
      // Create auth token from user data
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';
      
      const response = await fetch(`/api/nep/buckets/${bucketId}/subjects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subjectIds: [subjectId] })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add subject');
      }

      // Update local state
      const subject = availableSubjects.find(s => s.id === subjectId);
      if (subject) {
        setAvailableSubjects(prev => prev.filter(s => s.id !== subjectId));
        setBuckets(prev => prev.map(b => 
          b.id === bucketId 
            ? { ...b, subjects: [...(b.subjects || []), { ...subject, course_group_id: bucketId }] }
            : b
        ));
      }

      setSuccessMessage('Subject added to bucket successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error adding subject:', err);
      setError(err.message || 'Failed to add subject to bucket');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingBucket(null);
    }
  }

  // Remove subject from bucket (using API route)
  async function removeSubjectFromBucket(bucketId: string, subjectId: string) {
    setSavingBucket(bucketId);
    try {
      // Create auth token from user data
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';
      
      const response = await fetch(`/api/nep/buckets/${bucketId}/subjects?subjectId=${subjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove subject');
      }

      // Update local state
      const bucket = buckets.find(b => b.id === bucketId);
      const subject = bucket?.subjects?.find(s => s.id === subjectId);
      
      if (subject) {
        setBuckets(prev => prev.map(b => 
          b.id === bucketId 
            ? { ...b, subjects: (b.subjects || []).filter(s => s.id !== subjectId) }
            : b
        ));
        setAvailableSubjects(prev => [...prev, { ...subject, course_group_id: null }]);
      }

      setSuccessMessage('Subject removed from bucket');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error removing subject:', err);
      setError(err.message || 'Failed to remove subject');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingBucket(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading NEP Subject Assignment...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/faculty/dashboard')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Faculty Dashboard</span>
          </button>

          {/* Page Header */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">NEP 2020 Subject Assignment</h1>
                </div>
                <p className="text-gray-600 text-lg">
                  Add subjects from your department to elective buckets created by Admin
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-bold text-gray-900 text-lg">{user.first_name} {user.last_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                    Creator Faculty
                  </span>
                  {userDepartment && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                      {userDepartment.code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 shadow-sm animate-fade-in">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-green-800 font-medium">{successMessage}</span>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          )}

          {/* Filters Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Course Selector */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Select Course / Program
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setSelectedSemester(1);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-colors"
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.code})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the program for which you want to assign subjects
                </p>
              </div>

              {/* Department Display */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Your Department
                </label>
                <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-700">
                  {userDepartment ? (
                    <span className="font-medium">{userDepartment.name} ({userDepartment.code})</span>
                  ) : (
                    <span className="text-gray-500">Loading department...</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You can only add subjects from your department
                </p>
              </div>

              {/* Semester Selector */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  Select Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-colors"
                >
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  View buckets and subjects for this semester
                </p>
              </div>
            </div>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Available Subjects */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Available Subjects</h2>
                  </div>
                  <button
                    onClick={fetchBucketsAndSubjects}
                    disabled={refreshing}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                  📚 Subjects from <strong>{userDepartment?.code || 'your dept'}</strong> not yet assigned to any bucket
                </p>
                
                <div className="max-h-[500px] overflow-y-auto space-y-3">
                  {availableSubjects.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <BookOpen className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 font-medium">No available subjects</p>
                      <p className="text-xs text-gray-400 mt-1">
                        All subjects are assigned or none exist for this semester
                      </p>
                    </div>
                  ) : (
                    availableSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{subject.name}</p>
                            <p className="text-sm text-gray-500 mt-1">{subject.code}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                {subject.credits_per_week} hrs/wk
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {subject.subject_type}
                              </span>
                              {subject.nep_category && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  {subject.nep_category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subject Count */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-blue-600">{availableSubjects.length}</span> subjects available to assign
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Buckets */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Layers className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Elective Buckets</h2>
                  </div>
                  <span className="text-xs text-gray-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <span>📌</span> Created by Admin • Click to expand
                  </span>
                </div>

                {buckets.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-white">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Info className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Buckets Available</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-4">
                      No elective buckets have been created by the Admin for this course and semester combination.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-sm mx-auto">
                      <p className="text-sm text-blue-700">
                        💡 Please contact your <strong>College Admin</strong> to create buckets first.
                      </p>
                    </div>
                    
                    {/* Debug Info for Development */}
                    {debugInfo && (
                      <details className="mt-6 text-left max-w-md mx-auto">
                        <summary className="text-xs text-gray-400 cursor-pointer">Debug Info</summary>
                        <pre className="text-xs text-gray-500 bg-gray-100 p-2 rounded mt-2 whitespace-pre-wrap">
                          {debugInfo}
                        </pre>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {buckets.map((bucket) => (
                      <div
                        key={bucket.id}
                        className={`border-2 rounded-2xl overflow-hidden transition-all ${
                          expandedBucket === bucket.id 
                            ? 'border-blue-400 shadow-lg shadow-blue-100' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        {/* Bucket Header */}
                        <div
                          className={`p-5 cursor-pointer transition-colors ${
                            expandedBucket === bucket.id 
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          onClick={() => setExpandedBucket(expandedBucket === bucket.id ? null : bucket.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{bucket.bucket_name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  📦 {bucket.batches?.name}
                                </span>
                                <span>•</span>
                                <span>Sem {bucket.batches?.semester}</span>
                                <span>•</span>
                                <span className="text-indigo-600 font-semibold">
                                  {bucket.subjects?.length || 0} subjects assigned
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {bucket.is_common_slot && (
                                <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                                  ⏰ Common Slot
                                </span>
                              )}
                              <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                                {bucket.min_selection}-{bucket.max_selection} selection
                              </span>
                              <div className={`p-2 rounded-full transition-colors ${
                                expandedBucket === bucket.id ? 'bg-blue-100' : 'bg-gray-200'
                              }`}>
                                {expandedBucket === bucket.id ? (
                                  <ChevronUp className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedBucket === bucket.id && (
                          <div className="p-5 border-t border-gray-200 bg-white">
                            {/* Current Subjects in Bucket */}
                            <div className="mb-6">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                  ✓ In Bucket
                                </span>
                                Subjects assigned ({bucket.subjects?.length || 0})
                              </h4>
                              {(!bucket.subjects || bucket.subjects.length === 0) ? (
                                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                  <p className="text-gray-400 italic">No subjects assigned yet</p>
                                  <p className="text-xs text-gray-400 mt-1">Add subjects from the list below</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {bucket.subjects.map((subject) => (
                                    <div
                                      key={subject.id}
                                      className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4"
                                    >
                                      <div>
                                        <p className="font-semibold text-gray-900">{subject.name}</p>
                                        <p className="text-sm text-gray-500">
                                          {subject.code} • {subject.credits_per_week} hrs/wk • {subject.subject_type}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeSubjectFromBucket(bucket.id, subject.id);
                                        }}
                                        disabled={savingBucket === bucket.id}
                                        className="p-3 text-red-600 hover:text-white hover:bg-red-500 rounded-xl transition-all disabled:opacity-50 border border-red-200 hover:border-red-500"
                                        title="Remove from bucket"
                                      >
                                        <Minus className="w-5 h-5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Add Subjects Section */}
                            <div className="pt-6 border-t border-gray-200">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                  + Available
                                </span>
                                Add subjects to this bucket
                              </h4>
                              {availableSubjects.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                  <p className="text-gray-400 italic">No subjects available to add</p>
                                  <p className="text-xs text-gray-400 mt-1">All your department&apos;s subjects are assigned</p>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                  {availableSubjects.map((subject) => (
                                    <div
                                      key={subject.id}
                                      className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
                                    >
                                      <div>
                                        <p className="font-semibold text-gray-900">{subject.name}</p>
                                        <p className="text-sm text-gray-500">
                                          {subject.code} • {subject.credits_per_week} hrs/wk • {subject.subject_type}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addSubjectToBucket(bucket.id, subject.id);
                                        }}
                                        disabled={savingBucket === bucket.id}
                                        className="p-3 text-green-600 hover:text-white hover:bg-green-500 rounded-xl transition-all disabled:opacity-50 border border-green-200 hover:border-green-500"
                                        title="Add to bucket"
                                      >
                                        <Plus className="w-5 h-5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Debug Info */}
                {debugInfo && buckets.length === 0 && (
                  <details className="mt-4 text-left">
                    <summary className="text-xs text-gray-400 cursor-pointer">Show Debug Info</summary>
                    <pre className="text-xs text-gray-500 bg-gray-100 p-3 rounded-lg mt-2 whitespace-pre-wrap overflow-x-auto">
                      {debugInfo}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 mb-4 text-lg flex items-center gap-2">
              <span className="text-2xl">📚</span> How to use Subject Assignment
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li><strong>Select Course & Semester:</strong> Choose the program and semester from the filters above</li>
              <li><strong>View Available Buckets:</strong> Buckets are created by College Admin. Click on a bucket to expand it</li>
              <li><strong>Add Subjects:</strong> Click the <span className="inline-flex items-center px-2 py-0.5 bg-green-100 rounded"><Plus className="w-4 h-4 text-green-600" /></span> button to add a subject to the bucket</li>
              <li><strong>Remove Subjects:</strong> Click the <span className="inline-flex items-center px-2 py-0.5 bg-red-100 rounded"><Minus className="w-4 h-4 text-red-600" /></span> button to remove a subject from the bucket</li>
              <li><strong>Auto-Save:</strong> All changes are saved automatically to the database</li>
            </ol>
            <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">📌 Important Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                <li><strong>Split Responsibility:</strong> Admin creates bucket structure → You add subjects from your department</li>
                <li>You can only add subjects that belong to your department ({userDepartment?.code || 'your dept'})</li>
                <li>Only subjects without an assigned bucket are shown in &quot;Available Subjects&quot;</li>
                <li>Contact your College Admin if no buckets are available for your course/semester</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
