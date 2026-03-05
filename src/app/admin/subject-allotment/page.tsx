'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, RefreshCw, Search, Eye, EyeOff, Download, Play, AlertCircle, CheckCircle, Users, BookOpen, Undo2, FileText, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import CollegeAdminLayout from '@/components/admin/CollegeAdminLayout';
import { CardLoader } from '@/components/ui/PageLoader';
import { useSemesterMode } from '@/contexts/SemesterModeContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface BucketSubject { subject_id: string; subjects: { id: string; code: string; name: string; } | null; }

interface Bucket {
  id: string;
  bucket_name: string;
  is_published: boolean;
  is_live_for_creators?: boolean;
  is_live_for_students?: boolean;
  batch_id: string;
  batches?: { name: string; semester: number; } | null;
  bucket_subjects?: BucketSubject[];
}

interface StudentChoice {
  id: string;
  student_id: string;
  student_name: string;
  college_uid: string;
  cgpa: number;
  priority: number;
  subject_code: string;
  subject_name: string;
  created_at: string;
}

interface Allotment {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  college_uid: string;
  subject_code: string;
  subject_name: string;
  priority_rank: number;
  student_cgpa: number;
  allotted_at: string;
}

const SubjectAllotmentPage: React.FC = () => {
  const router = useRouter();
  const { semesterMode, activeSemesters, modeLabel } = useSemesterMode();
  const { showConfirm } = useConfirm();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [studentChoices, setStudentChoices] = useState<StudentChoice[]>([]);
  const [allotments, setAllotments] = useState<Allotment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [loadingAllotments, setLoadingAllotments] = useState(false);
  const [converting, setConverting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllotments, setShowAllotments] = useState(false);

  useEffect(() => { fetchBuckets(); }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchStudentChoices();
      fetchAllotments();
    }
  }, [selectedBucket]);

  const getAuthHeaders = () => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return null; }
    return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
  };

  const fetchBuckets = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const headers = getAuthHeaders();
      if (!headers) return;
      const q = user.college_id ? `?college_id=${user.college_id}` : '';
      const res = await fetch(`/api/admin/buckets${q}`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Show all buckets (published + draft)
        setBuckets(data.buckets || []);
      }
    } catch { toast.error('Error loading buckets'); } finally { setLoading(false); }
  };

  const fetchStudentChoices = async () => {
    if (!selectedBucket) return;
    try {
      setLoadingChoices(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/admin/student-choices?bucketId=${selectedBucket}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStudentChoices(data.choices || []);
      }
    } catch { toast.error('Error loading choices'); } finally { setLoadingChoices(false); }
  };

  const fetchAllotments = async () => {
    if (!selectedBucket) return;
    try {
      setLoadingAllotments(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/admin/subject-allotment/convert?bucketId=${selectedBucket}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAllotments(data.allotments || []);
      }
    } catch { console.error('Error loading allotments'); } finally { setLoadingAllotments(false); }
  };

  const handleRunAllotment = async () => {
    if (!selectedBucket) { toast.error('Select a bucket first'); return; }
    if (studentChoices.length === 0) { toast.error('No student choices to process'); return; }

    setConverting(true);
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return;
      const user = JSON.parse(userData);
      const headers = getAuthHeaders();
      if (!headers) return;

      const res = await fetch('/api/admin/subject-allotment/convert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bucket_id: selectedBucket,
          allotted_by: user.id,
          algorithm: 'priority_based'
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Successfully allotted ${data.stats?.allotted || 0} students`);
        fetchStudentChoices();
        fetchAllotments();
        setShowAllotments(true);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Allotment failed');
      }
    } catch { toast.error('Error running allotment'); } finally { setConverting(false); }
  };

  const handleRevokeAllotment = (allotment: Allotment) => {
    showConfirm({
      title: 'Revoke Subject Allotment',
      message: `Are you sure you want to revoke the allotment for student "${allotment.first_name} ${allotment.last_name}" (${allotment.college_uid})?`,
      confirmText: 'Revoke',
      onConfirm: async () => {
        try {
          const headers = getAuthHeaders();
          if (!headers) return;
          const res = await fetch('/api/admin/subject-allotment/revoke', {
            method: 'POST',
            headers,
            body: JSON.stringify({ allotment_id: allotment.id })
          });
          if (res.ok) {
            toast.success('Allotment revoked');
            fetchAllotments();
            fetchStudentChoices();
          } else {
            const err = await res.json();
            toast.error(err.error || 'Failed to revoke');
          }
        } catch { toast.error('Error revoking'); }
      }
    });
  };

  const handleRevokeAll = () => {
    showConfirm({
      title: 'Revoke All Allotments',
      message: `Are you sure you want to revoke all ${allotments.length} allotments? This action cannot be undone.`,
      confirmText: 'Revoke All',
      onConfirm: async () => {
        try {
          const headers = getAuthHeaders();
          if (!headers) return;

          // Revoke all allotments one by one
          for (const allotment of allotments) {
            await fetch('/api/admin/subject-allotment/revoke', {
              method: 'POST',
              headers,
              body: JSON.stringify({ allotment_id: allotment.id })
            });
          }
          toast.success('All allotments revoked');
          fetchAllotments();
          fetchStudentChoices();
        } catch { toast.error('Error revoking allotments'); }
      }
    });
  };

  // CSV Download function
  const downloadCSV = () => {
    if (allotments.length === 0) {
      toast.error('No allotments to download');
      return;
    }

    const bucketInfo = selectedBucketData;
    const headers = ['S.No', 'Student Name', 'UID', 'Subject Code', 'Subject Name', 'Original Priority', 'CGPA', 'Allotted At'];
    const rows = allotments.map((a, i) => [
      i + 1,
      `${a.first_name} ${a.last_name}`,
      a.college_uid,
      a.subject_code,
      a.subject_name,
      `P${a.priority_rank}`,
      a.student_cgpa?.toFixed(2) || '-',
      new Date(a.allotted_at).toLocaleString()
    ]);

    const csvContent = [
      `"Subject Allotment Report"`,
      `"Bucket: ${bucketInfo?.bucket_name || 'Unknown'}"`,
      `"Batch: ${bucketInfo?.batches?.name || 'Unknown'} - Semester ${bucketInfo?.batches?.semester || '?'}"`,
      `"Generated: ${new Date().toLocaleString()}"`,
      `"Total Allotted: ${allotments.length}"`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `allotment_${bucketInfo?.bucket_name?.replace(/\s+/g, '_') || 'report'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV downloaded successfully');
  };

  // PDF Download function
  const downloadPDF = () => {
    if (allotments.length === 0) {
      toast.error('No allotments to download');
      return;
    }

    const bucketInfo = selectedBucketData;

    // Create PDF content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to download PDF');
      return;
    }

    const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Subject Allotment Report - ${bucketInfo?.bucket_name || 'Report'}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4D869C; padding-bottom: 20px; }
                    .header h1 { color: #4D869C; margin-bottom: 10px; font-size: 24px; }
                    .header p { color: #666; font-size: 14px; margin: 5px 0; }
                    .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; }
                    .info-item { text-align: center; }
                    .info-item .label { font-size: 12px; color: #666; }
                    .info-item .value { font-size: 18px; font-weight: bold; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #4D869C; color: white; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
                    td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .priority { background: #e8d5f0; color: #6b21a8; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 11px; }
                    .subject-code { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-weight: 500; font-size: 11px; }
                    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
                    @media print {
                        body { padding: 20px; }
                        .header { page-break-after: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 Subject Allotment Report</h1>
                    <p><strong>Bucket:</strong> ${bucketInfo?.bucket_name || 'Unknown'}</p>
                    <p><strong>Batch:</strong> ${bucketInfo?.batches?.name || 'Unknown'} - Semester ${bucketInfo?.batches?.semester || '?'}</p>
                </div>
                
                <div class="info-box">
                    <div class="info-item">
                        <div class="label">Total Students Allotted</div>
                        <div class="value">${allotments.length}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Report Generated</div>
                        <div class="value">${new Date().toLocaleDateString()}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Time</div>
                        <div class="value">${new Date().toLocaleTimeString()}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Student Name</th>
                            <th>UID</th>
                            <th>Subject Allotted</th>
                            <th>Priority</th>
                            <th>CGPA</th>
                            <th>Allotted At</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allotments.map((a, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${a.first_name} ${a.last_name}</strong></td>
                                <td><code>${a.college_uid}</code></td>
                                <td><span class="subject-code">${a.subject_code}</span> ${a.subject_name}</td>
                                <td><span class="priority">#${a.priority_rank}</span></td>
                                <td>${a.student_cgpa?.toFixed(2) || '-'}</td>
                                <td>${new Date(a.allotted_at).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Generated by Algomate - Subject Allotment System</p>
                    <p>This is a computer-generated document. No signature required.</p>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success('PDF ready for download');
  };

  const selectedBucketData = buckets.find(b => b.id === selectedBucket);

  const filteredChoices = studentChoices.filter(c =>
    c.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.college_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllotments = allotments.filter(a =>
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.college_uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.subject_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to get subjects from bucket_subjects junction table
  const getBucketSubjects = (bucket: Bucket | undefined) => {
    if (!bucket?.bucket_subjects) return [];
    return bucket.bucket_subjects
      .filter(bs => bs.subjects)
      .map(bs => bs.subjects!);
  };

  const bucketSubjectsCount = getBucketSubjects(selectedBucketData).length;

  return (
    <CollegeAdminLayout activeTab="subject-allotment">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Subject Allotment</h1>
            <p className="text-gray-600">View student submissions and manage permanent allotments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAllotments(!showAllotments)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors border ${showAllotments ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              <Eye size={18} />
              {showAllotments ? 'Viewing Allotments' : 'Viewing Submissions'}
            </button>
            <button onClick={fetchBuckets} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Bucket Selection Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Select Bucket ({buckets.length} available)</label>
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none text-lg"
              >
                <option value="">-- Select a Bucket --</option>
                {buckets
                  .filter(b => semesterMode === 'all' || (b.batches?.semester != null && activeSemesters.includes(b.batches.semester)))
                  .map(b => (
                    <option key={b.id} value={b.id}>
                      [{b.is_published ? '✓ Published' : '○ Draft'}] {b.bucket_name} - {b.batches?.name || 'Unknown Batch'} (Sem {b.batches?.semester || '?'})
                    </option>
                  ))}
              </select>
              {semesterMode !== 'all' && (
                <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium w-fit ${semesterMode === 'odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-violet-50 text-violet-700 border border-violet-200'
                  }`}>
                  <span className="w-2 h-2 rounded-full animate-pulse inline-block bg-current"></span>
                  Active mode: <strong className="ml-1">{modeLabel}</strong>
                  <span className="ml-1 text-xs opacity-70">— Sem {activeSemesters.join(', ')} only.</span>
                </div>
              )}
            </div>

            {/* Bucket Info Row */}
            {selectedBucketData && (
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bucket:</p>
                  <p className="font-semibold text-gray-800">{selectedBucketData.bucket_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Batch:</p>
                  <p className="font-semibold text-gray-800">{selectedBucketData.batches?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Semester:</p>
                  <p className="font-semibold text-gray-800">{selectedBucketData.batches?.semester || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status:</p>
                  <p className={`font-semibold ${selectedBucketData.is_published ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedBucketData.is_published ? 'Published' : 'Draft'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Subject Allotment Section */}
        {selectedBucket && showAllotments && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Section Header with Actions */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckSquare size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Student Subject Allotment</h3>
                  <p className="text-sm text-gray-500">Permanent allotments after conversion (final results)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <p className="text-2xl font-bold text-gray-800">{allotments.length}</p>
                  <p className="text-xs text-gray-500">Students Allotted</p>
                </div>
                {allotments.length > 0 && (
                  <>
                    <button
                      onClick={handleRevokeAll}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      <Undo2 size={16} /> Revoke All
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                    >
                      <FileSpreadsheet size={16} /> CSV
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                    >
                      <FileText size={16} /> PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search allotments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none text-sm"
                />
              </div>
            </div>

            {/* Allotments Table */}
            {loadingAllotments ? (
              <CardLoader message="Loading allotments..." subMessage="Fetching subject allotment data" />
            ) : filteredAllotments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckSquare size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No allotments yet. Run the allotment algorithm to assign subjects.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">UID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subject Allotted</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Original Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">CGPA</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Allotted At</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAllotments.map((allotment, i) => (
                    <motion.tr key={allotment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{allotment.first_name} {allotment.last_name}</td>
                      <td className="px-6 py-4"><span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{allotment.college_uid}</span></td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">{allotment.subject_code}</span>
                        <span className="text-gray-600 ml-2">- {allotment.subject_name}</span>
                      </td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">#{allotment.priority_rank}</span></td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{allotment.student_cgpa?.toFixed(2) || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(allotment.allotted_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleRevokeAllotment(allotment)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Revoke"><Undo2 size={16} /></button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Student Submissions Section */}
        {selectedBucket && !showAllotments && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Section Header */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Student Submissions (Pending)</h3>
                  <p className="text-sm text-gray-500">Students who have submitted their choices but not yet allotted</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <p className="text-2xl font-bold text-gray-800">{studentChoices.length}</p>
                  <p className="text-xs text-gray-500">Pending Choices</p>
                </div>
                {studentChoices.length > 0 && (
                  <button
                    onClick={handleRunAllotment}
                    disabled={converting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play size={16} />
                    {converting ? 'Processing...' : 'Run Allotment'}
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4D869C] outline-none text-sm"
                />
              </div>
            </div>

            {/* Choices Table */}
            {loadingChoices ? (
              <CardLoader message="Loading submissions..." subMessage="Fetching student choices" />
            ) : filteredChoices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No pending student choices for this bucket.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">UID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">CGPA</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredChoices.map((choice, i) => (
                    <motion.tr key={choice.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{choice.student_name}</td>
                      <td className="px-6 py-4"><span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{choice.college_uid}</span></td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{choice.cgpa?.toFixed(2) || '-'}</td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">P{choice.priority}</span></td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{choice.subject_code}</span>
                        <span className="text-gray-500 ml-2 text-sm">- {choice.subject_name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(choice.created_at).toLocaleString()}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Stats Cards */}
        {selectedBucket && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100"><Users size={24} className="text-blue-600" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{filteredChoices.length}</p><p className="text-sm text-gray-500">Pending Choices</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100"><CheckCircle size={24} className="text-green-600" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{filteredAllotments.length}</p><p className="text-sm text-gray-500">Allotted</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100"><BookOpen size={24} className="text-purple-600" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{bucketSubjectsCount}</p><p className="text-sm text-gray-500">Subjects in Bucket</p></div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100"><AlertCircle size={24} className="text-orange-600" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{filteredChoices.length + filteredAllotments.length}</p><p className="text-sm text-gray-500">Total Submissions</p></div>
            </div>
          </div>
        )}

        {/* No Bucket Selected */}
        {!selectedBucket && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CheckSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">Select a Bucket</h3>
            <p className="text-gray-500">Choose a published elective bucket to view student choices and manage allotments.</p>
          </div>
        )}
      </div>
    </CollegeAdminLayout>
  );
};

export default SubjectAllotmentPage;
