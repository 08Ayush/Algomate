import { serviceDb as supabase } from '@/shared/database';
/**
 * Cross-Department Conflict Detection System
 * Prevents shared resource conflicts (faculty, classrooms) across departments
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export interface ResourceConflict {
  conflict_id?: string;
  resource_type: 'FACULTY' | 'CLASSROOM';
  resource_id: string;
  resource_name?: string;
  time_slot_id: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  conflicting_timetables: {
    timetable_id: string;
    timetable_title: string;
    department_id: string;
    department_name: string;
    batch_id: string;
    batch_name: string;
    subject_id: string;
    subject_name: string;
    class_id: string;
  }[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  conflict_description: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ResourceConflict[];
  conflictCount: number;
  criticalCount: number;
  affectedResources: {
    faculty: string[];
    classrooms: string[];
  };
}

/**
 * Check for conflicts before publishing a timetable
 */
export async function checkConflictsBeforePublish(
  timetableId: string
): Promise<ConflictCheckResult> {
  try {
    console.log(`🔍 Checking cross-department conflicts for timetable: ${timetableId}`);

    // 1. Get the timetable details
    const { data: timetable, error: ttError } = await supabase
      .from('generated_timetables')
      .select(`
        id,
        title,
        batch_id,
        semester,
        department_id,
        departments(name),
        batches(name, year)
      `)
      .eq('id', timetableId)
      .single();

    if (ttError || !timetable) {
      throw new Error(`Failed to fetch timetable: ${ttError?.message}`);
    }

    // 2. Get all scheduled classes for this timetable
    const { data: scheduledClasses, error: classError } = await supabase
      .from('scheduled_classes')
      .select(`
        id,
        faculty_id,
        classroom_id,
        time_slot_id,
        subject_id,
        batch_id,
        subjects(name, code),
        time_slots(day, start_time, end_time)
      `)
      .eq('timetable_id', timetableId);

    if (classError) {
      throw new Error(`Failed to fetch scheduled classes: ${classError.message}`);
    }

    if (!scheduledClasses || scheduledClasses.length === 0) {
      return {
        hasConflicts: false,
        conflicts: [],
        conflictCount: 0,
        criticalCount: 0,
        affectedResources: { faculty: [], classrooms: [] }
      };
    }

    // 3. Check for faculty conflicts
    const facultyConflicts = await checkFacultyConflicts(
      scheduledClasses,
      timetable
    );

    // 4. Check for classroom conflicts
    const classroomConflicts = await checkClassroomConflicts(
      scheduledClasses,
      timetable
    );

    // 5. Combine all conflicts
    const allConflicts = [...facultyConflicts, ...classroomConflicts];
    const criticalCount = allConflicts.filter(c => c.severity === 'CRITICAL').length;

    // 6. Extract affected resources
    const affectedFaculty = new Set<string>();
    const affectedClassrooms = new Set<string>();

    allConflicts.forEach(conflict => {
      if (conflict.resource_type === 'FACULTY') {
        affectedFaculty.add(conflict.resource_id);
      } else if (conflict.resource_type === 'CLASSROOM') {
        affectedClassrooms.add(conflict.resource_id);
      }
    });

    const result: ConflictCheckResult = {
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
      conflictCount: allConflicts.length,
      criticalCount,
      affectedResources: {
        faculty: Array.from(affectedFaculty),
        classrooms: Array.from(affectedClassrooms)
      }
    };

    console.log(`✅ Conflict check complete: ${result.conflictCount} conflicts found (${criticalCount} critical)`);
    return result;

  } catch (error) {
    console.error('❌ Error checking conflicts:', error);
    throw error;
  }
}

/**
 * Check for faculty double-booking conflicts
 */
async function checkFacultyConflicts(
  scheduledClasses: any[],
  timetable: any
): Promise<ResourceConflict[]> {
  const conflicts: ResourceConflict[] = [];

  // Group classes by faculty and time slot
  const facultyTimeSlotMap = new Map<string, any[]>();

  scheduledClasses.forEach(cls => {
    const key = `${cls.faculty_id}-${cls.time_slot_id}`;
    if (!facultyTimeSlotMap.has(key)) {
      facultyTimeSlotMap.set(key, []);
    }
    facultyTimeSlotMap.get(key)!.push(cls);
  });

  // Check each faculty-timeslot combination against master registry
  for (const [key, classes] of facultyTimeSlotMap.entries()) {
    const [facultyId, timeSlotId] = key.split('-');

    // Query master_scheduled_classes for this faculty at this time
    const { data: existingClasses, error } = await supabase
      .from('master_scheduled_classes')
      .select(`
        id,
        timetable_id,
        faculty_id,
        classroom_id,
        time_slot_id,
        subject_id,
        batch_id,
        master_accepted_timetables!inner(
          id,
          title,
          department_id,
          departments(name)
        ),
        subjects(name, code),
        batches(name, year),
        time_slots(day, start_time, end_time)
      `)
      .eq('faculty_id', facultyId)
      .eq('time_slot_id', timeSlotId);

    if (error) {
      console.error('Error querying master classes:', error);
      continue;
    }

    // If there are existing classes, we have a conflict
    if (existingClasses && existingClasses.length > 0) {
      // Get faculty name
      const { data: facultyData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', facultyId)
        .single();

      const facultyName = facultyData 
        ? `${facultyData.first_name} ${facultyData.last_name}`
        : 'Unknown Faculty';

      const timeSlot = classes[0].time_slots;

      // Build conflict record
      const conflictingTimetables = existingClasses.map((existing: any) => {
        const timetableData = Array.isArray(existing.master_accepted_timetables) 
          ? existing.master_accepted_timetables[0] 
          : existing.master_accepted_timetables;
        
        const departmentData = Array.isArray(timetableData?.departments)
          ? timetableData.departments[0]
          : timetableData?.departments;
        
        const batchData = Array.isArray(existing.batches)
          ? existing.batches[0]
          : existing.batches;
        
        const subjectData = Array.isArray(existing.subjects)
          ? existing.subjects[0]
          : existing.subjects;
        
        return {
          timetable_id: existing.timetable_id,
          timetable_title: timetableData?.title || 'Unknown',
          department_id: timetableData?.department_id || '',
          department_name: departmentData?.name || 'Unknown Department',
          batch_id: existing.batch_id,
          batch_name: batchData?.name || 'Unknown Batch',
          subject_id: existing.subject_id,
          subject_name: subjectData?.name || 'Unknown Subject',
          class_id: existing.id
        };
      });

      // Add our current timetable's classes
      classes.forEach(cls => {
        conflictingTimetables.push({
          timetable_id: timetable.id,
          timetable_title: timetable.title,
          department_id: timetable.department_id,
          department_name: timetable.departments?.name || 'Unknown Department',
          batch_id: cls.batch_id,
          batch_name: timetable.batches?.name || 'Unknown Batch',
          subject_id: cls.subject_id,
          subject_name: cls.subjects?.name || 'Unknown Subject',
          class_id: cls.id
        });
      });

      conflicts.push({
        resource_type: 'FACULTY',
        resource_id: facultyId,
        resource_name: facultyName,
        time_slot_id: timeSlotId,
        day: timeSlot?.day,
        start_time: timeSlot?.start_time,
        end_time: timeSlot?.end_time,
        conflicting_timetables: conflictingTimetables,
        severity: 'CRITICAL',
        conflict_description: `Faculty "${facultyName}" is scheduled to teach ${conflictingTimetables.length} classes at the same time (${timeSlot?.day} ${timeSlot?.start_time}-${timeSlot?.end_time})`
      });
    }
  }

  return conflicts;
}

/**
 * Check for classroom double-booking conflicts
 */
async function checkClassroomConflicts(
  scheduledClasses: any[],
  timetable: any
): Promise<ResourceConflict[]> {
  const conflicts: ResourceConflict[] = [];

  // Group classes by classroom and time slot
  const classroomTimeSlotMap = new Map<string, any[]>();

  scheduledClasses.forEach(cls => {
    const key = `${cls.classroom_id}-${cls.time_slot_id}`;
    if (!classroomTimeSlotMap.has(key)) {
      classroomTimeSlotMap.set(key, []);
    }
    classroomTimeSlotMap.get(key)!.push(cls);
  });

  // Check each classroom-timeslot combination against master registry
  for (const [key, classes] of classroomTimeSlotMap.entries()) {
    const [classroomId, timeSlotId] = key.split('-');

    // Query master_scheduled_classes for this classroom at this time
    const { data: existingClasses, error } = await supabase
      .from('master_scheduled_classes')
      .select(`
        id,
        timetable_id,
        faculty_id,
        classroom_id,
        time_slot_id,
        subject_id,
        batch_id,
        master_accepted_timetables!inner(
          id,
          title,
          department_id,
          departments(name)
        ),
        subjects(name, code),
        batches(name, year),
        time_slots(day, start_time, end_time)
      `)
      .eq('classroom_id', classroomId)
      .eq('time_slot_id', timeSlotId);

    if (error) {
      console.error('Error querying master classes:', error);
      continue;
    }

    // If there are existing classes, we have a conflict
    if (existingClasses && existingClasses.length > 0) {
      // Get classroom name
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('room_number, building, room_type')
        .eq('id', classroomId)
        .single();

      const classroomName = classroomData 
        ? `${classroomData.building}-${classroomData.room_number} (${classroomData.room_type})`
        : 'Unknown Classroom';

      const timeSlot = classes[0].time_slots;

      // Build conflict record
      const conflictingTimetables = existingClasses.map((existing: any) => {
        const timetableData = Array.isArray(existing.master_accepted_timetables) 
          ? existing.master_accepted_timetables[0] 
          : existing.master_accepted_timetables;
        
        const departmentData = Array.isArray(timetableData?.departments)
          ? timetableData.departments[0]
          : timetableData?.departments;
        
        const batchData = Array.isArray(existing.batches)
          ? existing.batches[0]
          : existing.batches;
        
        const subjectData = Array.isArray(existing.subjects)
          ? existing.subjects[0]
          : existing.subjects;
        
        return {
          timetable_id: existing.timetable_id,
          timetable_title: timetableData?.title || 'Unknown',
          department_id: timetableData?.department_id || '',
          department_name: departmentData?.name || 'Unknown Department',
          batch_id: existing.batch_id,
          batch_name: batchData?.name || 'Unknown Batch',
          subject_id: existing.subject_id,
          subject_name: subjectData?.name || 'Unknown Subject',
          class_id: existing.id
        };
      });

      // Add our current timetable's classes
      classes.forEach(cls => {
        conflictingTimetables.push({
          timetable_id: timetable.id,
          timetable_title: timetable.title,
          department_id: timetable.department_id,
          department_name: timetable.departments?.name || 'Unknown Department',
          batch_id: cls.batch_id,
          batch_name: timetable.batches?.name || 'Unknown Batch',
          subject_id: cls.subject_id,
          subject_name: cls.subjects?.name || 'Unknown Subject',
          class_id: cls.id
        });
      });

      conflicts.push({
        resource_type: 'CLASSROOM',
        resource_id: classroomId,
        resource_name: classroomName,
        time_slot_id: timeSlotId,
        day: timeSlot?.day,
        start_time: timeSlot?.start_time,
        end_time: timeSlot?.end_time,
        conflicting_timetables: conflictingTimetables,
        severity: 'CRITICAL',
        conflict_description: `Classroom "${classroomName}" is booked for ${conflictingTimetables.length} classes at the same time (${timeSlot?.day} ${timeSlot?.start_time}-${timeSlot?.end_time})`
      });
    }
  }

  return conflicts;
}

/**
 * Store detected conflicts in database
 */
export async function storeConflicts(
  timetableId: string,
  conflicts: ResourceConflict[]
): Promise<void> {
  if (conflicts.length === 0) return;

  try {
    // Store each conflict in cross_department_conflicts table
    const conflictRecords = conflicts.map(conflict => ({
      timetable_id: timetableId,
      resource_type: conflict.resource_type,
      resource_id: conflict.resource_id,
      time_slot_id: conflict.time_slot_id,
      conflict_details: {
        resource_name: conflict.resource_name,
        day: conflict.day,
        start_time: conflict.start_time,
        end_time: conflict.end_time,
        conflicting_timetables: conflict.conflicting_timetables,
        description: conflict.conflict_description
      },
      severity: conflict.severity,
      resolved: false
    }));

    const { error } = await supabase
      .from('cross_department_conflicts')
      .insert(conflictRecords);

    if (error) {
      console.error('❌ Error storing conflicts:', error);
      throw error;
    }

    console.log(`✅ Stored ${conflicts.length} conflicts in database`);
  } catch (error) {
    console.error('❌ Error in storeConflicts:', error);
    throw error;
  }
}

/**
 * Get all unresolved conflicts for a timetable
 */
export async function getUnresolvedConflicts(
  timetableId: string
): Promise<ResourceConflict[]> {
  try {
    const { data, error } = await supabase
      .from('cross_department_conflicts')
      .select('*')
      .eq('timetable_id', timetableId)
      .eq('resolved', false)
      .order('severity', { ascending: true }) // CRITICAL first
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((record: any) => ({
      conflict_id: record.id,
      resource_type: record.resource_type,
      resource_id: record.resource_id,
      resource_name: record.conflict_details?.resource_name,
      time_slot_id: record.time_slot_id,
      day: record.conflict_details?.day,
      start_time: record.conflict_details?.start_time,
      end_time: record.conflict_details?.end_time,
      conflicting_timetables: record.conflict_details?.conflicting_timetables || [],
      severity: record.severity,
      conflict_description: record.conflict_details?.description || ''
    }));
  } catch (error) {
    console.error('❌ Error fetching unresolved conflicts:', error);
    return [];
  }
}

/**
 * Mark conflicts as resolved
 */
export async function resolveConflicts(conflictIds: string[]): Promise<void> {
  if (conflictIds.length === 0) return;

  try {
    const { error } = await supabase
      .from('cross_department_conflicts')
      .update({ 
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .in('id', conflictIds);

    if (error) throw error;

    console.log(`✅ Resolved ${conflictIds.length} conflicts`);
  } catch (error) {
    console.error('❌ Error resolving conflicts:', error);
    throw error;
  }
}
