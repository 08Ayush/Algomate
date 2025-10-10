'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  AlertCircle
} from 'lucide-react';

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

      // Fetch timetable details
      const { data: timetableData, error: timetableError } = await supabase
        .from('generated_timetables')
        .select('*')
        .eq('id', timetableId)
        .single();

      if (timetableError) throw timetableError;
      if (!timetableData) throw new Error('Timetable not found');

      // Fetch batch name
      let batchName = 'Unknown Batch';
      if (timetableData.batch_id) {
        const { data: batchData } = await supabase
          .from('batches')
          .select('name')
          .eq('id', timetableData.batch_id)
          .single();
        if (batchData) batchName = batchData.name;
      }

      // Fetch creator name
      let creatorName = 'Unknown';
      if (timetableData.created_by) {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', timetableData.created_by)
          .single();
        if (userData) creatorName = `${userData.first_name} ${userData.last_name}`;
      }

      setTimetable({
        ...timetableData,
        batch_name: batchName,
        creator_name: creatorName
      });

      // Fetch scheduled classes with time slot info
      const { data: classesData, error: classesError } = await supabase
        .from('scheduled_classes')
        .select('*')
        .eq('timetable_id', timetableId);

      if (classesError) throw classesError;

      // Fetch additional details for each class
      const enrichedClasses = await Promise.all(
        (classesData || []).map(async (cls) => {
          // Get time slot
          const { data: timeSlot } = await supabase
            .from('time_slots')
            .select('day, start_time, end_time')
            .eq('id', cls.time_slot_id)
            .single();

          // Get subject
          const { data: subject } = await supabase
            .from('subjects')
            .select('name, code')
            .eq('id', cls.subject_id)
            .single();

          // Get faculty
          const { data: faculty } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', cls.faculty_id)
            .single();

          // Get classroom
          const { data: classroom } = await supabase
            .from('classrooms')
            .select('name')
            .eq('id', cls.classroom_id)
            .single();

          return {
            ...cls,
            day: timeSlot?.day || '',
            start_time: timeSlot?.start_time || '',
            end_time: timeSlot?.end_time || '',
            subject_name: subject?.name || 'Unknown',
            subject_code: subject?.code || '',
            faculty_name: faculty ? `${faculty.first_name} ${faculty.last_name}` : 'Unknown',
            classroom_name: classroom?.name || 'Unknown'
          };
        })
      );

      setClasses(enrichedClasses);

      // Extract unique time slots and sort them
      const uniqueSlots = Array.from(
        new Set(
          enrichedClasses
            .map(cls => `${cls.start_time}-${cls.end_time}`)
            .filter(slot => slot !== '-')
        )
      ).sort();
      setTimeSlots(uniqueSlots);

    } catch (err: any) {
      console.error('Error fetching timetable:', err);
      setError(err.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const getClassForSlot = (day: string, timeSlot: string): ScheduledClass | undefined => {
    const [startTime, endTime] = timeSlot.split('-');
    return classes.find(
      cls => cls.day === day && cls.start_time === startTime && cls.end_time === endTime
    );
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-yellow-100 text-yellow-700',
      published: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timetable...</p>
        </div>
      </div>
    );
  }

  if (error || !timetable) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Timetable</h2>
          <p className="text-gray-600 mb-4">{error || 'Timetable not found'}</p>
          <button
            onClick={() => router.push('/faculty/timetables')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Timetables
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <button
                onClick={() => router.push('/faculty/timetables')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{timetable.title}</h1>
                {timetable.description && (
                  <p className="text-gray-600 mt-1">{timetable.description}</p>
                )}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(timetable.status)}`}>
              {timetable.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Batch</p>
                <p className="text-sm font-medium">{timetable.batch_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Academic Year</p>
                <p className="text-sm font-medium">{timetable.academic_year}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Semester</p>
                <p className="text-sm font-medium">Semester {timetable.semester}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created By</p>
                <p className="text-sm font-medium">{timetable.creator_name}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t">
            {timetable.status === 'draft' && (
              <button
                onClick={() => router.push(`/faculty/manual-scheduling?edit=${timetableId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Timetable
              </button>
            )}
            <button
              onClick={() => alert('Export feature coming soon!')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {timeSlots.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No classes scheduled yet</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">
                      Day / Time
                    </th>
                    {timeSlots.map((slot) => {
                      const [start, end] = slot.split('-');
                      return (
                        <th key={slot} className="border border-gray-200 p-3 text-center font-semibold text-gray-700 min-w-[200px]">
                          <div className="flex flex-col items-center">
                            <Clock className="w-4 h-4 mb-1 text-gray-400" />
                            <span className="text-sm">{start}</span>
                            <span className="text-xs text-gray-500">to {end}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-3 font-medium text-gray-700 sticky left-0 bg-white z-10">
                        {day}
                      </td>
                      {timeSlots.map((slot) => {
                        const classInfo = getClassForSlot(day, slot);
                        return (
                          <td key={`${day}-${slot}`} className="border border-gray-200 p-2">
                            {classInfo ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors">
                                <div className="font-semibold text-sm text-blue-900 mb-1">
                                  {classInfo.subject_name}
                                </div>
                                {classInfo.subject_code && (
                                  <div className="text-xs text-blue-700 mb-2">
                                    {classInfo.subject_code}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                  <User className="w-3 h-3" />
                                  <span>{classInfo.faculty_name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <MapPin className="w-3 h-3" />
                                  <span>{classInfo.classroom_name}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-xs text-gray-400 py-4">
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
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
            <div className="text-sm text-gray-600">Total Classes</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">
              {Array.from(new Set(classes.map(c => c.subject_id))).length}
            </div>
            <div className="text-sm text-gray-600">Unique Subjects</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Array.from(new Set(classes.map(c => c.faculty_id))).length}
            </div>
            <div className="text-sm text-gray-600">Faculty Members</div>
          </div>
        </div>
      </div>
    </div>
  );
}
