'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CardLoader } from '@/components/ui/PageLoader';
import { Users, Search, RefreshCw, Mail, Phone, Award, BookOpen, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface Faculty {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  college_uid: string;
  faculty_type: string;
  department_name?: string;
  department_code?: string;
  max_hours_per_day?: number;
  max_hours_per_week?: number;
  subjects: string[];
  is_active: boolean;
}

const FacultyListPage: React.FC = () => {
  const router = useRouter();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { fetchFaculty(); }, []);

  const getAuthHeaders = () => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return null; }
    return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
  };

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch('/api/faculty', { headers });
      if (res.ok) {
        const data = await res.json();
        setFaculty(data.data || []);
      }
    } catch { toast.error('Error loading faculty'); } finally { setLoading(false); }
  };

  const filteredFaculty = faculty.filter(f => {
    const matchesSearch = `${f.first_name} ${f.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.college_uid?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || f.faculty_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getFacultyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'creator': 'bg-blue-100 text-blue-700',
      'publisher': 'bg-purple-100 text-purple-700',
      'general': 'bg-gray-100 text-gray-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <FacultyCreatorLayout activeTab="faculty">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Faculty</h1>
            <p className="text-gray-600">View and manage faculty members in your department</p>
          </div>
          <button onClick={fetchFaculty} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]"
            >
              <option value="all">All Types</option>
              <option value="creator">Creator</option>
              <option value="publisher">Publisher</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100"><Users size={24} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{faculty.length}</p><p className="text-sm text-gray-500">Total Faculty</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100"><Award size={24} className="text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{faculty.filter(f => f.faculty_type === 'creator').length}</p><p className="text-sm text-gray-500">Creators</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100"><BookOpen size={24} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{faculty.filter(f => f.faculty_type === 'publisher').length}</p><p className="text-sm text-gray-500">Publishers</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100"><Building size={24} className="text-orange-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{new Set(faculty.map(f => f.department_name).filter(Boolean)).size}</p><p className="text-sm text-gray-500">Departments</p></div>
          </div>
        </div>

        {/* Faculty Grid */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <CardLoader message="Loading faculty..." subMessage="Fetching department faculty list" />
          ) : filteredFaculty.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No faculty found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredFaculty.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#4D869C] text-white flex items-center justify-center font-bold text-lg">
                      {f.first_name?.[0]}{f.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{f.first_name} {f.last_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getFacultyTypeColor(f.faculty_type)}`}>
                          {f.faculty_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{f.department_name || 'No department'}</p>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={14} />
                          <span className="truncate">{f.email}</span>
                        </div>
                        {f.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={14} />
                            <span>{f.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-500 text-xs mt-2">
                          <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">{f.college_uid}</span>
                        </div>
                      </div>


                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FacultyCreatorLayout>
  );
};

export default FacultyListPage;
