'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, RefreshCw, BookOpen, Users, Award, Plus, X, Trash2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface Qualification {
  id: string;
  faculty_id: string;
  subject_id: string;
  proficiency_level: number;
  preference_score: number;
  teaching_load_weight: number;
  is_primary_teacher: boolean;
  can_handle_lab: boolean;
  can_handle_tutorial: boolean;
  faculty?: { first_name: string; last_name: string; email: string };
  subject?: {
    name: string;
    code: string;
    subject_type: string;
    semester: number;
  };
  subjects?: { name: string; code: string };
}

interface Subject {
  id: string;
  name: string;
  code: string;
  subject_type?: string;
  semester?: number;
  course_id?: string;
}

interface Faculty {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
  code: string;
}

const QualificationsPage: React.FC = () => {
  const router = useRouter();
  const { showConfirm } = useConfirm();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    faculty_id: '',
    course_id: '',     // Filter helper
    semester: '',      // Filter helper
    subject_id: '',
    proficiency_level: 7,
    preference_score: 5,
    is_primary_teacher: false,
    can_handle_lab: true,
    can_handle_tutorial: true
  });

  useEffect(() => { fetchData(); }, []);

  const getAuthHeaders = () => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return null; }
    return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      if (!headers) return;

      const [qualRes, subRes, facRes, courseRes] = await Promise.all([
        fetch('/api/faculty/qualifications', { headers }),
        fetch('/api/subjects', { headers }),
        fetch('/api/faculty', { headers }),
        fetch('/api/admin/courses', { headers })
      ]);

      if (qualRes.ok) {
        const data = await qualRes.json();
        setQualifications(data.qualifications || data.data || []);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubjects(data.subjects || data.data || []);
      }
      if (facRes.ok) {
        const data = await facRes.json();
        setFacultyList(data.data || []);
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourses(data.courses || []);
      }
    } catch { toast.error('Error loading data'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.faculty_id || !form.subject_id) { toast.error('Select faculty and subject'); return; }
    setSubmitting(true);
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch('/api/faculty/qualifications', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          faculty_id: form.faculty_id,
          subject_id: form.subject_id,
          proficiency_level: form.proficiency_level,
          preference_score: form.preference_score,
          is_primary_teacher: form.is_primary_teacher,
          can_handle_lab: form.can_handle_lab,
          can_handle_tutorial: form.can_handle_tutorial,
        })
      });
      if (res.ok) {
        toast.success('Qualification added');
        setShowForm(false);
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed');
      }
    } catch { toast.error('Error'); } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setForm({
      faculty_id: '',
      course_id: '',
      semester: '',
      subject_id: '',
      proficiency_level: 7,
      preference_score: 5,
      is_primary_teacher: false,
      can_handle_lab: true,
      can_handle_tutorial: true
    });
  };

  const handleDelete = (qualification: Qualification) => {
    const subjectName = qualification.subjects?.name || qualification.subject?.name || 'Unknown';
    const facultyName = qualification.faculty ? `${qualification.faculty.first_name} ${qualification.faculty.last_name}` : 'Unknown';
    
    showConfirm({
      title: 'Remove Qualification',
      message: `Are you sure you want to remove the qualification "${subjectName}" for ${facultyName}?`,
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          const headers = getAuthHeaders();
          if (!headers) return;
          const res = await fetch(`/api/faculty/qualifications?id=${qualification.id}`, { method: 'DELETE', headers });
          if (res.ok) {
            toast.success('Qualification removed');
            setQualifications(prev => prev.filter(q => q.id !== qualification.id));
          } else {
            toast.error('Failed to remove');
          }
        } catch { toast.error('Error'); }
      }
    });
  };

  const filteredQualifications = qualifications.filter(q =>
    q.faculty?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.faculty?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.subject?.name || q.subjects?.name || '')?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.subject?.code || q.subjects?.code || '')?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedByFaculty = filteredQualifications.reduce((acc, q) => {
    const fid = q.faculty_id;
    if (!acc[fid]) acc[fid] = { faculty: q.faculty, qualifications: [] };
    acc[fid].qualifications.push(q);
    return acc;
  }, {} as Record<string, { faculty: any; qualifications: Qualification[] }>);

  const getProficiencyColor = (level: number) => {
    if (level >= 9) return 'bg-green-500';
    if (level >= 7) return 'bg-blue-500';
    if (level >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Filter subjects for the form
  const filteredSubjects = subjects.filter(s => {
    const matchesCourse = !form.course_id || (s.course_id === form.course_id);
    const matchesSemester = !form.semester || (s.semester?.toString() === form.semester);
    return matchesCourse && matchesSemester;
  });

  return (
    <FacultyCreatorLayout activeTab="qualifications">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Qualifications</h1>
            <p className="text-gray-600">Manage faculty subject qualifications</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white shadow-sm transition-all hover:shadow-md">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-3 bg-[#4D869C] text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5">
              <Plus size={18} /> Add Qualification
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-50"><Sparkles size={24} className="text-purple-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{qualifications.length}</p><p className="text-sm text-gray-500">Total Qualifications</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50"><Users size={24} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{Object.keys(groupedByFaculty).length}</p><p className="text-sm text-gray-500">Qualified Faculty</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-50"><BookOpen size={24} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{new Set(qualifications.map(q => q.subject_id)).size}</p><p className="text-sm text-gray-500">Subjects Covered</p></div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by faculty name or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none transition-all"
            />
          </div>
        </div>

        {/* Qualifications by Faculty */}
        <div className="space-y-8">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading data...</div>
          ) : Object.keys(groupedByFaculty).length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Sparkles size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No qualifications found</p>
            </div>
          ) : (
            Object.entries(groupedByFaculty).map(([fid, data], i) => (
              <motion.div
                key={fid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#4D869C]/10 text-[#4D869C] flex items-center justify-center text-lg font-bold">
                      {data.faculty?.first_name?.[0]}{data.faculty?.last_name?.[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">
                        Dr. {data.faculty?.first_name} {data.faculty?.last_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>{data.faculty?.email}</span>
                        <span>•</span>
                        <span>{data.qualifications.length} Qualifications</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 text-left">
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Proficiency</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capabilities</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.qualifications.map((q) => (
                        <tr key={q.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-semibold text-gray-900">{q.subject?.name || q.subjects?.name}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{q.subject?.code || q.subjects?.code}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {q.subject?.semester && (
                              <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                                Sem {q.subject.semester}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-600">{q.subject?.subject_type || 'THEORY'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getProficiencyColor(q.proficiency_level)}`}
                                  style={{ width: `${q.proficiency_level * 10}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-600 w-8">{q.proficiency_level}/10</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {q.is_primary_teacher && (
                                <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold">Primary</span>
                              )}
                              {q.can_handle_lab && (
                                <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-semibold">Lab</span>
                              )}
                              {q.can_handle_tutorial && (
                                <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">Tutorial</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDelete(q)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Modal Form */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                  <h3 className="text-xl font-bold text-gray-900">Add Faculty Qualification</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Faculty *</label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none appearance-none bg-white text-gray-900"
                        value={form.faculty_id}
                        onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
                        required
                      >
                        <option value="">Choose faculty...</option>
                        {facultyList.map(f => (
                          <option key={f.id} value={f.id}>{f.first_name} {f.last_name} ({f.email})</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <Search size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Course</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none appearance-none bg-white text-gray-900"
                      value={form.course_id}
                      onChange={(e) => setForm({ ...form, course_id: e.target.value, subject_id: '' })}
                    >
                      <option value="">All Courses</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Semester</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none appearance-none bg-white text-gray-900"
                      value={form.semester}
                      onChange={(e) => setForm({ ...form, semester: e.target.value, subject_id: '' })}
                    >
                      <option value="">All Semesters</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Subject *</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none appearance-none bg-white text-gray-900"
                      value={form.subject_id}
                      onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                      required
                    >
                      <option value="">Choose subject...</option>
                      {filteredSubjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code}) - Sem {s.semester}</option>
                      ))}
                    </select>
                  </div>

                  {/* Proficiency Slider */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">Proficiency Level: {form.proficiency_level}/10</label>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={form.proficiency_level}
                      onChange={e => setForm({ ...form, proficiency_level: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
                    />
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>Beginner</span>
                      <span>Expert</span>
                    </div>
                  </div>

                  {/* Teaching Preference Slider */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">Teaching Preference: {form.preference_score}/10</label>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={form.preference_score}
                      onChange={e => setForm({ ...form, preference_score: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
                    />
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_primary_teacher}
                        onChange={e => setForm({ ...form, is_primary_teacher: e.target.checked })}
                        className="w-5 h-5 text-[#0066FF] rounded focus:ring-[#0066FF] border-gray-300"
                      />
                      <span className="text-gray-700 font-medium text-sm">Primary Teacher (Preferred for this subject)</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.can_handle_lab}
                        onChange={e => setForm({ ...form, can_handle_lab: e.target.checked })}
                        className="w-5 h-5 text-[#0066FF] rounded focus:ring-[#0066FF] border-gray-300"
                      />
                      <span className="text-gray-700 font-medium text-sm">Can handle lab sessions</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.can_handle_tutorial}
                        onChange={e => setForm({ ...form, can_handle_tutorial: e.target.checked })}
                        className="w-5 h-5 text-[#0066FF] rounded focus:ring-[#0066FF] border-gray-300"
                      />
                      <span className="text-gray-700 font-medium text-sm">Can handle tutorial sessions</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t mt-4 sticky bottom-0 bg-white pb-2">
                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-8 py-2.5 bg-[#4D869C] text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg transition-all">{submitting ? 'Adding...' : 'Add Qualification'}</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </FacultyCreatorLayout>
  );
};

export default QualificationsPage;
