/**
 * TypeScript interfaces for NEP 2020 Scheduler
 */

export type NEPCategory = 
  | 'MAJOR' 
  | 'MINOR' 
  | 'MULTIDISCIPLINARY' 
  | 'AEC' 
  | 'VAC' 
  | 'CORE' 
  | 'PEDAGOGY' 
  | 'INTERNSHIP';

export interface NEPSubject {
  id: string;
  code: string;
  name: string;
  nep_category: NEPCategory;
  lecture_hours: number;
  tutorial_hours: number;
  practical_hours: number;
  credit_value: number;
  subject_type: 'THEORY' | 'LAB' | 'PRACTICAL' | 'TUTORIAL';
  requires_lab: boolean;
  course_group_id?: string;
}

export interface ElectiveBucket {
  id: string;
  batch_id: string;
  bucket_name: string;
  min_selection: number;
  max_selection: number;
  is_common_slot: boolean;
  subjects?: NEPSubject[];
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  slot_index?: number;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  room_type?: string;
  has_projector: boolean;
  has_lab_equipment: boolean;
}

export interface ScheduledClass {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  time_slot_id: string;
  day: string;
  start_time: string;
  end_time: string;
  classroom_id: string;
  classroom_name: string;
  faculty_id?: string;
  nep_category: NEPCategory;
}

export interface BucketSummary {
  bucket_id: string;
  bucket_name: string;
  time_slot: {
    day: string;
    start_time: string;
    end_time: string;
  } | null;
  subjects: number;
}

export interface NEPSchedulerSolution {
  success: boolean;
  batch_id: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';
  solver_stats?: {
    wall_time: number;
    num_branches: number;
    num_conflicts: number;
  };
  scheduled_classes?: ScheduledClass[];
  bucket_summary?: BucketSummary[];
  metrics?: {
    total_subjects: number;
    total_buckets: number;
    time_slots_used: number;
    rooms_used: number;
  };
  generated_at?: string;
  error?: string;
  suggestions?: string[];
}

export interface NEPSchedulerRequest {
  batch_id: string;
  time_limit?: number;
  save_to_db?: boolean;
}

export interface StudentCourseSelection {
  id: string;
  student_id: string;
  subject_id: string;
  semester: number;
  academic_year: string;
  enrolled_at: string;
}
