'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { motion } from 'framer-motion';
import {
  BookOpen, Plus, Minus, RefreshCw, CheckCircle,
  AlertCircle, Info, ChevronDown, ChevronUp, Layers, GraduationCap,
  Building2, Calendar
} from 'lucide-react';
import { createClient } from '@/shared/database/browser';

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
    courses?: { id: string; title: string; code: string } | null;
    departments?: { id: string; name: string; code: string } | null;
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
  const [allBuckets, setAllBuckets] = useState<Bucket[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [savingBucket, setSavingBucket] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createClient();

  const getAvailableSemesters = useCallback(() => {
    const selectedCourseObj = courses.find(c => c.id === selectedCourse);
    const duration = selectedCourseObj?.duration_years || 4;
    const totalSemesters = duration * 2;
    return Array.from({ length: totalSemesters }, (_, i) => i + 1);
  }, [courses, selectedCourse]);

  const semesters = getAvailableSemesters();

  const fetchCourses = useCallback(async (collegeId: string, userId: string) => {
    if (!collegeId) return;

    try {
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';

      const response = await fetch(`/api/admin/courses?college_id=${collegeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      const coursesData = Array.isArray(data) ? data : data.courses;

      if (coursesData && coursesData.length > 0) {
        setCourses(coursesData);
        setSelectedCourse(coursesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  }, []);

  const fetchUserDepartment = useCallback(async (departmentId: string, collegeId: string) => {
    if (!departmentId) return;

    try {
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';

      const response = await fetch(`/api/admin/departments?college_id=${collegeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;

      const { departments } = await response.json();
      const deptData = departments?.find((d: Department) => d.id === departmentId);

      if (deptData) {
        setUserDepartment(deptData);
      }
    } catch (error) {
      console.error('Error fetching department:', error);
    }
  }, []);

  const fetchBucketsAndSubjects = useCallback(async () => {
    if (!user) return;

    setRefreshing(true);

    try {
      const userData = localStorage.getItem('user');
      const authToken = userData ? btoa(userData) : '';

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

      if (bucketsResponse.ok) {
        const bucketsData = await bucketsResponse.json();
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
      }

      const subjectsResponse = await fetch(`/api/admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (subjectsResponse.ok) {
        const { subjects: allSubjects } = await subjectsResponse.json();
        let availableSubjects = (allSubjects || []).filter((s: Subject) => !s.course_group_id);

        if (selectedSemester && availableSubjects.length > 0) {
          availableSubjects = availableSubjects.filter((s: Subject) => s.semester === selectedSemester);
        }

        setAvailableSubjects(availableSubjects);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, selectedCourse, selectedSemester]);

  useEffect(() => {
    async function checkAuthAndRole() {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          router.push('/login?message=Please login to access this page');
          return;
        }

        const parsedUser: User = JSON.parse(userData);

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

  useEffect(() => {
    if (user && selectedCourse && selectedSemester) {
      fetchBucketsAndSubjects();
    }
  }, [user, selectedCourse, selectedSemester, fetchBucketsAndSubjects]);

  async function addSubjectToBucket(bucketId: string, subjectId: string) {
    setSavingBucket(bucketId);
    try {
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
      setError(err.message || 'Failed to add subject to bucket');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingBucket(null);
    }
  }

  async function removeSubjectFromBucket(bucketId: string, subjectId: string) {
    setSavingBucket(bucketId);
    try {
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
      setError(err.message || 'Failed to remove subject');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingBucket(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2]">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading NEP Subject Assignment...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <FacultyCreatorLayout activeTab="nep-curriculum">
      <div className="space-y-6">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#4D869C] via-[#5a9aae] to-[#7AB2B2] rounded-2xl p-6 shadow-lg"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
                <Layers size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">NEP 2020 Bucket Builder</h1>
                <p className="text-white/80">Add subjects from your department to elective buckets</p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
              <p className="text-xs text-white/70">Logged in as</p>
              <p className="font-bold text-white">{user.first_name} {user.last_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-white/30 text-white text-xs rounded-full font-medium">Creator</span>
                {userDepartment && (
                  <span className="px-2 py-0.5 bg-white/30 text-white text-xs rounded-full font-medium">{userDepartment.code}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full"><CheckCircle size={18} className="text-green-600" /></div>
            <span className="text-green-800 font-medium">{successMessage}</span>
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full"><AlertCircle size={18} className="text-red-600" /></div>
            <span className="text-red-800 font-medium">{error}</span>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <GraduationCap size={16} className="text-[#4D869C]" /> Select Course / Program
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSemester(1); }}
                aria-label="Select course"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              >
                {courses.length === 0 ? (
                  <option value="">No courses available</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title} ({course.code})</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Building2 size={16} className="text-[#4D869C]" /> Your Department
              </label>
              <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                {userDepartment ? <span className="font-medium">{userDepartment.name} ({userDepartment.code})</span> : <span className="text-gray-500">Loading...</span>}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar size={16} className="text-[#4D869C]" /> Select Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                aria-label="Select semester"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Subjects */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg"><BookOpen size={18} className="text-blue-600" /></div>
                  <h2 className="text-lg font-bold text-gray-900">Available Subjects</h2>
                </div>
                <button
                  onClick={fetchBucketsAndSubjects}
                  disabled={refreshing}
                  title="Refresh"
                  className="p-2 text-gray-500 hover:text-[#4D869C] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                📚 Subjects from <strong>{userDepartment?.code || 'your dept'}</strong> not yet assigned
              </p>

              <div className="max-h-[500px] overflow-y-auto space-y-3">
                {availableSubjects.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No available subjects</p>
                  </div>
                ) : (
                  availableSubjects.map((subject) => (
                    <div key={subject.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-[#4D869C] transition-all">
                      <p className="font-semibold text-gray-900">{subject.name}</p>
                      <p className="text-sm text-gray-500">{subject.code}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{subject.credits_per_week} hrs/wk</span>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">{subject.subject_type}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600"><span className="font-semibold text-[#4D869C]">{availableSubjects.length}</span> subjects available</p>
              </div>
            </div>
          </motion.div>

          {/* Buckets */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#4D869C]/10 rounded-lg"><Layers size={18} className="text-[#4D869C]" /></div>
                  <h2 className="text-lg font-bold text-gray-900">Elective Buckets</h2>
                </div>
                <span className="text-xs text-gray-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">📌 Created by Admin</span>
              </div>

              {buckets.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                  <Info size={40} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">No Buckets Available</h3>
                  <p className="text-gray-500">Contact your College Admin to create buckets for this course/semester.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {buckets.map((bucket) => (
                    <div key={bucket.id} className={`border-2 rounded-2xl overflow-hidden transition-all ${expandedBucket === bucket.id ? 'border-[#4D869C] shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div
                        className={`p-5 cursor-pointer transition-colors ${expandedBucket === bucket.id ? 'bg-[#4D869C]/5' : 'bg-gray-50 hover:bg-gray-100'}`}
                        onClick={() => setExpandedBucket(expandedBucket === bucket.id ? null : bucket.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{bucket.bucket_name}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <span>📦 {bucket.batches?.name}</span>
                              <span>•</span>
                              <span>Sem {bucket.batches?.semester}</span>
                              <span>•</span>
                              <span className="text-[#4D869C] font-semibold">{bucket.subjects?.length || 0} subjects</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {bucket.is_common_slot && (
                              <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">⏰ Common Slot</span>
                            )}
                            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{bucket.min_selection}-{bucket.max_selection} selection</span>
                            <div className={`p-2 rounded-full ${expandedBucket === bucket.id ? 'bg-[#4D869C]/20' : 'bg-gray-200'}`}>
                              {expandedBucket === bucket.id ? <ChevronUp size={18} className="text-[#4D869C]" /> : <ChevronDown size={18} className="text-gray-500" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedBucket === bucket.id && (
                        <div className="p-5 border-t border-gray-200 bg-white">
                          {/* Current Subjects */}
                          <div className="mb-6">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">✓ In Bucket</span>
                              Assigned ({bucket.subjects?.length || 0})
                            </h4>
                            {(!bucket.subjects || bucket.subjects.length === 0) ? (
                              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                <p className="text-gray-400">No subjects assigned yet</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {bucket.subjects.map((subject) => (
                                  <div key={subject.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                                    <div>
                                      <p className="font-semibold text-gray-900">{subject.name}</p>
                                      <p className="text-sm text-gray-500">{subject.code} • {subject.credits_per_week} hrs/wk</p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removeSubjectFromBucket(bucket.id, subject.id); }}
                                      disabled={savingBucket === bucket.id}
                                      title="Remove subject"
                                      className="p-3 text-red-600 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50 border border-red-200"
                                    >
                                      <Minus size={18} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Add Subjects */}
                          <div className="pt-6 border-t border-gray-200">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">+ Available</span>
                              Add subjects
                            </h4>
                            {availableSubjects.length === 0 ? (
                              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                <p className="text-gray-400">No subjects available to add</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-72 overflow-y-auto">
                                {availableSubjects.map((subject) => (
                                  <div key={subject.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-[#4D869C] transition-all">
                                    <div>
                                      <p className="font-semibold text-gray-900">{subject.name}</p>
                                      <p className="text-sm text-gray-500">{subject.code} • {subject.credits_per_week} hrs/wk</p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); addSubjectToBucket(bucket.id, subject.id); }}
                                      disabled={savingBucket === bucket.id}
                                      title="Add subject"
                                      className="p-3 text-green-600 hover:bg-green-100 rounded-xl transition-all disabled:opacity-50 border border-green-200"
                                    >
                                      <Plus size={18} />
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
            </div>
          </motion.div>
        </div>

        {/* Help Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-r from-[#4D869C]/10 to-[#7AB2B2]/10 border border-[#4D869C]/20 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
            <span className="text-2xl">📚</span> How to use Subject Assignment
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>Select Course & Semester:</strong> Choose the program and semester from the filters above</li>
            <li><strong>View Available Buckets:</strong> Buckets are created by College Admin. Click to expand</li>
            <li><strong>Add Subjects:</strong> Click the <span className="inline-flex items-center px-2 py-0.5 bg-green-100 rounded"><Plus size={14} className="text-green-600" /></span> button to add</li>
            <li><strong>Remove Subjects:</strong> Click the <span className="inline-flex items-center px-2 py-0.5 bg-red-100 rounded"><Minus size={14} className="text-red-600" /></span> button to remove</li>
            <li><strong>Auto-Save:</strong> All changes are saved automatically</li>
          </ol>
        </motion.div>
      </div>
    </FacultyCreatorLayout>
  );
}
