'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Book, Search, BookOpen, Code } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits?: number;
  credits_per_week?: number;
  subject_type: string;
  semester: number;
  requires_lab: boolean;
  is_core_subject: boolean;
  description?: string;
  course_id?: string;
  courses?: {
    id: string;
    title: string;
    code: string;
  };
}

interface Course {
  id: string;
  title: string;
  code: string;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groupedSubjects, setGroupedSubjects] = useState<{ [key: number]: Subject[] }>({});
  const [statistics, setStatistics] = useState({
    totalSubjects: 0,
    totalCredits: 0,
    coreSubjects: 0,
    theorySubjects: 0,
    labSubjects: 0
  });
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch subjects
  useEffect(() => {
    fetchSubjects();
  }, [user]);

  // Update statistics when filters change
  useEffect(() => {
    if (subjects.length > 0) {
      const filteredForStats = selectedCourse === 'all' 
        ? subjects 
        : subjects.filter(s => s.course_id === selectedCourse);
      
      setStatistics({
        totalSubjects: filteredForStats.length,
        totalCredits: filteredForStats.reduce((sum, s) => sum + (s.credits_per_week || 0), 0),
        coreSubjects: filteredForStats.filter(s => s.is_core_subject).length,
        theorySubjects: filteredForStats.filter(s => s.subject_type === 'THEORY').length,
        labSubjects: filteredForStats.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length
      });
    }
  }, [selectedCourse, subjects]);

  async function fetchSubjects() {
    try {
      if (!user) return;
      
      // Use admin API for cross-department access (creator/publisher can view all)
      const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
      
      // Fetch subjects
      const response = await fetch('/api/admin/subjects', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const result = await response.json();
      console.log('Subjects API Result:', result);
      
      // Fetch courses
      const coursesResponse = await fetch('/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const coursesResult = await coursesResponse.json();
      if (coursesResult.courses) {
        setCourses(coursesResult.courses);
      }
      
      if (result.subjects) {
        const subjectsData = result.subjects;
        console.log('Subjects data sample:', subjectsData.slice(0, 2)); // Debug first 2 subjects
        console.log('Total subjects fetched:', subjectsData.length);
        
        // Log subjects with and without course_id
        const withCourse = subjectsData.filter((s: any) => s.course_id).length;
        const withoutCourse = subjectsData.filter((s: any) => !s.course_id).length;
        console.log(`Subjects with course_id: ${withCourse}, without course_id: ${withoutCourse}`);
        
        setSubjects(subjectsData);
        
        // Group by semester (for backward compatibility)
        const grouped = subjectsData.reduce((acc: any, subject: any) => {
          const sem = subject.semester || 1;
          if (!acc[sem]) acc[sem] = [];
          acc[sem].push(subject);
          return acc;
        }, {});
        setGroupedSubjects(grouped);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }

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

  // Filter subjects based on course, semester and search
  const filteredSubjects = subjects.filter(subject => {
    const matchesCourse = selectedCourse === 'all' || subject.course_id === selectedCourse;
    const matchesSemester = selectedSemester === 'all' || subject.semester === selectedSemester;
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'theory' && subject.subject_type === 'THEORY') ||
      (selectedCategory === 'lab' && (subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL'));
    const matchesSearch = searchQuery === '' || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCourse && matchesSemester && matchesCategory && matchesSearch;
  });

  // Get current semester subjects - use grouped data if specific semester selected
  const currentSemesterSubjects = selectedSemester === 'all' 
    ? filteredSubjects 
    : (groupedSubjects[selectedSemester as number] || []).filter(subject => {
        const matchesCourse = selectedCourse === 'all' || subject.course_id === selectedCourse;
        const matchesCategory = selectedCategory === 'all' || 
          (selectedCategory === 'theory' && subject.subject_type === 'THEORY') ||
          (selectedCategory === 'lab' && (subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL'));
        const matchesSearch = searchQuery === '' || 
          subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subject.code.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCourse && matchesCategory && matchesSearch;
      });

  console.log('Current filter state:', {
    selectedSemester,
    selectedCategory,
    searchQuery,
    totalSubjects: subjects.length,
    filteredCount: currentSemesterSubjects.length,
    groupedKeys: Object.keys(groupedSubjects),
    semesterData: selectedSemester !== 'all' ? groupedSubjects[selectedSemester as number]?.length : null
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Subjects Management</h1>
                <p className="text-gray-600 dark:text-gray-300">All Departments - Cross-Department View</p>
              </div>
              {/* Only admin can add subjects - creator/publisher have read-only access */}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Subjects</h3>
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalSubjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all semesters</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Credits</h3>
                  <Code className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.totalCredits}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Credit hours</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Theory Subjects</h3>
                  <Code className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.theorySubjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Theory courses</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Lab Subjects</h3>
                  <Book className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.labSubjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lab & Practical</p>
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
                    placeholder="Search subjects by name or code..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  aria-label="Filter by course"
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white min-w-[140px]"
                >
                  <option value="all">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.code || course.title}</option>
                  ))}
                </select>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  aria-label="Filter by semester"
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white min-w-[140px]"
                >
                  <option value="all">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  aria-label="Filter by category"
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white min-w-[140px]"
                >
                  <option value="all">All Categories</option>
                  <option value="theory">Theory</option>
                  <option value="lab">Lab/Practical</option>
                </select>
              </div>
            </div>

            {/* Subjects Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedCourse !== 'all' && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {courses.find(c => c.id === selectedCourse)?.code || 'Course'} - 
                  </span>
                )}{' '}
                {selectedSemester === 'all' ? 'All Subjects' : `Semester ${selectedSemester} Subjects`}
              </h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentSemesterSubjects.length} subjects found
              </span>
            </div>

            {/* Subjects Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Subject Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Subject Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Credits
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {currentSemesterSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No subjects found for the selected filters
                        </td>
                      </tr>
                    ) : (
                      currentSemesterSubjects.map((subject) => (
                        <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{subject.code}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{subject.name}</div>
                            {subject.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{subject.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {subject.courses?.code ? (
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {subject.courses.code}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                Not Assigned
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                              Sem {subject.semester}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              subject.subject_type === 'THEORY'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            }`}>
                              {subject.subject_type === 'THEORY' ? 'Theory' : subject.subject_type === 'LAB' ? 'Lab' : 'Practical'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{subject.credits_per_week || subject.credits}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
