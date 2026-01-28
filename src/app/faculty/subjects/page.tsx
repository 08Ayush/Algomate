'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, RefreshCw, Clock, Tag, Building, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  lecture_hours?: number;
  lab_hours?: number;
  tutorial_hours?: number;
  semester?: number;
  subject_type?: string;
  department_id?: string;
  departments?: { name: string; code: string } | null;
  nep_category?: string;
  requires_lab?: boolean;
}

const SubjectsPage: React.FC = () => {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => { fetchSubjects(); }, []);

  const getAuthHeaders = () => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return null; }
    return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const headers = getAuthHeaders();
      if (!headers) return;

      const q = user.department_id ? `?department_id=${user.department_id}` : '';
      const res = await fetch(`/api/subjects${q}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || data.data || []);
      }
    } catch { toast.error('Error loading subjects'); } finally { setLoading(false); }
  };

  const uniqueSemesters = [...new Set(subjects.map(s => s.semester).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0));
  const uniqueCategories = [...new Set(subjects.map(s => s.nep_category).filter(Boolean))];

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSem = semesterFilter === 'all' || s.semester?.toString() === semesterFilter;
    const matchesCategory = categoryFilter === 'all' || s.nep_category === categoryFilter;
    return matchesSearch && matchesSem && matchesCategory;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'theory': 'bg-blue-100 text-blue-700',
      'practical': 'bg-green-100 text-green-700',
      'lab': 'bg-green-100 text-green-700',
      'elective': 'bg-purple-100 text-purple-700',
      'core': 'bg-orange-100 text-orange-700',
    };
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'Core': 'text-orange-700 bg-orange-50',
      'Major': 'text-blue-700 bg-blue-50',
      'Minor': 'text-purple-700 bg-purple-50',
    };
    return colors[category || ''] || 'text-gray-700 bg-gray-50';
  };

  const totalTheory = filteredSubjects.filter(s => s.subject_type?.toLowerCase() === 'theory').length;
  const totalLab = filteredSubjects.filter(s => s.subject_type?.toLowerCase() === 'lab' || s.subject_type?.toLowerCase() === 'practical' || s.requires_lab).length;
  const filteredUniqueSemesters = [...new Set(filteredSubjects.map(s => s.semester).filter(Boolean))];

  return (
    <FacultyCreatorLayout activeTab="subjects">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Subjects</h1>
            <p className="text-gray-600">View subjects in your department</p>
          </div>
          <button onClick={fetchSubjects} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
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
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
              />
            </div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]"
            >
              <option value="all">All Semesters</option>
              {uniqueSemesters.map(sem => (
                <option key={sem} value={sem?.toString()}>Semester {sem}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl min-w-[150px]"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100"><BookOpen size={24} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{filteredSubjects.length}</p><p className="text-sm text-gray-500">Total Subjects</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100"><Clock size={24} className="text-green-600" /></div>
            <div>
              <div className="flex gap-3 text-sm">
                <span className="font-semibold text-gray-900">{totalTheory} Theory</span>
                <span className="text-gray-300">|</span>
                <span className="font-semibold text-gray-900">{totalLab} Lab</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Total Lectures</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100"><Tag size={24} className="text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{filteredSubjects.reduce((sum, s) => sum + (s.credits || 0), 0)}</p><p className="text-sm text-gray-500">Total Credits</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100"><Building size={24} className="text-orange-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{filteredUniqueSemesters.length}</p><p className="text-sm text-gray-500">Semesters</p></div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No subjects found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Semester</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Credits</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubjects.map((subject, i) => (
                  <motion.tr key={subject.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <BookOpen size={18} className="text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{subject.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{subject.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                        Sem {subject.semester || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{subject.credits || 0}</td>
                    <td className="px-6 py-4">
                      {subject.nep_category ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryColor(subject.nep_category)}`}>
                          {subject.nep_category}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(subject.subject_type || '')}`}>
                        {subject.subject_type || 'N/A'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </FacultyCreatorLayout>
  );
};

export default SubjectsPage;
