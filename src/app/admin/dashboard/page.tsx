'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Search, Building2, Users, BookOpen, Calendar, ChevronDown, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface College {
  id: string;
  name: string;
  code: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head_of_department?: string;
  created_at: string;
  college_id?: string;
}

interface Faculty {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
  phone?: string;
  role: 'admin' | 'college_admin' | 'faculty';
  faculty_type?: 'creator' | 'publisher' | 'general' | 'guest';
  department_id: string | null;
  is_active: boolean;
  college_id?: string;
  departments?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Classroom {
  id: string;
  name: string;
  building?: string;
  floor_number?: number;
  capacity: number;
  type: 'Lecture Hall' | 'Lab' | 'Seminar Room' | 'Tutorial Room' | 'Auditorium';
  has_projector: boolean;
  has_ac: boolean;
  has_computers: boolean;
  has_lab_equipment: boolean;
  is_smart_classroom: boolean;
  classroom_priority: number;
  booking_weight: number;
  facilities: string[];
  location_notes?: string;
  is_available: boolean;
  created_at: string;
}

interface Batch {
  id: string;
  name: string;
  college_id: string;
  department_id: string;
  course_id?: string;
  semester: number;
  section: string;
  academic_year: string;
  expected_strength: number;
  actual_strength: number;
  is_active: boolean;
  created_at: string;
  departments?: {
    id: string;
    name: string;
    code: string;
  } | null;
  courses?: {
    id: string;
    title: string;
    code: string;
  } | null;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  credits_per_week: number;
  semester?: number;
  college_id: string;
  department_id: string;
  course_id?: string | null;
  subject_type: 'THEORY' | 'LAB' | 'PRACTICAL' | 'TUTORIAL';  // Delivery type enum
  nep_category?: 'MAJOR' | 'MINOR' | 'MULTIDISCIPLINARY' | 'AEC' | 'VAC' | 'CORE' | 'PEDAGOGY' | 'INTERNSHIP';  // NEP classification
  preferred_duration?: number;
  max_continuous_hours?: number;
  requires_lab?: boolean;
  requires_projector?: boolean;
  requires_special_room?: boolean;
  is_intensive_subject?: boolean;
  min_gap_hours?: number;
  algorithm_complexity?: number;
  is_core_subject?: boolean;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  departments?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Course {
  id: string;
  title: string;
  code: string;
  nature_of_course?: string;
  intake: number;
  duration_years?: number;
  college_id: string;
  created_at: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
  student_id?: string;
  phone?: string;
  admission_year: number;
  current_semester: number;
  course_id?: string;
  department_id?: string | null;
  is_active: boolean;
  created_at: string;
  departments?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface ElectiveBucket {
  id: string;
  batch_id: string;
  bucket_name: string;
  min_selection: number;
  max_selection: number;
  is_common_slot: boolean;
  created_at: string;
  updated_at?: string;
  subjects?: Array<{ id: string }>;
  batches?: {
    id: string;
    name: string;
    semester: number;
    section: string;
    academic_year: string;
    course_id?: string;
    department_id: string;
    college_id: string;
    departments?: {
      id: string;
      name: string;
      code: string;
    } | null;
    courses?: {
      id: string;
      title: string;
      code: string;
    } | null;
  } | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'departments' | 'faculty' | 'classrooms' | 'batches' | 'buckets' | 'subjects' | 'courses' | 'students'>('departments');
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [collegeDropdownOpen, setCollegeDropdownOpen] = useState(false);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [buckets, setBuckets] = useState<ElectiveBucket[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [bucketCourseFilter, setBucketCourseFilter] = useState<string>('all');
  const [bucketSemesterFilter, setBucketSemesterFilter] = useState<string>('all');
  const [courseSemesterFilter, setCourseSemesterFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [showPassword, setShowPassword] = useState(false);

  // Loading states for forms
  const [submittingDept, setSubmittingDept] = useState(false);
  const [submittingFaculty, setSubmittingFaculty] = useState(false);
  const [submittingClassroom, setSubmittingClassroom] = useState(false);
  const [submittingSubject, setSubmittingSubject] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [submittingBucket, setSubmittingBucket] = useState(false);

  // Department form state
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Faculty form state
  const [showFacultyForm, setShowFacultyForm] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultyForm, setFacultyForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'faculty' as 'admin' | 'college_admin' | 'faculty',
    faculty_type: 'general' as 'creator' | 'publisher' | 'general' | 'guest',
    department_id: '',
    college_id: '',
    is_active: true
  });

  // Classroom form state
  const [showClassroomForm, setShowClassroomForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classroomForm, setClassroomForm] = useState({
    name: '',
    building: '',
    floor_number: 1,
    capacity: 30,
    type: 'Lecture Hall' as 'Lecture Hall' | 'Lab' | 'Seminar Room' | 'Tutorial Room' | 'Auditorium',
    has_projector: false,
    has_ac: false,
    has_computers: false,
    has_lab_equipment: false,
    is_smart_classroom: false,
    classroom_priority: 5,
    booking_weight: 1.0,
    facilities: [] as string[],
    location_notes: '',
    is_available: true
  });

  // Subject form state
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    credits_per_week: 4,
    semester: 1,
    department_id: '',
    course_id: '',
    subject_type: 'THEORY' as 'THEORY' | 'LAB' | 'PRACTICAL' | 'TUTORIAL',  // Delivery type
    nep_category: 'CORE' as 'MAJOR' | 'MINOR' | 'MULTIDISCIPLINARY' | 'AEC' | 'VAC' | 'CORE' | 'PEDAGOGY' | 'INTERNSHIP',  // NEP classification
    description: '',
    requires_lab: false,
    requires_projector: false,
    is_active: true
  });

  // Course form state
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    code: '',
    nature_of_course: '',
    intake: 0,
    duration_years: 4
  });

  // Student form state
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    student_id: '',
    phone: '',
    password: '',
    current_semester: 1,
    admission_year: new Date().getFullYear(),
    course_id: '',
    department_id: '',
    is_active: true
  });

  // Bucket form state
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchForm, setBatchForm] = useState({
    department_id: '',
    course_id: '',
    semester: 1,
    academic_year: '2025-26',
    admission_year: 2025,
    section: 'A',
    expected_strength: 60,
    actual_strength: 0
  });
  const [editingBucket, setEditingBucket] = useState<ElectiveBucket | null>(null);
  const [bucketForm, setBucketForm] = useState({
    batch_id: '',
    bucket_name: '',
    min_selection: 1,
    max_selection: 1,
    is_common_slot: true
  });
  const [bucketSubjectFilter, setBucketSubjectFilter] = useState({
    course_id: '',
    department_id: '',
    semester: ''
  });
  const [selectedSubjectsForBucket, setSelectedSubjectsForBucket] = useState<string[]>([]);
  const [bucketSubjects, setBucketSubjects] = useState<Subject[]>([]);

  // Auto-filter subjects when batch is selected for bucket
  useEffect(() => {
    if (bucketForm.batch_id) {
      const selectedBatch = batches.find(b => b.id === bucketForm.batch_id);
      if (selectedBatch) {
        // Auto-set filters based on batch
        setBucketSubjectFilter({
          course_id: selectedBatch.course_id || '',
          department_id: selectedBatch.department_id || '',
          semester: selectedBatch.semester?.toString() || ''
        });
      }
    }
  }, [bucketForm.batch_id, batches]);

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'admin' && user.role !== 'college_admin' && user.role !== 'super_admin') {
      router.push('/login?message=Access denied');
      return;
    }

    setUserRole(user.role);

    // Set default tab for super_admin to faculty
    if (user.role === 'super_admin') {
      setActiveTab('faculty');
    }

    fetchColleges(user);
  }, [router]);

  // Fetch colleges list
  const fetchColleges = async (user: any) => {
    try {
      const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/admin/colleges', { headers });
      if (response.ok) {
        const data = await response.json();
        const collegesList = data.colleges || [];
        setColleges(collegesList);

        // Auto-select college based on role
        if (user.role === 'college_admin' && user.college_id) {
          const userCollege = collegesList.find((c: College) => c.id === user.college_id);
          if (userCollege) {
            setSelectedCollege(userCollege);
            fetchData(userCollege.id);
          } else {
            // If college not found but user has college_id, still fetch data
            fetchData(user.college_id);
          }
        } else if (user.role === 'admin' && user.college_id) {
          // For regular admin with college_id, fetch their college data
          const userCollege = collegesList.find((c: College) => c.id === user.college_id);
          if (userCollege) {
            setSelectedCollege(userCollege);
          }
          fetchData(user.college_id);
        } else if (user.role === 'super_admin') {
          // For super admin, check if there's a saved college preference
          const savedCollegeId = localStorage.getItem('selected_college_id');
          if (savedCollegeId) {
            const savedCollege = collegesList.find((c: College) => c.id === savedCollegeId);
            if (savedCollege) {
              setSelectedCollege(savedCollege);
              fetchData(savedCollege.id);
              return;
            }
          }
          // Otherwise, select first college by default
          if (collegesList.length > 0) {
            setSelectedCollege(collegesList[0]);
            fetchData(collegesList[0].id);
          }
        } else {
          // Fallback: if no college_id, just fetch data without filtering
          fetchData();
        }
      } else if (response.status === 401) {
        router.push('/login?message=Session expired');
      } else {
        // If colleges API fails, still try to fetch data
        console.warn('Failed to fetch colleges, attempting to fetch data anyway');
        fetchData(user.college_id);
      }
    } catch (error) {
      console.error('Error fetching colleges:', error);
      setError('Failed to load colleges');
      // Even if college fetch fails, try to fetch data
      fetchData(user.college_id);
    }
  };

  // Handle college selection change
  const handleCollegeChange = (college: College) => {
    setSelectedCollege(college);
    setCollegeDropdownOpen(false);
    setCollegeSearchQuery('');

    // Save preference for super admin
    if (userRole === 'super_admin') {
      localStorage.setItem('selected_college_id', college.id);
    }

    // Refresh data for selected college
    fetchData(college.id);
  };

  // Filter colleges based on search
  const filteredColleges = colleges.filter(college =>
    college.name.toLowerCase().includes(collegeSearchQuery.toLowerCase()) ||
    college.code.toLowerCase().includes(collegeSearchQuery.toLowerCase())
  );

  const fetchData = async (collegeId?: string) => {
    try {
      setLoading(true);

      // Get user data for authentication
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      // Create authentication token (base64 encoded user data)
      let userDataObj = JSON.parse(userData);

      // Fix: Add college_id if missing (for existing users)
      if (!userDataObj.college_id && userDataObj.departments?.id) {
        // Try to get college_id from department
        const deptResponse = await fetch(`/api/admin/departments/${userDataObj.departments.id}`);
        if (deptResponse.ok) {
          const deptData = await deptResponse.json();
          userDataObj.college_id = deptData.college_id;
          localStorage.setItem('user', JSON.stringify(userDataObj));
        }
      }

      const authToken = Buffer.from(JSON.stringify(userDataObj)).toString('base64');
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      // Use provided collegeId or user's college_id
      const targetCollegeId = collegeId || userDataObj.college_id;
      const queryParam = targetCollegeId ? `?college_id=${targetCollegeId}` : '';

      // Fetch all data in parallel for faster loading
      const [deptResponse, facultyResponse, classroomResponse, batchResponse, bucketResponse, subjectResponse, courseResponse, studentResponse] = await Promise.all([
        fetch(`/api/admin/departments${queryParam}`, { headers }),
        fetch(`/api/admin/faculty${queryParam}`, { headers }),
        fetch(`/api/admin/classrooms${queryParam}`, { headers }),
        fetch(`/api/admin/batches${queryParam}`, { headers }),
        fetch(`/api/admin/buckets${queryParam}`, { headers }),
        fetch(`/api/admin/subjects${queryParam}`, { headers }),
        fetch(`/api/admin/courses${queryParam}`, { headers }),
        fetch(`/api/admin/students${queryParam}`, { headers })
      ]);

      // Check for auth errors
      if (deptResponse.status === 401 || facultyResponse.status === 401 || classroomResponse.status === 401 ||
        batchResponse.status === 401 || bucketResponse.status === 401 || subjectResponse.status === 401 ||
        courseResponse.status === 401 || studentResponse.status === 401) {
        router.push('/login?message=Session expired');
        return;
      }

      // Process all responses in parallel
      const [deptData, facultyData, classroomData, batchData, bucketData, subjectData, courseData, studentData] = await Promise.all([
        deptResponse.ok ? deptResponse.json() : Promise.resolve({ departments: [] }),
        facultyResponse.ok ? facultyResponse.json() : Promise.resolve({ faculty: [] }),
        classroomResponse.ok ? classroomResponse.json() : Promise.resolve({ classrooms: [] }),
        batchResponse.ok ? batchResponse.json() : Promise.resolve({ batches: [] }),
        bucketResponse.ok ? bucketResponse.json() : Promise.resolve({ buckets: [] }),
        subjectResponse.ok ? subjectResponse.json() : Promise.resolve({ subjects: [] }),
        courseResponse.ok ? courseResponse.json() : Promise.resolve({ courses: [] }),
        studentResponse.ok ? studentResponse.json() : Promise.resolve({ students: [] })
      ]);

      // Update all state at once
      setDepartments(deptData.departments || []);
      setFaculty(facultyData.faculty || []);
      setClassrooms(classroomData.classrooms || []);
      setBatches(batchData.batches || []);
      setBuckets(bucketData.buckets || []);
      setSubjects(subjectData.subjects || []);
      setCourses(courseData.courses || []);
      setStudents(studentData.students || []);

    } catch (error: any) {
      setError('Failed to fetch data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDept(true);
    setError('');

    try {
      // Get authentication token
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : '/api/admin/departments';

      const response = await fetch(url, {
        method: editingDept ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(deptForm)
      });

      if (response.ok) {
        const data = await response.json();
        const dept = data.department;

        // Optimistic update
        if (editingDept) {
          setDepartments(prev => prev.map(d => d.id === dept.id ? dept : d));
          setSuccessMessage('Department updated successfully');
        } else {
          setDepartments(prev => [...prev, dept]);
          setSuccessMessage('Department created successfully');
        }

        setShowDeptForm(false);
        setEditingDept(null);
        setDeptForm({ name: '', code: '', description: '' });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save department');
      }
    } catch (error) {
      setError('Failed to save department');
    } finally {
      setSubmittingDept(false);
    }
  };

  const handleDeptDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      // Get authentication token
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete department');
      }
    } catch (error) {
      setError('Failed to delete department');
    }
  };

  const handleFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFaculty(true);
    setError('');

    try {
      // Get authentication token
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingFaculty
        ? `/api/admin/faculty/${editingFaculty.id}`
        : '/api/admin/faculty';

      const response = await fetch(url, {
        method: editingFaculty ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(facultyForm)
      });

      if (response.ok) {
        const data = await response.json();
        const fac = data.faculty;

        // Optimistic update
        if (editingFaculty) {
          setFaculty(prev => prev.map(f => f.id === fac.id ? fac : f));
          setSuccessMessage('Faculty updated successfully');
        } else {
          setFaculty(prev => [...prev, fac]);
          setSuccessMessage('Faculty created successfully');
        }

        setShowFacultyForm(false);
        setEditingFaculty(null);
        setFacultyForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          role: 'faculty',
          faculty_type: 'general',
          department_id: '',
          college_id: '',
          is_active: true
        });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save faculty');
      }
    } catch (error) {
      setError('Failed to save faculty');
    } finally {
      setSubmittingFaculty(false);
    }
  };

  const handleFacultyDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this faculty member? This action cannot be undone.')) return;

    setError('');
    setSuccessMessage('');

    try {
      // Get authentication token
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/admin/faculty/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        setSuccessMessage('Faculty member deleted successfully');
        fetchData();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete faculty');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete faculty. Please try again.');
    }
  };

  const startEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || ''
    });
    setShowDeptForm(true);
  };

  const startEditFaculty = (fac: Faculty) => {
    setEditingFaculty(fac);
    setFacultyForm({
      first_name: fac.first_name,
      last_name: fac.last_name,
      email: fac.email,
      phone: fac.phone || '',
      role: fac.role,
      faculty_type: fac.faculty_type || 'general',
      department_id: fac.department_id || '',
      college_id: fac.college_id || selectedCollege?.id || '',
      is_active: fac.is_active
    });
    setShowFacultyForm(true);
  };

  const handleClassroomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClassroom(true);
    setError('');

    try {
      // Get authentication token
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingClassroom
        ? `/api/admin/classrooms/${editingClassroom.id}`
        : '/api/admin/classrooms';

      const response = await fetch(url, {
        method: editingClassroom ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(classroomForm)
      });

      if (response.ok) {
        const data = await response.json();
        const classroom = data.classroom;

        // Optimistic update
        if (editingClassroom) {
          setClassrooms(prev => prev.map(c => c.id === classroom.id ? classroom : c));
          setSuccessMessage('Classroom updated successfully');
        } else {
          setClassrooms(prev => [...prev, classroom]);
          setSuccessMessage('Classroom created successfully');
        }

        setShowClassroomForm(false);
        setEditingClassroom(null);
        setClassroomForm({
          name: '',
          building: '',
          floor_number: 1,
          capacity: 30,
          type: 'Lecture Hall',
          has_projector: false,
          has_ac: false,
          has_computers: false,
          has_lab_equipment: false,
          is_smart_classroom: false,
          classroom_priority: 5,
          booking_weight: 1.0,
          facilities: [],
          location_notes: '',
          is_available: true
        });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save classroom');
      }
    } catch (error) {
      setError('Failed to save classroom');
    } finally {
      setSubmittingClassroom(false);
    }
  };

  const handleClassroomDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;

    try {
      // Get authentication token
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/admin/classrooms/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete classroom');
      }
    } catch (error) {
      setError('Failed to delete classroom');
    }
  };

  const startEditClassroom = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setClassroomForm({
      name: classroom.name,
      building: classroom.building || '',
      floor_number: classroom.floor_number || 1,
      capacity: classroom.capacity,
      type: classroom.type,
      has_projector: classroom.has_projector,
      has_ac: classroom.has_ac,
      has_computers: classroom.has_computers,
      has_lab_equipment: classroom.has_lab_equipment,
      is_smart_classroom: classroom.is_smart_classroom,
      classroom_priority: classroom.classroom_priority,
      booking_weight: classroom.booking_weight,
      facilities: classroom.facilities || [],
      location_notes: classroom.location_notes || '',
      is_available: classroom.is_available
    });
    setShowClassroomForm(true);
  };

  // Batch handlers
  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      const token = btoa(JSON.stringify({ id: parsedUser.id, role: parsedUser.role, department_id: parsedUser.department_id }));

      const response = await fetch('/api/batches/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(batchForm)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(`Failed to create batch: ${result.error || 'Unknown error'}`);
        return;
      }

      alert(result.message || 'Batch created successfully!');
      setShowBatchForm(false);
      setBatchForm({
        department_id: '',
        course_id: '',
        semester: 1,
        academic_year: '2025-26',
        admission_year: 2025,
        section: 'A',
        expected_strength: 60,
        actual_strength: 0
      });
      fetchData();
    } catch (error: any) {
      console.error('Error creating batch:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleBatchDelete = async (id: string, batchName: string) => {
    if (!confirm(`Are you sure you want to delete batch "${batchName}"?\n\nThis will also delete:\n- All elective buckets associated with this batch\n- All subject assignments linked to this batch\n- Student enrollments\n\nThis action cannot be undone.`)) return;

    try {
      // Get authentication token
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      const token = btoa(JSON.stringify({ id: parsedUser.id, role: parsedUser.role, department_id: parsedUser.department_id }));

      const response = await fetch(`/api/admin/batches?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Batch deleted successfully');
        fetchData(); // Refresh the data
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete batch');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      setError('Failed to delete batch');
    }
  };

  // Subject handlers
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSubject(true);
    setError('');

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingSubject
        ? `/api/admin/subjects/${editingSubject.id}`
        : '/api/admin/subjects';

      const response = await fetch(url, {
        method: editingSubject ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(subjectForm)
      });

      if (response.ok) {
        const data = await response.json();
        const subject = data.subject;

        // Optimistic update
        if (editingSubject) {
          setSubjects(prev => prev.map(s => s.id === subject.id ? subject : s));
          setSuccessMessage('Subject updated successfully');
        } else {
          setSubjects(prev => [...prev, subject]);
          setSuccessMessage('Subject created successfully');
        }

        setShowSubjectForm(false);
        setEditingSubject(null);
        setSubjectForm({
          code: '',
          name: '',
          credits_per_week: 4,
          semester: 1,
          department_id: '',
          course_id: '',
          subject_type: 'THEORY',
          nep_category: 'CORE',
          description: '',
          requires_lab: false,
          requires_projector: false,
          is_active: true
        });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save subject');
      }
    } catch (error) {
      setError('Failed to save subject');
    } finally {
      setSubmittingSubject(false);
    }
  };

  const handleSubjectDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/admin/subjects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        setSuccessMessage('Subject deleted successfully');
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete subject');
      }
    } catch (error) {
      setError('Failed to delete subject');
    }
  };

  const startEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      code: subject.code,
      name: subject.name,
      credits_per_week: subject.credits_per_week,
      semester: subject.semester || 1,
      department_id: subject.department_id,
      course_id: subject.course_id || '',
      subject_type: subject.subject_type,
      nep_category: subject.nep_category || 'CORE',
      description: subject.description || '',
      requires_lab: subject.requires_lab || false,
      requires_projector: subject.requires_projector || false,
      is_active: subject.is_active
    });
    setShowSubjectForm(true);
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCourse(true);
    setError('');

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingCourse
        ? `/api/admin/courses/${editingCourse.id}`
        : '/api/admin/courses';

      const response = await fetch(url, {
        method: editingCourse ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(courseForm)
      });

      if (response.ok) {
        const data = await response.json();
        const course = data.course;

        // Optimistic update
        if (editingCourse) {
          setCourses(prev => prev.map(c => c.id === course.id ? course : c));
          setSuccessMessage('Course updated successfully');
        } else {
          setCourses(prev => [...prev, course]);
          setSuccessMessage('Course created successfully');
        }

        setShowCourseForm(false);
        setEditingCourse(null);
        setCourseForm({
          title: '',
          code: '',
          nature_of_course: '',
          intake: 0,
          duration_years: 4
        });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save course');
      }
    } catch (error) {
      setError('Failed to save course');
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleCourseDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This will affect associated subjects.')) return;

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/admin/courses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        setSuccessMessage('Course deleted successfully');
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete course');
      }
    } catch (error) {
      setError('Failed to delete course');
    }
  };

  const startEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      code: course.code,
      nature_of_course: course.nature_of_course || '',
      intake: course.intake,
      duration_years: course.duration_years || 4
    });
    setShowCourseForm(true);
  };

  // Student handlers
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate course selection
    if (!studentForm.course_id) {
      setError('Course selection is required');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSubmittingStudent(true);
    setError('');

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingStudent
        ? `/api/admin/students/${editingStudent.id}`
        : '/api/admin/students';

      const response = await fetch(url, {
        method: editingStudent ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(studentForm)
      });

      if (response.ok) {
        const data = await response.json();
        const student = data.student;

        // Optimistic update
        if (editingStudent) {
          setStudents(prev => prev.map(s => s.id === student.id ? student : s));
          setSuccessMessage('Student updated successfully');
        } else {
          setStudents(prev => [...prev, student]);
          setSuccessMessage('Student created successfully');
        }

        setShowStudentForm(false);
        setEditingStudent(null);
        setStudentForm({
          first_name: '',
          last_name: '',
          email: '',
          student_id: '',
          phone: '',
          password: '',
          current_semester: 1,
          admission_year: new Date().getFullYear(),
          course_id: '',
          department_id: '',
          is_active: true
        });
        setShowPassword(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save student');
      }
    } catch (error) {
      setError('Failed to save student');
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleStudentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/admin/students/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        setSuccessMessage('Student deleted successfully');
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete student');
      }
    } catch (error) {
      setError('Failed to delete student');
    }
  };

  const startEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      student_id: student.student_id || '',
      phone: student.phone || '',
      password: '',
      current_semester: student.current_semester,
      admission_year: student.admission_year,
      course_id: student.course_id || '',
      department_id: student.department_id || '',
      is_active: student.is_active
    });
    setShowPassword(false);
    setShowStudentForm(true);
  };

  // Bucket handlers
  const handleBucketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bucketForm.batch_id) {
      setError('Batch selection is required');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!bucketForm.bucket_name.trim()) {
      setError('Bucket name is required');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (selectedSubjectsForBucket.length === 0 && !editingBucket) {
      if (!confirm('No subjects selected. Create bucket without subjects?')) {
        return;
      }
    }

    setSubmittingBucket(true);
    setError('');

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingBucket
        ? `/api/admin/buckets/${editingBucket.id}`
        : '/api/admin/buckets';

      const payload = {
        ...bucketForm,
        subject_ids: selectedSubjectsForBucket
      };

      console.log('Submitting bucket:', payload);

      const response = await fetch(url, {
        method: editingBucket ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const bucket = data.bucket;

        console.log('Bucket saved successfully:', bucket);

        // Optimistic update
        if (editingBucket) {
          setBuckets(prev => prev.map(b => b.id === bucket.id ? bucket : b));
          setSuccessMessage('Bucket updated successfully');
        } else {
          setBuckets(prev => [...prev, bucket]);
          setSuccessMessage('Bucket created successfully');
        }

        setShowBucketForm(false);
        setEditingBucket(null);
        setBucketForm({
          batch_id: '',
          bucket_name: '',
          min_selection: 1,
          max_selection: 1,
          is_common_slot: true
        });
        setSelectedSubjectsForBucket([]);
        setBucketSubjectFilter({ course_id: '', department_id: '', semester: '' });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save bucket');
      }
    } catch (error) {
      setError('Failed to save bucket');
    } finally {
      setSubmittingBucket(false);
    }
  };

  const handleBucketDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bucket? This will remove all subject associations.')) return;

    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const authToken = Buffer.from(userData).toString('base64');
      const response = await fetch(`/api/admin/buckets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        setBuckets(prev => prev.filter(b => b.id !== id));
        setSuccessMessage('Bucket deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete bucket');
      }
    } catch (error) {
      setError('Failed to delete bucket');
    }
  };

  const startEditBucket = async (bucket: ElectiveBucket) => {
    setEditingBucket(bucket);
    setBucketForm({
      batch_id: bucket.batch_id,
      bucket_name: bucket.bucket_name,
      min_selection: bucket.min_selection,
      max_selection: bucket.max_selection,
      is_common_slot: bucket.is_common_slot
    });

    // Fetch subjects for this bucket
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const authToken = Buffer.from(userData).toString('base64');
        const response = await fetch(`/api/admin/buckets/${bucket.id}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedSubjectsForBucket(data.subject_ids || []);
        }
      }
    } catch (error) {
      console.error('Error fetching bucket subjects:', error);
    }

    setShowBucketForm(true);
  };

  // Helper function to get max semesters for a course
  const getMaxSemestersForCourse = (courseId: string): number => {
    if (!courseId) return 8; // Default max
    const course = courses.find(c => c.id === courseId);
    if (!course || !course.duration_years) return 8;
    // Each year has 2 semesters
    return course.duration_years * 2;
  };

  // Filter data based on search query
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaculty = faculty.filter(f => {
    const matchesSearch = f.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.college_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.departments?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = departmentFilter === 'all' || f.department_id === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const filteredClassrooms = classrooms.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.building || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location_notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const filteredBatches = batches.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.academic_year.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.departments?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = departmentFilter === 'all' || b.department_id === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subject_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nep_category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.departments?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSemester = selectedSemester === 'all' || s.semester === selectedSemester;
    const matchesCourse = courseSemesterFilter === 'all' || s.course_id === courseSemesterFilter;
    const matchesDepartment = departmentFilter === 'all' || s.department_id === departmentFilter;

    return matchesSearch && matchesSemester && matchesCourse && matchesDepartment;
  });

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.nature_of_course || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.college_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.student_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.departments?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse = courseFilter === 'all' || s.course_id === courseFilter;
    const matchesDepartment = departmentFilter === 'all' || s.department_id === departmentFilter;

    return matchesSearch && matchesCourse && matchesDepartment;
  });

  const filteredBuckets = buckets.filter(b => {
    const matchesSearch = b.bucket_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.batches?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.batches?.section || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.batches?.departments?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse = bucketCourseFilter === 'all' || b.batches?.course_id === bucketCourseFilter;
    const matchesSemester = bucketSemesterFilter === 'all' || b.batches?.semester === parseInt(bucketSemesterFilter);
    const matchesDepartment = departmentFilter === 'all' || b.batches?.department_id === departmentFilter;

    return matchesSearch && matchesCourse && matchesSemester && matchesDepartment;
  });

  // Filter subjects for bucket creation based on bucket filters
  const availableSubjectsForBucket = subjects.filter(s => {
    const matchesCourse = !bucketSubjectFilter.course_id || s.course_id === bucketSubjectFilter.course_id;
    const matchesDepartment = !bucketSubjectFilter.department_id || s.department_id === bucketSubjectFilter.department_id;
    const matchesSemester = !bucketSubjectFilter.semester || s.semester === parseInt(bucketSubjectFilter.semester);
    return matchesCourse && matchesDepartment && matchesSemester && s.is_active;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-gray-600">Manage departments and faculty members. Creator Faculty can access NEP Bucket Builder from their dashboard.</p>
            </div>

            {/* College Selector - Only for Super Admin */}
            {userRole === 'super_admin' && (
              <div className="relative">
                <button
                  onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Building2 className="h-5 w-5 text-gray-500" />
                  <span className="font-medium text-gray-700">
                    {selectedCollege ? selectedCollege.name : 'Select College'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${collegeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {collegeDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Search colleges..."
                        value={collegeSearchQuery}
                        onChange={(e) => setCollegeSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredColleges.map((college) => (
                        <button
                          key={college.id}
                          onClick={() => handleCollegeChange(college)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedCollege?.id === college.id ? 'bg-blue-50' : ''
                            }`}
                        >
                          <div className="font-medium text-gray-900">{college.name}</div>
                          <div className="text-sm text-gray-500">{college.code}</div>
                        </button>
                      ))}
                      {filteredColleges.length === 0 && (
                        <div className="px-4 py-3 text-center text-gray-500">
                          No colleges found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* College Info Display - For College Admin */}
            {userRole === 'college_admin' && selectedCollege && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">{selectedCollege.name}</div>
                  <div className="text-sm text-blue-600">{selectedCollege.code}</div>
                </div>
              </div>
            )}
          </div>

          {/* Active College Banner - Shows for both Super Admin and College Admin */}
          {selectedCollege && (
            <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6" />
                  <div>
                    <div className="text-sm font-medium opacity-90">Viewing Data For:</div>
                    <div className="text-lg font-bold">{selectedCollege.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90">College Code</div>
                  <div className="text-lg font-semibold">{selectedCollege.code}</div>
                </div>
              </div>
              {selectedCollege.address && (
                <div className="mt-2 text-sm opacity-90 flex items-center gap-2">
                  <span>📍</span>
                  <span>{selectedCollege.address}</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
              <button
                onClick={() => setError('')}
                className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
              {successMessage}
              <button
                onClick={() => setSuccessMessage('')}
                className="absolute top-3 right-3 text-green-500 hover:text-green-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {userRole !== 'super_admin' && (
                  <button
                    onClick={() => setActiveTab('departments')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'departments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    Departments ({departments.length})
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('faculty')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'faculty'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {userRole === 'super_admin' ? 'College Admins' : 'Faculty'} ({faculty.length})
                </button>
                {userRole !== 'super_admin' && (
                  <>
                    <button
                      onClick={() => setActiveTab('classrooms')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'classrooms'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      Classrooms ({classrooms.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('batches')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'batches'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      Batches ({batches.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('buckets')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'buckets'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      Buckets ({buckets.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('subjects')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'subjects'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      Subjects ({subjects.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('courses')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'courses'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      Courses ({courses.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('students')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'students'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      Students ({students.length})
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>

          {/* Search Bar */}
          {userRole !== 'super_admin' || activeTab === 'faculty' ? (
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ) : null}

          {/* Departments Tab */}
          {activeTab === 'departments' && userRole !== 'super_admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Departments</h2>
                <button
                  onClick={() => {
                    setEditingDept(null);
                    setDeptForm({ name: '', code: '', description: '' });
                    setShowDeptForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Department
                </button>
              </div>

              {/* Department Form Modal */}
              {showDeptForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingDept ? 'Edit Department' : 'Add Department'}
                    </h3>
                    <form onSubmit={handleDeptSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <input
                            type="text"
                            required
                            value={deptForm.name}
                            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Department Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Code</label>
                          <input
                            type="text"
                            required
                            value={deptForm.code}
                            onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Department Code"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={deptForm.description}
                            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Department Description"
                          />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowDeptForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingDept}
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submittingDept ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingDept ? 'Updating...' : 'Creating...'}</span>
                            </>
                          ) : (
                            editingDept ? 'Update' : 'Create'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Departments List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredDepartments.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No departments found matching "{searchQuery}"
                    </li>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <li key={dept.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-indigo-600 truncate">
                                  {dept.name}
                                </p>
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {dept.code}
                                </span>
                              </div>
                              {dept.description && (
                                <p className="mt-2 text-sm text-gray-600">{dept.description}</p>
                              )}
                              <p className="mt-2 text-xs text-gray-500">
                                Created: {new Date(dept.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditDept(dept)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeptDelete(dept.id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )))}
                </ul>
              </div>
            </div>
          )}

          {/* Faculty Tab */}
          {activeTab === 'faculty' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Faculty</h2>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Faculty by Department"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setEditingFaculty(null);
                    setFacultyForm({
                      first_name: '',
                      last_name: '',
                      email: '',
                      phone: '',
                      role: 'faculty',
                      faculty_type: 'general',
                      department_id: '',
                      college_id: selectedCollege?.id || '',
                      is_active: true
                    });
                    setShowFacultyForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Faculty
                </button>
              </div>

              {/* Faculty Form Modal */}
              {showFacultyForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingFaculty ? 'Edit Faculty' : 'Add Faculty'}
                    </h3>
                    <form onSubmit={handleFacultySubmit}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">First Name</label>
                          <input
                            type="text"
                            required
                            value={facultyForm.first_name}
                            onChange={(e) => setFacultyForm({ ...facultyForm, first_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Faculty First Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Last Name</label>
                          <input
                            type="text"
                            required
                            value={facultyForm.last_name}
                            onChange={(e) => setFacultyForm({ ...facultyForm, last_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Faculty Last Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            required
                            value={facultyForm.email}
                            onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Faculty Email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            type="tel"
                            value={facultyForm.phone}
                            onChange={(e) => setFacultyForm({ ...facultyForm, phone: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Faculty Phone Number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department <span className="text-gray-400">(Optional)</span></label>
                          <select
                            value={facultyForm.department_id}
                            onChange={(e) => setFacultyForm({ ...facultyForm, department_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Faculty Department"
                          >
                            <option value="">No Department</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Role</label>
                          <select
                            value={facultyForm.role}
                            onChange={(e) => setFacultyForm({ ...facultyForm, role: e.target.value as 'admin' | 'college_admin' | 'faculty' })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Faculty Role"
                          >
                            <option value="faculty">Faculty</option>
                            <option value="college_admin">College Admin</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Faculty Type</label>
                          <select
                            value={facultyForm.faculty_type}
                            onChange={(e) => setFacultyForm({ ...facultyForm, faculty_type: e.target.value as 'creator' | 'publisher' | 'general' | 'guest' })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Faculty Type"
                          >
                            <option value="general">General</option>
                            <option value="creator">Creator</option>
                            <option value="publisher">Publisher</option>
                            <option value="guest">Guest</option>
                          </select>
                        </div>
                        {userRole === 'super_admin' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">College {facultyForm.role === 'college_admin' ? '*' : ''}</label>
                            <select
                              value={facultyForm.college_id}
                              onChange={(e) => setFacultyForm({ ...facultyForm, college_id: e.target.value })}
                              required={facultyForm.role === 'college_admin'}
                              className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              aria-label="Faculty College"
                            >
                              <option value="">Select College</option>
                              {colleges.map((college) => (
                                <option key={college.id} value={college.id}>
                                  {college.name} ({college.code})
                                </option>
                              ))}
                            </select>
                            {facultyForm.role === 'college_admin' && (
                              <p className="mt-1 text-xs text-gray-500">College Admin must be assigned to a college</p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={facultyForm.is_active}
                            onChange={(e) => setFacultyForm({ ...facultyForm, is_active: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowFacultyForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingFaculty}
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submittingFaculty ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingFaculty ? 'Updating...' : 'Creating...'}</span>
                            </>
                          ) : (
                            editingFaculty ? 'Update' : 'Create'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Faculty List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredFaculty.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No faculty found matching "{searchQuery}"
                    </li>
                  ) : (
                    filteredFaculty.map((fac) => (
                      <li key={fac.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-indigo-600 truncate">
                                  {fac.first_name} {fac.last_name}
                                </p>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fac.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {fac.role}
                                </span>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fac.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {fac.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-gray-600">{fac.email}</p>
                              <p className="mt-1 text-sm text-gray-600">
                                {fac.departments ? `${fac.departments.name} (${fac.departments.code})` : 'No Department Assigned'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500">
                                  {fac.college_uid} • {fac.faculty_type}
                                </p>
                                {fac.college_id && selectedCollege && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                    🏛️ {selectedCollege.code}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditFaculty(fac)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleFacultyDelete(fac.id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )))}
                </ul>
              </div>
            </div>
          )}

          {/* Classrooms Tab */}
          {activeTab === 'classrooms' && userRole !== 'super_admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Classrooms & Labs</h2>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Classrooms by Department"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setEditingClassroom(null);
                    setClassroomForm({
                      name: '',
                      building: '',
                      floor_number: 1,
                      capacity: 30,
                      type: 'Lecture Hall',
                      has_projector: false,
                      has_ac: false,
                      has_computers: false,
                      has_lab_equipment: false,
                      is_smart_classroom: false,
                      classroom_priority: 5,
                      booking_weight: 1.0,
                      facilities: [],
                      location_notes: '',
                      is_available: true
                    });
                    setShowClassroomForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Classroom
                </button>
              </div>

              {/* Classroom Form Modal */}
              {showClassroomForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingClassroom ? 'Edit Classroom' : 'Add Classroom'}
                    </h3>
                    <form onSubmit={handleClassroomSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name *</label>
                          <input
                            type="text"
                            required
                            value={classroomForm.name}
                            onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Room A101, Lab C301"
                            aria-label="Classroom Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Building</label>
                          <input
                            type="text"
                            value={classroomForm.building}
                            onChange={(e) => setClassroomForm({ ...classroomForm, building: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Academic Block A"
                            aria-label="Classroom Building"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Floor Number</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={classroomForm.floor_number}
                            onChange={(e) => setClassroomForm({ ...classroomForm, floor_number: parseInt(e.target.value) || 1 })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Classroom Floor Number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Capacity *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="500"
                            value={classroomForm.capacity}
                            onChange={(e) => setClassroomForm({ ...classroomForm, capacity: parseInt(e.target.value) || 30 })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Classroom Capacity"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type *</label>
                          <select
                            required
                            value={classroomForm.type}
                            onChange={(e) => setClassroomForm({ ...classroomForm, type: e.target.value as any })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Classroom Type"
                          >
                            <option value="Lecture Hall">Lecture Hall</option>
                            <option value="Lab">Lab</option>
                            <option value="Seminar Room">Seminar Room</option>
                            <option value="Tutorial Room">Tutorial Room</option>
                            <option value="Auditorium">Auditorium</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Priority (1-10)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={classroomForm.classroom_priority}
                            onChange={(e) => setClassroomForm({ ...classroomForm, classroom_priority: parseInt(e.target.value) || 5 })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Classroom Priority"
                          />
                        </div>
                      </div>

                      {/* Features */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Features</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="has_projector"
                              checked={classroomForm.has_projector}
                              onChange={(e) => setClassroomForm({ ...classroomForm, has_projector: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="has_projector" className="ml-2 block text-sm text-gray-900">
                              Projector
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="has_ac"
                              checked={classroomForm.has_ac}
                              onChange={(e) => setClassroomForm({ ...classroomForm, has_ac: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="has_ac" className="ml-2 block text-sm text-gray-900">
                              Air Conditioning
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="has_computers"
                              checked={classroomForm.has_computers}
                              onChange={(e) => setClassroomForm({ ...classroomForm, has_computers: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="has_computers" className="ml-2 block text-sm text-gray-900">
                              Computers
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="has_lab_equipment"
                              checked={classroomForm.has_lab_equipment}
                              onChange={(e) => setClassroomForm({ ...classroomForm, has_lab_equipment: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="has_lab_equipment" className="ml-2 block text-sm text-gray-900">
                              Lab Equipment
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="is_smart_classroom"
                              checked={classroomForm.is_smart_classroom}
                              onChange={(e) => setClassroomForm({ ...classroomForm, is_smart_classroom: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_smart_classroom" className="ml-2 block text-sm text-gray-900">
                              Smart Classroom
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="is_available"
                              checked={classroomForm.is_available}
                              onChange={(e) => setClassroomForm({ ...classroomForm, is_available: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">
                              Available
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Location Notes</label>
                        <textarea
                          value={classroomForm.location_notes}
                          onChange={(e) => setClassroomForm({ ...classroomForm, location_notes: e.target.value })}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Additional location information..."
                        />
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowClassroomForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingClassroom}
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submittingClassroom ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingClassroom ? 'Updating...' : 'Creating...'}</span>
                            </>
                          ) : (
                            editingClassroom ? 'Update' : 'Create'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Classrooms List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredClassrooms.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No classrooms found matching "{searchQuery}"
                    </li>
                  ) : (
                    filteredClassrooms.map((classroom) => (
                      <li key={classroom.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-indigo-600 truncate">
                                  {classroom.name}
                                </p>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classroom.type === 'Lab' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {classroom.type}
                                </span>
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {classroom.capacity} seats
                                </span>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classroom.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                  {classroom.is_available ? 'Available' : 'Unavailable'}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-600">
                                {classroom.building && (
                                  <span className="mr-4">📍 {classroom.building}</span>
                                )}
                                {classroom.floor_number && (
                                  <span className="mr-4">🏢 Floor {classroom.floor_number}</span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {classroom.has_projector && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    📽️ Projector
                                  </span>
                                )}
                                {classroom.has_ac && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    ❄️ AC
                                  </span>
                                )}
                                {classroom.has_computers && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                    💻 Computers
                                  </span>
                                )}
                                {classroom.has_lab_equipment && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                                    🔬 Lab Equipment
                                  </span>
                                )}
                                {classroom.is_smart_classroom && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">
                                    🧠 Smart Room
                                  </span>
                                )}
                              </div>
                              {classroom.location_notes && (
                                <p className="mt-2 text-sm text-gray-600">{classroom.location_notes}</p>
                              )}
                              <p className="mt-2 text-xs text-gray-500">
                                Priority: {classroom.classroom_priority}/10 • Created: {new Date(classroom.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditClassroom(classroom)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleClassroomDelete(classroom.id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )))}
                </ul>
                {classrooms.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No classrooms found. Add your first classroom to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Batches Tab */}
          {activeTab === 'batches' && userRole !== 'super_admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Student Batches</h2>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Batches by Department"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowBatchForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create Batch
                </button>
              </div>

              {/* Create Batch Modal */}
              {showBatchForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Batch</h3>
                    <form onSubmit={handleBatchCreate} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department *
                          </label>
                          <select
                            required
                            value={batchForm.department_id}
                            onChange={(e) => setBatchForm({ ...batchForm, department_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>
                                {dept.code} - {dept.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Course *
                          </label>
                          <select
                            required
                            value={batchForm.course_id}
                            onChange={(e) => setBatchForm({ ...batchForm, course_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Course</option>
                            {courses.map(course => (
                              <option key={course.id} value={course.id}>
                                {course.code} - {course.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Semester *
                          </label>
                          <select
                            required
                            value={batchForm.semester}
                            onChange={(e) => setBatchForm({ ...batchForm, semester: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                              <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Academic Year *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="2025-26"
                            value={batchForm.academic_year}
                            onChange={(e) => setBatchForm({ ...batchForm, academic_year: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Admission Year *
                          </label>
                          <input
                            type="number"
                            required
                            min="2020"
                            max="2030"
                            value={batchForm.admission_year}
                            onChange={(e) => setBatchForm({ ...batchForm, admission_year: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Year when students were admitted</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Section *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="A"
                            value={batchForm.section}
                            onChange={(e) => setBatchForm({ ...batchForm, section: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expected Strength *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="200"
                            value={batchForm.expected_strength}
                            onChange={(e) => setBatchForm({ ...batchForm, expected_strength: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Actual Strength
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={batchForm.actual_strength}
                            onChange={(e) => setBatchForm({ ...batchForm, actual_strength: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <strong>Batch Name Preview:</strong> {batchForm.department_id && batchForm.semester ?
                            `${departments.find(d => d.id === batchForm.department_id)?.code || 'DEPT'} Batch ${batchForm.admission_year} - Sem ${batchForm.semester} (${batchForm.academic_year})`
                            : 'Select department and semester to preview name'}
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowBatchForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Create Batch
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Batches List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredBatches.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No batches found matching "{searchQuery}"
                    </li>
                  ) : (
                    filteredBatches.map((batch) => (
                      <li key={batch.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">{batch.name}</h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    <span className="font-medium">ID:</span> {batch.id}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${batch.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {batch.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Department:</span><br />
                                  {batch.departments?.name || 'N/A'} ({batch.departments?.code || 'N/A'})
                                </div>
                                <div>
                                  <span className="font-medium">Semester:</span><br />
                                  Semester {batch.semester}
                                </div>
                                <div>
                                  <span className="font-medium">Section:</span><br />
                                  {batch.section}
                                </div>
                                <div>
                                  <span className="font-medium">Strength:</span><br />
                                  {batch.actual_strength}/{batch.expected_strength}
                                </div>
                              </div>

                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Academic Year:</span> {batch.academic_year}
                                <span className="ml-4 font-medium">Created:</span> {new Date(batch.created_at).toLocaleDateString()}
                              </div>

                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 mb-2">NEP 2020 Data Flow:</h4>
                                <div className="text-xs text-blue-800">
                                  <div className="flex items-center space-x-2">
                                    <span className="bg-blue-100 px-2 py-1 rounded">Batch ID: {batch.id}</span>
                                    <span>→</span>
                                    <span className="bg-green-100 px-2 py-1 rounded">Elective Buckets</span>
                                    <span>→</span>
                                    <span className="bg-yellow-100 px-2 py-1 rounded">Subjects (via course_group_id)</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={() => handleBatchDelete(batch.id, batch.name)}
                                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                                >
                                  Delete Batch
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )))}
                </ul>
                {batches.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No batches found. Batches are created automatically when you create NEP curriculum buckets.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buckets Tab */}
          {activeTab === 'buckets' && userRole !== 'super_admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Elective Buckets</h2>
                  <select
                    value={bucketCourseFilter}
                    onChange={(e) => setBucketCourseFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Buckets by Course"
                  >
                    <option value="all">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Buckets by Department"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bucketSemesterFilter}
                    onChange={(e) => setBucketSemesterFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Buckets by Semester"
                  >
                    <option value="all">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setEditingBucket(null);
                    setBucketForm({
                      batch_id: '',
                      bucket_name: '',
                      min_selection: 1,
                      max_selection: 1,
                      is_common_slot: true
                    });
                    setSelectedSubjectsForBucket([]);
                    setBucketSubjectFilter({ course_id: '', department_id: '', semester: '' });
                    setShowBucketForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create Bucket
                </button>
              </div>

              {/* Bucket Form Modal */}
              {showBucketForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-screen overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingBucket ? 'Edit Elective Bucket' : 'Create New Elective Bucket'}
                    </h3>
                    <form onSubmit={handleBucketSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Batch *</label>
                          <select
                            value={bucketForm.batch_id}
                            onChange={(e) => setBucketForm({ ...bucketForm, batch_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                            disabled={!!editingBucket}
                            aria-label="Bucket Batch"
                          >
                            <option value="">Select Batch</option>
                            {batches.map(batch => (
                              <option key={batch.id} value={batch.id}>
                                {batch.name} - {batch.section} (Sem {batch.semester}, {batch.academic_year})
                              </option>
                            ))}
                          </select>
                          {bucketForm.batch_id && batches.find(b => b.id === bucketForm.batch_id) && (
                            <p className="mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              ✓ Selected: {batches.find(b => b.id === bucketForm.batch_id)?.name} -
                              Sem {batches.find(b => b.id === bucketForm.batch_id)?.semester}
                              ({batches.find(b => b.id === bucketForm.batch_id)?.departments?.code})
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Bucket Name *</label>
                          <input
                            type="text"
                            value={bucketForm.bucket_name}
                            onChange={(e) => setBucketForm({ ...bucketForm, bucket_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Open Elective 1"
                            required
                            aria-label="Bucket Name"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Min Selection</label>
                            <input
                              type="number"
                              min="1"
                              value={bucketForm.min_selection}
                              onChange={(e) => setBucketForm({ ...bucketForm, min_selection: parseInt(e.target.value) })}
                              className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              aria-label="Minimum Subject Selection"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Max Selection</label>
                            <input
                              type="number"
                              min="1"
                              value={bucketForm.max_selection}
                              onChange={(e) => setBucketForm({ ...bucketForm, max_selection: parseInt(e.target.value) })}
                              className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              aria-label="Maximum Subject Selection"
                            />
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="is_common_slot"
                            checked={bucketForm.is_common_slot}
                            onChange={(e) => setBucketForm({ ...bucketForm, is_common_slot: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="is_common_slot" className="ml-2 block text-sm text-gray-900">
                            Common Time Slot (All subjects scheduled together)
                          </label>
                        </div>

                        {/* Subject Selection Section */}
                        {bucketForm.batch_id ? (
                          <div className="border-t pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Add Subjects to Bucket</h4>

                            {/* Subject Filters */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <select
                                value={bucketSubjectFilter.course_id}
                                onChange={(e) => setBucketSubjectFilter({ ...bucketSubjectFilter, course_id: e.target.value })}
                                className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-900"
                                aria-label="Filter Bucket Subjects by Course"
                              >
                                <option value="">All Courses</option>
                                {courses.map(course => (
                                  <option key={course.id} value={course.id}>{course.code}</option>
                                ))}
                              </select>
                              <select
                                value={bucketSubjectFilter.department_id}
                                onChange={(e) => setBucketSubjectFilter({ ...bucketSubjectFilter, department_id: e.target.value })}
                                className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-900"
                                aria-label="Filter Bucket Subjects by Department"
                              >
                                <option value="">All Depts</option>
                                {departments.map(dept => (
                                  <option key={dept.id} value={dept.id}>{dept.code}</option>
                                ))}
                              </select>
                              <select
                                value={bucketSubjectFilter.semester}
                                onChange={(e) => setBucketSubjectFilter({ ...bucketSubjectFilter, semester: e.target.value })}
                                className="text-xs px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-900"
                                aria-label="Filter Bucket Subjects by Semester"
                              >
                                <option value="">All Sems</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                  <option key={sem} value={sem}>Sem {sem}</option>
                                ))}
                              </select>
                            </div>

                            {/* Available Subjects */}
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                              {availableSubjectsForBucket.length === 0 ? (
                                <div className="p-3 text-xs text-gray-500 text-center">
                                  No subjects available with selected filters
                                </div>
                              ) : (
                                availableSubjectsForBucket.map(subject => (
                                  <label
                                    key={subject.id}
                                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedSubjectsForBucket.includes(subject.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedSubjectsForBucket([...selectedSubjectsForBucket, subject.id]);
                                        } else {
                                          setSelectedSubjectsForBucket(selectedSubjectsForBucket.filter(id => id !== subject.id));
                                        }
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-900">
                                      <span className="font-medium">{subject.code}</span> - {subject.name}
                                      <span className="text-xs text-gray-500 ml-1">
                                        ({subject.subject_type}, {subject.credits_per_week} hrs)
                                      </span>
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>

                            {selectedSubjectsForBucket.length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                {selectedSubjectsForBucket.length} subject(s) selected
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="border-t pt-4 mt-4">
                            <div className="text-center py-6 text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <p className="text-sm font-medium">Select a batch first</p>
                              <p className="text-xs mt-1">Choose a batch above to add subjects to this bucket</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowBucketForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingBucket}
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submittingBucket ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingBucket ? 'Updating...' : 'Creating...'}</span>
                            </>
                          ) : (
                            editingBucket ? 'Update' : 'Create'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Buckets List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredBuckets.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      {searchQuery ? `No buckets found matching "${searchQuery}"` : 'No buckets created yet. Create your first elective bucket!'}
                    </li>
                  ) : (
                    filteredBuckets.map((bucket) => (
                      <li key={bucket.id} className="px-4 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{bucket.bucket_name}</h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {bucket.batches?.name} - {bucket.batches?.section}
                              </span>
                              {bucket.is_common_slot && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Common Slot
                                </span>
                              )}
                              {bucket.subjects && bucket.subjects.length > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {bucket.subjects.length} Subject{bucket.subjects.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Department:</span>
                                <p className="font-medium text-gray-900">
                                  {bucket.batches?.departments?.code || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Course:</span>
                                <p className="font-medium text-gray-900">{bucket.batches?.courses?.code || bucket.batches?.courses?.title || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Semester:</span>
                                <p className="font-medium text-gray-900">{bucket.batches?.semester || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Selection:</span>
                                <p className="font-medium text-gray-900">
                                  {bucket.min_selection} - {bucket.max_selection} subjects
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              <span>Academic Year: {bucket.batches?.academic_year || 'N/A'}</span>
                              <span className="mx-2">•</span>
                              <span>Created: {new Date(bucket.created_at).toLocaleDateString()}</span>
                              {bucket.subjects && bucket.subjects.length > 0 && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-purple-600 font-medium">
                                    {bucket.subjects.length} subject(s) available for selection
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => {
                                // Navigate to student choices view for this bucket
                                router.push(`/admin/bucket_creator/choices/${bucket.id}?name=${encodeURIComponent(bucket.bucket_name)}`);
                              }}
                              className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50"
                              title="View student choices"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => startEditBucket(bucket)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                              title="Edit bucket"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleBucketDelete(bucket.id)}
                              className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                              title="Delete bucket"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && userRole !== 'super_admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Subjects</h2>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Subjects by Department"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={courseSemesterFilter}
                    onChange={(e) => setCourseSemesterFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Subjects by Course"
                  >
                    <option value="all">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Subjects by Semester"
                  >
                    <option value="all">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setEditingSubject(null);
                    setSubjectForm({
                      code: '',
                      name: '',
                      credits_per_week: 4,
                      semester: 1,
                      department_id: '',
                      course_id: '',
                      subject_type: 'THEORY',
                      nep_category: 'CORE',
                      description: '',
                      requires_lab: false,
                      requires_projector: false,
                      is_active: true
                    });
                    setShowSubjectForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Subject
                </button>
              </div>

              {/* Subject Form Modal */}
              {showSubjectForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingSubject ? 'Edit Subject' : 'Add Subject'}
                    </h3>
                    <form onSubmit={handleSubjectSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Course *</label>
                          <select
                            required
                            value={subjectForm.course_id}
                            onChange={(e) => setSubjectForm({ ...subjectForm, course_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Subject Course"
                          >
                            <option value="">Select Course</option>
                            {courses.map(course => (
                              <option key={course.id} value={course.id}>
                                {course.title} ({course.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department (Optional)</label>
                          <select
                            value={subjectForm.department_id}
                            onChange={(e) => setSubjectForm({ ...subjectForm, department_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Subject Department"
                          >
                            <option value="">None (No Department)</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Subject Code *</label>
                          <input
                            type="text"
                            required
                            value={subjectForm.code}
                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., CS101, MATH201"
                            aria-label="Subject Code"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Subject Name *</label>
                          <input
                            type="text"
                            required
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Data Structures"
                            aria-label="Subject Name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Credits Per Week *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max="10"
                            value={subjectForm.credits_per_week}
                            onChange={(e) => setSubjectForm({ ...subjectForm, credits_per_week: parseInt(e.target.value) || 1 })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Subject Credits Per Week"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Semester *</label>
                          <select
                            required
                            value={subjectForm.semester}
                            onChange={(e) => setSubjectForm({ ...subjectForm, semester: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Subject Semester"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                              <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={subjectForm.description}
                            onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            rows={3}
                            placeholder="Subject description (optional)"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Subject Type (Delivery) *</label>
                          <select
                            required
                            value={subjectForm.subject_type}
                            onChange={(e) => setSubjectForm({ ...subjectForm, subject_type: e.target.value as any })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Subject Type"
                          >
                            <option value="THEORY">Theory</option>
                            <option value="LAB">Lab</option>
                            <option value="PRACTICAL">Practical</option>
                            <option value="TUTORIAL">Tutorial</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">NEP Category</label>
                          <select
                            value={subjectForm.nep_category}
                            onChange={(e) => setSubjectForm({ ...subjectForm, nep_category: e.target.value as any })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Subject NEP Category"
                          >
                            <option value="CORE">Core</option>
                            <option value="MAJOR">Major</option>
                            <option value="MINOR">Minor</option>
                            <option value="MULTIDISCIPLINARY">Multidisciplinary</option>
                            <option value="AEC">AEC (Ability Enhancement)</option>
                            <option value="VAC">VAC (Value Added)</option>
                            <option value="PEDAGOGY">Pedagogy</option>
                            <option value="INTERNSHIP">Internship</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="requires_lab"
                              checked={subjectForm.requires_lab}
                              onChange={(e) => setSubjectForm({ ...subjectForm, requires_lab: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="requires_lab" className="ml-2 block text-sm text-gray-900">
                              Requires Lab
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="requires_projector"
                              checked={subjectForm.requires_projector}
                              onChange={(e) => setSubjectForm({ ...subjectForm, requires_projector: e.target.checked })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="requires_projector" className="ml-2 block text-sm text-gray-900">
                              Requires Projector
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="subject_is_active"
                            checked={subjectForm.is_active}
                            onChange={(e) => setSubjectForm({ ...subjectForm, is_active: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="subject_is_active" className="ml-2 block text-sm text-gray-900">
                            Active
                          </label>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowSubjectForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingSubject}
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submittingSubject ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingSubject ? 'Updating...' : 'Creating...'}</span>
                            </>
                          ) : (
                            editingSubject ? 'Update' : 'Create'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Subjects List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredSubjects.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No subjects found matching "{searchQuery}"
                    </li>
                  ) : (
                    filteredSubjects.map((subject) => (
                      <li key={subject.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-indigo-600 truncate">
                                  {subject.code}
                                </p>
                                <span className="ml-2 text-sm text-gray-900">
                                  {subject.name}
                                </span>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subject.subject_type === 'LAB' ? 'bg-purple-100 text-purple-800' :
                                  subject.subject_type === 'PRACTICAL' ? 'bg-green-100 text-green-800' :
                                    subject.subject_type === 'TUTORIAL' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-blue-100 text-blue-800'
                                  }`}>
                                  {subject.subject_type}
                                </span>
                                {subject.nep_category && (
                                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subject.nep_category === 'MAJOR' ? 'bg-indigo-100 text-indigo-800' :
                                    subject.nep_category === 'MINOR' ? 'bg-pink-100 text-pink-800' :
                                      subject.nep_category === 'CORE' ? 'bg-cyan-100 text-cyan-800' :
                                        subject.nep_category === 'MULTIDISCIPLINARY' ? 'bg-teal-100 text-teal-800' :
                                          subject.nep_category === 'AEC' ? 'bg-orange-100 text-orange-800' :
                                            subject.nep_category === 'VAC' ? 'bg-lime-100 text-lime-800' :
                                              subject.nep_category === 'PEDAGOGY' ? 'bg-amber-100 text-amber-800' :
                                                'bg-rose-100 text-rose-800'
                                    }`}>
                                    {subject.nep_category}
                                  </span>
                                )}
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subject.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                  {subject.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-600">
                                <span className="mr-4">📚 {subject.credits_per_week} Credits/Week</span>
                                <span className="mr-4">📅 Semester {subject.semester}</span>
                                {subject.departments && (
                                  <span className="mr-4">🏢 {subject.departments.name}</span>
                                )}
                                {subject.course_id && courses.find(c => c.id === subject.course_id) && (
                                  <span className="mr-4">🎓 {courses.find(c => c.id === subject.course_id)?.code}</span>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                Created: {new Date(subject.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditSubject(subject)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleSubjectDelete(subject.id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )))}
                </ul>
                {subjects.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No subjects found. Add your first subject to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && userRole !== 'super_admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Courses</h2>
                <button
                  onClick={() => {
                    setEditingCourse(null);
                    setCourseForm({
                      title: '',
                      code: '',
                      nature_of_course: '',
                      intake: 0,
                      duration_years: 4
                    });
                    setShowCourseForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Course
                </button>
              </div>

              {/* Course Form Modal */}
              {showCourseForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingCourse ? 'Edit Course' : 'Add Course'}
                    </h3>
                    <form onSubmit={handleCourseSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Course Title *</label>
                          <input
                            type="text"
                            required
                            value={courseForm.title}
                            onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Bachelor of Education"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Course Code *</label>
                          <input
                            type="text"
                            required
                            value={courseForm.code}
                            onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., B.Ed, M.Ed, ITEP"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nature of Course</label>
                          <select
                            value={courseForm.nature_of_course}
                            onChange={(e) => setCourseForm({ ...courseForm, nature_of_course: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Course Nature"
                          >
                            <option value="">Select Type</option>
                            <option value="UG">Undergraduate (UG)</option>
                            <option value="PG">Postgraduate (PG)</option>
                            <option value="Integrated">Integrated</option>
                            <option value="Diploma">Diploma</option>
                            <option value="Certificate">Certificate</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Intake Capacity *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={courseForm.intake}
                            onChange={(e) => setCourseForm({ ...courseForm, intake: parseInt(e.target.value) || 0 })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., 50, 100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Duration (Years)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={courseForm.duration_years}
                            onChange={(e) => setCourseForm({ ...courseForm, duration_years: parseInt(e.target.value) || 4 })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., 2, 4"
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowCourseForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingCourse}
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submittingCourse ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingCourse ? 'Updating...' : 'Creating...'}</span>
                            </>
                          ) : (
                            editingCourse ? 'Update' : 'Create'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Courses List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredCourses.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No courses found matching "{searchQuery}"
                    </li>
                  ) : (
                    filteredCourses.map((course) => (
                      <li key={course.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <p className="text-lg font-semibold text-indigo-600 truncate">
                                  {course.title}
                                </p>
                                <span className="ml-3 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                  {course.code}
                                </span>
                                {course.nature_of_course && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {course.nature_of_course}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-600 space-x-4">
                                <span className="flex items-center">
                                  <svg className="mr-1.5 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                  </svg>
                                  Intake: {course.intake} students
                                </span>
                                {course.duration_years && (
                                  <span className="flex items-center">
                                    <svg className="mr-1.5 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Duration: {course.duration_years} {course.duration_years === 1 ? 'year' : 'years'}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                Created: {new Date(course.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditCourse(course)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleCourseDelete(course.id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )))}
                </ul>
                {courses.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding your first course program.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setEditingCourse(null);
                          setCourseForm({
                            title: '',
                            code: '',
                            nature_of_course: '',
                            intake: 0,
                            duration_years: 4
                          });
                          setShowCourseForm(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Course
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && userRole !== 'super_admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Students</h2>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Students by Department"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code} - {dept.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Filter Students by Course"
                  >
                    <option value="all">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    setEditingStudent(null);
                    setStudentForm({
                      first_name: '',
                      last_name: '',
                      email: '',
                      student_id: '',
                      phone: '',
                      password: '',
                      current_semester: 1,
                      admission_year: new Date().getFullYear(),
                      course_id: '',
                      department_id: '',
                      is_active: true
                    });
                    setShowPassword(false);
                    setShowStudentForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Student
                </button>
              </div>

              {/* Student Form Modal */}
              {showStudentForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingStudent ? 'Edit Student' : 'Add Student'}
                    </h3>
                    <form onSubmit={handleStudentSubmit}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">First Name *</label>
                          <input
                            type="text"
                            required
                            value={studentForm.first_name}
                            onChange={(e) => setStudentForm({ ...studentForm, first_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Student First Name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                          <input
                            type="text"
                            required
                            value={studentForm.last_name}
                            onChange={(e) => setStudentForm({ ...studentForm, last_name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Student Last Name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email *</label>
                          <input
                            type="email"
                            required
                            value={studentForm.email}
                            onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Student Email"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student ID</label>
                          <input
                            type="text"
                            value={studentForm.student_id}
                            onChange={(e) => setStudentForm({ ...studentForm, student_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., STU001"
                            aria-label="Student ID Number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            type="tel"
                            value={studentForm.phone}
                            onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Student Phone Number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Current Semester *</label>
                          <select
                            required
                            value={studentForm.current_semester}
                            onChange={(e) => setStudentForm({ ...studentForm, current_semester: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            disabled={!studentForm.course_id}
                            aria-label="Student Current Semester"
                          >
                            {Array.from({ length: getMaxSemestersForCourse(studentForm.course_id) }, (_, i) => i + 1).map(sem => (
                              <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                          </select>
                          {!studentForm.course_id && (
                            <p className="mt-1 text-sm text-gray-500">Please select a course first</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Admission Year *</label>
                          <input
                            type="number"
                            required
                            value={studentForm.admission_year}
                            onChange={(e) => setStudentForm({ ...studentForm, admission_year: parseInt(e.target.value) })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., 2024"
                            min="2000"
                            max="2099"
                            aria-label="Student Admission Year"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Course *</label>
                          <select
                            required
                            value={studentForm.course_id}
                            onChange={(e) => {
                              const newCourseId = e.target.value;
                              const maxSemesters = getMaxSemestersForCourse(newCourseId);
                              // Reset semester to 1 if current semester exceeds max for new course
                              const newSemester = studentForm.current_semester > maxSemesters ? 1 : studentForm.current_semester;
                              setStudentForm({ ...studentForm, course_id: newCourseId, current_semester: newSemester });
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Student Course"
                          >
                            <option value="">Select Course *</option>
                            {courses.map(course => (
                              <option key={course.id} value={course.id}>
                                {course.code} - {course.title} ({course.duration_years} years)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department *</label>
                          <select
                            required
                            value={studentForm.department_id}
                            onChange={(e) => setStudentForm({ ...studentForm, department_id: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            aria-label="Student Department"
                          >
                            <option value="">Select Department *</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>
                                {dept.code} - {dept.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Password {!editingStudent && '*'}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required={!editingStudent}
                              value={studentForm.password}
                              onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                              placeholder={editingStudent ? 'Leave blank to keep current password' : 'Enter new password'}
                              className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none mt-0.5"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          {editingStudent && (
                            <p className="mt-1 text-xs text-gray-500">
                              💡 Leave blank to keep the current password, or enter a new password to change it
                            </p>
                          )}
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="student_is_active"
                            checked={studentForm.is_active}
                            onChange={(e) => setStudentForm({ ...studentForm, is_active: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="student_is_active" className="ml-2 block text-sm text-gray-900">
                            Active Student
                          </label>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowStudentForm(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingStudent}
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {submittingStudent ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{editingStudent ? 'Updating...' : 'Creating...'}</span>
                            </>
                          ) : (
                            <>{editingStudent ? 'Update' : 'Create'} Student</>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Students List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredStudents.length === 0 ? (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No students found matching "{searchQuery}"
                    </li>
                  ) : (
                    filteredStudents.map((student) => (
                      <li key={student.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">
                                    {student.first_name} {student.last_name}
                                    {!student.is_active && (
                                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        Inactive
                                      </span>
                                    )}
                                  </h3>
                                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                    <span>📧 {student.email}</span>
                                    <span>🆔 {student.college_uid}</span>
                                    {student.student_id && <span>🎓 {student.student_id}</span>}
                                    {student.phone && <span>📱 {student.phone}</span>}
                                    {student.course_id && (
                                      <span>📚 {courses.find(c => c.id === student.course_id)?.code || 'N/A'}</span>
                                    )}
                                    {student.departments && (
                                      <span>🏢 {student.departments.code} - {student.departments.name}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-blue-600">
                                    Semester {student.current_semester}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Admitted {student.admission_year}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 flex space-x-2">
                              <button
                                onClick={() => startEditStudent(student)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleStudentDelete(student.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
                {students.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding your first student.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}