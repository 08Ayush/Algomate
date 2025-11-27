'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head_of_department?: string;
  created_at: string;
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

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'departments' | 'faculty' | 'classrooms'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'admin' && user.role !== 'college_admin') {
      router.push('/login?message=Access denied');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch departments
      const deptResponse = await fetch('/api/admin/departments');
      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData.departments || []);
      }

      // Fetch faculty
      const facultyResponse = await fetch('/api/admin/faculty');
      if (facultyResponse.ok) {
        const facultyData = await facultyResponse.json();
        setFaculty(facultyData.faculty || []);
      }

      // Fetch classrooms
      const classroomResponse = await fetch('/api/admin/classrooms');
      if (classroomResponse.ok) {
        const classroomData = await classroomResponse.json();
        setClassrooms(classroomData.classrooms || []);
      }

    } catch (error: any) {
      setError('Failed to fetch data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDept 
        ? `/api/admin/departments/${editingDept.id}` 
        : '/api/admin/departments';
      
      const response = await fetch(url, {
        method: editingDept ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm)
      });

      if (response.ok) {
        setShowDeptForm(false);
        setEditingDept(null);
        setDeptForm({ name: '', code: '', description: '' });
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save department');
      }
    } catch (error) {
      setError('Failed to save department');
    }
  };

  const handleDeptDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      const response = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE'
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
    try {
      const url = editingFaculty 
        ? `/api/admin/faculty/${editingFaculty.id}` 
        : '/api/admin/faculty';
      
      const response = await fetch(url, {
        method: editingFaculty ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyForm)
      });

      if (response.ok) {
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
          is_active: true
        });
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save faculty');
      }
    } catch (error) {
      setError('Failed to save faculty');
    }
  };

  const handleFacultyDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this faculty member? This action cannot be undone.')) return;

    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/admin/faculty/${id}`, {
        method: 'DELETE'
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
      is_active: fac.is_active
    });
    setShowFacultyForm(true);
  };

  const handleClassroomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingClassroom 
        ? `/api/admin/classrooms/${editingClassroom.id}` 
        : '/api/admin/classrooms';
      
      const response = await fetch(url, {
        method: editingClassroom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classroomForm)
      });

      if (response.ok) {
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
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save classroom');
      }
    } catch (error) {
      setError('Failed to save classroom');
    }
  };

  const handleClassroomDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;

    try {
      const response = await fetch(`/api/admin/classrooms/${id}`, {
        method: 'DELETE'
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage departments and faculty members</p>
          </div>

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
                <button
                  onClick={() => setActiveTab('departments')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'departments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Departments ({departments.length})
                </button>
                <button
                  onClick={() => setActiveTab('faculty')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'faculty'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Faculty ({faculty.length})
                </button>
                <button
                  onClick={() => setActiveTab('classrooms')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'classrooms'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Classrooms ({classrooms.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Departments Tab */}
          {activeTab === 'departments' && (
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
                            onChange={(e) => setDeptForm({...deptForm, name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Code</label>
                          <input
                            type="text"
                            required
                            value={deptForm.code}
                            onChange={(e) => setDeptForm({...deptForm, code: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={deptForm.description}
                            onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                        >
                          {editingDept ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Departments List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {departments.map((dept) => (
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
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Faculty Tab */}
          {activeTab === 'faculty' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Faculty</h2>
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
                            onChange={(e) => setFacultyForm({...facultyForm, first_name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Last Name</label>
                          <input
                            type="text"
                            required
                            value={facultyForm.last_name}
                            onChange={(e) => setFacultyForm({...facultyForm, last_name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            required
                            value={facultyForm.email}
                            onChange={(e) => setFacultyForm({...facultyForm, email: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            type="tel"
                            value={facultyForm.phone}
                            onChange={(e) => setFacultyForm({...facultyForm, phone: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Department <span className="text-gray-400">(Optional)</span></label>
                          <select
                            value={facultyForm.department_id}
                            onChange={(e) => setFacultyForm({...facultyForm, department_id: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                            onChange={(e) => setFacultyForm({...facultyForm, role: e.target.value as 'admin' | 'college_admin' | 'faculty'})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                                                        onChange={(e) => setFacultyForm({...facultyForm, faculty_type: e.target.value as 'creator' | 'publisher' | 'general' | 'guest'})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="general">General</option>
                            <option value="creator">Creator</option>
                            <option value="publisher">Publisher</option>
                            <option value="guest">Guest</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={facultyForm.is_active}
                            onChange={(e) => setFacultyForm({...facultyForm, is_active: e.target.checked})}
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
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                        >
                          {editingFaculty ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Faculty List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {faculty.map((fac) => (
                    <li key={fac.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {fac.first_name} {fac.last_name}
                              </p>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                fac.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {fac.role}
                              </span>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                fac.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {fac.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{fac.email}</p>
                            <p className="mt-1 text-sm text-gray-600">
                              {fac.departments ? `${fac.departments.name} (${fac.departments.code})` : 'No Department Assigned'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {fac.college_uid} • {fac.faculty_type}
                            </p>
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
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Classrooms Tab */}
          {activeTab === 'classrooms' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Classrooms & Labs</h2>
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
                            onChange={(e) => setClassroomForm({...classroomForm, name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Room A101, Lab C301"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Building</label>
                          <input
                            type="text"
                            value={classroomForm.building}
                            onChange={(e) => setClassroomForm({...classroomForm, building: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g., Academic Block A"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Floor Number</label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={classroomForm.floor_number}
                            onChange={(e) => setClassroomForm({...classroomForm, floor_number: parseInt(e.target.value) || 1})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                            onChange={(e) => setClassroomForm({...classroomForm, capacity: parseInt(e.target.value) || 30})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type *</label>
                          <select
                            required
                            value={classroomForm.type}
                            onChange={(e) => setClassroomForm({...classroomForm, type: e.target.value as any})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                            onChange={(e) => setClassroomForm({...classroomForm, classroom_priority: parseInt(e.target.value) || 5})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                              onChange={(e) => setClassroomForm({...classroomForm, has_projector: e.target.checked})}
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
                              onChange={(e) => setClassroomForm({...classroomForm, has_ac: e.target.checked})}
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
                              onChange={(e) => setClassroomForm({...classroomForm, has_computers: e.target.checked})}
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
                              onChange={(e) => setClassroomForm({...classroomForm, has_lab_equipment: e.target.checked})}
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
                              onChange={(e) => setClassroomForm({...classroomForm, is_smart_classroom: e.target.checked})}
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
                              onChange={(e) => setClassroomForm({...classroomForm, is_available: e.target.checked})}
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
                          onChange={(e) => setClassroomForm({...classroomForm, location_notes: e.target.value})}
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
                          className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                        >
                          {editingClassroom ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Classrooms List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {classrooms.map((classroom) => (
                    <li key={classroom.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {classroom.name}
                              </p>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                classroom.type === 'Lab' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {classroom.type}
                              </span>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {classroom.capacity} seats
                              </span>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                classroom.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                  ))}
                </ul>
                {classrooms.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No classrooms found. Add your first classroom to get started.</p>
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