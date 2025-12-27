'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Eye, EyeOff } from 'lucide-react';

interface College {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  academic_year: string;
  semester_system: 'semester' | 'trimester' | 'quarter';
  is_active: boolean;
  created_at: string;
  _count?: {
    departments: number;
    users: number;
  };
}

interface CollegeAdmin {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
  college_id: string;
  phone?: string;
  is_active: boolean;
  college: {
    id: string;
    name: string;
    code: string;
  };
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'colleges' | 'admins'>('colleges');
  const [colleges, setColleges] = useState<College[]>([]);
  const [admins, setAdmins] = useState<CollegeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // College form state
  const [showCollegeForm, setShowCollegeForm] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [collegeForm, setCollegeForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    academic_year: '2025-26',
    semester_system: 'semester' as 'semester' | 'trimester' | 'quarter',
    is_active: true
  });

  // Admin form state
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<CollegeAdmin | null>(null);
  const [adminForm, setAdminForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    college_id: '',
    college_uid: '',
    password: '',
    is_active: true
  });

  useEffect(() => {
    // Check if user is super admin
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'super_admin') {
      router.push('/login?message=Access denied. Super admin only.');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel for faster loading
      const [collegeResponse, adminResponse] = await Promise.all([
        fetch('/api/super-admin/colleges'),
        fetch('/api/super-admin/college-admins')
      ]);

      // Process responses in parallel
      const [collegeData, adminData] = await Promise.all([
        collegeResponse.ok ? collegeResponse.json() : Promise.resolve({ colleges: [] }),
        adminResponse.ok ? adminResponse.json() : Promise.resolve({ admins: [] })
      ]);

      // Update state
      setColleges(collegeData.colleges || []);
      setAdmins(adminData.admins || []);

    } catch (error: any) {
      setError('Failed to fetch data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const url = editingCollege 
        ? `/api/super-admin/colleges/${editingCollege.id}` 
        : '/api/super-admin/colleges';
      
      const response = await fetch(url, {
        method: editingCollege ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collegeForm)
      });

      if (response.ok) {
        setSuccessMessage(`College ${editingCollege ? 'updated' : 'created'} successfully`);
        setShowCollegeForm(false);
        setEditingCollege(null);
        setCollegeForm({
          name: '',
          code: '',
          address: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
          phone: '',
          email: '',
          website: '',
          academic_year: '2025-26',
          semester_system: 'semester',
          is_active: true
        });
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save college');
      }
    } catch (error) {
      setError('Failed to save college');
    }
  };

  const handleCollegeDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all associated data including departments, users, and timetables. This action cannot be undone.`)) return;

    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/super-admin/colleges/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccessMessage('College deleted successfully');
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete college');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete college. Please try again.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const url = editingAdmin 
        ? `/api/super-admin/college-admins/${editingAdmin.id}` 
        : '/api/super-admin/college-admins';
      
      const response = await fetch(url, {
        method: editingAdmin ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm)
      });

      if (response.ok) {
        setSuccessMessage(`College admin ${editingAdmin ? 'updated' : 'created'} successfully`);
        setShowAdminForm(false);
        setEditingAdmin(null);
        setAdminForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          college_id: '',
          college_uid: '',
          password: '',
          is_active: true
        });
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save college admin');
      }
    } catch (error) {
      setError('Failed to save college admin');
    }
  };

  const handleAdminDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this college admin? This action cannot be undone.')) return;

    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/super-admin/college-admins/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccessMessage('College admin deleted successfully');
        fetchData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete college admin');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete college admin. Please try again.');
    }
  };

  const startEditCollege = (college: College) => {
    setEditingCollege(college);
    setCollegeForm({
      name: college.name,
      code: college.code,
      address: college.address || '',
      city: college.city || '',
      state: college.state || '',
      country: college.country,
      pincode: college.pincode || '',
      phone: college.phone || '',
      email: college.email || '',
      website: college.website || '',
      academic_year: college.academic_year,
      semester_system: college.semester_system,
      is_active: college.is_active
    });
    setShowCollegeForm(true);
  };

  const startEditAdmin = (admin: CollegeAdmin) => {
    setEditingAdmin(admin);
    setAdminForm({
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      phone: admin.phone || '',
      college_id: admin.college_id || admin.college?.id || '', // Fetch from database
      college_uid: admin.college_uid,
      password: '',
      is_active: admin.is_active
    });
    setShowAdminForm(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage colleges and college administrators</p>
          </div>

          {/* Quick Navigation Cards */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Colleges</h3>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-purple-100 text-sm">Total: {colleges.length} college{colleges.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Admins</h3>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-green-100 text-sm">Total: {admins.length} college admin{admins.length !== 1 ? 's' : ''}</p>
            </div>
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
                  onClick={() => setActiveTab('colleges')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'colleges'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Colleges ({colleges.length})
                </button>
                <button
                  onClick={() => setActiveTab('admins')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'admins'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  College Admins ({admins.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Colleges Tab */}
          {activeTab === 'colleges' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Colleges</h2>
                <button
                  onClick={() => setShowCollegeForm(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add College
                </button>
              </div>

              {/* College Form Modal */}
              {showCollegeForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {editingCollege ? 'Edit College' : 'Add New College'}
                    </h3>
                    <form onSubmit={handleCollegeSubmit}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">College Name *</label>
                          <input
                            type="text"
                            required
                            value={collegeForm.name}
                            onChange={(e) => setCollegeForm({...collegeForm, name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">College Code *</label>
                          <input
                            type="text"
                            required
                            value={collegeForm.code}
                            onChange={(e) => setCollegeForm({...collegeForm, code: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Code"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <textarea
                            value={collegeForm.address}
                            onChange={(e) => setCollegeForm({...collegeForm, address: e.target.value})}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Address"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <input
                            type="text"
                            value={collegeForm.city}
                            onChange={(e) => setCollegeForm({...collegeForm, city: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">State</label>
                          <input
                            type="text"
                            value={collegeForm.state}
                            onChange={(e) => setCollegeForm({...collegeForm, state: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College State"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Pincode</label>
                          <input
                            type="text"
                            value={collegeForm.pincode}
                            onChange={(e) => setCollegeForm({...collegeForm, pincode: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Pincode"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            type="tel"
                            value={collegeForm.phone}
                            onChange={(e) => setCollegeForm({...collegeForm, phone: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Phone"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={collegeForm.email}
                            onChange={(e) => setCollegeForm({...collegeForm, email: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Website</label>
                          <input
                            type="url"
                            value={collegeForm.website}
                            onChange={(e) => setCollegeForm({...collegeForm, website: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Website"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Academic Year</label>
                          <input
                            type="text"
                            value={collegeForm.academic_year}
                            onChange={(e) => setCollegeForm({...collegeForm, academic_year: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Academic Year"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Semester System</label>
                          <select
                            value={collegeForm.semester_system}
                            onChange={(e) => setCollegeForm({...collegeForm, semester_system: e.target.value as any})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="College Semester System"
                          >
                            <option value="semester">Semester</option>
                            <option value="trimester">Trimester</option>
                            <option value="quarter">Quarter</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="college_is_active"
                            checked={collegeForm.is_active}
                            onChange={(e) => setCollegeForm({...collegeForm, is_active: e.target.checked})}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor="college_is_active" className="ml-2 block text-sm text-gray-900">
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCollegeForm(false);
                            setEditingCollege(null);
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                        >
                          {editingCollege ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* College List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {colleges.map((college) => (
                    <li key={college.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="text-lg font-medium text-indigo-600 truncate">
                                {college.name}
                              </p>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {college.code}
                              </span>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                college.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {college.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                              {college.city && college.state && (
                                <p>📍 {college.city}, {college.state}</p>
                              )}
                              {college.email && <p>✉️ {college.email}</p>}
                              {college.phone && <p>📞 {college.phone}</p>}
                              <p>🗓️ Academic Year: {college.academic_year} | System: {college.semester_system}</p>
                              {college._count && (
                                <p>👥 {college._count.departments} Departments | {college._count.users} Users</p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditCollege(college)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCollegeDelete(college.id, college.name)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {colleges.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No colleges registered yet. Click "Add College" to create one.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* College Admins Tab */}
          {activeTab === 'admins' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">College Administrators</h2>
                <button
                  onClick={() => setShowAdminForm(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add College Admin
                </button>
              </div>

              {/* Admin Form Modal */}
              {showAdminForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {editingAdmin ? 'Edit College Admin' : 'Add New College Admin'}
                    </h3>
                    <form onSubmit={handleAdminSubmit}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">First Name *</label>
                          <input
                            type="text"
                            required
                            value={adminForm.first_name}
                            onChange={(e) => setAdminForm({...adminForm, first_name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="Admin First Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                          <input
                            type="text"
                            required
                            value={adminForm.last_name}
                            onChange={(e) => setAdminForm({...adminForm, last_name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="Admin Last Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email *</label>
                          <input
                            type="email"
                            required
                            value={adminForm.email}
                            onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="Admin Email"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <input
                            type="tel"
                            value={adminForm.phone}
                            onChange={(e) => setAdminForm({...adminForm, phone: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="Admin Phone"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">College *</label>
                          <select
                            required
                            value={adminForm.college_id}
                            onChange={(e) => setAdminForm({...adminForm, college_id: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="Admin College"
                          >
                            <option value="">Select College</option>
                            {colleges.map((college) => (
                              <option key={college.id} value={college.id}>
                                {college.name} ({college.code})
                              </option>
                            ))}
                          </select>
                          {editingAdmin && (
                            <p className="mt-1 text-xs text-gray-500">Current college from database</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">College UID *</label>
                          <input
                            type="text"
                            required
                            value={adminForm.college_uid}
                            onChange={(e) => setAdminForm({...adminForm, college_uid: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            aria-label="Admin College UID"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Password {!editingAdmin && '*'}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required={!editingAdmin}
                              value={adminForm.password}
                              onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                              placeholder={editingAdmin ? 'Leave blank to keep current password' : 'Enter new password'}
                              className="mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
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
                          {editingAdmin && (
                            <p className="mt-1 text-xs text-gray-500">
                              💡 Leave blank to keep the current password, or enter a new password to change it
                            </p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="admin_is_active"
                            checked={adminForm.is_active}
                            onChange={(e) => setAdminForm({...adminForm, is_active: e.target.checked})}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor="admin_is_active" className="ml-2 block text-sm text-gray-900">
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdminForm(false);
                            setEditingAdmin(null);
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                        >
                          {editingAdmin ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Admin List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <li key={admin.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {admin.first_name} {admin.last_name}
                              </p>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                admin.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {admin.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{admin.email}</p>
                            <p className="text-sm text-gray-600">
                              {admin.college.name} ({admin.college.code})
                            </p>
                            <p className="text-xs text-gray-500">UID: {admin.college_uid}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditAdmin(admin)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleAdminDelete(admin.id)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {admins.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500">
                      No college admins created yet. Click "Add College Admin" to create one.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
