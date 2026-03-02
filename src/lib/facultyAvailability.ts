import { serviceDb as supabase } from '@/shared/database';
/**
 * Faculty Availability Service
 * Manage faculty time preferences and unavailability
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export type AvailabilityType = 'available' | 'unavailable' | 'preferred' | 'avoid';

export interface FacultyAvailability {
  id: string;
  faculty_id: string;
  time_slot_id: string;
  is_available: boolean;
  availability_type: AvailabilityType;
  preference_weight: number;
  effective_from?: string;
  effective_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FacultyAvailabilityInput {
  faculty_id: string;
  time_slot_id: string;
  availability_type: AvailabilityType;
  preference_weight?: number;
  effective_from?: string;
  effective_until?: string;
  notes?: string;
}

export interface FacultyAvailabilityWithDetails extends FacultyAvailability {
  time_slots?: {
    id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    period_number: number;
  };
}

/**
 * Set faculty availability for a specific time slot
 * Creates or updates existing record
 */
export async function setFacultyAvailability(
  data: FacultyAvailabilityInput
): Promise<{ success: boolean; availability?: FacultyAvailability; error?: string }> {
  try {
    const is_available = data.availability_type === 'available' || data.availability_type === 'preferred';
    
    // Upsert (insert or update if exists)
    const { data: availability, error } = await supabase
      .from('faculty_availability')
      .upsert({
        faculty_id: data.faculty_id,
        time_slot_id: data.time_slot_id,
        is_available,
        availability_type: data.availability_type,
        preference_weight: data.preference_weight || (
          data.availability_type === 'preferred' ? 1.5 :
          data.availability_type === 'avoid' ? 0.5 : 1.0
        ),
        effective_from: data.effective_from || new Date().toISOString().split('T')[0],
        effective_until: data.effective_until,
        notes: data.notes,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'faculty_id,time_slot_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error setting faculty availability:', error);
      return { success: false, error: error.message };
    }

    return { success: true, availability };
  } catch (error: any) {
    console.error('❌ Exception in setFacultyAvailability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set bulk availability for a faculty (e.g., unavailable for all Monday mornings)
 */
export async function setBulkFacultyAvailability(
  facultyId: string,
  timeSlotIds: string[],
  availabilityType: AvailabilityType,
  options?: {
    notes?: string;
    effectiveFrom?: string;
    effectiveUntil?: string;
  }
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const is_available = availabilityType === 'available' || availabilityType === 'preferred';
    const preference_weight = 
      availabilityType === 'preferred' ? 1.5 :
      availabilityType === 'avoid' ? 0.5 : 1.0;

    const records = timeSlotIds.map(time_slot_id => ({
      faculty_id: facultyId,
      time_slot_id,
      is_available,
      availability_type: availabilityType,
      preference_weight,
      effective_from: options?.effectiveFrom || new Date().toISOString().split('T')[0],
      effective_until: options?.effectiveUntil,
      notes: options?.notes,
      updated_at: new Date().toISOString()
    }));

    const { error, count } = await supabase
      .from('faculty_availability')
      .upsert(records, {
        onConflict: 'faculty_id,time_slot_id'
      });

    if (error) {
      console.error('❌ Error setting bulk faculty availability:', error);
      return { success: false, count: 0, error: error.message };
    }

    console.log(`✅ Set availability for ${count || records.length} time slot(s)`);
    return { success: true, count: count || records.length };
  } catch (error: any) {
    console.error('❌ Exception in setBulkFacultyAvailability:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Get faculty availability with time slot details
 */
export async function getFacultyAvailability(
  facultyId: string,
  options?: {
    includeExpired?: boolean;
    dayOfWeek?: string;
    availabilityType?: AvailabilityType;
  }
): Promise<{ success: boolean; data?: FacultyAvailabilityWithDetails[]; error?: string }> {
  try {
    let query = supabase
      .from('faculty_availability')
      .select(`
        *,
        time_slots (
          id,
          day_of_week,
          start_time,
          end_time,
          period_number
        )
      `)
      .eq('faculty_id', facultyId);

    // Filter by effective dates if not including expired
    if (!options?.includeExpired) {
      const today = new Date().toISOString().split('T')[0];
      query = query
        .lte('effective_from', today)
        .or(`effective_until.is.null,effective_until.gte.${today}`);
    }

    // Filter by day of week
    if (options?.dayOfWeek) {
      query = query.eq('time_slots.day_of_week', options.dayOfWeek);
    }

    // Filter by availability type
    if (options?.availabilityType) {
      query = query.eq('availability_type', options.availabilityType);
    }

    const { data, error } = await query.order('time_slots.day_of_week', { ascending: true });

    if (error) {
      console.error('❌ Error fetching faculty availability:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as FacultyAvailabilityWithDetails[] };
  } catch (error: any) {
    console.error('❌ Exception in getFacultyAvailability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if faculty is available at a specific time slot
 */
export async function isFacultyAvailable(
  facultyId: string,
  timeSlotId: string,
  checkDate?: string
): Promise<{ available: boolean; preferenceWeight: number; notes?: string }> {
  try {
    const date = checkDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('faculty_availability')
      .select('is_available, preference_weight, notes, availability_type')
      .eq('faculty_id', facultyId)
      .eq('time_slot_id', timeSlotId)
      .lte('effective_from', date)
      .or(`effective_until.is.null,effective_until.gte.${date}`)
      .single();

    if (error || !data) {
      // No availability record = assume available with normal weight
      return { available: true, preferenceWeight: 1.0 };
    }

    return {
      available: data.is_available,
      preferenceWeight: data.preference_weight || 1.0,
      notes: data.notes || undefined
    };
  } catch (error) {
    // On error, assume available
    console.error('⚠️ Error checking faculty availability:', error);
    return { available: true, preferenceWeight: 1.0 };
  }
}

/**
 * Get unavailable time slots for faculty (for scheduling algorithm)
 */
export async function getFacultyUnavailableSlots(
  facultyId: string,
  checkDate?: string
): Promise<string[]> {
  try {
    const date = checkDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('faculty_availability')
      .select('time_slot_id')
      .eq('faculty_id', facultyId)
      .eq('is_available', false)
      .lte('effective_from', date)
      .or(`effective_until.is.null,effective_until.gte.${date}`);

    if (error) {
      console.error('❌ Error fetching unavailable slots:', error);
      return [];
    }

    return data?.map(d => d.time_slot_id) || [];
  } catch (error) {
    console.error('⚠️ Exception in getFacultyUnavailableSlots:', error);
    return [];
  }
}

/**
 * Get faculty preferences (preferred/avoid slots) for optimization
 */
export async function getFacultyPreferences(
  facultyId: string,
  checkDate?: string
): Promise<{
  preferred: Array<{ timeSlotId: string; weight: number }>;
  avoid: Array<{ timeSlotId: string; weight: number }>;
}> {
  try {
    const date = checkDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('faculty_availability')
      .select('time_slot_id, availability_type, preference_weight')
      .eq('faculty_id', facultyId)
      .in('availability_type', ['preferred', 'avoid'])
      .lte('effective_from', date)
      .or(`effective_until.is.null,effective_until.gte.${date}`);

    if (error) {
      console.error('❌ Error fetching faculty preferences:', error);
      return { preferred: [], avoid: [] };
    }

    const preferred = data
      ?.filter(d => d.availability_type === 'preferred')
      .map(d => ({ timeSlotId: d.time_slot_id, weight: d.preference_weight })) || [];

    const avoid = data
      ?.filter(d => d.availability_type === 'avoid')
      .map(d => ({ timeSlotId: d.time_slot_id, weight: d.preference_weight })) || [];

    return { preferred, avoid };
  } catch (error) {
    console.error('⚠️ Exception in getFacultyPreferences:', error);
    return { preferred: [], avoid: [] };
  }
}

/**
 * Delete faculty availability record
 */
export async function deleteFacultyAvailability(
  facultyId: string,
  timeSlotId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('faculty_availability')
      .delete()
      .eq('faculty_id', facultyId)
      .eq('time_slot_id', timeSlotId);

    if (error) {
      console.error('❌ Error deleting faculty availability:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Exception in deleteFacultyAvailability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear all availability settings for a faculty
 */
export async function clearFacultyAvailability(
  facultyId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('faculty_availability')
      .delete()
      .eq('faculty_id', facultyId);

    if (error) {
      console.error('❌ Error clearing faculty availability:', error);
      return { success: false, count: 0, error: error.message };
    }

    console.log(`✅ Cleared ${count || 0} availability record(s)`);
    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('❌ Exception in clearFacultyAvailability:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Get all faculty with their availability summary (for admin view)
 */
export async function getAllFacultyAvailabilitySummary(
  departmentId?: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        department_id,
        departments (name)
      `)
      .eq('role', 'faculty')
      .eq('is_active', true);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data: faculty, error: facultyError } = await query;

    if (facultyError) {
      console.error('❌ Error fetching faculty:', facultyError);
      return { success: false, error: facultyError.message };
    }

    // Get availability counts for each faculty
    const summaries = await Promise.all(
      (faculty || []).map(async (fac) => {
        const { count: unavailableCount } = await supabase
          .from('faculty_availability')
          .select('*', { count: 'exact', head: true })
          .eq('faculty_id', fac.id)
          .eq('is_available', false);

        const { count: preferredCount } = await supabase
          .from('faculty_availability')
          .select('*', { count: 'exact', head: true })
          .eq('faculty_id', fac.id)
          .eq('availability_type', 'preferred');

        const { count: avoidCount } = await supabase
          .from('faculty_availability')
          .select('*', { count: 'exact', head: true })
          .eq('faculty_id', fac.id)
          .eq('availability_type', 'avoid');

        return {
          ...fac,
          availability_summary: {
            unavailable_slots: unavailableCount || 0,
            preferred_slots: preferredCount || 0,
            avoid_slots: avoidCount || 0,
            has_preferences: (unavailableCount || 0) + (preferredCount || 0) + (avoidCount || 0) > 0
          }
        };
      })
    );

    return { success: true, data: summaries };
  } catch (error: any) {
    console.error('❌ Exception in getAllFacultyAvailabilitySummary:', error);
    return { success: false, error: error.message };
  }
}
