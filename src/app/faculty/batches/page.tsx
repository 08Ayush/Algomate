'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Users, Search, Calendar, BookOpen, Package, ChevronDown, ChevronUp, ArrowUpCircle } from 'lucide-react';

interface Subject {
  id: string;
  code: string;
  name: string;
  credit_value: number;
  subject_type: string;
  nep_category: string;
  is_active: boolean;
  lecture_hours?: number;
  tutorial_hours?: number;
  practical_hours?: number;
  description?: string;
}

interface ElectiveBucket {
  id: string;
  bucket_name: string;
  max_selection: number;
  min_selection: number;
  is_common_slot?: boolean;
  created_at: string;
  subjects: Subject[];
  subjectCount: number;
}

interface Batch {
  id: string;
  name: string;
  semester: number;
  academic_year: string;
  section: string;
  expected_strength: number;
  actual_strength: number;
  course_id: string;
  college_id: string;
  department_id: string;
  is_active: boolean;
  created_at: string;
  course?: {
    id: string;
    title: string;
    code: string;
    nature_of_course: string;
  };
  departments?: {
    id: string;
    name: string;
    code: string;
  };
  buckets: ElectiveBucket[];
  bucketsCount: number;
  totalSubjects: number;
}

interface Statistics {
  totalBatches: number;
  totalBuckets: number;
  totalSubjects: number;
  totalStudents: number;
  bySemester: Record<number, { batches: number; buckets: number; subjects: number }>;
}

export default function BatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalBatches: 0,
    totalBuckets: 0,
    totalSubjects: 0,
    totalStudents: 0,
    bySemester: {}
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [promotingBatch, setPromotingBatch] = useState<string | null>(null);

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

  // Fetch NEP batches with buckets and subjects
  const fetchBatches = async () => {
    try {
      if (!user) return;
      
      console.log('📋 Fetching batches for faculty:', {
        userId: user.id,
        collegeId: user.college_id,
        courseId: user.course_id,
        facultyType: user.faculty_type
      });
      
      const response = await fetch(`/api/faculty/nep-batches?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      
      const result = await response.json();
      console.log('🔥 NEP Batches API Result:', JSON.stringify(result, null, 2));
      console.log('🔥 Number of batches:', result.batches?.length);
      
      // Debug each batch's buckets and subjects
      result.batches?.forEach((batch: any, batchIdx: number) => {
        console.log(`📦 Batch ${batchIdx + 1}: ${batch.course?.code}-${batch.section} (Sem ${batch.semester})`);
        console.log(`   - Buckets array:`, batch.buckets);
        console.log(`   - Buckets count field: ${batch.bucketsCount}`);
        console.log(`   - Buckets length: ${batch.buckets?.length}`);
        console.log(`   - Total subjects: ${batch.totalSubjects}`);
        
        batch.buckets?.forEach((bucket: any, bucketIdx: number) => {
          console.log(`   🎯 Bucket ${bucketIdx + 1}: ${bucket.bucket_name}`);
          console.log(`      - Subjects: ${bucket.subjects?.length || 0}`);
          bucket.subjects?.forEach((subject: any) => {
            console.log(`         ✓ ${subject.code}: ${subject.name} (${subject.nep_category})`);
          });
        });
      });
      
      if (result.success) {
        setBatches(result.batches || []);
        setStatistics(result.statistics || {
          totalBatches: 0,
          totalBuckets: 0,
          totalSubjects: 0,
          totalStudents: 0,
          bySemester: {}
        });
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBatches();
    }
  }, [user]);

  const toggleBatchExpansion = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const toggleBucketExpansion = (bucketId: string) => {
    setExpandedBuckets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bucketId)) {
        newSet.delete(bucketId);
      } else {
        newSet.add(bucketId);
      }
      return newSet;
    });
  };

  const handlePromoteBatch = async (batchId: string, batchName: string, currentSem: number) => {
    if (currentSem >= 8) {
      alert('This batch has completed all semesters (Semester 8).');
      return;
    }

    if (!confirm(`Promote "${batchName}" from Semester ${currentSem} to Semester ${currentSem + 1}?\\n\\nThis will update the academic year if moving to a new year.`)) {
      return;
    }

    setPromotingBatch(batchId);
    console.log('📈 Promoting batch:', batchId);

    try {
      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));
      
      const response = await fetch(`/api/batches/${batchId}/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(`Failed to promote batch: ${result.error || 'Unknown error'}`);
        setPromotingBatch(null);
        return;
      }

      console.log('✅ Batch promoted successfully');
      alert(
        `✅ Batch Promoted Successfully!\\n\\n` +
        `From: Semester ${result.data.previousSemester} (${result.data.previousYear})\\n` +
        `To: Semester ${result.data.newSemester} (${result.data.newYear})`
      );
      
      // Refresh the batches list
      fetchBatches();
    } catch (error: any) {
      console.error('❌ Error promoting batch:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setPromotingBatch(null);
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
      batch.semester.toString().includes(searchQuery) ||
      batch.course?.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.course?.title.toLowerCase().includes(searchQuery.toLowerCase());
    
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">NEP 2020 Batches</h1>
                <p className="text-gray-600 dark:text-gray-300">View batches with elective buckets and subjects</p>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Batches</h3>
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalBatches}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active batches</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Elective Buckets</h3>
                  <Package className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalBuckets}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total buckets</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Subjects</h3>
                  <BookOpen className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalSubjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In all buckets</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</h3>
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalStudents}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enrolled students</p>
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
                  placeholder="Search batches by name, semester, course code, or section..."
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

            {/* Batches List */}
            <div className="space-y-4">
              {filteredBatches.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No NEP Batches Available</p>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    NEP 2020 batches with elective buckets will appear here once they are created from the Admin Dashboard.
                  </p>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-lg mx-auto text-left">
                    <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">📝 How to create NEP batches:</p>
                    <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                      <li>Go to <strong>Admin Dashboard</strong></li>
                      <li>Navigate to <strong>NEP Bucket Builder</strong></li>
                      <li>Select your course and semester</li>
                      <li>Create <strong>Elective Buckets</strong> and assign subjects</li>
                      <li>Click <strong>Save Curriculum</strong></li>
                    </ol>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
                      Batches are automatically created when you save the curriculum with elective buckets.
                    </p>
                  </div>
                </div>
              ) : (
                filteredBatches.map((batch) => {
                  const isExpanded = expandedBatches.has(batch.id);
                  
                  return (
                    <div key={batch.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                      {/* Batch Header */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => toggleBatchExpansion(batch.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {batch.name}
                              </h3>
                              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                                Semester {batch.semester}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {batch.course?.title} • {batch.academic_year}
                            </p>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {batch.actual_strength}/{batch.expected_strength} Students
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-purple-500" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {batch.bucketsCount} Buckets
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-green-500" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {batch.totalSubjects} Subjects
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Promote Button - Only for College Admin */}
                            {user.role === 'college_admin' && batch.semester < 8 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePromoteBatch(batch.id, batch.name, batch.semester);
                                }}
                                disabled={promotingBatch === batch.id}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-md"
                              >
                                {promotingBatch === batch.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Promoting...
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpCircle className="w-4 h-4" />
                                    Promote to Sem {batch.semester + 1}
                                  </>
                                )}
                              </button>
                            )}
                            <button 
                              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                              onClick={() => toggleBatchExpansion(batch.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content - Buckets */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-6">
                          {batch.buckets.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                                No elective buckets for Semester {batch.semester}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-500">
                                Admin needs to create buckets in <strong>NEP Bucket Builder</strong> for<br/>
                                <span className="text-blue-600 dark:text-blue-400">{batch.course?.title} - Semester {batch.semester}</span>
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Elective Buckets:
                              </h4>
                              {batch.buckets.map((bucket) => {
                                const isBucketExpanded = expandedBuckets.has(bucket.id);
                                
                                return (
                                  <div key={bucket.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                                    <div 
                                      className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBucketExpansion(bucket.id);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-purple-500" />
                                            <h5 className="font-semibold text-gray-900 dark:text-white">
                                              {bucket.bucket_name}
                                            </h5>
                                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                                              {bucket.subjectCount} subjects
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                              Select {bucket.min_selection} to {bucket.max_selection} subjects
                                            </p>
                                            {bucket.is_common_slot && (
                                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                                Common Slot
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded transition-colors">
                                          {isBucketExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expanded Bucket - Subjects */}
                                    {isBucketExpanded && (
                                      <div className="border-t border-gray-200 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-900/50">
                                        {bucket.subjects.length === 0 ? (
                                          <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                                            No subjects in this bucket
                                          </p>
                                        ) : (
                                          <div className="space-y-3">
                                            {/* Group subjects by NEP category */}
                                            {(() => {
                                              const groupedSubjects = bucket.subjects.reduce((acc, subject) => {
                                                const category = subject.nep_category || 'OTHER';
                                                if (!acc[category]) {
                                                  acc[category] = [];
                                                }
                                                acc[category].push(subject);
                                                return acc;
                                              }, {} as Record<string, Subject[]>);

                                              const categoryOrder = ['MAJOR', 'MINOR', 'CORE', 'ELECTIVE', 'SEC', 'AEC', 'VAC', 'OE', 'INTERNSHIP', 'OTHER'];
                                              const sortedCategories = Object.keys(groupedSubjects).sort(
                                                (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
                                              );

                                              return sortedCategories.map(category => (
                                                <div key={category} className="space-y-2">
                                                  <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-md">
                                                      {category}
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                      ({groupedSubjects[category].length} subjects)
                                                    </span>
                                                  </h6>
                                                  <div className="grid grid-cols-1 gap-2">
                                                    {groupedSubjects[category].map((subject) => (
                                                      <div key={subject.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start">
                                                          <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                {subject.code}
                                                              </span>
                                                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                                                                {subject.subject_type}
                                                              </span>
                                                            </div>
                                                            <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight mb-1">
                                                              {subject.name}
                                                            </p>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                                {subject.credit_value || 0} credits
                                                              </span>
                                                              <span>•</span>
                                                              <span>
                                                                L: {subject.lecture_hours || 0} | T: {subject.tutorial_hours || 0} | P: {subject.practical_hours || 0}
                                                              </span>
                                                            </div>
                                                            {subject.description && (
                                                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                                                                {subject.description}
                                                              </p>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

    </>
  );
}
