import { serviceDb as supabase } from '@/shared/database';
/**
 * Constraint Rules Engine
 * Fetches and applies constraint rules from database for timetable generation
 */

import { getFacultyUnavailableSlots, getFacultyPreferences } from './facultyAvailability';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export interface ConstraintRule {
  id: string;
  rule_name: string;
  rule_type: 'HARD' | 'SOFT' | 'PREFERENCE';
  description: string;
  rule_parameters: Record<string, any>;
  weight: number;
  applies_to_departments?: string[];
  applies_to_subjects?: string[];
  applies_to_faculty?: string[];
  applies_to_batches?: string[];
  is_active: boolean;
}

export interface ConstraintViolation {
  rule_name: string;
  rule_type: 'HARD' | 'SOFT' | 'PREFERENCE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affected_resources: {
    faculty_id?: string;
    classroom_id?: string;
    batch_id?: string;
    subject_id?: string;
    time_slot_id?: string;
  };
  details: Record<string, any>;
}

export interface ScheduledClass {
  id?: string;
  timetable_id: string;
  batch_id: string;
  subject_id: string;
  faculty_id: string;
  classroom_id: string;
  time_slot_id: string;
  class_type?: 'THEORY' | 'LAB' | 'PRACTICAL' | 'TUTORIAL';
  credit_hour_number: number;
  is_lab?: boolean;
  is_continuation?: boolean;
  session_number?: number;
}

export interface TimeSlot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
}

/**
 * Fetch active constraint rules from database
 */
export async function fetchConstraintRules(filters?: {
  department_id?: string;
  batch_id?: string;
  rule_type?: 'HARD' | 'SOFT' | 'PREFERENCE';
  enabled_constraint_ids?: string[]; // Filter to only specific constraint IDs from UI
}): Promise<ConstraintRule[]> {
  try {
    let query = supabase
      .from('constraint_rules')
      .select('*')
      .eq('is_active', true)
      .order('rule_type', { ascending: true }) // HARD first, then SOFT, then PREFERENCE
      .order('weight', { ascending: false }); // Higher weights first

    if (filters?.rule_type) {
      query = query.eq('rule_type', filters.rule_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching constraint rules:', error);
      return [];
    }

    // Filter by department/batch if specified
    let rules = data || [];
    
    if (filters?.department_id) {
      rules = rules.filter((rule: ConstraintRule) => 
        !rule.applies_to_departments || 
        rule.applies_to_departments.length === 0 || 
        rule.applies_to_departments.includes(filters.department_id!)
      );
    }

    if (filters?.batch_id) {
      rules = rules.filter((rule: ConstraintRule) => 
        !rule.applies_to_batches || 
        rule.applies_to_batches.length === 0 || 
        rule.applies_to_batches.includes(filters.batch_id!)
      );
    }

    // Filter by enabled constraint IDs if provided (from UI selection)
    if (filters?.enabled_constraint_ids && filters.enabled_constraint_ids.length > 0) {
      const enabledIds = new Set(filters.enabled_constraint_ids);
      rules = rules.filter((rule: ConstraintRule) => enabledIds.has(rule.id));
      console.log(`✅ Filtered to ${rules.length} user-enabled constraints from UI`);
    }

    console.log(`✅ Loaded ${rules.length} active constraint rules`);
    return rules;
  } catch (error) {
    console.error('❌ Exception fetching constraint rules:', error);
    return [];
  }
}

/**
 * Check lunch break consideration (SOFT constraint)
 */
function checkLunchBreak(
  scheduledClasses: ScheduledClass[],
  timeSlotMap: Map<string, TimeSlot>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;
  const lunchStartTime = rule.rule_parameters.lunch_start || '13:00';
  const lunchEndTime = rule.rule_parameters.lunch_end || '14:00';

  // Check if any classes are scheduled during lunch time
  scheduledClasses.forEach(cls => {
    const timeSlot = timeSlotMap.get(cls.time_slot_id);
    if (!timeSlot) return;

    // Check if class overlaps with lunch time
    if (timeSlot.start_time >= lunchStartTime && timeSlot.start_time < lunchEndTime) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'LOW',
        description: `Class scheduled during lunch break (${lunchStartTime}-${lunchEndTime})`,
        affected_resources: {
          batch_id: cls.batch_id,
          time_slot_id: cls.time_slot_id
        },
        details: { lunch_time: `${lunchStartTime}-${lunchEndTime}`, slot_time: timeSlot.start_time }
      });
    }
  });

  return violated;
}

/**
 * Check faculty preferred time slots (SOFT constraint)
 */
function checkFacultyPreferences(
  classesByFaculty: Map<string, ScheduledClass[]>,
  timeSlotMap: Map<string, TimeSlot>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  // This would require fetching faculty_availability data
  // For now, we'll implement basic check without database query
  // In production, pass faculty preferences as parameter
  
  // Placeholder: Check if faculty has too many classes in non-preferred slots
  // (e.g., early morning or late evening)
  const nonPreferredSlots = ['08:00', '17:00', '18:00'];

  classesByFaculty.forEach((classes, facultyId) => {
    let nonPreferredCount = 0;
    
    classes.forEach(cls => {
      const timeSlot = timeSlotMap.get(cls.time_slot_id);
      if (timeSlot && nonPreferredSlots.includes(timeSlot.start_time)) {
        nonPreferredCount++;
      }
    });

    if (nonPreferredCount > 2) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'LOW',
        description: `Faculty has ${nonPreferredCount} classes in non-preferred time slots`,
        affected_resources: {
          faculty_id: facultyId
        },
        details: { non_preferred_count: nonPreferredCount }
      });
    }
  });

  return violated;
}

/**
 * Check avoid first/last slot for labs (SOFT constraint)
 */
function checkLabSlotPreference(
  scheduledClasses: ScheduledClass[],
  timeSlotMap: Map<string, TimeSlot>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  const labClasses = scheduledClasses.filter(cls => cls.is_lab || cls.class_type === 'LAB');

  // Group by day to find first and last slots
  const slotsByDay = new Map<string, TimeSlot[]>();
  timeSlotMap.forEach(slot => {
    if (!slotsByDay.has(slot.day)) {
      slotsByDay.set(slot.day, []);
    }
    slotsByDay.get(slot.day)!.push(slot);
  });

  // Sort slots by time for each day
  slotsByDay.forEach(slots => {
    slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  // Check if labs are in first or last slot
  labClasses.forEach(cls => {
    const timeSlot = timeSlotMap.get(cls.time_slot_id);
    if (!timeSlot) return;

    const daySlots = slotsByDay.get(timeSlot.day) || [];
    if (daySlots.length === 0) return;

    const firstSlot = daySlots[0];
    const lastSlot = daySlots[daySlots.length - 1];

    if (timeSlot.id === firstSlot.id || timeSlot.id === lastSlot.id) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'LOW',
        description: `Lab scheduled in ${timeSlot.id === firstSlot.id ? 'first' : 'last'} slot of ${timeSlot.day}`,
        affected_resources: {
          subject_id: cls.subject_id,
          time_slot_id: cls.time_slot_id
        },
        details: { day: timeSlot.day, position: timeSlot.id === firstSlot.id ? 'first' : 'last' }
      });
    }
  });

  return violated;
}

/**
 * Check faculty cross-timetable preference (SOFT constraint)
 */
function checkFacultyCrossTimetable(
  classesByFaculty: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  // This checks if faculty workload is balanced across different timetables
  // For current timetable scope, we check if faculty has reasonable number of classes
  const maxClassesPerWeek = rule.rule_parameters.max_classes_per_week || 25;

  classesByFaculty.forEach((classes, facultyId) => {
    if (classes.length > maxClassesPerWeek) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'LOW',
        description: `Faculty has ${classes.length} classes, exceeds recommended ${maxClassesPerWeek} per week`,
        affected_resources: {
          faculty_id: facultyId
        },
        details: { class_count: classes.length, max_recommended: maxClassesPerWeek }
      });
    }
  });

  return violated;
}

/**
 * Check classroom cross-timetable preference (SOFT constraint)
 */
function checkClassroomCrossTimetable(
  classesByClassroom: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  // Check if classroom utilization is balanced
  // Avoid overusing or underusing specific classrooms
  const minUtilization = rule.rule_parameters.min_utilization || 10;
  const maxUtilization = rule.rule_parameters.max_utilization || 30;

  classesByClassroom.forEach((classes, classroomId) => {
    if (classes.length < minUtilization) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'LOW',
        description: `Classroom underutilized: ${classes.length} classes (minimum ${minUtilization})`,
        affected_resources: {
          classroom_id: classroomId
        },
        details: { class_count: classes.length, min_utilization: minUtilization }
      });
    } else if (classes.length > maxUtilization) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'LOW',
        description: `Classroom overutilized: ${classes.length} classes (maximum ${maxUtilization})`,
        affected_resources: {
          classroom_id: classroomId
        },
        details: { class_count: classes.length, max_utilization: maxUtilization }
      });
    }
  });

  return violated;
}

/**
 * Validate scheduled classes against constraint rules
 */
export async function validateConstraints(
  scheduledClasses: ScheduledClass[],
  timeSlots: TimeSlot[],
  rules: ConstraintRule[]
): Promise<{ violations: ConstraintViolation[]; score: number }> {
  const violations: ConstraintViolation[] = [];
  let totalWeight = 0;
  let satisfiedWeight = 0;

  // Create lookup maps for efficient checking
  const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));
  
  // Group classes by various criteria for constraint checking
  const classesByTimeSlot = new Map<string, ScheduledClass[]>();
  const classesByFaculty = new Map<string, ScheduledClass[]>();
  const classesByClassroom = new Map<string, ScheduledClass[]>();
  const classesByBatch = new Map<string, ScheduledClass[]>();
  const classesBySubject = new Map<string, ScheduledClass[]>();

  scheduledClasses.forEach(cls => {
    // By time slot
    if (!classesByTimeSlot.has(cls.time_slot_id)) {
      classesByTimeSlot.set(cls.time_slot_id, []);
    }
    classesByTimeSlot.get(cls.time_slot_id)!.push(cls);

    // By faculty
    if (!classesByFaculty.has(cls.faculty_id)) {
      classesByFaculty.set(cls.faculty_id, []);
    }
    classesByFaculty.get(cls.faculty_id)!.push(cls);

    // By classroom
    if (!classesByClassroom.has(cls.classroom_id)) {
      classesByClassroom.set(cls.classroom_id, []);
    }
    classesByClassroom.get(cls.classroom_id)!.push(cls);

    // By batch
    if (!classesByBatch.has(cls.batch_id)) {
      classesByBatch.set(cls.batch_id, []);
    }
    classesByBatch.get(cls.batch_id)!.push(cls);

    // By subject
    if (!classesBySubject.has(cls.subject_id)) {
      classesBySubject.set(cls.subject_id, []);
    }
    classesBySubject.get(cls.subject_id)!.push(cls);
  });

  // Check each rule
  for (const rule of rules) {
    totalWeight += rule.weight;
    let ruleViolated = false;

    switch (rule.rule_name) {
      case 'no_batch_overlap_per_timetable':
        ruleViolated = checkBatchOverlap(
          classesByTimeSlot,
          classesByBatch,
          rule,
          violations
        );
        break;

      case 'no_faculty_overlap_per_timetable':
        ruleViolated = checkFacultyOverlap(
          classesByTimeSlot,
          classesByFaculty,
          rule,
          violations
        );
        break;

      case 'no_classroom_overlap_per_timetable':
        ruleViolated = checkClassroomOverlap(
          classesByTimeSlot,
          classesByClassroom,
          rule,
          violations
        );
        break;

      case 'no_continuous_theory_same_faculty':
        ruleViolated = checkContinuousTheory(
          classesByFaculty,
          timeSlotMap,
          rule,
          violations
        );
        break;

      case 'lab_requires_continuous_slots':
        ruleViolated = checkLabContinuity(
          scheduledClasses,
          timeSlotMap,
          rule,
          violations
        );
        break;

      case 'max_one_lab_per_day':
        ruleViolated = checkMaxLabPerDay(
          classesByBatch,
          timeSlotMap,
          rule,
          violations
        );
        break;

      case 'minimum_subject_hours':
        ruleViolated = checkMinimumHours(
          classesBySubject,
          rule,
          violations
        );
        break;

      case 'distribute_subjects_evenly':
        ruleViolated = checkEvenDistribution(
          classesBySubject,
          timeSlotMap,
          rule,
          violations
        );
        break;

      case 'lunch_break_consideration':
        ruleViolated = checkLunchBreak(
          scheduledClasses,
          timeSlotMap,
          rule,
          violations
        );
        break;

      case 'faculty_preferred_time_slots':
        ruleViolated = checkFacultyPreferences(
          classesByFaculty,
          timeSlotMap,
          rule,
          violations
        );
        break;

      case 'avoid_first_last_slot_labs':
        ruleViolated = checkLabSlotPreference(
          scheduledClasses,
          timeSlotMap,
          rule,
          violations
        );
        break;

      case 'faculty_cross_timetable_preference':
        ruleViolated = checkFacultyCrossTimetable(
          classesByFaculty,
          rule,
          violations
        );
        break;

      case 'classroom_cross_timetable_preference':
        ruleViolated = checkClassroomCrossTimetable(
          classesByClassroom,
          rule,
          violations
        );
        break;

      case 'faculty_availability_hard':
        // ✨ NEW: Check faculty unavailable time slots (HARD constraint)
        ruleViolated = await checkFacultyAvailabilityConstraint(
          classesByFaculty,
          rule,
          violations
        );
        break;

      case 'faculty_preference_optimization':
        // ✨ NEW: Optimize for faculty preferred/avoid slots (SOFT constraint)
        ruleViolated = await checkFacultyPreferenceOptimization(
          classesByFaculty,
          rule,
          violations
        );
        break;

      default:
        console.log(`⚠️ Unknown rule: ${rule.rule_name}`);
    }

    if (!ruleViolated) {
      satisfiedWeight += rule.weight;
    }
  }

  const score = totalWeight > 0 ? (satisfiedWeight / totalWeight) * 100 : 100;

  return { violations, score };
}

/**
 * Check for batch time overlaps (HARD constraint)
 */
function checkBatchOverlap(
  classesByTimeSlot: Map<string, ScheduledClass[]>,
  classesByBatch: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  classesByTimeSlot.forEach((classes, timeSlotId) => {
    const batchesAtThisTime = new Set<string>();
    
    classes.forEach(cls => {
      if (batchesAtThisTime.has(cls.batch_id)) {
        violated = true;
        violations.push({
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          severity: 'CRITICAL',
          description: `Batch ${cls.batch_id} has multiple classes at the same time`,
          affected_resources: {
            batch_id: cls.batch_id,
            time_slot_id: timeSlotId
          },
          details: { classes_count: classes.filter(c => c.batch_id === cls.batch_id).length }
        });
      }
      batchesAtThisTime.add(cls.batch_id);
    });
  });

  return violated;
}

/**
 * Check for faculty time overlaps (HARD constraint)
 */
function checkFacultyOverlap(
  classesByTimeSlot: Map<string, ScheduledClass[]>,
  classesByFaculty: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  classesByTimeSlot.forEach((classes, timeSlotId) => {
    const facultyAtThisTime = new Set<string>();
    
    classes.forEach(cls => {
      if (facultyAtThisTime.has(cls.faculty_id)) {
        violated = true;
        violations.push({
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          severity: 'CRITICAL',
          description: `Faculty ${cls.faculty_id} assigned to multiple classes at the same time`,
          affected_resources: {
            faculty_id: cls.faculty_id,
            time_slot_id: timeSlotId
          },
          details: { classes_count: classes.filter(c => c.faculty_id === cls.faculty_id).length }
        });
      }
      facultyAtThisTime.add(cls.faculty_id);
    });
  });

  return violated;
}

/**
 * Check for classroom overlaps (HARD constraint)
 */
function checkClassroomOverlap(
  classesByTimeSlot: Map<string, ScheduledClass[]>,
  classesByClassroom: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  classesByTimeSlot.forEach((classes, timeSlotId) => {
    const classroomsAtThisTime = new Set<string>();
    
    classes.forEach(cls => {
      if (classroomsAtThisTime.has(cls.classroom_id)) {
        violated = true;
        violations.push({
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          severity: 'CRITICAL',
          description: `Classroom ${cls.classroom_id} assigned to multiple classes at the same time`,
          affected_resources: {
            classroom_id: cls.classroom_id,
            time_slot_id: timeSlotId
          },
          details: { classes_count: classes.filter(c => c.classroom_id === cls.classroom_id).length }
        });
      }
      classroomsAtThisTime.add(cls.classroom_id);
    });
  });

  return violated;
}

/**
 * Check for continuous theory lectures by same faculty (HARD constraint)
 */
function checkContinuousTheory(
  classesByFaculty: Map<string, ScheduledClass[]>,
  timeSlotMap: Map<string, TimeSlot>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;
  const maxContinuous = rule.rule_parameters.max_continuous || 1;

  classesByFaculty.forEach((classes, facultyId) => {
    // Group by day
    const classesByDay = new Map<string, ScheduledClass[]>();
    
    classes.forEach(cls => {
      const timeSlot = timeSlotMap.get(cls.time_slot_id);
      if (!timeSlot || cls.class_type === 'LAB') return; // Skip labs
      
      if (!classesByDay.has(timeSlot.day)) {
        classesByDay.set(timeSlot.day, []);
      }
      classesByDay.get(timeSlot.day)!.push(cls);
    });

    // Check each day for continuous theory lectures
    classesByDay.forEach((dayClasses, day) => {
      // Sort by start time
      dayClasses.sort((a, b) => {
        const timeA = timeSlotMap.get(a.time_slot_id)?.start_time || '';
        const timeB = timeSlotMap.get(b.time_slot_id)?.start_time || '';
        return timeA.localeCompare(timeB);
      });

      // Check for consecutive slots
      let consecutiveCount = 1;
      for (let i = 1; i < dayClasses.length; i++) {
        const prevSlot = timeSlotMap.get(dayClasses[i-1].time_slot_id);
        const currSlot = timeSlotMap.get(dayClasses[i].time_slot_id);
        
        if (prevSlot && currSlot && prevSlot.end_time === currSlot.start_time) {
          consecutiveCount++;
          if (consecutiveCount > maxContinuous) {
            violated = true;
            violations.push({
              rule_name: rule.rule_name,
              rule_type: rule.rule_type,
              severity: 'HIGH',
              description: `Faculty has ${consecutiveCount} continuous theory lectures on ${day}`,
              affected_resources: {
                faculty_id: facultyId
              },
              details: { day, consecutive_count: consecutiveCount }
            });
          }
        } else {
          consecutiveCount = 1;
        }
      }
    });
  });

  return violated;
}

/**
 * Check lab continuity (HARD constraint)
 */
function checkLabContinuity(
  scheduledClasses: ScheduledClass[],
  timeSlotMap: Map<string, TimeSlot>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;
  const requiredSlots = rule.rule_parameters.required_slots || 2;

  const labClasses = scheduledClasses.filter(cls => cls.is_lab || cls.class_type === 'LAB');
  
  // Group labs by batch+subject+day
  const labGroups = new Map<string, ScheduledClass[]>();
  
  labClasses.forEach(cls => {
    const timeSlot = timeSlotMap.get(cls.time_slot_id);
    if (!timeSlot) return;
    
    const key = `${cls.batch_id}-${cls.subject_id}-${timeSlot.day}`;
    if (!labGroups.has(key)) {
      labGroups.set(key, []);
    }
    labGroups.get(key)!.push(cls);
  });

  // Check each lab group for continuity
  labGroups.forEach((labs, key) => {
    labs.sort((a, b) => {
      const timeA = timeSlotMap.get(a.time_slot_id)?.start_time || '';
      const timeB = timeSlotMap.get(b.time_slot_id)?.start_time || '';
      return timeA.localeCompare(timeB);
    });

    // Check if slots are continuous
    let isContinuous = true;
    for (let i = 1; i < labs.length; i++) {
      const prevSlot = timeSlotMap.get(labs[i-1].time_slot_id);
      const currSlot = timeSlotMap.get(labs[i].time_slot_id);
      
      if (!prevSlot || !currSlot || prevSlot.end_time !== currSlot.start_time) {
        isContinuous = false;
        break;
      }
    }

    if (labs.length < requiredSlots || !isContinuous) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'HIGH',
        description: `Lab session requires ${requiredSlots} continuous slots but has ${labs.length} ${isContinuous ? 'continuous' : 'non-continuous'} slots`,
        affected_resources: {
          batch_id: labs[0].batch_id,
          subject_id: labs[0].subject_id
        },
        details: { required: requiredSlots, actual: labs.length, continuous: isContinuous }
      });
    }
  });

  return violated;
}

/**
 * Check max labs per day (HARD constraint)
 */
function checkMaxLabPerDay(
  classesByBatch: Map<string, ScheduledClass[]>,
  timeSlotMap: Map<string, TimeSlot>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;
  const maxLabs = rule.rule_parameters.max_labs || 1;

  classesByBatch.forEach((classes, batchId) => {
    const labsByDay = new Map<string, number>();
    
    classes.forEach(cls => {
      if (!cls.is_lab && cls.class_type !== 'LAB') return;
      
      const timeSlot = timeSlotMap.get(cls.time_slot_id);
      if (!timeSlot) return;
      
      labsByDay.set(timeSlot.day, (labsByDay.get(timeSlot.day) || 0) + 1);
    });

    labsByDay.forEach((count, day) => {
      if (count > maxLabs) {
        violated = true;
        violations.push({
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          severity: 'MEDIUM',
          description: `Batch has ${count} lab sessions on ${day}, exceeds maximum of ${maxLabs}`,
          affected_resources: {
            batch_id: batchId
          },
          details: { day, lab_count: count, max_allowed: maxLabs }
        });
      }
    });
  });

  return violated;
}

/**
 * Check minimum subject hours (HARD constraint)
 */
function checkMinimumHours(
  classesBySubject: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;
  
  // This would require fetching batch_subjects data to know required_hours_per_week
  // For now, we'll skip implementation as it requires additional database queries
  // In production, pass batch_subjects data as parameter
  
  return violated;
}

/**
 * Check even distribution of subjects (SOFT constraint)
 */
function checkEvenDistribution(
  classesBySubject: Map<string, ScheduledClass[]>,
  timeSlotMap: Map<string, TimeSlot>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): boolean {
  let violated = false;

  classesBySubject.forEach((classes, subjectId) => {
    const classesByDay = new Map<string, number>();
    
    classes.forEach(cls => {
      const timeSlot = timeSlotMap.get(cls.time_slot_id);
      if (!timeSlot) return;
      
      classesByDay.set(timeSlot.day, (classesByDay.get(timeSlot.day) || 0) + 1);
    });

    // Check if distribution is uneven (more than 2 classes on one day while others have 0)
    const counts = Array.from(classesByDay.values());
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    
    if (maxCount - minCount > 2) {
      violated = true;
      violations.push({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        severity: 'LOW',
        description: `Subject has uneven distribution across days`,
        affected_resources: {
          subject_id: subjectId
        },
        details: { distribution: Object.fromEntries(classesByDay), max: maxCount, min: minCount }
      });
    }
  });

  return violated;
}

/**
 * ✨ NEW: Check faculty availability constraints (HARD constraint)
 * Ensures faculty are not scheduled during unavailable time slots
 */
async function checkFacultyAvailabilityConstraint(
  classesByFaculty: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): Promise<boolean> {
  let violated = false;

  // Get unique faculty IDs
  const facultyIds = Array.from(classesByFaculty.keys());

  // Check availability for each faculty
  for (const facultyId of facultyIds) {
    const classes = classesByFaculty.get(facultyId) || [];
    
    // Get unavailable slots for this faculty
    const unavailableSlots = await getFacultyUnavailableSlots(facultyId);
    
    if (unavailableSlots.length === 0) continue;

    // Check if any class is scheduled in unavailable slot
    classes.forEach(cls => {
      if (unavailableSlots.includes(cls.time_slot_id)) {
        violated = true;
        violations.push({
          rule_name: rule.rule_name,
          rule_type: 'HARD',
          severity: 'CRITICAL',
          description: `Faculty scheduled during unavailable time slot`,
          affected_resources: {
            faculty_id: facultyId,
            time_slot_id: cls.time_slot_id,
            batch_id: cls.batch_id,
            subject_id: cls.subject_id
          },
          details: { 
            class_id: cls.id,
            reason: 'Faculty marked this time slot as unavailable'
          }
        });
      }
    });
  }

  return violated;
}

/**
 * ✨ NEW: Check faculty preference optimization (SOFT constraint)
 * Rewards scheduling classes in preferred slots, penalizes avoid slots
 */
async function checkFacultyPreferenceOptimization(
  classesByFaculty: Map<string, ScheduledClass[]>,
  rule: ConstraintRule,
  violations: ConstraintViolation[]
): Promise<boolean> {
  let violated = false;

  // Get unique faculty IDs
  const facultyIds = Array.from(classesByFaculty.keys());

  // Check preferences for each faculty
  for (const facultyId of facultyIds) {
    const classes = classesByFaculty.get(facultyId) || [];
    
    // Get preferences for this faculty
    const preferences = await getFacultyPreferences(facultyId);
    
    if (preferences.avoid.length === 0 && preferences.preferred.length === 0) continue;

    let avoidCount = 0;
    let preferredCount = 0;

    // Count classes in avoid and preferred slots
    classes.forEach(cls => {
      const isAvoid = preferences.avoid.some(p => p.timeSlotId === cls.time_slot_id);
      const isPreferred = preferences.preferred.some(p => p.timeSlotId === cls.time_slot_id);

      if (isAvoid) {
        avoidCount++;
        violated = true;
        violations.push({
          rule_name: rule.rule_name,
          rule_type: 'SOFT',
          severity: 'MEDIUM',
          description: `Faculty scheduled in time slot marked as "avoid"`,
          affected_resources: {
            faculty_id: facultyId,
            time_slot_id: cls.time_slot_id,
            batch_id: cls.batch_id,
            subject_id: cls.subject_id
          },
          details: { 
            class_id: cls.id,
            reason: 'Faculty prefers to avoid this time slot'
          }
        });
      } else if (isPreferred) {
        preferredCount++;
      }
    });

    // Report summary if faculty has preferences
    if (preferences.preferred.length > 0 || preferences.avoid.length > 0) {
      console.log(`📊 Faculty ${facultyId} preference summary: ${preferredCount} in preferred slots, ${avoidCount} in avoid slots`);
    }
  }

  return violated;
}

/**
 * Calculate fitness score from violations
 */
export function calculateFitnessScore(violations: ConstraintViolation[]): number {
  let score = 100;
  
  violations.forEach(v => {
    switch (v.severity) {
      case 'CRITICAL':
        score -= 20;
        break;
      case 'HIGH':
        score -= 10;
        break;
      case 'MEDIUM':
        score -= 5;
        break;
      case 'LOW':
        score -= 2;
        break;
    }
  });

  return Math.max(0, score);
}
