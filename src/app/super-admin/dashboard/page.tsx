'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Building2,
  Calendar,
  Settings,
  Users,
  BarChart3,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Menu,
  Bell,
  GraduationCap,
  Key,
  ClipboardList,
  RefreshCw,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('colleges');
  const [colleges, setColleges] = useState<College[]>([]);
  const [admins, setAdmins] = useState<CollegeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const notifications = [
    { id: 1, title: 'New College Added', message: 'Engineering College has been successfully added', time: '5 mins ago', type: 'success', read: false },
    { id: 2, title: 'Admin Request', message: 'New admin requested access', time: '1 hour ago', type: 'info', read: false },
  ];

  useEffect(() => {
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
      const [collegeResponse, adminResponse] = await Promise.all([
        fetch('/api/super-admin/colleges'),
        fetch('/api/super-admin/college-admins')
      ]);

      const [collegeData, adminData] = await Promise.all([
        collegeResponse.ok ? collegeResponse.json() : Promise.resolve({ colleges: [] }),
        adminResponse.ok ? adminResponse.json() : Promise.resolve({ admins: [] })
      ]);

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
          name: '', code: '', address: '', city: '', state: '', country: 'India',
          pincode: '', phone: '', email: '', website: '', academic_year: '2025-26',
          semester_system: 'semester', is_active: true
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
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

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
      setError('Failed to delete college');
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
          first_name: '', last_name: '', email: '', phone: '',
          college_id: '', college_uid: '', password: '', is_active: true
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
    if (!confirm('Are you sure you want to delete this college admin?')) return;

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
      setError('Failed to delete college admin');
    }
  };

  const startEditCollege = (college: College) => {
    setEditingCollege(college);
    setCollegeForm({
      name: college.name, code: college.code, address: college.address || '',
      city: college.city || '', state: college.state || '', country: college.country,
      pincode: college.pincode || '', phone: college.phone || '', email: college.email || '',
      website: college.website || '', academic_year: college.academic_year,
      semester_system: college.semester_system, is_active: college.is_active
    });
    setShowCollegeForm(true);
  };

  const startEditAdmin = (admin: CollegeAdmin) => {
    setEditingAdmin(admin);
    setAdminForm({
      first_name: admin.first_name, last_name: admin.last_name, email: admin.email,
      phone: admin.phone || '', college_id: admin.college_id || admin.college?.id || '',
      college_uid: admin.college_uid, password: '', is_active: admin.is_active
    });
    setShowAdminForm(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const stats = [
    { icon: <Building2 size={32} />, label: 'Total Colleges', value: colleges.length, color: '#2563A3' },
    { icon: <Users size={32} />, label: 'Total Admins', value: admins.length, color: '#5FB3B3' },
    { icon: <Calendar size={32} />, label: 'Active Calendars', value: colleges.length, color: '#B8E5E5' },
    { icon: <BarChart3 size={32} />, label: 'System Health', value: '99%', color: '#10B981' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF7FF] to-[#B8E5E5]">
        <div className="text-xl font-semibold text-[#2563A3]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF7FF] to-[#B8E5E5]">
      {/* Floating Background Shapes */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#B8E5E5] rounded-full opacity-20 blur-3xl animate-[float_6s_ease-in-out_infinite]" />
        <div className="absolute top-40 right-20 w-80 h-80 bg-[#5FB3B3] rounded-full opacity-20 blur-3xl animate-[float_8s_ease-in-out_infinite_1s]" />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-[#2563A3] rounded-full opacity-20 blur-3xl animate-[float_7s_ease-in-out_infinite_2s]" />
      </div>

      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-[70px] bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex justify-between items-center px-8 z-[1000]">
        <div className="flex items-center gap-3">
          <GraduationCap size={40} className="text-white" />
          <h1 className="text-white text-[22px] font-bold">Academic Compass</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="bg-white/20 hover:bg-white/30 border-none rounded-xl p-2.5 cursor-pointer flex items-center transition-all relative"
            >
              <Bell size={20} className="text-white" />
              <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-[18px] h-[18px] text-[11px] font-bold flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <img
              src="https://ui-avatars.com/api/?name=Super+Admin&background=B8E5E5&color=1e293b"
              alt="User"
              className="w-[42px] h-[42px] rounded-full border-2 border-white"
            />
            <div>
              <p className="text-white text-sm font-semibold m-0">Super Admin</p>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <motion.aside
        className="fixed left-0 top-[70px] h-[calc(100vh-70px)] bg-white/80 backdrop-blur-md shadow-lg flex flex-col z-[100]"
        initial={{ x: -100, opacity: 0 }}
        animate={{
          width: sidebarOpen ? '280px' : '90px',
          opacity: 1,
          x: 0
        }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div className="relative p-6 flex items-center justify-center border-b-2 border-[#2563A3]/20">
          <Shield size={32} className="text-[#2563A3]" style={{ marginRight: sidebarOpen ? '12px' : '0' }} />
          {sidebarOpen && <h2 className="text-xl font-bold text-[#2563A3]">Super Admin</h2>}
        </div>

        <nav className="flex-1 flex flex-col gap-2 p-4">
          <button
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] transition-all ${activeTab === 'colleges'
              ? 'bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white'
              : 'text-[#2563A3] hover:bg-[#B8E5E5] hover:translate-x-1'
              }`}
            onClick={() => setActiveTab('colleges')}
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <Building2 size={20} />
            {sidebarOpen && <span>Colleges</span>}
          </button>

          <button
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] transition-all ${activeTab === 'collegeAdmins'
              ? 'bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white'
              : 'text-[#2563A3] hover:bg-[#B8E5E5] hover:translate-x-1'
              }`}
            onClick={() => setActiveTab('collegeAdmins')}
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <Users size={20} />
            {sidebarOpen && <span>College Admins</span>}
          </button>

          <button
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] transition-all ${activeTab === 'settings'
              ? 'bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white'
              : 'text-[#2563A3] hover:bg-[#B8E5E5] hover:translate-x-1'
              }`}
            onClick={() => setActiveTab('settings')}
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <Settings size={20} />
            {sidebarOpen && <span>Settings</span>}
          </button>

          <button
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] transition-all ${activeTab === 'analytics'
              ? 'bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white'
              : 'text-[#2563A3] hover:bg-[#B8E5E5] hover:translate-x-1'
              }`}
            onClick={() => setActiveTab('analytics')}
            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
          >
            <BarChart3 size={20} />
            {sidebarOpen && <span>Analytics</span>}
          </button>
        </nav>

        <button
          className="flex items-center gap-3 px-4 py-3 m-4 rounded-xl font-semibold text-[15px] border-2 border-red-400 bg-white text-red-500 hover:bg-red-50 hover:translate-x-1 transition-all"
          onClick={handleLogout}
          style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
        >
          <LogOut size={20} />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main
        className="pt-[70px] transition-all duration-300 pb-20 min-h-screen"
        style={{
          marginLeft: sidebarOpen ? '280px' : '90px',
          width: sidebarOpen ? 'calc(100% - 280px)' : 'calc(100% - 90px)'
        }}
      >
        <div className="p-8">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-[#2563A3] mb-2">Super Admin Dashboard</h1>
            <p className="text-slate-600 text-lg">Welcome back! Manage your entire academic system.</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-5 p-6 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: stat.color }}
                >
                  {stat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-[#2563A3]">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative">
              {error}
              <button onClick={() => setError('')} className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xl font-bold">×</button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg relative">
              {successMessage}
              <button onClick={() => setSuccessMessage('')} className="absolute top-3 right-3 text-green-500 hover:text-green-700 text-xl font-bold">×</button>
            </div>
          )}

          {/* Content Area */}
          <motion.div
            className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activeTab === 'colleges' && (
              <div>
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#2563A3]/10">
                  <div>
                    <h2 className="text-2xl font-bold text-[#2563A3]">Colleges</h2>
                    <p className="text-slate-600 text-sm mt-1">Manage all registered colleges</p>
                  </div>
                  <button
                    onClick={() => setShowCollegeForm(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    <Plus size={20} />
                    Add College
                  </button>
                </div>

                {/* College List */}
                <div className="space-y-4">
                  {colleges.map((college) => (
                    <div key={college.id} className="p-5 bg-white rounded-xl border-2 border-slate-100 hover:border-[#2563A3]/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-lg font-bold text-[#2563A3]">{college.name}</p>
                            <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-semibold">{college.code}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${college.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {college.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            {college.city && college.state && <p>📍 {college.city}, {college.state}</p>}
                            {college.email && <p>✉️ {college.email}</p>}
                            {college.phone && <p>📞 {college.phone}</p>}
                            <p>🗓️ Academic Year: {college.academic_year} | System: {college.semester_system}</p>
                            {college._count && <p>👥 {college._count.departments} Departments | {college._count.users} Users</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditCollege(college)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleCollegeDelete(college.id, college.name)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {colleges.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No colleges registered yet. Click "Add College" to create one.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'collegeAdmins' && (
              <div>
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#2563A3]/10">
                  <div>
                    <h2 className="text-2xl font-bold text-[#2563A3]">College Administrators</h2>
                    <p className="text-slate-600 text-sm mt-1">Manage college admin accounts</p>
                  </div>
                  <button
                    onClick={() => setShowAdminForm(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    <Plus size={20} />
                    Add Admin
                  </button>
                </div>

                {/* Admin List */}
                <div className="space-y-4">
                  {admins.map((admin) => (
                    <div key={admin.id} className="p-5 bg-white rounded-xl border-2 border-slate-100 hover:border-[#2563A3]/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-lg font-bold text-[#2563A3]">{admin.first_name} {admin.last_name}</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${admin.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>✉️ {admin.email}</p>
                            {admin.phone && <p>📞 {admin.phone}</p>}
                            <p>🏛️ {admin.college?.name} ({admin.college?.code})</p>
                            <p>🆔 UID: {admin.college_uid}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditAdmin(admin)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleAdminDelete(admin.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {admins.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      No college admins registered yet. Click "Add Admin" to create one.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2563A3] mb-6">Global Settings</h2>
                <div className="space-y-4">
                  <div className="p-6 bg-white rounded-xl border-2 border-slate-100">
                    <h3 className="text-lg font-bold text-[#2563A3] mb-2">System Configuration</h3>
                    <p className="text-slate-600 text-sm">Configure global system settings</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-2xl font-bold text-[#2563A3] mb-6">System Analytics</h2>
                <div className="space-y-4">
                  <div className="p-6 bg-white rounded-xl border-2 border-slate-100">
                    <h3 className="text-lg font-bold text-[#2563A3] mb-2">Usage Statistics</h3>
                    <p className="text-slate-600 text-sm">View system usage and performance metrics</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* College Form Modal */}
      {showCollegeForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-2xl font-bold text-[#2563A3]">
                {editingCollege ? 'Edit College' : 'Add New College'}
              </h3>
            </div>
            <form onSubmit={handleCollegeSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">College Name *</label>
                  <input
                    type="text"
                    required
                    value={collegeForm.name}
                    onChange={(e) => setCollegeForm({ ...collegeForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">College Code *</label>
                  <input
                    type="text"
                    required
                    value={collegeForm.code}
                    onChange={(e) => setCollegeForm({ ...collegeForm, code: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                  <textarea
                    value={collegeForm.address}
                    onChange={(e) => setCollegeForm({ ...collegeForm, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                  <input
                    type="text"
                    value={collegeForm.city}
                    onChange={(e) => setCollegeForm({ ...collegeForm, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">State</label>
                  <input
                    type="text"
                    value={collegeForm.state}
                    onChange={(e) => setCollegeForm({ ...collegeForm, state: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={collegeForm.phone}
                    onChange={(e) => setCollegeForm({ ...collegeForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={collegeForm.email}
                    onChange={(e) => setCollegeForm({ ...collegeForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Academic Year</label>
                  <input
                    type="text"
                    value={collegeForm.academic_year}
                    onChange={(e) => setCollegeForm({ ...collegeForm, academic_year: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Semester System</label>
                  <select
                    value={collegeForm.semester_system}
                    onChange={(e) => setCollegeForm({ ...collegeForm, semester_system: e.target.value as any })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
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
                    onChange={(e) => setCollegeForm({ ...collegeForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#2563A3] focus:ring-[#2563A3] border-slate-300 rounded"
                  />
                  <label htmlFor="college_is_active" className="ml-2 text-sm font-semibold text-slate-700">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCollegeForm(false);
                    setEditingCollege(null);
                  }}
                  className="px-6 py-3 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {editingCollege ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Admin Form Modal */}
      {showAdminForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-2xl font-bold text-[#2563A3]">
                {editingAdmin ? 'Edit College Admin' : 'Add New College Admin'}
              </h3>
            </div>
            <form onSubmit={handleAdminSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={adminForm.first_name}
                    onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={adminForm.last_name}
                    onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">College *</label>
                  <select
                    required
                    value={adminForm.college_id}
                    onChange={(e) => setAdminForm({ ...adminForm, college_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  >
                    <option value="">Select College</option>
                    {colleges.map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.name} ({college.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">College UID *</label>
                  <input
                    type="text"
                    required
                    value={adminForm.college_uid}
                    onChange={(e) => setAdminForm({ ...adminForm, college_uid: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password {!editingAdmin && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingAdmin}
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      placeholder={editingAdmin ? 'Leave blank to keep current password' : 'Enter new password'}
                      className="w-full px-4 py-3 pr-12 rounded-lg border-2 border-slate-200 focus:border-[#2563A3] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {editingAdmin && (
                    <p className="mt-1 text-xs text-slate-500">
                      💡 Leave blank to keep the current password
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="admin_is_active"
                    checked={adminForm.is_active}
                    onChange={(e) => setAdminForm({ ...adminForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#2563A3] focus:ring-[#2563A3] border-slate-300 rounded"
                  />
                  <label htmlFor="admin_is_active" className="ml-2 text-sm font-semibold text-slate-700">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminForm(false);
                    setEditingAdmin(null);
                  }}
                  className="px-6 py-3 border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#2563A3] to-[#5FB3B3] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {editingAdmin ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
