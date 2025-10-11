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

interface Classroom {
  id: string;
  name: string;
  building: string;
  capacity: number;
  type: string;
  hasProjector: boolean;
  hasAc: boolean;
  hasComputers: boolean;
  hasLabEquipment: boolean;
  isSmartClassroom: boolean;
  departmentId?: string;
}

interface Assignment {
  id: string;
  faculty: Faculty;
  subject: Subject;
  timeSlot: TimeSlot;
  classroom?: Classroom;
  isLab?: boolean;
  duration?: number; // Duration in hours (1 for regular class, 2 for lab)
  endSlotIndex?: number; // For lab sessions that span multiple slots
}

interface ManualSchedulingComponentProps {
  user: any;
}

export default function ManualSchedulingComponent({ user }: ManualSchedulingComponentProps) {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [filteredFaculty, setFilteredFaculty] = useState<Faculty[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [draggedItem, setDraggedItem] = useState<{ type: 'faculty' | 'subject', item: any } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timetableTitle, setTimetableTitle] = useState('');

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
    
    { id: '41', day: 'Saturday', time: '9:00-10:00', startTime: '09:00', endTime: '10:00', slotIndex: 0 },
    { id: '42', day: 'Saturday', time: '10:00-11:00', startTime: '10:00', endTime: '11:00', slotIndex: 1 },
    { id: '43', day: 'Saturday', time: '11:00-11:15', startTime: '11:00', endTime: '11:15', slotIndex: 2, isBreak: true },
    { id: '44', day: 'Saturday', time: '11:15-12:15', startTime: '11:15', endTime: '12:15', slotIndex: 3 },
    { id: '45', day: 'Saturday', time: '12:15-1:15', startTime: '12:15', endTime: '13:15', slotIndex: 4 },
    { id: '46', day: 'Saturday', time: '1:15-2:15', startTime: '13:15', endTime: '14:15', slotIndex: 5, isLunch: true },
    { id: '47', day: 'Saturday', time: '2:15-3:15', startTime: '14:15', endTime: '15:15', slotIndex: 6 },
    { id: '48', day: 'Saturday', time: '3:15-4:15', startTime: '15:15', endTime: '16:15', slotIndex: 7 },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load faculty and subjects from database
  useEffect(() => {
    loadFacultyAndSubjects();
  }, [user]);

  // Load batches when semester changes
  useEffect(() => {
    loadBatches();
  }, [selectedSemester, user]);

  // Filter subjects and faculty based on selected semester
  useEffect(() => {
    if (subjects.length > 0) {
      const semesterSubjects = subjects.filter(subject => 
        subject.semester === selectedSemester
      );
      setFilteredSubjects(semesterSubjects);

      // For now, show all faculty regardless of qualifications
      // Later we can add qualification-based filtering
      const relevantFaculty = faculty.filter(facultyMember => {
        // If faculty has qualifications, filter by them
        if (facultyMember.qualifiedSubjects.length > 0) {
          return facultyMember.qualifiedSubjects.some(qualifiedSubject => 
            semesterSubjects.some(semesterSubject => 
              semesterSubject.id === qualifiedSubject.id
            )
          );
        }
        // If no qualifications exist, show all faculty
        return true;
      });
      setFilteredFaculty(relevantFaculty);

      // Clear selections when semester changes
      setSelectedFaculty(null);
      setSelectedSubject(null);
      setSelectedClassroom(null);
    }
  }, [selectedSemester, subjects, faculty]);

  // Load classrooms when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      loadClassrooms();
    } else {
      setClassrooms([]);
      setFilteredClassrooms([]);
      setSelectedClassroom(null);
    }
  }, [selectedSubject, user]);

  const loadBatches = async () => {
    try {
      console.log('🔍 Loading batches for semester:', selectedSemester);
      
      // Load batches for the selected semester
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('id, name, semester, academic_year, department_id, college_id')
        .eq('semester', selectedSemester)
        .eq('is_active', true);

      if (batchError) {
        console.error('❌ Error loading batches:', batchError);
        return;
      }

      console.log('✅ Loaded batches:', batchData);
      setBatches(batchData || []);
      
      // Auto-select first batch if available
      if (batchData && batchData.length > 0) {
        setSelectedBatch(batchData[0]);
        console.log('✅ Auto-selected batch:', batchData[0]);
      } else {
        setSelectedBatch(null);
      }
    } catch (error) {
      console.error('❌ Error in loadBatches:', error);
    }
  };

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
        console.log('⚠ Using default CSE department:', defaultDept.id);
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
        .select('id, name, code, subject_type, credits_per_week, requires_lab, semester')
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
        credits: s.credits_per_week,
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
            subjects!inner(id, name, code, subject_type, credits_per_week, requires_lab, semester)
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
              credits: q.subjects.credits_per_week,
              requiresLab: q.subjects.requires_lab,
              semester: q.subjects.semester || 1
            })) || []
        }));

        setFaculty(updatedFaculty);
        console.log('✅ Faculty updated with qualifications');
      } else {
        console.log('⚠  No faculty found, skipping qualifications');
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

  const loadClassrooms = async () => {
    try {
      setLoadingClassrooms(true);
      console.log('🏫 Loading classrooms for selected subject:', selectedSubject);
      
      if (!selectedSubject || !user?.department_id) {
        console.log('⚠ Missing selected subject or user department');
        return;
      }

      // Determine classroom requirements based on subject
      const isLabSubject = selectedSubject.requiresLab || 
                          selectedSubject.subjectType.toLowerCase().includes('lab') ||
                          selectedSubject.subjectType.toLowerCase().includes('practical');

      console.log('📚 Subject requirements:', {
        isLab: isLabSubject,
        subjectType: selectedSubject.subjectType,
        requiresLab: selectedSubject.requiresLab
      });

      // Load classrooms from API
      const response = await fetch(`/api/classrooms?department_id=${user.department_id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch classrooms: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🏫 Classrooms API response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch classrooms');
      }

      const allClassrooms: Classroom[] = data.data?.map((c: any) => ({
        id: c.id,
        name: c.name,
        building: c.building || 'Unknown',
        capacity: c.capacity || 0,
        type: c.type || 'Classroom',
        hasProjector: c.has_projector || false,
        hasAc: c.has_ac || false,
        hasComputers: c.has_computers || false,
        hasLabEquipment: c.has_lab_equipment || false,
        isSmartClassroom: c.is_smart_classroom || false,
        departmentId: c.department_id
      })) || [];

      setClassrooms(allClassrooms);

      // Filter classrooms based on subject requirements
      let suitable = allClassrooms;

      if (isLabSubject) {
        // For lab subjects, prefer classrooms with lab equipment or computers
        const labClassrooms = suitable.filter(c => 
          c.hasLabEquipment || 
          c.hasComputers || 
          c.type.toLowerCase().includes('lab')
        );
        
        // If we have specific lab classrooms, use them; otherwise, use all
        if (labClassrooms.length > 0) {
          suitable = labClassrooms;
        }
      } else {
        // For theory subjects, prefer lecture halls and regular classrooms
        suitable = suitable.filter(c => 
          !c.type.toLowerCase().includes('lab') || 
          c.type.toLowerCase().includes('lecture') ||
          c.type === 'Classroom'
        );
      }

      // Sort by suitability score
      suitable.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Prefer same department classrooms
        if (a.departmentId === user.department_id) scoreA += 10;
        if (b.departmentId === user.department_id) scoreB += 10;

        // For lab subjects, prioritize lab features
        if (isLabSubject) {
          if (a.hasLabEquipment) scoreA += 5;
          if (b.hasLabEquipment) scoreB += 5;
          if (a.hasComputers) scoreA += 3;
          if (b.hasComputers) scoreB += 3;
        } else {
          // For theory subjects, prioritize presentation features
          if (a.hasProjector) scoreA += 3;
          if (b.hasProjector) scoreB += 3;
          if (a.isSmartClassroom) scoreA += 2;
          if (b.isSmartClassroom) scoreB += 2;
        }

        // Consider capacity (moderate preference for larger rooms)
        scoreA += Math.min(a.capacity / 20, 2);
        scoreB += Math.min(b.capacity / 20, 2);

        return scoreB - scoreA;
      });

      setFilteredClassrooms(suitable);
      console.log(`✅ Filtered ${suitable.length} suitable classrooms out of ${allClassrooms.length} total`);

      // Auto-select first suitable classroom if available
      if (suitable.length > 0) {
        setSelectedClassroom(suitable[0]);
        console.log('🎯 Auto-selected classroom:', suitable[0].name);
      }

    } catch (error) {
      console.error('❌ Error loading classrooms:', error);
      setClassrooms([]);
      setFilteredClassrooms([]);
      setSelectedClassroom(null);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const checkConflicts = useCallback((newAssignment: Assignment) => {
    const conflicts: string[] = [];
    
    assignments.forEach(assignment => {
      // Check for faculty conflicts
      if (assignment.faculty.id === newAssignment.faculty.id) {
        // For lab sessions, check all occupied slots
        const assignmentSlots = assignment.isLab 
          ? [assignment.timeSlot.slotIndex, assignment.endSlotIndex!]
          : [assignment.timeSlot.slotIndex];
          
        const newAssignmentSlots = newAssignment.isLab 
          ? [newAssignment.timeSlot.slotIndex, newAssignment.endSlotIndex!]
          : [newAssignment.timeSlot.slotIndex];
        
        // Check if any slots overlap on the same day
        if (assignment.timeSlot.day === newAssignment.timeSlot.day) {
          const hasOverlap = assignmentSlots.some(slot => newAssignmentSlots.includes(slot));
          if (hasOverlap) {
            conflicts.push(`${assignment.faculty.firstName} ${assignment.faculty.lastName} is already assigned at ${assignment.timeSlot.day} ${assignment.timeSlot.time}`);
          }
        }
      }

      // Check for classroom conflicts
      if (assignment.classroom?.id === newAssignment.classroom?.id && newAssignment.classroom) {
        // For lab sessions, check all occupied slots
        const assignmentSlots = assignment.isLab 
          ? [assignment.timeSlot.slotIndex, assignment.endSlotIndex!]
          : [assignment.timeSlot.slotIndex];
          
        const newAssignmentSlots = newAssignment.isLab 
          ? [newAssignment.timeSlot.slotIndex, newAssignment.endSlotIndex!]
          : [newAssignment.timeSlot.slotIndex];
        
        // Check if any slots overlap on the same day
        if (assignment.timeSlot.day === newAssignment.timeSlot.day) {
          const hasOverlap = assignmentSlots.some(slot => newAssignmentSlots.includes(slot));
          if (hasOverlap) {
            conflicts.push(`Classroom ${assignment.classroom?.name} is already booked at ${assignment.timeSlot.day} ${assignment.timeSlot.time}`);
          }
        }
      }
    });
    
    return conflicts;
  }, [assignments]);

  const handleAssignClass = useCallback((faculty: Faculty, subject: Subject, timeSlot: TimeSlot, classroom?: Classroom) => {
    // Check if faculty is qualified for this subject (skip check if no qualifications set up)
    const hasQualifications = faculty.qualifiedSubjects.length > 0;
    if (hasQualifications) {
      const isQualified = faculty.qualifiedSubjects.some(s => s.id === subject.id);
      if (!isQualified) {
        console.warn(`${faculty.firstName} ${faculty.lastName} is not qualified to teach ${subject.name}`);
        return;
      }
    }

    // Use selected classroom or require classroom selection
    const assignedClassroom = classroom || selectedClassroom;
    if (!assignedClassroom) {
      console.warn('Please select a classroom before creating the assignment');
      return;
    }

    const isLab = subject.requiresLab || subject.subjectType.toLowerCase().includes('lab');
    const duration = isLab ? 2 : 1;
    
    // For lab sessions, check if we have enough consecutive slots
    if (isLab) {
      // Skip break/lunch slots for consecutive checking
      const nextSlotIndex = timeSlot.slotIndex + 1;
      
      // Check if next slot exists and is not break/lunch
      const nextTimeSlot = timeSlots.find(ts => 
        ts.day === timeSlot.day && ts.slotIndex === nextSlotIndex
      );
      
      if (!nextTimeSlot || nextTimeSlot.isBreak || nextTimeSlot.isLunch) {
        console.warn('Lab sessions require 2 consecutive non-break hours');
        return;
      }
      
      // Check if both slots are free
      const slot1Assignment = assignments.find(a => 
        a.timeSlot.day === timeSlot.day && a.timeSlot.slotIndex === timeSlot.slotIndex
      );
      const slot2Assignment = assignments.find(a => 
        a.timeSlot.day === timeSlot.day && a.timeSlot.slotIndex === nextSlotIndex
      );
      
      if (slot1Assignment || slot2Assignment) {
        console.warn('Both time slots must be free for lab sessions');
        return;
      }
    }

    const newAssignment: Assignment = {
      id: `${faculty.id}-${subject.id}-${timeSlot.day}-${timeSlot.slotIndex}-${Date.now()}`,
      faculty,
      subject,
      timeSlot,
      classroom: assignedClassroom,
      isLab,
      duration,
      endSlotIndex: isLab ? timeSlot.slotIndex + 1 : undefined
    };

    const conflicts = checkConflicts(newAssignment);
    
    if (conflicts.length > 0) {
      console.warn(`Scheduling Conflict: ${conflicts[0]}`);
      return;
    }

    setAssignments(prev => [...prev, newAssignment]);
  }, [checkConflicts, assignments, timeSlots, selectedClassroom]);

  const handleRemoveAssignment = useCallback((assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
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
      return;
    }
    
    // Check if the time slot is a break or lunch
    if (timeSlot.isBreak || timeSlot.isLunch) {
      setDraggedItem(null);
      return;
    }
    
    if (draggedItem.type === 'faculty' && selectedSubject) {
      handleAssignClass(draggedItem.item, selectedSubject, timeSlot);
    } else if (draggedItem.type === 'subject' && selectedFaculty) {
      handleAssignClass(selectedFaculty, draggedItem.item, timeSlot);
    }
    
    setDraggedItem(null);
  };
  const getAssignmentForSlot = (day: string, slotIndex: number) => {
    // Check for direct assignment
    const directAssignment = assignments.find(a => a.timeSlot.day === day && a.timeSlot.slotIndex === slotIndex);
    if (directAssignment) {
      return directAssignment;
    }
    
    // Check if this slot is part of a lab session (second hour of a 2-hour lab)
    const labAssignment = assignments.find(a => 
      a.timeSlot.day === day && 
      a.isLab && 
      a.endSlotIndex === slotIndex
    );
    
    if (labAssignment) {
      return labAssignment;
    }
    
    return null;
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      if (assignments.length === 0) {
        alert('Please create at least one assignment before saving.');
        return;
      }

      if (!timetableTitle.trim()) {
        alert('Please enter a title for the timetable.');
        return;
      }

      // Log the full user object to see what we're working with
      console.log('👤 Full user object:', user);
      console.log('📋 User properties:', {
        id: user?.id,
        userId: user?.userId,
        department_id: user?.department_id,
        departmentId: user?.departmentId,
        college_id: user?.college_id,
        collegeId: user?.collegeId,
        allKeys: Object.keys(user || {})
      });

      // Try different property names that might be used
      const userId = user?.id || user?.userId;
      let departmentId = user?.department_id || user?.departmentId;
      let collegeId = user?.college_id || user?.collegeId;

      // Validate critical user ID field
      if (!userId) {
        alert('User information is incomplete. Missing user ID. Please log in again.');
        console.error('❌ Missing user ID in user object:', user);
        return;
      }

      // Check if batch is selected
      if (!selectedBatch) {
        alert('Please wait for batch information to load, or create a batch for this semester first.');
        return;
      }

      // If department or college is missing, try to fetch from API using batch for this semester
      if (!departmentId || !collegeId) {
        console.warn('⚠ User missing department_id or college_id, will use batch info');
        console.log('📍 User fields:', { userId, departmentId, collegeId });
      }

      // Build payload - include batchId so API can derive everything from it
      const payload = {
        assignments,
        createdBy: userId,
        academicYear: '2025-26',
        semester: selectedSemester,
        batchId: selectedBatch.id,
        // Only include department/college if available
        ...(departmentId && { departmentId }),
        ...(collegeId && { collegeId }),
        title: timetableTitle.trim()
      };

      console.log('📤 Sending timetable save request:', payload);

      const response = await fetch('/api/timetables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('📥 Save response:', data);
      console.log('📥 Response status:', response.status);
      console.log('📥 Full response data:', JSON.stringify(data, null, 2));

      if (data.success) {
        alert('Timetable saved successfully! You can now submit it for review.');
        // Optionally reset the form or redirect
        // setAssignments([]);
        // setTimetableTitle('');
      } else {
        console.error('❌ Save failed with error:', data.error);
        console.error('❌ Error details:', data.details);
        console.error('❌ Error hint:', data.hint);
        console.error('❌ Error code:', data.code);
        alert(`Error saving timetable: ${data.error}\n\nDetails: ${data.details || 'No details'}\n\nHint: ${data.hint || 'No hint'}`);
      }
    } catch (error) {
      console.error('❌ Exception during save:', error);
      alert('Error saving schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      if (assignments.length === 0) {
        alert('Please create at least one assignment before submitting.');
        return;
      }

      if (!timetableTitle.trim()) {
        alert('Please enter a title for the timetable.');
        return;
      }

      // Log the full user object to see what we're working with
      console.log('👤 Full user object (submit):', user);

      // Try different property names that might be used
      const userId = user?.id || user?.userId;
      let departmentId = user?.department_id || user?.departmentId;
      let collegeId = user?.college_id || user?.collegeId;

      // Validate critical user ID field
      if (!userId) {
        alert('User information is incomplete. Missing user ID. Please log in again.');
        console.error('❌ Missing user ID in user object:', user);
        return;
      }

      // Check if batch is selected
      if (!selectedBatch) {
        alert('Please wait for batch information to load, or create a batch for this semester first.');
        return;
      }

      // If department or college is missing, use batch info
      if (!departmentId || !collegeId) {
        console.warn('⚠ User missing department_id or college_id, will use batch info');
        console.log('📍 User fields:', { userId, departmentId, collegeId });
      }

      // Build payload - include batchId so API can derive everything from it
      const payload = {
        assignments,
        createdBy: userId,
        academicYear: '2025-26',
        semester: selectedSemester,
        batchId: selectedBatch.id,
        // Only include department/college if available
        ...(departmentId && { departmentId }),
        ...(collegeId && { collegeId }),
        title: timetableTitle.trim()
      };

      console.log('📤 Sending timetable save request for review:', payload);

      // First save the timetable
      const saveResponse = await fetch('/api/timetables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const saveData = await saveResponse.json();
      console.log('📥 Save response:', saveData);

      if (!saveData.success) {
        alert(`Error saving timetable: ${saveData.error}`);
        return;
      }

      // Then submit for review
      const publishResponse = await fetch('/api/timetables/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timetableId: saveData.timetable.id,
          action: 'submit_for_review',
          publisherId: userId // Use the flexible userId variable
        }),
      });

      const publishData = await publishResponse.json();

      if (publishData.success) {
        alert('Timetable submitted for review successfully! Publishers will be notified.');
        // Reset form
        setAssignments([]);
        setTimetableTitle('');
        setSelectedFaculty(null);
        setSelectedSubject(null);
      } else {
        alert(`Error submitting for review: ${publishData.error}`);
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Error submitting for review. Please try again.');
    } finally {
      setSubmitting(false);
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
            Showing {filteredSubjects.length} subjects and {filteredFaculty.length} faculty for Semester {selectedSemester} | {assignments.length} assignments created
          </div>
          {selectedBatch && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm font-medium">Batch: {selectedBatch.name}</span>
            </div>
          )}
          {!selectedBatch && batches.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm font-medium">No batch found - Please create a batch first</span>
            </div>
          )}
        </div>
      </div>

      {/* Timetable Title and Actions */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label htmlFor="timetableTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Timetable Title
            </label>
            <input
              id="timetableTitle"
              type="text"
              value={timetableTitle}
              onChange={(e) => setTimetableTitle(e.target.value)}
              placeholder={`Semester ${selectedSemester} Timetable - 2025-26`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={saveSchedule}
              disabled={saving || assignments.length === 0 || !timetableTitle.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  Save Draft
                </>
              )}
            </button>
            <button
              onClick={submitForReview}
              disabled={submitting || assignments.length === 0 || !timetableTitle.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd"/>
                  </svg>
                  Submit for Review
                </>
              )}
            </button>
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
              <span className="font-medium text-gray-700">Selected Faculty:</span>
              <span className={selectedFaculty ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {selectedFaculty ? `${selectedFaculty.firstName} ${selectedFaculty.lastName}` : 'None selected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium text-gray-700">Selected Subject:</span>
              <span className={selectedSubject ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {selectedSubject ? `${selectedSubject.name} (${selectedSubject.code}) - Sem ${selectedSubject.semester}` : 'None selected'}
              </span>
            </div>

            {selectedSubject && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium text-gray-700">Selected Classroom:</span>
                {loadingClassrooms ? (
                  <span className="text-blue-600 flex items-center gap-1">
                    <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                    Loading...
                  </span>
                ) : (
                  <select
                    value={selectedClassroom?.id || ''}
                    onChange={(e) => {
                      const classroom = filteredClassrooms.find(c => c.id === e.target.value);
                      setSelectedClassroom(classroom || null);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  >
                    <option value="">Select classroom...</option>
                    {filteredClassrooms.map(classroom => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name} - {classroom.building} (Cap: {classroom.capacity})
                        {classroom.hasLabEquipment && ' 🧪'}
                        {classroom.hasComputers && ' 💻'}
                        {classroom.hasProjector && ' 📽'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
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
                Faculty for Sem {selectedSemester} ({filteredFaculty.length})
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
                    {facultyMember.qualifiedSubjects.length > 0 
                      ? `${facultyMember.qualifiedSubjects.filter(s => s.semester === selectedSemester).length} qualified subjects for Sem ${selectedSemester}`
                      : 'No qualifications set up yet'
                    }
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-4">
                  No faculty available for Semester {selectedSemester}
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
                    {(subject.requiresLab || subject.subjectType.toLowerCase().includes('lab')) && (
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded">
                        Lab (2hrs)
                      </span>
                    )}
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
                              className={`p-1 border-r border-b h-24 relative ${
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
                                <div className={`text-white p-2 rounded text-xs h-full flex flex-col justify-between ${
                                  assignment.isLab ? 'bg-purple-500' : 'bg-blue-500'
                                }`}>
                                  <div className="flex-1">
                                    <div className="font-bold text-sm mb-1">{assignment.subject.name}</div>
                                    <div className="text-xs opacity-90">{assignment.subject.code}</div>
                                    <div className="text-xs opacity-90 mt-1">
                                      {assignment.faculty.firstName} {assignment.faculty.lastName}
                                    </div>
                                    {assignment.classroom && (
                                      <div className="text-xs opacity-90 mt-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd"/>
                                        </svg>
                                        {assignment.classroom.name}
                                      </div>
                                    )}
                                    {assignment.isLab && (
                                      <div className="text-xs bg-white bg-opacity-20 px-1 rounded mt-1">
                                        Lab (2hrs)
                                      </div>
                                    )}
                                    {assignment.isLab && assignment.timeSlot.slotIndex === slotIndex && (
                                      <div className="text-xs opacity-75 mt-1">
                                        {assignment.timeSlot.time.split('-')[0]} - {timeSlots.find(ts => ts.day === day && ts.slotIndex === slotIndex + 1)?.time.split('-')[1]}
                                      </div>
                                    )}
                                  </div>
                                  {assignment.timeSlot.slotIndex === slotIndex && (
                                    <button
                                      onClick={() => handleRemoveAssignment(assignment.id)}
                                      className="text-white hover:text-red-200 self-end mt-1"
                                      title="Remove assignment"
                                    >
                                      ✕
                                    </button>
                                  )}
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