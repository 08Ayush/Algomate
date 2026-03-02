import { serviceDb as supabase } from '@/shared/database';
/**
 * Resource Utilization Service
 * Calculate and track usage statistics for faculty, classrooms, and time slots
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export interface ResourceUtilization {
  id: string;
  resource_type: 'faculty' | 'classroom' | 'time_slot';
  resource_id: string;
  college_id: string;
  department_id?: string;
  academic_year: string;
  semester: string;
  total_hours_scheduled: number;
  total_classes_count: number;
  unique_batches_count: number;
  unique_subjects_count: number;
  available_capacity_hours?: number;
  utilization_percentage: number;
  capacity_status: 'underutilized' | 'optimal' | 'near_capacity' | 'overutilized';
  total_conflicts_count: number;
  critical_conflicts_count: number;
  statistics: Record<string, any>;
  last_calculated_at: string;
}

/**
 * Calculate resource utilization for a specific resource
 */
export async function calculateResourceUtilization(params: {
  resourceType: 'faculty' | 'classroom' | 'time_slot';
  resourceId: string;
  collegeId: string;
  academicYear: string;
  semester: string;
  departmentId?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { resourceType, resourceId, collegeId, academicYear, semester, departmentId } = params;

    // Get all published timetables for the scope
    let timetableQuery = supabase
      .from('master_accepted_timetables')
      .select('id')
      .eq('college_id', collegeId)
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .eq('is_active', true);

    if (departmentId) {
      timetableQuery = timetableQuery.eq('department_id', departmentId);
    }

    const { data: timetables, error: timetableError } = await timetableQuery;

    if (timetableError) {
      console.error('❌ Error fetching timetables:', timetableError);
      return { success: false, error: timetableError.message };
    }

    const timetableIds = timetables?.map(t => t.id) || [];

    if (timetableIds.length === 0) {
      // No timetables published yet - create zero stats
      const zeroStats = {
        resource_type: resourceType,
        resource_id: resourceId,
        college_id: collegeId,
        department_id: departmentId,
        academic_year: academicYear,
        semester: semester,
        total_hours_scheduled: 0,
        total_classes_count: 0,
        unique_batches_count: 0,
        unique_subjects_count: 0,
        available_capacity_hours: await getAvailableCapacity(resourceType, resourceId),
        capacity_status: 'underutilized',
        total_conflicts_count: 0,
        critical_conflicts_count: 0,
        statistics: {},
        last_calculated_at: new Date().toISOString(),
        calculation_source: 'auto'
      };

      const { error: insertError } = await supabase
        .from('resource_utilization_summary')
        .upsert(zeroStats, {
          onConflict: 'resource_type,resource_id,academic_year,semester,college_id'
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true, data: zeroStats };
    }

    // Build query based on resource type
    let classQuery = supabase
      .from('master_scheduled_classes')
      .select(`
        id,
        faculty_id,
        classroom_id,
        time_slot_id,
        batch_id,
        subject_id,
        master_timetable_id,
        time_slots (id, duration_minutes)
      `)
      .in('master_timetable_id', timetableIds);

    // Filter by resource
    switch (resourceType) {
      case 'faculty':
        classQuery = classQuery.eq('faculty_id', resourceId);
        break;
      case 'classroom':
        classQuery = classQuery.eq('classroom_id', resourceId);
        break;
      case 'time_slot':
        classQuery = classQuery.eq('time_slot_id', resourceId);
        break;
    }

    const { data: classes, error: classError } = await classQuery;

    if (classError) {
      console.error('❌ Error fetching classes:', classError);
      return { success: false, error: classError.message };
    }

    // Calculate statistics
    const totalClasses = classes?.length || 0;
    const uniqueBatches = new Set(classes?.map(c => c.batch_id) || []).size;
    const uniqueSubjects = new Set(classes?.map(c => c.subject_id) || []).size;
    
    // Calculate total hours (assuming each class is 1 hour if duration not available)
    const totalHours = classes?.reduce((sum, cls: any) => {
      const duration = cls.time_slots?.duration_minutes || 60;
      return sum + (duration / 60);
    }, 0) || 0;

    // Get available capacity
    const availableCapacity = await getAvailableCapacity(resourceType, resourceId);

    // Calculate utilization percentage
    const utilizationPercentage = availableCapacity > 0 
      ? (totalHours / availableCapacity) * 100 
      : 0;

    // Determine capacity status
    const capacityStatus = 
      utilizationPercentage < 50 ? 'underutilized' :
      utilizationPercentage < 75 ? 'optimal' :
      utilizationPercentage < 90 ? 'near_capacity' : 'overutilized';

    // Get conflict counts (from cross_department_conflicts table)
    const { data: conflicts } = await supabase
      .from('cross_department_conflicts')
      .select('severity')
      .eq('resource_id', resourceId)
      .eq('resolved', false);

    const totalConflicts = conflicts?.length || 0;
    const criticalConflicts = conflicts?.filter(c => c.severity === 'CRITICAL').length || 0;

    // Calculate additional statistics
    const statistics = {
      avg_classes_per_day: totalClasses / 5, // Assuming 5-day week
      peak_utilization: utilizationPercentage,
      calculated_at: new Date().toISOString()
    };

    // Upsert into database
    const utilizationData = {
      resource_type: resourceType,
      resource_id: resourceId,
      college_id: collegeId,
      department_id: departmentId,
      academic_year: academicYear,
      semester: semester,
      total_hours_scheduled: totalHours,
      total_classes_count: totalClasses,
      unique_batches_count: uniqueBatches,
      unique_subjects_count: uniqueSubjects,
      available_capacity_hours: availableCapacity,
      capacity_status: capacityStatus,
      total_conflicts_count: totalConflicts,
      critical_conflicts_count: criticalConflicts,
      statistics,
      last_calculated_at: new Date().toISOString(),
      calculation_source: 'auto'
    };

    const { error: upsertError } = await supabase
      .from('resource_utilization_summary')
      .upsert(utilizationData, {
        onConflict: 'resource_type,resource_id,academic_year,semester,college_id'
      });

    if (upsertError) {
      console.error('❌ Error upserting utilization data:', upsertError);
      return { success: false, error: upsertError.message };
    }

    console.log(`✅ Calculated utilization for ${resourceType} ${resourceId}: ${utilizationPercentage.toFixed(2)}%`);
    return { success: true, data: utilizationData };
  } catch (error: any) {
    console.error('❌ Exception in calculateResourceUtilization:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get available capacity for a resource (in hours per week)
 */
async function getAvailableCapacity(
  resourceType: 'faculty' | 'classroom' | 'time_slot',
  resourceId: string
): Promise<number> {
  try {
    // Get total available time slots per week
    const { count } = await supabase
      .from('time_slots')
      .select('*', { count: 'exact', head: true });

    const totalSlotsPerWeek = count || 30; // Default assumption: 6 hours/day * 5 days
    const hoursPerSlot = 1; // Assuming 1-hour slots

    switch (resourceType) {
      case 'faculty':
        // Faculty typically work 18-24 hours per week teaching
        return 20; // Default teaching load
      
      case 'classroom':
        // Classrooms can be used all available slots
        return totalSlotsPerWeek * hoursPerSlot;
      
      case 'time_slot':
        // A time slot can be used by multiple batches (up to number of classrooms)
        const { count: classroomCount } = await supabase
          .from('classrooms')
          .select('*', { count: 'exact', head: true });
        return (classroomCount || 10) * hoursPerSlot; // Max concurrent classes
      
      default:
        return totalSlotsPerWeek;
    }
  } catch (error) {
    console.error('⚠️ Error getting available capacity:', error);
    return 20; // Default fallback
  }
}

/**
 * Calculate utilization for all resources in a college/department
 */
export async function calculateAllResourceUtilization(params: {
  collegeId: string;
  academicYear: string;
  semester: string;
  departmentId?: string;
  resourceType?: 'faculty' | 'classroom' | 'time_slot';
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { collegeId, academicYear, semester, departmentId, resourceType } = params;

    let successCount = 0;
    const errors: string[] = [];

    // Get all resources based on type
    const resourceTypes = resourceType ? [resourceType] : ['faculty', 'classroom', 'time_slot'];

    for (const type of resourceTypes) {
      let resources: any[] = [];

      if (type === 'faculty') {
        // Get all faculty in college/department
        let query = supabase
          .from('users')
          .select('id, department_id')
          .eq('role', 'faculty')
          .eq('is_active', true);

        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }

        const { data } = await query;
        resources = data || [];

      } else if (type === 'classroom') {
        // Get all classrooms in college/department
        let query = supabase
          .from('classrooms')
          .select('id, department_id')
          .eq('college_id', collegeId)
          .eq('is_available', true);

        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }

        const { data } = await query;
        resources = data || [];

      } else if (type === 'time_slot') {
        // Get all time slots
        const { data } = await supabase
          .from('time_slots')
          .select('id')
          .eq('college_id', collegeId);

        resources = data || [];
      }

      // Calculate utilization for each resource
      for (const resource of resources) {
        const result = await calculateResourceUtilization({
          resourceType: type as any,
          resourceId: resource.id,
          collegeId,
          academicYear,
          semester,
          departmentId: resource.department_id || departmentId
        });

        if (result.success) {
          successCount++;
        } else {
          errors.push(`${type} ${resource.id}: ${result.error}`);
        }
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Some calculations failed: ${errors.join(', ')}`);
    }

    console.log(`✅ Calculated utilization for ${successCount} resource(s)`);
    return { success: true, count: successCount };
  } catch (error: any) {
    console.error('❌ Exception in calculateAllResourceUtilization:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Get resource utilization summary
 */
export async function getResourceUtilizationSummary(params: {
  collegeId: string;
  academicYear: string;
  semester: string;
  departmentId?: string;
  resourceType?: 'faculty' | 'classroom' | 'time_slot';
  capacityStatus?: 'underutilized' | 'optimal' | 'near_capacity' | 'overutilized';
}): Promise<{ success: boolean; data?: ResourceUtilization[]; error?: string }> {
  try {
    let query = supabase
      .from('resource_utilization_summary')
      .select('*')
      .eq('college_id', params.collegeId)
      .eq('academic_year', params.academicYear)
      .eq('semester', params.semester)
      .order('utilization_percentage', { ascending: false });

    if (params.departmentId) {
      query = query.eq('department_id', params.departmentId);
    }

    if (params.resourceType) {
      query = query.eq('resource_type', params.resourceType);
    }

    if (params.capacityStatus) {
      query = query.eq('capacity_status', params.capacityStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching utilization summary:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ResourceUtilization[] };
  } catch (error: any) {
    console.error('❌ Exception in getResourceUtilizationSummary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get utilization analytics (aggregated stats)
 */
export async function getUtilizationAnalytics(params: {
  collegeId: string;
  academicYear: string;
  semester: string;
  departmentId?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { collegeId, academicYear, semester, departmentId } = params;

    let query = supabase
      .from('resource_utilization_summary')
      .select('*')
      .eq('college_id', collegeId)
      .eq('academic_year', academicYear)
      .eq('semester', semester);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Calculate analytics
    const analytics = {
      total_resources: data?.length || 0,
      by_type: {
        faculty: data?.filter(r => r.resource_type === 'faculty').length || 0,
        classroom: data?.filter(r => r.resource_type === 'classroom').length || 0,
        time_slot: data?.filter(r => r.resource_type === 'time_slot').length || 0
      },
      by_capacity_status: {
        underutilized: data?.filter(r => r.capacity_status === 'underutilized').length || 0,
        optimal: data?.filter(r => r.capacity_status === 'optimal').length || 0,
        near_capacity: data?.filter(r => r.capacity_status === 'near_capacity').length || 0,
        overutilized: data?.filter(r => r.capacity_status === 'overutilized').length || 0
      },
      average_utilization: {
        faculty: calculateAverage(data?.filter(r => r.resource_type === 'faculty'), 'utilization_percentage'),
        classroom: calculateAverage(data?.filter(r => r.resource_type === 'classroom'), 'utilization_percentage'),
        time_slot: calculateAverage(data?.filter(r => r.resource_type === 'time_slot'), 'utilization_percentage'),
        overall: calculateAverage(data, 'utilization_percentage')
      },
      total_conflicts: data?.reduce((sum, r) => sum + (r.total_conflicts_count || 0), 0) || 0,
      critical_conflicts: data?.reduce((sum, r) => sum + (r.critical_conflicts_count || 0), 0) || 0
    };

    return { success: true, data: analytics };
  } catch (error: any) {
    console.error('❌ Exception in getUtilizationAnalytics:', error);
    return { success: false, error: error.message };
  }
}

function calculateAverage(arr: any[] | undefined, field: string): number {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((acc, item) => acc + (item[field] || 0), 0);
  return Math.round((sum / arr.length) * 100) / 100;
}
