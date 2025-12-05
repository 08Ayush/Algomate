'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Faculty {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
  subject_type: string;
  credits_per_week: number;
  department_id: string;
  course_id?: string;
}

interface Course {
  id: string;
  title: string;
  code: string;
  nature_of_course?: string;
}

interface Qualification {
  id: string;
  faculty_id: string;
  subject_id: string;
  proficiency_level: number;
  preference_score: number;
  is_primary_teacher: boolean;
  can_handle_lab: boolean;
  can_handle_tutorial: boolean;
  faculty: Faculty;
  subject: Subject;
}

export default function FacultyQualificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState(7);
  const [preferenceScore, setPreferenceScore] = useState(5);
  const [isPrimaryTeacher, setIsPrimaryTeacher] = useState(false);
  const [canHandleLab, setCanHandleLab] = useState(true);
  const [canHandleTutorial, setCanHandleTutorial] = useState(true);

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
      
      setUser(parsedUser);
      loadData(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  const loadData = async (userData: any) => {
    try {
      setLoading(true);

      // Get user's department_id
      const userDepartmentId = userData.department_id;
      console.log('👤 Loading data for department:', userDepartmentId);

      if (!userDepartmentId) {
        alert('Your profile is missing department information. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Load department name
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('name, code')
        .eq('id', userDepartmentId)
        .single();

      if (!deptError && deptData) {
        setDepartmentName(`${deptData.name} (${deptData.code})`);
      }

      // Load qualifications for this department only
      const qualRes = await fetch(`/api/faculty/qualifications?department_id=${userDepartmentId}`);
      const qualData = await qualRes.json();
      if (qualData.success) {
        setQualifications(qualData.qualifications);
        console.log(`✅ Loaded ${qualData.qualifications.length} qualifications for department`);
      }

      // Load faculty from same department only
      const { data: facultyData, error: facultyError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, department_id')
        .eq('role', 'faculty')
        .eq('department_id', userDepartmentId)
        .eq('is_active', true)
        .order('first_name');

      if (!facultyError && facultyData) {
        setFaculty(facultyData);
        console.log(`✅ Loaded ${facultyData.length} faculty from department`);
      }

      // Load subjects from same department only
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code, semester, subject_type, credits_per_week, department_id, course_id')
        .eq('department_id', userDepartmentId)
        .eq('is_active', true)
        .order('semester', { ascending: true })
        .order('name');

      if (!subjectsError && subjectsData) {
        setSubjects(subjectsData);
        console.log(`✅ Loaded ${subjectsData.length} subjects from department`);
      }

      // Load courses for the college
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, code, nature_of_course')
        .eq('college_id', userData.college_id)
        .order('code');

      if (!coursesError && coursesData) {
        setCourses(coursesData);
        console.log(`✅ Loaded ${coursesData.length} courses`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleAddQualification = async () => {
    if (!selectedFaculty || !selectedSubject) {
      alert('Please select both faculty and subject');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/faculty/qualifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faculty_id: selectedFaculty,
          subject_id: selectedSubject,
          proficiency_level: proficiencyLevel,
          preference_score: preferenceScore,
          is_primary_teacher: isPrimaryTeacher,
          can_handle_lab: canHandleLab,
          can_handle_tutorial: canHandleTutorial
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Qualification added successfully!');
        setShowAddModal(false);
        resetForm();
        loadData(user);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding qualification:', error);
      alert('Error adding qualification. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQualification = async (id: string, facultyName: string, subjectName: string) => {
    if (!confirm(`Remove qualification: ${facultyName} for ${subjectName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/faculty/qualifications?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Qualification deleted successfully!');
        loadData(user);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting qualification:', error);
      alert('Error deleting qualification. Please try again.');
    }
  };

  const resetForm = () => {
    setSelectedFaculty('');
    setSelectedCourse('');
    setSelectedSubject('');
    setProficiencyLevel(7);
    setPreferenceScore(5);
    setIsPrimaryTeacher(false);
    setCanHandleLab(true);
    setCanHandleTutorial(true);
  };

  // Filter subjects by selected course
  const filteredSubjectsBySelection = selectedCourse
    ? subjects.filter(s => s.course_id === selectedCourse)
    : subjects;

  const filteredQualifications = qualifications.filter(qual => {
    const matchesSearch = 
      qual.faculty?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qual.faculty?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qual.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qual.subject?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSemester = selectedSemester === 'all' || qual.subject?.semester === selectedSemester;
    
    return matchesSearch && matchesSemester;
  });

  // Group by semester
  const qualificationsBySemester = filteredQualifications.reduce((acc, qual) => {
    const semester = qual.subject?.semester || 0;
    if (!acc[semester]) {
      acc[semester] = [];
    }
    acc[semester].push(qual);
    return acc;
  }, {} as Record<number, Qualification[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Faculty Subject Qualifications
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                Manage which faculty members are qualified to teach specific subjects
              </p>
              {departmentName && (
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    {departmentName}
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Qualifications</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{qualifications.length}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Faculty Members</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{faculty.length}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Subjects</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{subjects.length}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Primary Teachers</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {qualifications.filter(q => q.is_primary_teacher).length}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-6 border border-gray-200 dark:border-slate-700">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search faculty or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Qualification
                </button>
              </div>
            </div>

            {/* Qualifications List */}
            {Object.keys(qualificationsBySemester).length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center border border-gray-200 dark:border-slate-700">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Qualifications Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start by adding faculty-subject qualifications to enable AI timetable generation
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add First Qualification
                </button>
              </div>
            ) : (
              Object.keys(qualificationsBySemester).sort((a, b) => Number(a) - Number(b)).map(semester => (
                <div key={semester} className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Semester {semester} ({qualificationsBySemester[Number(semester)].length})
                  </h2>
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                      <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Faculty
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Proficiency
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Capabilities
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {qualificationsBySemester[Number(semester)].map(qual => (
                          <tr key={qual.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    {qual.faculty?.first_name?.[0]}{qual.faculty?.last_name?.[0]}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {qual.faculty?.first_name} {qual.faculty?.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {qual.faculty?.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {qual.subject?.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {qual.subject?.code} • {qual.subject?.subject_type}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 max-w-[100px]">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${qual.proficiency_level * 10}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {qual.proficiency_level}/10
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {qual.is_primary_teacher && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                    Primary
                                  </span>
                                )}
                                {qual.can_handle_lab && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Lab
                                  </span>
                                )}
                                {qual.can_handle_tutorial && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Tutorial
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteQualification(
                                  qual.id,
                                  `${qual.faculty?.first_name} ${qual.faculty?.last_name}`,
                                  qual.subject?.name
                                )}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}

            {/* Add Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Add Faculty Qualification
                    </h2>

                    <div className="space-y-4">
                      {/* Faculty Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Faculty *
                        </label>
                        <select
                          value={selectedFaculty}
                          onChange={(e) => setSelectedFaculty(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Choose faculty...</option>
                          {faculty.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.first_name} {f.last_name} ({f.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Course Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Course
                        </label>
                        <select
                          value={selectedCourse}
                          onChange={(e) => {
                            setSelectedCourse(e.target.value);
                            setSelectedSubject(''); // Reset subject when course changes
                          }}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All Courses</option>
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.title} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subject Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Subject *
                        </label>
                        <select
                          value={selectedSubject}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Choose subject...</option>
                          {filteredSubjectsBySelection.map(s => (
                            <option key={s.id} value={s.id}>
                              Sem {s.semester} - {s.name} ({s.code}) - {s.subject_type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Proficiency Level */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Proficiency Level: {proficiencyLevel}/10
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={proficiencyLevel}
                          onChange={(e) => setProficiencyLevel(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Beginner</span>
                          <span>Expert</span>
                        </div>
                      </div>

                      {/* Preference Score */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Teaching Preference: {preferenceScore}/10
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={preferenceScore}
                          onChange={(e) => setPreferenceScore(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isPrimaryTeacher}
                            onChange={(e) => setIsPrimaryTeacher(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Primary Teacher (Preferred for this subject)
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={canHandleLab}
                            onChange={(e) => setCanHandleLab(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Can handle lab sessions
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={canHandleTutorial}
                            onChange={(e) => setCanHandleTutorial(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Can handle tutorial sessions
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          resetForm();
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddQualification}
                        disabled={saving || !selectedFaculty || !selectedSubject}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Adding...' : 'Add Qualification'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
