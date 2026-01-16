'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  DoorOpen,
  Layers,
  TrendingUp,
  ArrowRight,
  Activity,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';

interface DashboardStats {
  departments: number;
  faculty: number;
  classrooms: number;
  batches: number;
  subjects: number;
  courses: number;
  students: number;
}

const CollegeAdminDashboard: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    departments: 0,
    faculty: 0,
    classrooms: 0,
    batches: 0,
    subjects: 0,
    courses: 0,
    students: 0
  });
  const [loading, setLoading] = useState(true);
  const [collegeName, setCollegeName] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userData);
      const authToken = Buffer.from(userData).toString('base64');
      const collegeId = user.college_id;
      const queryParam = collegeId ? `?college_id=${collegeId}` : '';

      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      const [deptRes, facultyRes, classroomRes, batchRes, subjectRes, courseRes, studentRes] = await Promise.all([
        fetch(`/api/admin/departments${queryParam}`, { headers }).catch(() => ({ ok: false, json: () => Promise.resolve({ departments: [] }) } as Response)),
        fetch(`/api/admin/faculty${queryParam}`, { headers }).catch(() => ({ ok: false, json: () => Promise.resolve({ faculty: [] }) } as Response)),
        fetch(`/api/admin/classrooms${queryParam}`, { headers }).catch(() => ({ ok: false, json: () => Promise.resolve({ classrooms: [] }) } as Response)),
        fetch(`/api/admin/batches${queryParam}`, { headers }).catch(() => ({ ok: false, json: () => Promise.resolve({ batches: [] }) } as Response)),
        fetch(`/api/admin/subjects${queryParam}`, { headers }).catch(() => ({ ok: false, json: () => Promise.resolve({ subjects: [] }) } as Response)),
        fetch(`/api/admin/courses${queryParam}`, { headers }).catch(() => ({ ok: false, json: () => Promise.resolve({ courses: [] }) } as Response)),
        fetch(`/api/admin/students${queryParam}`, { headers }).catch(() => ({ ok: false, json: () => Promise.resolve({ students: [] }) } as Response))
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

      setStats({
        departments: deptData.departments?.length || 0,
        faculty: facultyData.faculty?.length || 0,
        classrooms: classroomData.classrooms?.length || 0,
        batches: batchData.batches?.length || 0,
        subjects: subjectData.subjects?.length || 0,
        courses: courseData.courses?.length || 0,
        students: studentData.students?.length || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { icon: Building2, label: 'Departments', value: stats.departments, color: '#4D869C', path: '/admin/departments', description: 'Manage departments' },
    { icon: Users, label: 'Faculty', value: stats.faculty, color: '#7AB2B2', path: '/admin/faculty', description: 'Manage faculty members' },
    { icon: DoorOpen, label: 'Classrooms', value: stats.classrooms, color: '#5A67D8', path: '/admin/classrooms', description: 'Manage rooms & labs' },
    { icon: Layers, label: 'Batches', value: stats.batches, color: '#ED8936', path: '/admin/batches', description: 'Manage student batches' },
    { icon: BookOpen, label: 'Subjects', value: stats.subjects, color: '#48BB78', path: '/admin/subjects', description: 'Manage subjects' },
    { icon: GraduationCap, label: 'Courses', value: stats.courses, color: '#9F7AEA', path: '/admin/courses', description: 'Manage courses' },
  ];

  return (
    <CollegeAdminLayout activeTab="dashboard">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">College Administration</h1>
            <p className="text-gray-600">Welcome back! Manage your college data here.</p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors bg-white"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.slice(0, 4).map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(item.path)}
              className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${item.color}20` }}>
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <TrendingUp size={20} className="text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '...' : item.value}
              </h3>
              <p className="text-sm text-gray-600 font-medium">{item.label}</p>
              <div className="mt-4 flex items-center text-xs text-gray-400 group-hover:text-[#4D869C] transition-colors">
                View details <ArrowRight size={14} className="ml-1" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {[...quickLinks, { icon: Users, label: 'Students', value: stats.students, color: '#F56565', path: '/admin/students', description: 'Manage students' }].map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(item.path)}
                className="flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 transition-all group border border-gray-100"
              >
                <div className="p-3 rounded-xl mb-3" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
                <span className="text-lg font-bold text-gray-900 mt-1">{loading ? '...' : item.value}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] rounded-2xl p-6 text-white">
            <Building2 size={32} className="mb-4 opacity-80" />
            <h3 className="text-2xl font-bold">{loading ? '...' : stats.departments}</h3>
            <p className="text-white/80">Total Departments</p>
          </div>
          <div className="bg-gradient-to-br from-[#5A67D8] to-[#9F7AEA] rounded-2xl p-6 text-white">
            <Users size={32} className="mb-4 opacity-80" />
            <h3 className="text-2xl font-bold">{loading ? '...' : stats.faculty + stats.students}</h3>
            <p className="text-white/80">Total Users</p>
          </div>
          <div className="bg-gradient-to-br from-[#ED8936] to-[#F6AD55] rounded-2xl p-6 text-white">
            <BookOpen size={32} className="mb-4 opacity-80" />
            <h3 className="text-2xl font-bold">{loading ? '...' : stats.subjects}</h3>
            <p className="text-white/80">Active Subjects</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-green-700">Database</p>
              <p className="text-xs text-green-600">Connected</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-green-700">API</p>
              <p className="text-xs text-green-600">Operational</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-green-700">Auth</p>
              <p className="text-xs text-green-600">Active</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-green-700">Storage</p>
              <p className="text-xs text-green-600">Available</p>
            </div>
          </div>
        </div>
      </div>
    </CollegeAdminLayout>
  );
};

export default CollegeAdminDashboard;