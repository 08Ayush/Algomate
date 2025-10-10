'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Book, Plus, Search, BookOpen, Edit, Trash2, Code } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  subject_type: string;
  semester: number;
  requires_lab: boolean;
  is_core_subject: boolean;
  description?: string;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groupedSubjects, setGroupedSubjects] = useState<{ [key: number]: Subject[] }>({});
  const [statistics, setStatistics] = useState({
    totalSubjects: 0,
    totalCredits: 0,
    coreSubjects: 0,
    theorySubjects: 0,
    labSubjects: 0
  });
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
    async function fetchSubjects() {
      try {
        if (!user) return;
        
        console.log('Fetching subjects for CSE department...');
        const departmentCode = 'CSE';
        const response = await fetch(`/api/subjects?department_code=${departmentCode}`);
        
        const result = await response.json();
        console.log('Subjects API Result:', result);
        
        if (result.success) {
          setSubjects(result.data || []);
          setGroupedSubjects(result.groupedBySemester || {});
          setStatistics(result.statistics || {
            totalSubjects: 0,
            totalCredits: 0,
            coreSubjects: 0,
            theorySubjects: 0,
            labSubjects: 0
          });
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    }
    fetchSubjects();
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

  // Filter subjects based on semester and search
  const filteredSubjects = subjects.filter(subject => {
    const matchesSemester = selectedSemester === 'all' || subject.semester === selectedSemester;
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'theory' && subject.subject_type === 'THEORY') ||
      (selectedCategory === 'lab' && (subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL'));
    const matchesSearch = searchQuery === '' || 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSemester && matchesCategory && matchesSearch;
  });

  // Get current semester subjects - use grouped data if specific semester selected
  const currentSemesterSubjects = selectedSemester === 'all' 
    ? filteredSubjects 
    : (groupedSubjects[selectedSemester as number] || []).filter(subject => {
        const matchesCategory = selectedCategory === 'all' || 
          (selectedCategory === 'theory' && subject.subject_type === 'THEORY') ||
          (selectedCategory === 'lab' && (subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL'));
        const matchesSearch = searchQuery === '' || 
          subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subject.code.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
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
                <p className="text-gray-600 dark:text-gray-300">Computer Science Engineering - All Semesters</p>
              </div>
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-5 h-5 mr-2" />
                Add Subject
              </button>
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
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="all">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Sem {sem}</option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="theory">Theory</option>
                  <option value="lab">Lab/Practical</option>
                </select>
              </div>
            </div>

            {/* Semester Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-2">
              <div className="flex overflow-x-auto space-x-2">
                <button
                  onClick={() => setSelectedSemester('all')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedSemester === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  All Semesters
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedSemester === sem
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>
            </div>

            {/* Subjects Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedSemester === 'all' ? 'All Subjects' : `Semester ${selectedSemester} Subjects`}
              </h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentSemesterSubjects.length} subjects
              </span>
            </div>

            {/* Subjects Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Course Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Course Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {currentSemesterSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No subjects found
                        </td>
                      </tr>
                    ) : (
                      currentSemesterSubjects.map((subject) => (
                        <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{subject.code}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{subject.name}</div>
                            {subject.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subject.description}</div>
                            )}
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
                            <div className="text-sm text-gray-900 dark:text-white font-medium">{subject.credits}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
