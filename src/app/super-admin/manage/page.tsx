'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import {
  Building2,
  Users,
  BookOpen,
  Calendar,
  ChevronDown,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  GraduationCap,
  DoorOpen,
  Layers,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface College {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head_of_department?: string;
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
  departments?: { id: string; name: string; code: string; } | null;
}

interface Classroom {
  id: string;
  name: string;
  building?: string;
  floor_number?: number;
  capacity: number;
  type: string;
  has_projector: boolean;
  has_ac: boolean;
  is_available: boolean;
}

interface Batch {
  id: string;
  name: string;
  department_id: string;
  semester: number;
  section: string;
  academic_year: string;
  expected_strength: number;
  actual_strength: number;
  is_active: boolean;
  departments?: { id: string; name: string; code: string; } | null;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  credits_per_week: number;
  semester?: number;
  department_id: string;
  subject_type: string;
  nep_category?: string;
  is_active: boolean;
  departments?: { id: string; name: string; code: string; } | null;
}

interface Course {
  id: string;
  title: string;
  code: string;
  nature_of_course?: string;
  intake: number;
  duration_years?: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
  student_id?: string;
  current_semester: number;
  admission_year: number;
  is_active: boolean;
  departments?: { id: string; name: string; code: string; } | null;
}

type TabType = 'departments' | 'faculty' | 'classrooms' | 'batches' | 'subjects' | 'courses' | 'students';

const ManagePage: React.FC = () => {
  const { showConfirm } = useConfirm();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('departments');
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [collegeDropdownOpen, setCollegeDropdownOpen] = useState(false);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Modal states
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userData);
    if (user.role !== 'super_admin') {
      router.push('/login?message=Access denied');
      return;
    }
    fetchColleges();
  }, [router]);

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const userData = localStorage.getItem('user');
    if (!userData) return {};
    const authToken = Buffer.from(userData).toString('base64');
    return { 'Authorization': `Bearer ${authToken}` };
  };

  const fetchColleges = async () => {
    try {
      const res = await fetch('/api/super-admin/colleges', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = (data.colleges || []).map((c: any) => ({ id: c.id, name: c.name, code: c.code }));
        setColleges(list);

        const savedId = localStorage.getItem('selected_college_id');
        if (savedId) {
          const saved = list.find((c: College) => c.id === savedId);
          if (saved) {
            setSelectedCollege(saved);
            fetchData(saved.id);
            return;
          }
        }
        if (list.length > 0) {
          setSelectedCollege(list[0]);
          fetchData(list[0].id);
        }
      }
    } catch (error) {
      toast.error('Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeChange = (college: College) => {
    setSelectedCollege(college);
    setCollegeDropdownOpen(false);
    localStorage.setItem('selected_college_id', college.id);
    fetchData(college.id);
  };

  const fetchData = async (collegeId: string) => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const authToken = Buffer.from(userData).toString('base64');
      const headers = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };
      const query = `?college_id=${collegeId}`;

      const [deptRes, facultyRes, classroomRes, batchRes, subjectRes, courseRes, studentRes] = await Promise.all([
        fetch(`/api/admin/departments${query}`, { headers }),
        fetch(`/api/admin/faculty${query}&limit=1000`, { headers }),
        fetch(`/api/admin/classrooms${query}`, { headers }),
        fetch(`/api/admin/batches${query}`, { headers }),
        fetch(`/api/admin/subjects${query}`, { headers }),
        fetch(`/api/admin/courses${query}`, { headers }),
        fetch(`/api/admin/students${query}&limit=1000`, { headers })
      ]);

      const [deptData, facultyData, classroomData, batchData, subjectData, courseData, studentData] = await Promise.all([
        deptRes.ok ? deptRes.json() : { departments: [] },
        facultyRes.ok ? facultyRes.json() : { faculty: [] },
        classroomRes.ok ? classroomRes.json() : { classrooms: [] },
        batchRes.ok ? batchRes.json() : { batches: [] },
        subjectRes.ok ? subjectRes.json() : { subjects: [] },
        courseRes.ok ? courseRes.json() : { courses: [] },
        studentRes.ok ? studentRes.json() : { students: [] }
      ]);

      setDepartments(deptData.departments || []);
      setFaculty(facultyData.faculty || []);
      setClassrooms(classroomData.classrooms || []);
      setBatches(batchData.batches || []);
      setSubjects(subjectData.subjects || []);
      setCourses(courseData.courses || []);
      setStudents(studentData.students || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = (type: string, id: string, name: string) => {
    showConfirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const userData = localStorage.getItem('user');
          if (!userData) return;

          const authToken = Buffer.from(userData).toString('base64');
          const endpoint = type === 'batches' ? `/api/admin/${type}?id=${id}` : `/api/admin/${type}/${id}`;
          const headers = { 'Authorization': `Bearer ${authToken}` };

          let res = await fetch(endpoint, { method: 'DELETE', headers });

          // If subject has references, ask user to force delete
          if (res.status === 409 && type === 'subjects') {
            const data = await res.json();
            if (data.hasReferences) {
              const forceConfirm = confirm(
                `${data.error}\n\nDo you want to force delete this subject and remove all related data?`
              );
              if (!forceConfirm) return;
              res = await fetch(`${endpoint}?force=true`, { method: 'DELETE', headers });
            }
          }

          if (res.ok) {
            toast.success(`${type.slice(0, -1)} deleted successfully`);
            if (selectedCollege) fetchData(selectedCollege.id);
          } else {
            const err = await res.json().catch(() => ({}));
            toast.error(err.error || 'Failed to delete');
          }
        } catch (e) {
          toast.error('Error deleting item');
        }
      }
    });
  };

  const handleDeptSubmit = async () => {
    if (!deptForm.name || !deptForm.code) {
      toast.error('Name and Code are required');
      return;
    }

    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const authToken = Buffer.from(userData).toString('base64');
      const url = editingDept ? `/api/admin/departments/${editingDept.id}` : '/api/admin/departments';

      const res = await fetch(url, {
        method: editingDept ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ ...deptForm, college_id: selectedCollege?.id })
      });

      if (res.ok) {
        toast.success(editingDept ? 'Department updated' : 'Department created');
        setShowDeptForm(false);
        setEditingDept(null);
        setDeptForm({ name: '', code: '', description: '' });
        if (selectedCollege) fetchData(selectedCollege.id);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save department');
      }
    } catch (e) {
      toast.error('Error saving department');
    }
  };

  const startEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setShowDeptForm(true);
  };

  const tabs = [
    { id: 'departments' as TabType, icon: Building2, label: 'Departments', count: departments.length },
    { id: 'faculty' as TabType, icon: Users, label: 'Faculty', count: faculty.length },
    { id: 'classrooms' as TabType, icon: DoorOpen, label: 'Classrooms', count: classrooms.length },
    { id: 'batches' as TabType, icon: Layers, label: 'Batches', count: batches.length },
    { id: 'subjects' as TabType, icon: BookOpen, label: 'Subjects', count: subjects.length },
    { id: 'courses' as TabType, icon: GraduationCap, label: 'Courses', count: courses.length },
    { id: 'students' as TabType, icon: Users, label: 'Students', count: students.length },
  ];

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(collegeSearchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(collegeSearchQuery.toLowerCase())
  );

  const getFilteredData = () => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'departments':
        return departments.filter(d => d.name.toLowerCase().includes(query) || d.code.toLowerCase().includes(query));
      case 'faculty':
        return faculty.filter(f => `${f.first_name} ${f.last_name}`.toLowerCase().includes(query) || f.email.toLowerCase().includes(query));
      case 'classrooms':
        return classrooms.filter(c => c.name.toLowerCase().includes(query) || c.type.toLowerCase().includes(query));
      case 'batches':
        return batches.filter(b => b.name.toLowerCase().includes(query) || b.section.toLowerCase().includes(query));
      case 'subjects':
        return subjects.filter(s => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query));
      case 'courses':
        return courses.filter(c => c.title.toLowerCase().includes(query) || c.code.toLowerCase().includes(query));
      case 'students':
        return students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) || s.email.toLowerCase().includes(query));
      default:
        return [];
    }
  };

  const renderTable = () => {
    const data = getFilteredData();

    if (loading) {
      return <CardLoader message="Loading data..." subMessage="Fetching platform records" />;
    }

    if (data.length === 0) {
      return <div className="p-12 text-center text-gray-500">No data found</div>;
    }

    switch (activeTab) {
      case 'departments':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data as Department[]).map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{dept.name}</td>
                  <td className="px-6 py-4"><span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{dept.code}</span></td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{dept.description || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => startEditDept(dept)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteItem('departments', dept.id, dept.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'faculty':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data as Faculty[]).map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{f.first_name} {f.last_name}</td>
                  <td className="px-6 py-4 text-gray-600">{f.email}</td>
                  <td className="px-6 py-4 text-gray-600">{f.departments?.name || '-'}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{f.faculty_type || 'general'}</span></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{f.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteItem('faculty', f.id, `${f.first_name} ${f.last_name}`)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'classrooms':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Building</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Facilities</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data as Classroom[]).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-gray-600">{c.building || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{c.capacity}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{c.type}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {c.has_projector && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Projector</span>}
                      {c.has_ac && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">AC</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteItem('classrooms', c.id, c.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'batches':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Semester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Section</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Strength</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data as Batch[]).map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{b.name}</td>
                  <td className="px-6 py-4 text-gray-600">{b.departments?.name || '-'}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">Sem {b.semester}</span></td>
                  <td className="px-6 py-4 text-gray-600">{b.section}</td>
                  <td className="px-6 py-4 text-gray-600">{b.actual_strength}/{b.expected_strength}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteItem('batches', b.id, b.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'subjects':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Credits</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data as Subject[]).map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4"><span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{s.code}</span></td>
                  <td className="px-6 py-4 text-gray-600">{s.credits_per_week}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">{s.subject_type}</span></td>
                  <td className="px-6 py-4 text-gray-600">{s.departments?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteItem('subjects', s.id, s.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'courses':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Intake</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data as Course[]).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.title}</td>
                  <td className="px-6 py-4"><span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{c.code}</span></td>
                  <td className="px-6 py-4 text-gray-600">{c.duration_years || 4} years</td>
                  <td className="px-6 py-4 text-gray-600">{c.intake}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteItem('courses', c.id, c.title)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'students':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Semester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data as Student[]).map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                  <td className="px-6 py-4 text-gray-600">{s.email}</td>
                  <td className="px-6 py-4 text-gray-600">{s.departments?.name || '-'}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Sem {s.current_semester}</span></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteItem('students', s.id, `${s.first_name} ${s.last_name}`)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  return (
    <SuperAdminLayout activeTab="manage" >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage College Data</h1>
            <p className="text-gray-600">Manage departments, faculty, classrooms, and more across colleges</p>
          </div>

          {/* College Selector */}
          <div className="relative">
            <button
              onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all"
            >
              <Building2 size={20} className="text-[#4D869C]" />
              <span className="font-medium text-gray-700">{selectedCollege?.name || 'Select College'}</span>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${collegeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {collegeDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-100">
                    <input
                      type="text"
                      placeholder="Search colleges..."
                      value={collegeSearchQuery}
                      onChange={(e) => setCollegeSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredColleges.map((college) => (
                      <button
                        key={college.id}
                        onClick={() => handleCollegeChange(college)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedCollege?.id === college.id ? 'bg-[#4D869C]/5' : ''}`}
                      >
                        <div>
                          <div className="font-medium text-gray-900">{college.name}</div>
                          <div className="text-sm text-gray-500">{college.code}</div>
                        </div>
                        {selectedCollege?.id === college.id && <Check size={18} className="text-[#4D869C]" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected College Banner */}
        {selectedCollege && (
          <div className="bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] rounded-2xl p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Building2 size={24} />
              <div>
                <p className="font-bold text-lg">{selectedCollege.name}</p>
                <p className="text-white/80 text-sm">Code: {selectedCollege.code}</p>
              </div>
            </div>
            <button onClick={() => selectedCollege && fetchData(selectedCollege.id)} className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
              <RefreshCw size={18} />
              Refresh Data
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id
                ? 'bg-[#4D869C] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <tab.icon size={18} />
              <span className="font-medium">{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
            />
          </div>
        </div>


        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {renderTable()}
        </div>

        {/* Department Modal */}
        {showDeptForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-800">{editingDept ? 'Edit Department' : 'Add Department'}</h3>
                <button onClick={() => setShowDeptForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none"
                    value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none font-mono"
                    value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none resize-none h-20"
                    value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button onClick={() => setShowDeptForm(false)} className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleDeptSubmit} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
                  {editingDept ? 'Update' : 'Add'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </SuperAdminLayout >
  );
};

export default ManagePage;