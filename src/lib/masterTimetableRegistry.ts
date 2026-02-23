/**
 * Master Timetable Registry System
 * Manages the college-wide published timetable registry
 * Prevents cross-department conflicts by maintaining a global schedule
 */

import { createClient } from '@supabase/supabase-js';
import { calculateAllResourceUtilization } from './resourceUtilization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface MasterTimetableEntry {
  id: string;
  source_timetable_id: string;
  title: string;
  batch_id: string;
  semester: number;
  department_id: string;
  college_id: string;
  academic_year: string;
  published_by: string;
  published_at: string;
  is_active: boolean;
  metadata?: any;
}

export interface MasterScheduledClass {
  id: string;
  master_timetable_id: string;
  timetable_id: string;
  batch_id: string;
  subject_id: string;
  faculty_id: string;
  classroom_id: string;
  time_slot_id: string;
  resource_hash: string;
  class_type?: string;
  credit_hour_number: number;
}

export interface PublishResult {
  success: boolean;
  master_timetable_id?: string;
  classes_published: number;
  errors?: string[];
}

/**
 * Publish a timetable to master registry
 * This makes the timetable visible college-wide and reserves resources
 */
export async function publishToMasterRegistry(
  timetableId: string,
  publishedBy: string
): Promise<PublishResult> {
  try {
    console.log(`📋 Publishing timetable ${timetableId} to master registry...`);

    // 1. Get timetable details
    const { data: timetable, error: ttError } = await supabase
      .from('generated_timetables')
      .select(`
        *,
        batches(name, year),
        departments(name)
      `)
      .eq('id', timetableId)
      .single();

    if (ttError || !timetable) {
      throw new Error(`Failed to fetch timetable: ${ttError?.message}`);
    }

    // 2. Check if already published
    const { data: existing } = await supabase
      .from('master_accepted_timetables')
      .select('id')
      .eq('source_timetable_id', timetableId)
      .eq('is_active', true)
      .single();

    if (existing) {
      console.log('⚠️ Timetable already published to master registry');
      return {
        success: true,
        master_timetable_id: existing.id,
        classes_published: 0,
        errors: ['Already published']
      };
    }

    // 3. Get all scheduled classes
    const { data: scheduledClasses, error: classError } = await supabase
      .from('scheduled_classes')
      .select('*')
      .eq('timetable_id', timetableId);

    if (classError) {
      throw new Error(`Failed to fetch scheduled classes: ${classError.message}`);
    }

    if (!scheduledClasses || scheduledClasses.length === 0) {
      throw new Error('No scheduled classes found for this timetable');
    }

    // 4. Create master timetable entry
    const masterTimetableEntry = {
      source_timetable_id: timetableId,
      title: timetable.title,
      batch_id: timetable.batch_id,
      semester: timetable.semester,
      department_id: timetable.department_id,
      college_id: timetable.college_id,
      academic_year: timetable.academic_year,
      published_by: publishedBy,
      published_at: new Date().toISOString(),
      is_active: true,
      metadata: {
        batch_name: timetable.batches?.name,
        department_name: timetable.departments?.name,
        fitness_score: timetable.fitness_score,
        total_classes: scheduledClasses.length
      }
    };

    const { data: masterTimetable, error: masterError } = await supabase
      .from('master_accepted_timetables')
      .insert(masterTimetableEntry)
      .select()
      .single();

    if (masterError || !masterTimetable) {
      throw new Error(`Failed to create master timetable entry: ${masterError?.message}`);
    }

    console.log(`✅ Created master timetable entry: ${masterTimetable.id}`);

    // 5. Copy scheduled classes to master registry
    const masterClasses = scheduledClasses.map(cls => ({
      master_timetable_id: masterTimetable.id,
      timetable_id: timetableId,
      batch_id: cls.batch_id,
      subject_id: cls.subject_id,
      faculty_id: cls.faculty_id,
      classroom_id: cls.classroom_id,
      time_slot_id: cls.time_slot_id,
      resource_hash: generateResourceHash(
        cls.faculty_id,
        cls.classroom_id,
        cls.time_slot_id
      ),
      class_type: cls.class_type,
      credit_hour_number: cls.credit_hour_number
    }));

    const { error: insertError } = await supabase
      .from('master_scheduled_classes')
      .insert(masterClasses);

    if (insertError) {
      // Rollback master timetable entry
      await supabase
        .from('master_accepted_timetables')
        .delete()
        .eq('id', masterTimetable.id);

      throw new Error(`Failed to insert master classes: ${insertError.message}`);
    }

    console.log(`✅ Published ${masterClasses.length} classes to master registry`);

    // 6. Update original timetable status
    await supabase
      .from('generated_timetables')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', timetableId);

    // 7. ✨ NEW: Trigger resource utilization calculation (async, non-blocking)
    console.log('📊 Triggering resource utilization calculation...');
    calculateAllResourceUtilization({
      collegeId: timetable.college_id,
      academicYear: timetable.academic_year,
      semester: timetable.semester,
      departmentId: timetable.department_id
    }).catch(error => {
      console.error('⚠️ Warning: Resource utilization calculation failed:', error);
      // Don't fail the publish operation if utilization calculation fails
    });

    return {
      success: true,
      master_timetable_id: masterTimetable.id,
      classes_published: masterClasses.length
    };

  } catch (error: any) {
    console.error('❌ Error publishing to master registry:', error);
    return {
      success: false,
      classes_published: 0,
      errors: [error.message]
    };
  }
}

/**
 * Unpublish a timetable from master registry
 * Removes the timetable and frees up reserved resources
 */
export async function unpublishFromMasterRegistry(
  timetableId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🗑️ Unpublishing timetable ${timetableId} from master registry...`);

    // 1. Find master timetable entry
    const { data: masterTimetable, error: findError } = await supabase
      .from('master_accepted_timetables')
      .select('id')
      .eq('source_timetable_id', timetableId)
      .eq('is_active', true)
      .single();

    if (findError || !masterTimetable) {
      return { success: false, error: 'Master timetable entry not found' };
    }

    // 2. Delete master scheduled classes
    const { error: deleteClassesError } = await supabase
      .from('master_scheduled_classes')
      .delete()
      .eq('master_timetable_id', masterTimetable.id);

    if (deleteClassesError) {
      throw new Error(`Failed to delete master classes: ${deleteClassesError.message}`);
    }

    // 3. Mark master timetable as inactive (soft delete)
    const { error: updateError } = await supabase
      .from('master_accepted_timetables')
      .update({ is_active: false })
      .eq('id', masterTimetable.id);

    if (updateError) {
      throw new Error(`Failed to deactivate master timetable: ${updateError.message}`);
    }

    // 4. Update original timetable status
    await supabase
      .from('generated_timetables')
      .update({
        status: 'approved',
        published_at: null
      })
      .eq('id', timetableId);

    console.log(`✅ Unpublished timetable from master registry`);

    return { success: true };

  } catch (error: any) {
    console.error('❌ Error unpublishing from master registry:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active published timetables in master registry
 */
export async function getActiveMasterTimetables(
  filters?: {
    college_id?: string;
    department_id?: string;
    academic_year?: string;
    semester?: number;
  }
): Promise<MasterTimetableEntry[]> {
  try {
    let query = supabase
      .from('master_accepted_timetables')
      .select(`
        *,
        departments(name),
        batches(name, year)
      `)
      .eq('is_active', true)
      .order('published_at', { ascending: false });

    if (filters?.college_id) {
      query = query.eq('college_id', filters.college_id);
    }
    if (filters?.department_id) {
      query = query.eq('department_id', filters.department_id);
    }
    if (filters?.academic_year) {
      query = query.eq('academic_year', filters.academic_year);
    }
    if (filters?.semester) {
      query = query.eq('semester', filters.semester);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error('❌ Error fetching active master timetables:', error);
    return [];
  }
}

/**
 * Get resource occupation summary from master registry
 */
export async function getResourceOccupation(
  collegeId: string,
  academicYear: string
): Promise<{
  faculty: Map<string, number>;
  classrooms: Map<string, number>;
  timeSlots: Map<string, number>;
}> {
  try {
    // Get all active master classes for this college/year
    const { data: masterTimetables } = await supabase
      .from('master_accepted_timetables')
      .select('id')
      .eq('college_id', collegeId)
      .eq('academic_year', academicYear)
      .eq('is_active', true);

    if (!masterTimetables || masterTimetables.length === 0) {
      return {
        faculty: new Map(),
        classrooms: new Map(),
        timeSlots: new Map()
      };
    }

    const masterIds = masterTimetables.map(mt => mt.id);

    const { data: classes } = await supabase
      .from('master_scheduled_classes')
      .select('faculty_id, classroom_id, time_slot_id')
      .in('master_timetable_id', masterIds);

    // Count occupations
    const facultyOccupation = new Map<string, number>();
    const classroomOccupation = new Map<string, number>();
    const timeSlotOccupation = new Map<string, number>();

    (classes || []).forEach(cls => {
      facultyOccupation.set(
        cls.faculty_id,
        (facultyOccupation.get(cls.faculty_id) || 0) + 1
      );
      classroomOccupation.set(
        cls.classroom_id,
        (classroomOccupation.get(cls.classroom_id) || 0) + 1
      );
      timeSlotOccupation.set(
        cls.time_slot_id,
        (timeSlotOccupation.get(cls.time_slot_id) || 0) + 1
      );
    });

    return {
      faculty: facultyOccupation,
      classrooms: classroomOccupation,
      timeSlots: timeSlotOccupation
    };

  } catch (error) {
    console.error('❌ Error getting resource occupation:', error);
    return {
      faculty: new Map(),
      classrooms: new Map(),
      timeSlots: new Map()
    };
  }
}

/**
 * Check if a resource is available at a specific time
 */
export async function isResourceAvailable(
  resourceType: 'faculty' | 'classroom',
  resourceId: string,
  timeSlotId: string,
  excludeTimetableId?: string
): Promise<boolean> {
  try {
    const column = resourceType === 'faculty' ? 'faculty_id' : 'classroom_id';

    let query = supabase
      .from('master_scheduled_classes')
      .select('id, master_timetable_id')
      .eq(column, resourceId)
      .eq('time_slot_id', timeSlotId);

    const { data } = await query;

    if (!data || data.length === 0) {
      return true; // Available
    }

    // If excluding a specific timetable, check if conflicts are only from that timetable
    if (excludeTimetableId) {
      const { data: masterTimetable } = await supabase
        .from('master_accepted_timetables')
        .select('id')
        .eq('source_timetable_id', excludeTimetableId)
        .single();

      if (masterTimetable) {
        const conflictsFromOthers = data.filter(
          cls => cls.master_timetable_id !== masterTimetable.id
        );
        return conflictsFromOthers.length === 0;
      }
    }

    return false; // Not available

  } catch (error) {
    console.error('❌ Error checking resource availability:', error);
    return false;
  }
}

/**
 * Generate unique hash for resource combination
 */
function generateResourceHash(
  facultyId: string,
  classroomId: string,
  timeSlotId: string
): string {
  return `${facultyId}-${classroomId}-${timeSlotId}`;
}

/**
 * Get statistics for master registry
 */
export async function getMasterRegistryStats(
  collegeId: string,
  academicYear: string
): Promise<{
  total_timetables: number;
  total_classes: number;
  departments_count: number;
  faculty_utilized: number;
  classrooms_utilized: number;
}> {
  try {
    // Get active master timetables
    const { data: timetables } = await supabase
      .from('master_accepted_timetables')
      .select('id, department_id')
      .eq('college_id', collegeId)
      .eq('academic_year', academicYear)
      .eq('is_active', true);

    if (!timetables || timetables.length === 0) {
      return {
        total_timetables: 0,
        total_classes: 0,
        departments_count: 0,
        faculty_utilized: 0,
        classrooms_utilized: 0
      };
    }

    const masterIds = timetables.map(t => t.id);

    // Get all classes
    const { data: classes } = await supabase
      .from('master_scheduled_classes')
      .select('faculty_id, classroom_id')
      .in('master_timetable_id', masterIds);

    // Calculate unique resources
    const uniqueFaculty = new Set((classes || []).map(c => c.faculty_id));
    const uniqueClassrooms = new Set((classes || []).map(c => c.classroom_id));
    const uniqueDepartments = new Set(timetables.map(t => t.department_id));

    return {
      total_timetables: timetables.length,
      total_classes: classes?.length || 0,
      departments_count: uniqueDepartments.size,
      faculty_utilized: uniqueFaculty.size,
      classrooms_utilized: uniqueClassrooms.size
    };

  } catch (error) {
    console.error('❌ Error getting master registry stats:', error);
    return {
      total_timetables: 0,
      total_classes: 0,
      departments_count: 0,
      faculty_utilized: 0,
      classrooms_utilized: 0
    };
  }
}
