'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { Book, Plus, Search, BookOpen, Edit, Trash2, Code, X, AlertCircle } from 'lucide-react';

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

interface NewSubjectForm {
  name: string;
  code: string;
  semester: number;
  credits_per_week: number;
  subject_type: string;
  preferred_duration: number;
  max_continuous_hours: number;
  requires_lab: boolean;
  requires_projector: boolean;
  is_core_subject: boolean;
  description: string;
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
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState<NewSubjectForm>({
    name: '',
    code: '',
    semester: 1,
    credits_per_week: 3,
    subject_type: 'THEORY',
    preferred_duration: 60,
    max_continuous_hours: 1,
    requires_lab: false,
    requires_projector: false,
    is_core_subject: true,
    description: ''
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

  // Fetch subjects
  useEffect(() => {
    fetchSubjects();
  }, [user]);

  async function fetchSubjects() {
    try {
      if (!user || !user.department_id) return;
      
      console.log('Fetching subjects for department:', user.department_id);
      const response = await fetch(`/api/subjects?department_id=${user.department_id}`);
      
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

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      // Get department ID for CSE
      const departmentCode = 'CSE';
      const deptResponse = await fetch(`/api/subjects?department_code=${departmentCode}`);
      const deptResult = await deptResponse.json();
      
      if (!deptResult.success || !deptResult.data || deptResult.data.length === 0) {
        setFormError('Could not find department information');
        setSubmitting(false);
        return;
      }

      const department_id = deptResult.data[0].department_id;
      const college_id = user.college_id;

      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSubject,
          department_id,
          college_id
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Subject created successfully!');
        setShowAddModal(false);
        // Reset form
        setNewSubject({
          name: '',
          code: '',
          semester: 1,
          credits_per_week: 3,
          subject_type: 'THEORY',
          preferred_duration: 60,
          max_continuous_hours: 1,
          requires_lab: false,
          requires_projector: false,
          is_core_subject: true,
          description: ''
        });
        // Refresh subjects list
        fetchSubjects();
      } else {
        setFormError(result.error || 'Failed to create subject');
      }
    } catch (error: any) {
      console.error('Error creating subject:', error);
      setFormError('An error occurred while creating the subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof NewSubjectForm, value: any) => {
    setNewSubject(prev => ({ ...prev, [field]: value }));
    setFormError(null);
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
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
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

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Subject</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Error</h3>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">{formError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subject Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Data Structures and Algorithms"
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Subject Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSubject.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="e.g., CS301"
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white uppercase"
                  />
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newSubject.semester}
                    onChange={(e) => handleInputChange('semester', parseInt(e.target.value))}
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>

                {/* Credits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Credits per Week <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newSubject.credits_per_week}
                    onChange={(e) => handleInputChange('credits_per_week', parseInt(e.target.value))}
                    min="1"
                    max="10"
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Subject Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newSubject.subject_type}
                    onChange={(e) => {
                      handleInputChange('subject_type', e.target.value);
                      // Auto-set requires_lab and preferred_duration based on type
                      if (e.target.value === 'LAB' || e.target.value === 'PRACTICAL') {
                        handleInputChange('requires_lab', true);
                        handleInputChange('preferred_duration', 120);
                        handleInputChange('max_continuous_hours', 2);
                      } else {
                        handleInputChange('requires_lab', false);
                        handleInputChange('preferred_duration', 60);
                        handleInputChange('max_continuous_hours', 1);
                      }
                    }}
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="THEORY">Theory</option>
                    <option value="LAB">Lab</option>
                    <option value="PRACTICAL">Practical</option>
                  </select>
                </div>

                {/* Preferred Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Duration (minutes)
                  </label>
                  <select
                    value={newSubject.preferred_duration}
                    onChange={(e) => handleInputChange('preferred_duration', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="60">60 minutes (1 hour)</option>
                    <option value="120">120 minutes (2 hours)</option>
                  </select>
                </div>

                {/* Max Continuous Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Continuous Hours
                  </label>
                  <input
                    type="number"
                    value={newSubject.max_continuous_hours}
                    onChange={(e) => handleInputChange('max_continuous_hours', parseInt(e.target.value))}
                    min="1"
                    max="4"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Checkboxes */}
                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={newSubject.requires_lab}
                      onChange={(e) => handleInputChange('requires_lab', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Requires Lab</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={newSubject.requires_projector}
                      onChange={(e) => handleInputChange('requires_projector', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Requires Projector</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={newSubject.is_core_subject}
                      onChange={(e) => handleInputChange('is_core_subject', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Core Subject</span>
                  </label>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newSubject.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the subject..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError(null);
                  }}
                  className="px-6 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Subject</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
