'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { ArrowLeft, Users, BookOpen, Download, Search, Filter, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  role: string;
  college_id: string;
  first_name: string;
  last_name: string;
}

interface StudentChoice {
  id: string;
  student_id: string;
  bucket_id: string;
  subject_id: string;
  priority: number;
  created_at: string;
  students?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    college_uid: string;
    current_semester: number;
  } | null;
  subjects?: {
    id: string;
    name: string;
    code: string;
    credits_per_week: number;
    subject_type: string;
  } | null;
}

interface BucketInfo {
  id: string;
  bucket_name: string;
  min_selection: number;
  max_selection: number;
  is_common_slot: boolean;
  batches?: {
    name: string;
    semester: number;
    section: string;
    academic_year: string;
    departments?: {
      name: string;
      code: string;
    } | null;
    courses?: {
      title: string;
      code: string;
    } | null;
  } | null;
}

interface SubjectStats {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  total_choices: number;
  priority_1_count: number;
  priority_2_count: number;
  priority_3_count: number;
}

export default function StudentChoicesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bucketId = params?.bucketId as string;
  const bucketName = searchParams?.get('name') || 'Bucket';

  const [user, setUser] = useState<User | null>(null);
  const [bucket, setBucket] = useState<BucketInfo | null>(null);
  const [choices, setChoices] = useState<StudentChoice[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'students' | 'subjects'>('students');

  const supabase = createClient();

  useEffect(() => {
    checkAuthAndFetchData();
  }, [bucketId]);

  async function checkAuthAndFetchData() {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login?message=Please login to access this page');
        return;
      }

      const parsedUser: User = JSON.parse(userData);

      if (parsedUser.role !== 'college_admin' && parsedUser.role !== 'admin') {
        router.push('/login?message=Access denied');
        return;
      }

      setUser(parsedUser);

      // Fetch bucket info
      const { data: bucketData, error: bucketError } = await supabase
        .from('elective_buckets')
        .select(`
          *,
          batches:batches!elective_buckets_batch_id_fkey (
            name,
            semester,
            section,
            academic_year,
            departments:departments (name, code),
            courses:courses (title, code)
          )
        `)
        .eq('id', bucketId)
        .single();

      if (bucketError) {
        console.error('Error fetching bucket:', bucketError);
      } else {
        setBucket(bucketData);
      }

      // Fetch student choices for this bucket
      const { data: choicesData, error: choicesError } = await supabase
        .from('student_subject_choices')
        .select(`
          *,
          students:students (
            id,
            first_name,
            last_name,
            email,
            college_uid,
            current_semester
          ),
          subjects:subjects (
            id,
            name,
            code,
            credits_per_week,
            subject_type
          )
        `)
        .eq('bucket_id', bucketId)
        .order('created_at', { ascending: false });

      if (choicesError) {
        console.error('Error fetching choices:', choicesError);
        // Table might not exist yet
        setChoices([]);
      } else {
        const typedChoicesData = (choicesData || []) as StudentChoice[];
        setChoices(typedChoicesData);
        
        // Calculate subject statistics
        const stats: Record<string, SubjectStats> = {};
        typedChoicesData.forEach(choice => {
          if (choice.subjects) {
            const subjectId = choice.subject_id;
            if (!stats[subjectId]) {
              stats[subjectId] = {
                subject_id: subjectId,
                subject_name: choice.subjects.name,
                subject_code: choice.subjects.code,
                total_choices: 0,
                priority_1_count: 0,
                priority_2_count: 0,
                priority_3_count: 0,
              };
            }
            stats[subjectId].total_choices++;
            if (choice.priority === 1) stats[subjectId].priority_1_count++;
            else if (choice.priority === 2) stats[subjectId].priority_2_count++;
            else if (choice.priority === 3) stats[subjectId].priority_3_count++;
          }
        });
        setSubjectStats(Object.values(stats).sort((a, b) => b.total_choices - a.total_choices));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  }

  // Group choices by student
  const choicesByStudent = choices.reduce((acc, choice) => {
    if (!choice.students) return acc;
    const studentId = choice.student_id;
    if (!acc[studentId]) {
      acc[studentId] = {
        student: choice.students,
        choices: []
      };
    }
    acc[studentId].choices.push(choice);
    return acc;
  }, {} as Record<string, { student: StudentChoice['students']; choices: StudentChoice[] }>);

  // Filter choices
  const filteredStudents = Object.values(choicesByStudent).filter(({ student }) => {
    if (!student) return false;
    const matchesSearch = searchQuery === '' ||
      student.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.college_uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get unique subjects for filter
  const uniqueSubjects = [...new Set(choices.map(c => c.subjects).filter(Boolean))];

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Email', 'Subject Code', 'Subject Name', 'Priority', 'Selected On'];
    const rows = choices.map(c => [
      c.students?.college_uid || '',
      `${c.students?.first_name || ''} ${c.students?.last_name || ''}`,
      c.students?.email || '',
      c.subjects?.code || '',
      c.subjects?.name || '',
      c.priority?.toString() || '',
      new Date(c.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bucketName.replace(/\s+/g, '_')}_choices_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading student choices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button and Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back to Dashboard</span>
            </button>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Student Choices: {bucket?.bucket_name || bucketName}
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {bucket?.batches?.name} - Sem {bucket?.batches?.semester} ({bucket?.batches?.academic_year})
                    {bucket?.batches?.departments && ` • ${bucket.batches.departments.code}`}
                    {bucket?.batches?.courses && ` • ${bucket.batches.courses.code}`}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-500">
                      Selection: <span className="font-medium text-gray-900">{bucket?.min_selection} - {bucket?.max_selection} subjects</span>
                    </span>
                    {bucket?.is_common_slot && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Common Slot
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={checkAuthAndFetchData}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button
                    onClick={exportToCSV}
                    disabled={choices.length === 0}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(choicesByStudent).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Choices</p>
                  <p className="text-2xl font-bold text-gray-900">{choices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unique Subjects</p>
                  <p className="text-2xl font-bold text-gray-900">{subjectStats.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Filter className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg. per Student</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(choicesByStudent).length > 0 
                      ? (choices.length / Object.keys(choicesByStudent).length).toFixed(1)
                      : '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* View Toggle and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('students')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'students'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  By Student
                </button>
                <button
                  onClick={() => setViewMode('subjects')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'subjects'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  By Subject
                </button>
              </div>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          {choices.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Student Choices Yet</h3>
              <p className="text-gray-500">
                No students have made their subject selections for this bucket yet.
                <br />
                Students can make choices through the Student Portal.
              </p>
            </div>
          ) : viewMode === 'students' ? (
            <div className="space-y-4">
              {filteredStudents.map(({ student, choices: studentChoices }) => (
                <div key={student?.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {student?.first_name} {student?.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {student?.college_uid} • {student?.email}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      Semester {student?.current_semester}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {studentChoices
                      .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                      .map((choice) => (
                        <div
                          key={choice.id}
                          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                            choice.priority === 1
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : choice.priority === 2
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          <span className="font-medium">{choice.subjects?.code}</span>
                          <span className="text-xs opacity-75">
                            Priority {choice.priority || '-'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Selections
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority 1
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority 2
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority 3+
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjectStats.map((stat) => (
                    <tr key={stat.subject_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{stat.subject_code}</div>
                          <div className="text-sm text-gray-500">{stat.subject_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {stat.total_choices}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-green-600 font-medium">{stat.priority_1_count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-blue-600 font-medium">{stat.priority_2_count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-gray-600 font-medium">{stat.priority_3_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
