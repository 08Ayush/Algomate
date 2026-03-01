'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GraduationCap, Search, RefreshCw, Users, Package, BookOpen, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { useSemesterMode } from '@/contexts/SemesterModeContext';

interface Batch {
  id: string;
  name: string;
  semester: number;
  section: string;
  academic_year: string;
  start_date?: string;
  end_date?: string;
  strength?: number;
  departments?: { name: string; code: string } | null;
  courses?: { title: string; code: string } | null;
  elective_buckets?: {
    id: string;
    bucket_name: string;
    subjects: { id: string; name: string; code: string; credits?: number }[];
    min_selection?: number;
    max_selection?: number;
    is_common_slot?: boolean;
  }[];
}

const BatchesPage: React.FC = () => {
  const router = useRouter();
  const { semesterMode, activeSemesters, modeLabel } = useSemesterMode();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  useEffect(() => { fetchBatches(); }, []);
  useEffect(() => { setSemesterFilter('all'); }, [semesterMode]);

  const getAuthHeaders = () => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return null; }
    return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const headers = getAuthHeaders();
      if (!headers) return;

      const q = user.department_id ? `?department_id=${user.department_id}` :
        user.college_id ? `?college_id=${user.college_id}` : '';
      const res = await fetch(`/api/batches${q}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || data.data || []);
      }
    } catch { toast.error('Error loading batches'); } finally { setLoading(false); }
  };

  const uniqueSemesters = [...new Set(batches.map(b => b.semester).filter(Boolean))]
    .filter(sem => semesterMode === 'all' || activeSemesters.includes(sem!))
    .sort((a, b) => a - b);

  const filteredBatches = batches.filter(b => {
    const matchesSearch = b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.section?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSem = semesterFilter === 'all' || b.semester?.toString() === semesterFilter;
    const matchesMode = semesterMode === 'all' || activeSemesters.includes(b.semester);
    return matchesSearch && matchesSem && matchesMode;
  });

  const totalBuckets = batches.reduce((acc, b) => acc + (b.elective_buckets?.length || 0), 0);
  const totalSubjectsInBuckets = batches.reduce((acc, b) =>
    acc + (b.elective_buckets?.reduce((sAcc, bucket) => sAcc + (bucket.subjects?.length || 0), 0) || 0), 0
  );

  const toggleExpand = (id: string) => {
    setExpandedBatch(expandedBatch === id ? null : id);
  };

  return (
    <FacultyCreatorLayout activeTab="batches">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Batches</h1>
            <p className="text-gray-600">View student batches and sections</p>
          </div>
          <button onClick={fetchBatches} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
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
                placeholder="Search batches..."
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
          </div>
          {semesterMode !== 'all' && (
            <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${semesterMode === 'odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
              }`}>
              <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-current"></span>
              Active mode: <strong className="ml-1">{modeLabel}</strong>
              <span className="ml-1 text-xs opacity-70">— Sem {activeSemesters.join(', ')} only.</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100"><GraduationCap size={24} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{batches.length}</p><p className="text-sm text-gray-500">Total Batches</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100"><Users size={24} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{batches.reduce((sum, b) => sum + (b.strength || 0), 0)}</p><p className="text-sm text-gray-500">Total Students</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100"><Package size={24} className="text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{totalBuckets}</p><p className="text-sm text-gray-500">Total Buckets</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100"><BookOpen size={24} className="text-orange-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{totalSubjectsInBuckets}</p><p className="text-sm text-gray-500">In all buckets</p></div>
          </div>
        </div>

        {/* Batches List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-lg">Loading...</div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-lg">
              <GraduationCap size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No batches found</p>
            </div>
          ) : (
            filteredBatches.map((batch, i) => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Batch Header Card */}
                <div
                  onClick={() => toggleExpand(batch.id)}
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{batch.name}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                        Semester {batch.semester}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {batch.courses?.title || 'Unknown Course'} • {batch.academic_year}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Users size={16} />
                        <span>{batch.strength || 0}/{batch.strength || 60} Students</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-purple-500" />
                        <span>{batch.elective_buckets?.length || 0} Buckets</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-green-500" />
                        <span>
                          {batch.elective_buckets?.reduce((acc, bucket) => acc + (bucket.subjects?.length || 0), 0) || 0} Subjects
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`transform transition-transform duration-200 ${expandedBatch === batch.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className="text-gray-400" />
                  </div>
                </div>

                {/* Expanded Content: Buckets */}
                <AnimatePresence>
                  {expandedBatch === batch.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 bg-gray-50/50"
                    >
                      <div className="p-6">
                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <Layers size={16} /> Elective Buckets:
                        </h4>

                        {(!batch.elective_buckets || batch.elective_buckets.length === 0) ? (
                          <div className="text-sm text-gray-500 italic">No elective buckets found for this batch.</div>
                        ) : (
                          <div className="space-y-4">
                            {batch.elective_buckets.map((bucket) => (
                              <div key={bucket.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {/* Bucket Header */}
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                                  <div className="flex items-center gap-3">
                                    <Package size={20} className="text-purple-500" />
                                    <span className="font-bold text-gray-900">{bucket.bucket_name}</span>
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-lg font-medium">
                                      {bucket.subjects?.length || 0} subjects
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="text-gray-500">
                                      Select {bucket.min_selection || 1} to {bucket.max_selection || 1} subjects
                                    </span>
                                    {/* Assuming Common Slot logic or just static label for now based on needs */}
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                                      Common Slot
                                    </span>
                                  </div>
                                </div>

                                {/* Bucket Subjects List */}
                                <div className="divide-y divide-gray-100">
                                  {bucket.subjects?.map((subject) => (
                                    <div key={subject.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-900">{subject.name}</span>
                                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                                            THEORY
                                          </span>
                                        </div>
                                        <div className="text-xs text-blue-600 font-mono mt-0.5">
                                          {subject.code}
                                        </div>
                                      </div>
                                      {/* Placeholders for credits if not available, or use API data if available */}
                                      <div className="text-xs text-gray-400">
                                        1 credits • L: 1 | T: 0 | P: 0
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </FacultyCreatorLayout>
  );
};

export default BatchesPage;
