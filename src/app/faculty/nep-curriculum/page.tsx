'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { ArrowLeft } from 'lucide-react';
import CurriculumBuilder from '@/components/nep/CurriculumBuilder';
import { createClient } from '@/lib/supabase/client';

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

export default function NEPCurriculumPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Get semesters based on selected course
  const getAvailableSemesters = () => {
    const selectedCourseObj = courses.find(c => c.id === selectedCourse);
    const duration = selectedCourseObj?.duration_years || 4;
    const totalSemesters = duration * 2; // Convert years to semesters
    return Array.from({ length: totalSemesters }, (_, i) => i + 1);
  };

  const semesters = getAvailableSemesters();

  useEffect(() => {
    checkAuthAndRole();
  }, []);

  async function fetchCourses(collegeId: string) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, code, nature_of_course, intake, duration_years, college_id')
        .eq('college_id', collegeId)
        .order('code');

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      if (data && data.length > 0) {
        setCourses(data as Course[]);
        // Set first course as default
        setSelectedCourse(data[0].id as string);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  }

  async function fetchDepartments(collegeId: string, userDepartmentId?: string) {
    try {
      // Creators can only see their own department
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('college_id', collegeId)
        .eq('is_active', true)
        .eq('id', userDepartmentId || '') // Filter by user's department
        .order('name');

      if (error) {
        console.error('Error fetching departments:', error);
        return;
      }

      if (data && data.length > 0) {
        setDepartments(data as Department[]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }

  async function checkAuthAndRole() {
    try {
      // Check if user is logged in
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login?message=Please login to access this page');
        return;
      }

      const parsedUser: User = JSON.parse(userData);

      // Check if user is a creator faculty
      if (parsedUser.role !== 'faculty' || parsedUser.faculty_type !== 'creator') {
        router.push('/login?message=Access denied. Only Creator Faculty can access this page');
        return;
      }

      setUser(parsedUser);
      
      // Set user's department as default (and only option)
      if (parsedUser.department_id) {
        setSelectedDepartment(parsedUser.department_id);
      }
      
      // Fetch courses and departments for this college
      // Only fetch user's own department
      await Promise.all([
        fetchCourses(parsedUser.college_id),
        fetchDepartments(parsedUser.college_id, parsedUser.department_id)
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push('/login');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
              onClick={() => router.push('/faculty/dashboard')}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back to Faculty Dashboard</span>
            </button>
            <div className="bg-white border-b border-gray-200 shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">NEP 2020 Bucket Builder</h1>
                  <p className="text-gray-600 mt-1">
                    Create elective buckets and assign subjects for Choice-Based Credit System
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Logged in as</p>
                  <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-blue-600">Creator Faculty</p>
                </div>
              </div>
            </div>
          </div>

          {/* Course, Department, and Semester Selector */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course / Program
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    // Reset semester to 1 when course changes
                    setSelectedSemester(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  Select the program for which you want to create curriculum
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Department
                </label>
                <select
                  value={selectedDepartment}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                >
                  {departments.length === 0 ? (
                    <option value="">No department assigned</option>
                  ) : (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  You can only create buckets for your assigned department
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Subjects will be filtered based on the selected semester
                </p>
              </div>
            </div>
          </div>

          {/* Curriculum Builder */}
          {selectedCourse && selectedDepartment && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CurriculumBuilder
                collegeId={user.college_id}
                course={selectedCourse}
                department={selectedDepartment}
                semester={selectedSemester}
              />
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-3 text-lg">📚 How to use the NEP Bucket Builder:</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li><strong>Select Course, Department & Semester:</strong> Choose the program, department, and semester from the dropdowns above</li>
              <li><strong>Create Elective Buckets:</strong> Enter a bucket name (e.g., "Major Pool", "Minor Pool", "Open Elective") and click "Create Bucket" - saves immediately!</li>
              <li><strong>Drag & Drop Subjects:</strong> Drag subjects from the available list on the left into the appropriate bucket on the right - auto-saved!</li>
              <li><strong>Configure Common Time Slot:</strong> Toggle this option if all subjects in the bucket should run simultaneously - updates instantly!</li>
              <li><strong>Set Selection Limits:</strong> Define minimum and maximum number of subjects students can choose - saved automatically!</li>
              <li><strong>Delete Buckets:</strong> Click the "Delete" button on any bucket to permanently remove it and return subjects to available pool</li>
            </ol>
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-300">
              <h4 className="font-semibold text-blue-900 mb-2">📌 Important Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                <li><strong>✓ Auto-Save:</strong> All changes (create, update, delete) are saved immediately to the database</li>
                <li><strong>✓ Batch Mapping:</strong> Buckets are automatically mapped to batches for the selected course, department, and semester</li>
                <li>Subjects are filtered based on your selected college, course, department, and semester</li>
                <li>Only Creator Faculty can access this page</li>
                <li>Changes are specific to the selected course, department, and semester combination</li>
                <li>Use this to implement NEP 2020 Choice-Based Credit System (CBCS)</li>
                <li>Deleted buckets cannot be recovered - confirm before deleting!</li>
                <li><strong>Categories supported:</strong> Major, Minor, Open Elective, MDM (Multi-Disciplinary), AEC, VAC, etc.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
