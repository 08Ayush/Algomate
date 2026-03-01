'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowLeft,
  Download,
  Edit,
  Clock,
  Users,
  Calendar,
  MapPin,
  User,
  BookOpen,
  AlertCircle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScheduledClass {
  id: string;
  subject_id: string;
  faculty_id: string;
  classroom_id: string;
  time_slot_id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_name?: string;
  subject_code?: string;
  faculty_name?: string;
  classroom_name?: string;
  notes?: string;
  session_duration?: number;
  class_type?: string;
  is_continuation?: boolean;
  is_lab?: boolean;
  session_number?: number;
}

interface TimetableDetails {
  id: string;
  title: string;
  description: string | null;
  status: string;
  academic_year: string;
  semester: number;
  batch_name?: string;
  created_at: string;
  created_by: string;
  creator_name?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ViewTimetablePage() {
  const params = useParams();
  const router = useRouter();
  const timetableId = params.id as string;

  const [timetable, setTimetable] = useState<TimetableDetails | null>(null);
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimetableDetails();
  }, [timetableId]);

  const fetchTimetableDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('Please log in to view timetables');
      }
      const user = JSON.parse(userStr);
      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));

      const response = await fetch(`/api/timetables/${timetableId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch timetable');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch timetable');
      }

      setTimetable(result.timetable);
      const fetchedClasses = result.scheduledClasses || [];
      setClasses(fetchedClasses);

      // --- Dynamically derive unique time slots from actual classes ---
      // This ensures every scheduled class gets a grid cell, regardless of
      // which specific time slots the college uses.
      const LUNCH_START = '13:15'; // Insert lunch column after this time

      const slotSet = new Set<string>();
      fetchedClasses.forEach((cls: ScheduledClass) => {
        if (cls.start_time) {
          slotSet.add(cls.start_time.substring(0, 5)); // normalise to HH:MM
        }
      });

      // Sort chronologically
      const sortedSlots = Array.from(slotSet).sort();

      // Build final display list, inserting LUNCH marker
      const displaySlots: string[] = [];
      let lunchInserted = false;
      sortedSlots.forEach(startHH => {
        if (!lunchInserted && startHH >= LUNCH_START) {
          displaySlots.push('LUNCH');
          lunchInserted = true;
        }
        displaySlots.push(startHH);
      });
      if (!lunchInserted) displaySlots.push('LUNCH'); // edge case

      setTimeSlots(displaySlots);

    } catch (err: any) {
      console.error('Error fetching timetable:', err);
      setError(err.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Find the class scheduled in a given (day, startTime) cell.
   * startTime is an HH:MM string derived from the dynamic slots array.
   * We match only on start_time (normalised to HH:MM) because end_time
   * format differences between DB and hardcoded strings caused misses.
   */
  const getClassForSlot = (day: string, startTime: string): ScheduledClass | undefined => {
    const normalize = (t: string) => (t || '').substring(0, 5);
    return classes.find(
      cls => cls.day === day && normalize(cls.start_time) === normalize(startTime)
    );
  };

  const isLabContinuation = (classInfo: ScheduledClass): boolean => {
    if (classInfo.is_continuation !== undefined) {
      return classInfo.is_continuation;
    }
    return classInfo.notes?.includes('Continuation') || classInfo.notes?.includes('cont.') || false;
  };

  const isLabStart = (classInfo: ScheduledClass): boolean => {
    if (classInfo.is_lab !== undefined) {
      return classInfo.is_lab && !classInfo.is_continuation;
    }
    return (classInfo.class_type === 'LAB' || classInfo.class_type === 'PRACTICAL') &&
      classInfo.session_duration === 120;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Approval' },
      published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' }
    };
    return badges[status] || badges.draft;
  };

  const exportToPDF = () => {
    console.log('Starting PDF export...');
    if (!timetable) {
      console.error('No timetable data to export');
      toast.error('No timetable data available');
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const titleText = timetable.title || `Timetable - ${timetable.semester || 'Draft'}`;
      doc.text(titleText, pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const metaY = 25;
      doc.text(`Batch: ${timetable.batch_name || 'N/A'}`, 14, metaY);
      doc.text(`Semester: ${timetable.semester}`, 80, metaY);
      doc.text(`Academic Year: ${timetable.academic_year}`, 140, metaY);
      doc.text(`Created: ${new Date(timetable.created_at).toLocaleDateString()}`, 210, metaY);

      const tableData: any[] = [];

      DAYS.forEach(day => {
        const rowData: any[] = [day];

        timeSlots.forEach(slot => {
          if (slot === 'LUNCH') {
            rowData.push('LUNCH BREAK');
          } else {
            const classInfo = getClassForSlot(day, slot);
            if (classInfo) {
              const cellContent = `${classInfo.subject_code || ''}\n${classInfo.subject_name || ''}\n${classInfo.faculty_name || ''}\n${classInfo.classroom_name || ''}`;
              rowData.push(cellContent);
            } else {
              rowData.push('-');
            }
          }
        });

        tableData.push(rowData);
      });

      const headers = ['Day / Time'];
      timeSlots.forEach(slot => {
        if (slot === 'LUNCH') {
          headers.push('1:15-2:15\nLunch');
        } else {
          // slot is now an HH:MM start string; derive end from classes
          const exampleClass = classes.find(c => c.start_time?.startsWith(slot));
          const endDisp = exampleClass?.end_time?.substring(0, 5) || '?';
          headers.push(`${slot}\n${endDisp}`);
        }
      });

      console.log('Generating autoTable...');
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'middle',
          halign: 'center'
        },
        headStyles: {
          fillColor: [77, 134, 156],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: {
            fontStyle: 'bold',
            fillColor: [243, 244, 246],
            halign: 'left',
            cellWidth: 25
          }
        }
      });

      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        doc.text(
          `Generated on ${new Date().toLocaleString()}`,
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }

      const fileName = `${(timetable.title || 'timetable').replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log(`Saving PDF: ${fileName}`);
      doc.save(fileName);
      toast.success('PDF downloaded successfully');

    } catch (err) {
      console.error('Export PDF Error:', err);
      toast.error('Failed to export PDF');
    }
  };

  const submitForApproval = async () => {
    try {
      if (!timetable) return;

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Please log in');
        return;
      }
      const user = JSON.parse(userStr);
      const token = btoa(JSON.stringify({ id: user.id, role: user.role, department_id: user.department_id }));

      const response = await fetch(`/api/timetables/${timetable.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Timetable submitted for approval');
        fetchTimetableDetails(); // Refresh to update status
      } else {
        toast.error(data.error || 'Failed to submit timetable');
      }
    } catch (error) {
      console.error('Error submitting timetable:', error);
      toast.error('Error submitting timetable');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2] flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Loading timetable...</p>
        </div>
      </div>
    );
  }

  if (error || !timetable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#CDE8E5] via-[#EEF7FF] to-[#7AB2B2] flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-lg max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Timetable</h2>
          <p className="text-gray-600 mb-6">{error || 'Timetable not found'}</p>
          <button
            onClick={() => router.push('/faculty/timetables')}
            className="px-6 py-3 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Back to Timetables
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusBadge(timetable.status);

  return (
    <FacultyCreatorLayout activeTab="timetables">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#4D869C] via-[#5a9aae] to-[#7AB2B2] rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => router.push('/faculty/timetables')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{timetable.title}</h1>
                {timetable.description && (
                  <p className="text-white/70">{timetable.description}</p>
                )}
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusInfo.bg} ${statusInfo.text}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-white/70 mb-1">
                <Users size={16} /> Batch
              </div>
              <p className="text-white font-semibold">{timetable.batch_name || 'N/A'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-white/70 mb-1">
                <Calendar size={16} /> Academic Year
              </div>
              <p className="text-white font-semibold">{timetable.academic_year}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-white/70 mb-1">
                <BookOpen size={16} /> Semester
              </div>
              <p className="text-white font-semibold">Semester {timetable.semester}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-white/70 mb-1">
                <User size={16} /> Created By
              </div>
              <p className="text-white font-semibold">{timetable.creator_name || 'Unknown'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {timetable.status === 'draft' && (
              <>
                <button
                  onClick={submitForApproval}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 hover:shadow-lg transition-all"
                >
                  <FileText size={16} /> Submit for Approval
                </button>
                <button
                  onClick={() => router.push('/faculty/ai-timetable-creator')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#4D869C] rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  <Edit size={16} /> Edit Timetable
                </button>
              </>
            )}
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-all"
            >
              <Download size={16} /> Export PDF (Fixed)
            </button>
            <button
              onClick={fetchTimetableDetails}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-all"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Clock size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
              <p className="text-sm text-gray-500">Total Classes</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <BookOpen size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Array.from(new Set(classes.map(c => c.subject_id))).length}
              </p>
              <p className="text-sm text-gray-500">Unique Subjects</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100">
              <Users size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Array.from(new Set(classes.map(c => c.faculty_id))).length}
              </p>
              <p className="text-sm text-gray-500">Faculty Members</p>
            </div>
          </div>
        </motion.div>

        {/* Timetable Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            {timeSlots.length === 0 ? (
              <div className="text-center py-16">
                <Clock size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No classes scheduled yet</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#4D869C]">
                    <th className="border border-[#4D869C]/30 p-3 text-left font-semibold text-white sticky left-0 bg-[#4D869C] z-10">
                      Day / Time
                    </th>
                    {timeSlots.map((slot) => {
                      if (slot === 'LUNCH') {
                        return (
                          <th key={slot} className="border border-[#4D869C]/30 p-3 text-center font-semibold text-amber-100 bg-amber-600 min-w-[160px]">
                            <div className="flex flex-col items-center">
                              <span className="text-lg mb-1">🍽️</span>
                              <span className="text-sm">1:15-2:15</span>
                              <span className="text-xs">Lunch</span>
                            </div>
                          </th>
                        );
                      }

                      // slot is now an HH:MM start time string
                      // Find an example class at this slot to derive end_time for display
                      const exampleClass = classes.find(c => c.start_time?.startsWith(slot));
                      const displayEnd = exampleClass?.end_time?.substring(0, 5) || '?';
                      return (
                        <th key={slot} className="border border-[#4D869C]/30 p-3 text-center font-semibold text-white min-w-[160px]">
                          <div className="flex flex-col items-center">
                            <Clock size={14} className="mb-1 text-white/70" />
                            <span className="text-sm">{slot}</span>
                            <span className="text-xs text-white/70">to {displayEnd}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIndex) => (
                    <tr key={day} className={dayIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-200 p-3 font-bold text-gray-800 sticky left-0 bg-inherit z-10">
                        {day}
                      </td>
                      {timeSlots.map((slot) => {
                        if (slot === 'LUNCH') {
                          return (
                            <td key={`${day}-${slot}`} className="border border-gray-200 p-4 bg-amber-50">
                              <div className="text-center text-amber-700 font-medium text-sm">
                                🍽️ Lunch
                              </div>
                            </td>
                          );
                        }

                        const classInfo = getClassForSlot(day, slot);
                        const isContinuation = classInfo && isLabContinuation(classInfo);
                        const isLabStartSlot = classInfo && isLabStart(classInfo);

                        return (
                          <td key={`${day}-${slot}`} className="border border-gray-200 p-2">
                            {classInfo ? (
                              <div className={`${isContinuation
                                ? 'bg-purple-50 border-l-4 border-l-purple-500 border-t border-r border-b border-purple-200'
                                : isLabStartSlot
                                  ? 'bg-purple-50 border border-purple-200'
                                  : 'bg-[#4D869C]/10 border border-[#4D869C]/30'
                                } rounded-xl p-3 relative`}>
                                {isLabStartSlot && (
                                  <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    2hr
                                  </div>
                                )}
                                {isContinuation && (
                                  <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    ↓
                                  </div>
                                )}
                                <div className={`font-bold text-sm ${isContinuation || isLabStartSlot ? 'text-purple-900' : 'text-[#4D869C]'
                                  } mb-1`}>
                                  {classInfo.subject_name}
                                </div>
                                {classInfo.subject_code && (
                                  <div className={`text-xs ${isContinuation || isLabStartSlot ? 'text-purple-700' : 'text-[#4D869C]/80'
                                    } mb-2`}>
                                    {classInfo.subject_code}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                  <User size={12} />
                                  <span className="truncate">{classInfo.faculty_name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <MapPin size={12} />
                                  <span>{classInfo.classroom_name}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-xs text-gray-400 py-6">
                                Free
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="text-sm font-bold text-gray-700 mb-4">Legend</h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#4D869C]/10 border border-[#4D869C]/30 rounded-lg"></div>
              <span className="text-sm text-gray-600">Theory Class (1 hour)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-50 border border-purple-200 rounded-lg relative">
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] px-1 rounded-full">2hr</span>
              </div>
              <span className="text-sm text-gray-600">Lab Start (2-hour session)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-50 border-l-4 border-l-purple-500 border-t border-r border-b border-purple-200 rounded-lg relative">
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] px-1 rounded-full">↓</span>
              </div>
              <span className="text-sm text-gray-600">Lab Continuation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center">
                <span className="text-sm">🍽️</span>
              </div>
              <span className="text-sm text-gray-600">Lunch Break</span>
            </div>
          </div>
        </motion.div>
      </div>
    </FacultyCreatorLayout>
  );
}
