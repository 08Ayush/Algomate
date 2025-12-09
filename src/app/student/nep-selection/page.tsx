'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { 
  BookOpen, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Info,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface Subject {
  id: string;
  code: string;
  name: string;
  credit_value: number;
  nep_category: string;
  subject_type: string;
  subject_domain?: string;
  description?: string;
  is_selectable: boolean;
  selection_type: 'MAJOR' | 'MINOR' | 'ELECTIVE' | 'CORE';
  reason: string;
  is_priority: boolean;
}

interface ElectiveBucket {
  id: string;
  bucket_name: string;
  description?: string;
  max_selection: number;
  min_selection: number;
  subjects: Subject[];
  selected_count: number;
}

interface LockedMajor {
  domain: string;
  locked_semester: number;
  locked_at: string;
  subject_name: string;
}

interface StudentSelection {
  id: string;
  subject_id: string;
  semester: number;
  academic_year: string;
  selection_type: string;
  is_locked: boolean;
  subjects: {
    id: string;
    code: string;
    name: string;
    credit_value: number;
    nep_category: string;
    subject_domain?: string;
  };
}

export default function NEPCurriculumSelection() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<ElectiveBucket[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [mySelections, setMySelections] = useState<StudentSelection[]>([]);
  const [lockedMajor, setLockedMajor] = useState<LockedMajor | null>(null);
  const [currentSemester, setCurrentSemester] = useState<number>(3);
  const [academicYear, setAcademicYear] = useState<string>('2024-25');
  const [submitting, setSubmitting] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setCurrentSemester(parsedUser.current_semester || 3);
      fetchMySelections(parsedUser.id, parsedUser.current_semester || 3);
      fetchAvailableSubjects(parsedUser.id, parsedUser.current_semester || 3, parsedUser.department_id);
      fetchBuckets(parsedUser.current_semester || 3, parsedUser.department_id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const fetchMySelections = async (studentId: string, semester: number) => {
    try {
      const response = await fetch(
        `/api/student/selections?studentId=${studentId}&semester=${semester}&academicYear=${academicYear}`
      );
      const data = await response.json();
      
      if (data.selections) {
        setMySelections(data.selections);
        const selected = new Set<string>(data.selections.map((s: StudentSelection) => s.subject_id));
        setSelectedSubjects(selected);
      }
    } catch (error) {
      console.error('Error fetching selections:', error);
    }
  };

  const fetchAvailableSubjects = async (studentId: string, semester: number, departmentId: string) => {
    try {
      const response = await fetch(
        `/api/student/available-subjects?studentId=${studentId}&semester=${semester}&departmentId=${departmentId}`
      );
      const data = await response.json();
      
      if (data.subjects) {
        setAvailableSubjects(data.subjects);
      }
      if (data.locked_major) {
        setLockedMajor(data.locked_major);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setLoading(false);
    }
  };

  const fetchBuckets = async (semester: number, departmentId: string) => {
    try {
      const response = await fetch(
        `/api/elective-buckets?semester=${semester}&department_id=${departmentId}`
      );
      const data = await response.json();
      
      if (data.buckets) {
        // Group subjects by bucket
        const bucketsMap = new Map<string, ElectiveBucket>();
        
        data.buckets.forEach((bucket: any) => {
          if (!bucketsMap.has(bucket.id)) {
            bucketsMap.set(bucket.id, {
              id: bucket.id,
              bucket_name: bucket.bucket_name,
              description: bucket.description,
              max_selection: bucket.max_selection || 1,
              min_selection: bucket.min_selection || 1,
              subjects: [],
              selected_count: 0
            });
          }
        });

        setBuckets(Array.from(bucketsMap.values()));
      }
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
  };

  const handleSubjectSelect = async (subject: Subject) => {
    if (!subject.is_selectable || selectedSubjects.has(subject.id)) {
      return;
    }

    // Check if this is a MAJOR selection in semester 3 or later
    if (subject.selection_type === 'MAJOR' && currentSemester >= 3) {
      const confirmLock = confirm(
        `⚠️ IMPORTANT: Once you select this MAJOR subject, you will be locked into the "${subject.subject_domain}" domain for all future semesters.\n\nYou will NOT be able to change your MAJOR in semesters 4, 5, 6, 7, or 8.\n\nAre you sure you want to proceed?`
      );
      
      if (!confirmLock) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/student/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.id,
          subject_id: subject.id,
          semester: currentSemester,
          academic_year: academicYear
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error}`);
        setSubmitting(false);
        return;
      }

      // Show lock confirmation if MAJOR was locked
      if (data.is_locked && data.selection_type === 'MAJOR') {
        alert(
          `✅ Subject selected successfully!\n\n🔒 Your MAJOR is now LOCKED in the "${subject.subject_domain}" domain.\n\nYou must continue with subjects from this domain in all future semesters.`
        );
      }

      // Refresh selections and available subjects
      await fetchMySelections(user.id, currentSemester);
      await fetchAvailableSubjects(user.id, currentSemester, user.department_id);
      
      setSubmitting(false);
    } catch (error) {
      console.error('Error selecting subject:', error);
      alert('Failed to select subject. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSubjectDeselect = async (subjectId: string) => {
    // Check if this is a locked MAJOR
    const selection = mySelections.find(s => s.subject_id === subjectId);
    if (selection?.is_locked) {
      alert('❌ Cannot remove locked MAJOR subject. MAJOR selections are permanent from Semester 3 onwards.');
      return;
    }

    const confirmDelete = confirm('Are you sure you want to remove this subject?');
    if (!confirmDelete) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/student/selections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.id,
          subject_id: subjectId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error: ${data.error}`);
        setSubmitting(false);
        return;
      }

      // Refresh selections
      await fetchMySelections(user.id, currentSemester);
      await fetchAvailableSubjects(user.id, currentSemester, user.department_id);
      
      setSubmitting(false);
    } catch (error) {
      console.error('Error removing subject:', error);
      alert('Failed to remove subject. Please try again.');
      setSubmitting(false);
    }
  };

  // Group subjects by bucket
  const groupSubjectsByBucket = () => {
    const majorSubjects: Subject[] = [];
    const minorSubjects: Subject[] = [];
    const otherElectives: Subject[] = [];

    availableSubjects.forEach(subject => {
      if (['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(subject.nep_category)) {
        majorSubjects.push(subject);
      } else if (['MINOR', 'CORE MINOR'].includes(subject.nep_category)) {
        minorSubjects.push(subject);
      } else {
        otherElectives.push(subject);
      }
    });

    return { majorSubjects, minorSubjects, otherElectives };
  };

  const { majorSubjects, minorSubjects, otherElectives } = groupSubjectsByBucket();

  // Calculate selected counts
  const majorCount = mySelections.filter(s => s.selection_type === 'MAJOR').length;
  const minorCount = mySelections.filter(s => s.selection_type === 'MINOR').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-8 h-8" />
                NEP 2020 Curriculum Selection
              </h1>
              <p className="text-gray-600 mt-2">Choose your elective subjects from available buckets</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Semester {currentSemester}</div>
              <div className="text-sm text-gray-600">{academicYear}</div>
            </div>
          </div>

          {/* Locked Major Warning */}
          {lockedMajor && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex items-start">
                <Lock className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-semibold text-yellow-900">🔒 Your MAJOR is Locked</h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    You selected a MAJOR in the <strong>{lockedMajor.domain}</strong> domain in Semester {lockedMajor.locked_semester}.
                    <br />
                    You must continue with subjects from this domain in all future semesters.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Total Selected</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {mySelections.length}
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">MAJOR Subjects</div>
                  <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                    {majorCount}
                    {majorCount > 0 && <Lock className="w-4 h-4" />}
                  </div>
                </div>
                <BookOpen className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">MINOR Subjects</div>
                  <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                    {minorCount}
                    <RefreshCw className="w-4 h-4" />
                  </div>
                </div>
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-xs text-gray-500 mt-1">Can be changed anytime</div>
            </div>
          </div>
        </div>

        {/* MAJOR Subjects */}
        {majorSubjects.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  SEM {currentSemester} Major
                  <span className="text-sm font-normal text-gray-600 ml-auto">
                    {majorCount}/1 Selected
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    Min: 1 • Max: 1
                  </span>
                </h2>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {majorSubjects.map((subject) => {
                  const isSelected = selectedSubjects.has(subject.id);
                  const canSelect = subject.is_selectable && !isSelected;

                  return (
                    <div
                      key={subject.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : canSelect
                          ? 'border-gray-200 hover:border-purple-300 bg-white cursor-pointer'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                      onClick={() => canSelect && handleSubjectSelect(subject)}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-6 h-6 text-purple-600" />
                        </div>
                      )}

                      <div className="mb-2">
                        <div className="text-xs text-gray-600 font-medium">{subject.code}</div>
                        <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                          MAJOR
                        </span>
                        <span className="text-xs text-gray-600">{subject.credit_value} Credits</span>
                      </div>

                      {subject.is_priority && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                          <Info className="w-3 h-3" />
                          <span>Continuation of your locked MAJOR</span>
                        </div>
                      )}

                      {!subject.is_selectable && (
                        <div className="flex items-center gap-1 text-xs text-red-600 mb-2">
                          <AlertCircle className="w-3 h-3" />
                          <span>{subject.reason}</span>
                        </div>
                      )}

                      {currentSemester >= 3 && canSelect && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 mt-2">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Will be locked after selection</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MINOR Subjects */}
        {minorSubjects.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  SEM {currentSemester} Minor
                  <span className="text-sm font-normal text-gray-600 ml-auto">
                    {minorCount}/1 Selected
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Min: 1 • Max: 1
                  </span>
                </h2>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {minorSubjects.map((subject) => {
                  const isSelected = selectedSubjects.has(subject.id);
                  const canSelect = subject.is_selectable && !isSelected;

                  return (
                    <div
                      key={subject.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : canSelect
                          ? 'border-gray-200 hover:border-green-300 bg-white cursor-pointer'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                      onClick={() => canSelect && handleSubjectSelect(subject)}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex gap-2">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubjectDeselect(subject.id);
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Remove selection"
                          >
                            ×
                          </button>
                        </div>
                      )}

                      <div className="mb-2">
                        <div className="text-xs text-gray-600 font-medium">{subject.code}</div>
                        <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                          MINOR
                        </span>
                        <span className="text-xs text-gray-600">{subject.credit_value} Credits</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
                        <RefreshCw className="w-3 h-3" />
                        <span>Can be changed in future semesters</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {submitting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-900">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
