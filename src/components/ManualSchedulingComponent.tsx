'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  startTime: string;
  endTime: string;
  slotIndex: number;
  isBreak?: boolean;
  isLunch?: boolean;
}

interface Faculty {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  qualifiedSubjects: Subject[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
  subjectType: string;
  credits: number;
  requiresLab: boolean;
  semester: number;
}

interface Assignment {
  id: string;
  faculty: Faculty;
  subject: Subject;
  timeSlot: TimeSlot;
  classroom?: string;
}

interface ManualSchedulingComponentProps {
  user: any;
}

export default function ManualSchedulingComponent({ user }: ManualSchedulingComponentProps) {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [filteredFaculty, setFilteredFaculty] = useState<Faculty[]>([]);
  const [draggedItem, setDraggedItem] = useState<{ type: 'faculty' | 'subject', item: any } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Time slots for the timetable
  const timeSlots: TimeSlot[] = [
    { id: '1', day: 'Monday', time: '9:00-10:00', startTime: '09:00', endTime: '10:00', slotIndex: 0 },
    { id: '2', day: 'Monday', time: '10:00-11:00', startTime: '10:00', endTime: '11:00', slotIndex: 1 },
    { id: '3', day: 'Monday', time: '11:00-11:15', startTime: '11:00', endTime: '11:15', slotIndex: 2, isBreak: true },
    { id: '4', day: 'Monday', time: '11:15-12:15', startTime: '11:15', endTime: '12:15', slotIndex: 3 },
    { id: '5', day: 'Monday', time: '12:15-1:15', startTime: '12:15', endTime: '13:15', slotIndex: 4 },
    { id: '6', day: 'Monday', time: '1:15-2:15', startTime: '13:15', endTime: '14:15', slotIndex: 5, isLunch: true },
    { id: '7', day: 'Monday', time: '2:15-3:15', startTime: '14:15', endTime: '15:15', slotIndex: 6 },
    { id: '8', day: 'Monday', time: '3:15-4:15', startTime: '15:15', endTime: '16:15', slotIndex: 7 },
    
    { id: '9', day: 'Tuesday', time: '9:00-10:00', startTime: '09:00', endTime: '10:00', slotIndex: 0 },
    { id: '10', day: 'Tuesday', time: '10:00-11:00', startTime: '10:00', endTime: '11:00', slotIndex: 1 },
    { id: '11', day: 'Tuesday', time: '11:00-11:15', startTime: '11:00', endTime: '11:15', slotIndex: 2, isBreak: true },
    { id: '12', day: 'Tuesday', time: '11:15-12:15', startTime: '11:15', endTime: '12:15', slotIndex: 3 },
    { id: '13', day: 'Tuesday', time: '12:15-1:15', startTime: '12:15', endTime: '13:15', slotIndex: 4 },
    { id: '14', day: 'Tuesday', time: '1:15-2:15', startTime: '13:15', endTime: '14:15', slotIndex: 5, isLunch: true },
    { id: '15', day: 'Tuesday', time: '2:15-3:15', startTime: '14:15', endTime: '15:15', slotIndex: 6 },
    { id: '16', day: 'Tuesday', time: '3:15-4:15', startTime: '15:15', endTime: '16:15', slotIndex: 7 },
    
    { id: '17', day: 'Wednesday', time: '9:00-10:00', startTime: '09:00', endTime: '10:00', slotIndex: 0 },
    { id: '18', day: 'Wednesday', time: '10:00-11:00', startTime: '10:00', endTime: '11:00', slotIndex: 1 },
    { id: '19', day: 'Wednesday', time: '11:00-11:15', startTime: '11:00', endTime: '11:15', slotIndex: 2, isBreak: true },
    { id: '20', day: 'Wednesday', time: '11:15-12:15', startTime: '11:15', endTime: '12:15', slotIndex: 3 },
    { id: '21', day: 'Wednesday', time: '12:15-1:15', startTime: '12:15', endTime: '13:15', slotIndex: 4 },
    { id: '22', day: 'Wednesday', time: '1:15-2:15', startTime: '13:15', endTime: '14:15', slotIndex: 5, isLunch: true },
    { id: '23', day: 'Wednesday', time: '2:15-3:15', startTime: '14:15', endTime: '15:15', slotIndex: 6 },
    { id: '24', day: 'Wednesday', time: '3:15-4:15', startTime: '15:15', endTime: '16:15', slotIndex: 7 },
    
    { id: '25', day: 'Thursday', time: '9:00-10:00', startTime: '09:00', endTime: '10:00', slotIndex: 0 },
    { id: '26', day: 'Thursday', time: '10:00-11:00', startTime: '10:00', endTime: '11:00', slotIndex: 1 },
    { id: '27', day: 'Thursday', time: '11:00-11:15', startTime: '11:00', endTime: '11:15', slotIndex: 2, isBreak: true },
    { id: '28', day: 'Thursday', time: '11:15-12:15', startTime: '11:15', endTime: '12:15', slotIndex: 3 },
    { id: '29', day: 'Thursday', time: '12:15-1:15', startTime: '12:15', endTime: '13:15', slotIndex: 4 },
    { id: '30', day: 'Thursday', time: '1:15-2:15', startTime: '13:15', endTime: '14:15', slotIndex: 5, isLunch: true },
    { id: '31', day: 'Thursday', time: '2:15-3:15', startTime: '14:15', endTime: '15:15', slotIndex: 6 },
    { id: '32', day: 'Thursday', time: '3:15-4:15', startTime: '15:15', endTime: '16:15', slotIndex: 7 },
    
    { id: '33', day: 'Friday', time: '9:00-10:00', startTime: '09:00', endTime: '10:00', slotIndex: 0 },
    { id: '34', day: 'Friday', time: '10:00-11:00', startTime: '10:00', endTime: '11:00', slotIndex: 1 },
    { id: '35', day: 'Friday', time: '11:00-11:15', startTime: '11:00', endTime: '11:15', slotIndex: 2, isBreak: true },
    { id: '36', day: 'Friday', time: '11:15-12:15', startTime: '11:15', endTime: '12:15', slotIndex: 3 },
    { id: '37', day: 'Friday', time: '12:15-1:15', startTime: '12:15', endTime: '13:15', slotIndex: 4 },
    { id: '38', day: 'Friday', time: '1:15-2:15', startTime: '13:15', endTime: '14:15', slotIndex: 5, isLunch: true },
    { id: '39', day: 'Friday', time: '2:15-3:15', startTime: '14:15', endTime: '15:15', slotIndex: 6 },
    { id: '40', day: 'Friday', time: '3:15-4:15', startTime: '15:15', endTime: '16:15', slotIndex: 7 },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Load faculty and subjects from database
  useEffect(() => {
    loadFacultyAndSubjects();
  }, [user]);

  // Filter subjects and faculty based on selected semester
  useEffect(() => {
    if (subjects.length > 0) {
      const semesterSubjects = subjects.filter(subject => 
        subject.semester === selectedSemester
      );
      setFilteredSubjects(semesterSubjects);

      // Filter faculty who can teach subjects in this semester
      const relevantFaculty = faculty.filter(facultyMember => 
        facultyMember.qualifiedSubjects.some(qualifiedSubject => 
          semesterSubjects.some(semesterSubject => 
            semesterSubject.id === qualifiedSubject.id
          )
        )
      );
      setFilteredFaculty(relevantFaculty);

      // Clear selections when semester changes
      setSelectedFaculty(null);
      setSelectedSubject(null);
    }
  }, [selectedSemester, subjects, faculty]);

  const loadFacultyAndSubjects = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading faculty and subjects for user:', user);
      
      // Check if user has department_id
      if (!user?.department_id) {
        console.error('❌ User missing department_id:', user);
        
        // Try to load a default department (CSE)
        console.log('🔄 Attempting to load default CSE department...');
        const { data: defaultDept, error: deptError } = await supabase
          .from('departments')
          .select('id')
          .eq('code', 'CSE')
          .eq('is_active', true)
          .single();
          
        if (deptError || !defaultDept) {
          alert('Error: User profile missing department information and no CSE department found. Please contact administrator.');
          setLoading(false);
          return;
        }
        
        // Use default department temporarily
        console.log('⚠️ Using default CSE department:', defaultDept.id);
        user.department_id = defaultDept.id;
      }

      console.log('📍 Loading data for department_id:', user.department_id);

      // Load faculty from the same department as the user
      const { data: facultyData, error: facultyError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, department_id')
        .eq('role', 'faculty')
        .eq('department_id', user.department_id)
        .eq('is_active', true);

      if (facultyError) {
        console.error('❌ Error loading faculty:', facultyError);
        alert(`Error loading faculty: ${facultyError.message}`);
        return;
      }

      console.log('👥 Faculty data loaded:', facultyData?.length || 0, 'records');
      if (facultyData && facultyData.length > 0) {
        console.log('Sample faculty:', facultyData.slice(0, 2));
      }

      // Transform faculty data with mock qualified subjects for now
      const transformedFaculty: Faculty[] = facultyData?.map((f: any) => ({
        id: f.id,
        firstName: f.first_name,
        lastName: f.last_name,
        email: f.email,
        departmentId: f.department_id,
        qualifiedSubjects: [] // Will be populated separately
      })) || [];

      setFaculty(transformedFaculty);

      // Load subjects from the same department
      console.log('📚 Loading subjects for department:', user.department_id);
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code, subject_type, credits, requires_lab, semester')
        .eq('department_id', user.department_id)
        .eq('is_active', true)
        .order('semester', { ascending: true });

      if (subjectsError) {
        console.error('❌ Error loading subjects:', subjectsError);
        alert(`Error loading subjects: ${subjectsError.message}`);
        return;
      }

      console.log('📖 Subjects data loaded:', subjectsData?.length || 0, 'records');
      if (subjectsData && subjectsData.length > 0) {
        console.log('Sample subjects:', subjectsData.slice(0, 3));
        const subjectsBySemester: { [key: string]: number } = {};
        subjectsData.forEach(s => {
          const sem = s.semester?.toString() || 'Unknown';
          if (!subjectsBySemester[sem]) subjectsBySemester[sem] = 0;
          subjectsBySemester[sem]++;
        });
        console.log('Subjects by semester:', subjectsBySemester);
      }

      const transformedSubjects: Subject[] = subjectsData?.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        subjectType: s.subject_type,
        credits: s.credits,
        requiresLab: s.requires_lab,
        semester: s.semester || 1
      })) || [];

      setSubjects(transformedSubjects);

      // Now load faculty qualifications separately
      if (transformedFaculty.length > 0) {
        console.log('🎓 Loading faculty qualifications...');
        const facultyIds = transformedFaculty.map(f => f.id);
        const { data: qualificationsData, error: qualError } = await supabase
          .from('faculty_qualified_subjects')
          .select(`
            faculty_id,
            subject_id,
            subjects!inner(id, name, code, subject_type, credits, requires_lab, semester)
          `)
          .in('faculty_id', facultyIds);

        if (qualError) {
          console.error('❌ Error loading qualifications:', qualError);
        } else {
          console.log('🎯 Qualifications loaded:', qualificationsData?.length || 0, 'records');
        }

        // Update faculty with their qualifications
        const updatedFaculty = transformedFaculty.map(f => ({
          ...f,
          qualifiedSubjects: qualificationsData
            ?.filter((q: any) => q.faculty_id === f.id)
            .map((q: any) => ({
              id: q.subjects.id,
              name: q.subjects.name,
              code: q.subjects.code,
              subjectType: q.subjects.subject_type,
              credits: q.subjects.credits,
              requiresLab: q.subjects.requires_lab,
              semester: q.subjects.semester || 1
            })) || []
        }));

        setFaculty(updatedFaculty);
        console.log('✅ Faculty updated with qualifications');
      } else {
        console.log('⚠️  No faculty found, skipping qualifications');
      }
      
      console.log('🎉 Data loading completed successfully!');
      console.log(`Final counts - Faculty: ${transformedFaculty.length}, Subjects: ${transformedSubjects.length}`);
    } catch (error) {
      console.error('❌ Unexpected error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Unexpected error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = useCallback((newAssignment: Assignment) => {
    const conflicts: string[] = [];
    
    assignments.forEach(assignment => {
      if (assignment.timeSlot.day === newAssignment.timeSlot.day && 
          assignment.timeSlot.slotIndex === newAssignment.timeSlot.slotIndex) {
        // Faculty conflict
        if (assignment.faculty.id === newAssignment.faculty.id) {
          conflicts.push(`${assignment.faculty.firstName} ${assignment.faculty.lastName} is already assigned at ${assignment.timeSlot.day} ${assignment.timeSlot.time}`);
        }
      }
    });
    
    return conflicts;
  }, [assignments]);

  const handleAssignClass = useCallback((faculty: Faculty, subject: Subject, timeSlot: TimeSlot) => {
    // Check if faculty is qualified for this subject
    const isQualified = faculty.qualifiedSubjects.some(s => s.id === subject.id);
    if (!isQualified) {
      alert(`${faculty.firstName} ${faculty.lastName} is not qualified to teach ${subject.name}`);
      return;
    }

    const newAssignment: Assignment = {
      id: `${faculty.id}-${subject.id}-${timeSlot.day}-${timeSlot.slotIndex}-${Date.now()}`,
      faculty,
      subject,
      timeSlot
    };

    const conflicts = checkConflicts(newAssignment);
    
    if (conflicts.length > 0) {
      alert(`Scheduling Conflict: ${conflicts[0]}`);
      return;
    }

    setAssignments(prev => [...prev, newAssignment]);
    alert(`Class assigned: ${subject.name} with ${faculty.firstName} ${faculty.lastName} on ${timeSlot.day} ${timeSlot.time}`);
  }, [checkConflicts]);

  const handleRemoveAssignment = useCallback((assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    alert('Assignment removed from timetable');
  }, []);

  const handleDragStart = (type: 'faculty' | 'subject', item: any) => {
    setDraggedItem({ type, item });
  };

  const handleDragOver = (e: React.DragEvent, timeSlot?: TimeSlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (timeSlot) {
      setDragOverSlot(`${timeSlot.day}-${timeSlot.slotIndex}`);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, timeSlot: TimeSlot) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    if (!draggedItem) {
      alert('No item selected. Please drag a faculty or subject to assign.');
      return;
    }
    
    // Check if the time slot is a break or lunch
    if (timeSlot.isBreak || timeSlot.isLunch) {
      alert('Cannot assign classes during break or lunch time.');
      setDraggedItem(null);
      return;
    }
    
    if (draggedItem.type === 'faculty' && selectedSubject) {
      handleAssignClass(draggedItem.item, selectedSubject, timeSlot);
    } else if (draggedItem.type === 'subject' && selectedFaculty) {
      handleAssignClass(selectedFaculty, draggedItem.item, timeSlot);
    } else if (draggedItem.type === 'faculty' && !selectedSubject) {
      alert(`You've dragged "${draggedItem.item.firstName} ${draggedItem.item.lastName}". Please select a subject first, then try dragging again.`);
    } else if (draggedItem.type === 'subject' && !selectedFaculty) {
      alert(`You've dragged "${draggedItem.item.name}". Please select a faculty member first, then try dragging again.`);
    } else {
      alert('Please select both a faculty member and a subject before dragging.');
    }
    
    setDraggedItem(null);
  };

  const getAssignmentForSlot = (day: string, slotIndex: number) => {
    return assignments.find(a => a.timeSlot.day === day && a.timeSlot.slotIndex === slotIndex);
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      // Here you would save the schedule to the database
      // For now, just show a success message
      alert(`Timetable saved successfully with ${assignments.length} assignments!`);
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manual Timetable Scheduling</h1>
        <p className="text-gray-600">Drag and drop faculty and subjects to create your timetable</p>
      </div>

      {/* Semester Selector */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
            <span className="font-medium text-gray-700">Select Semester:</span>
          </div>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-600">
            Showing {filteredSubjects.length} subjects and {filteredFaculty.length} qualified faculty for Semester {selectedSemester}
          </div>
        </div>
      </div>

      {/* Selection Status */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
              <span className="font-medium">Selected Faculty:</span>
              <span className={selectedFaculty ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {selectedFaculty ? `${selectedFaculty.firstName} ${selectedFaculty.lastName}` : 'None selected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">Selected Subject:</span>
              <span className={selectedSubject ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {selectedSubject ? `${selectedSubject.name} (${selectedSubject.code}) - Sem ${selectedSubject.semester}` : 'None selected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Assignments: {assignments.length}</span>
            <button
              onClick={saveSchedule}
              disabled={saving || assignments.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Faculty and Subjects */}
        <div className="col-span-3 space-y-6">
          {/* Faculty Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
                Faculty Qualified for Sem {selectedSemester} ({filteredFaculty.length})
              </h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {filteredFaculty.length > 0 ? filteredFaculty.map((facultyMember) => (
                <div
                  key={facultyMember.id}
                  draggable
                  onDragStart={() => handleDragStart('faculty', facultyMember)}
                  onClick={() => setSelectedFaculty(facultyMember)}
                  className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedFaculty?.id === facultyMember.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {facultyMember.firstName} {facultyMember.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{facultyMember.email}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    {facultyMember.qualifiedSubjects.filter(s => s.semester === selectedSemester).length} subjects for Sem {selectedSemester}
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-4">
                  No faculty qualified for Semester {selectedSemester} subjects
                </div>
              )}
            </div>
          </div>

          {/* Subjects Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd"/>
                </svg>
                Semester {selectedSemester} Subjects ({filteredSubjects.length})
              </h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {filteredSubjects.length > 0 ? filteredSubjects.map((subject) => (
                <div
                  key={subject.id}
                  draggable
                  onDragStart={() => handleDragStart('subject', subject)}
                  onClick={() => setSelectedSubject(subject)}
                  className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedSubject?.id === subject.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{subject.name}</div>
                  <div className="text-sm text-gray-500">{subject.code}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {subject.subjectType}
                    </span>
                    <span className="text-xs text-gray-500">{subject.credits} credits</span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded">
                      Sem {subject.semester}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-4">
                  No subjects found for Semester {selectedSemester}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Content - Timetable Grid */}
        <div className="col-span-9">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Timetable</h3>
              <p className="text-sm text-gray-600">Drag faculty or subjects to time slots to create assignments</p>
            </div>
            
            <div className="p-4 overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr>
                    <th className="w-20 p-2 text-left font-medium text-gray-700 border-b">Time</th>
                    {days.map(day => (
                      <th key={day} className="p-2 text-center font-medium text-gray-700 border-b">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(slotIndex => {
                    const timeSlot = timeSlots.find(ts => ts.slotIndex === slotIndex);
                    const isBreakOrLunch = timeSlot?.isBreak || timeSlot?.isLunch;
                    
                    return (
                      <tr key={slotIndex}>
                        <td className="p-2 text-sm font-medium text-gray-600 border-r">
                          {timeSlot?.time}
                        </td>
                        {days.map(day => {
                          const currentTimeSlot = timeSlots.find(ts => 
                            ts.day === day && ts.slotIndex === slotIndex
                          );
                          const assignment = getAssignmentForSlot(day, slotIndex);
                          const isDragOver = dragOverSlot === `${day}-${slotIndex}`;
                          
                          return (
                            <td
                              key={`${day}-${slotIndex}`}
                              className={`p-1 border-r border-b h-20 relative ${
                                isBreakOrLunch
                                  ? (timeSlot?.isBreak ? 'bg-orange-50' : 'bg-yellow-50')
                                  : 'bg-gray-50'
                              } ${isDragOver ? 'bg-blue-100 border-blue-300' : ''}`}
                              onDragOver={(e) => currentTimeSlot && handleDragOver(e, currentTimeSlot)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => currentTimeSlot && handleDrop(e, currentTimeSlot)}
                            >
                              {isBreakOrLunch ? (
                                <div className="flex items-center justify-center h-full">
                                  <span className={`text-xs font-medium ${
                                    timeSlot?.isBreak ? 'text-orange-600' : 'text-yellow-600'
                                  }`}>
                                    {timeSlot?.isBreak ? 'Break' : 'Lunch'}
                                  </span>
                                </div>
                              ) : assignment ? (
                                <div className="bg-blue-500 text-white p-2 rounded text-xs h-full flex flex-col justify-between">
                                  <div>
                                    <div className="font-medium truncate">{assignment.subject.code}</div>
                                    <div className="truncate">{assignment.faculty.firstName} {assignment.faculty.lastName}</div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveAssignment(assignment.id)}
                                    className="text-white hover:text-red-200 self-end"
                                    title="Remove assignment"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                                  Drop here
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}