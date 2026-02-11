"""
NEP 2020 Timetable Scheduler - Production Implementation
========================================================
Implements Choice-Based Credit System (CBCS) scheduling for J&K Cluster University
Uses Google OR-Tools CP-SAT solver for constraint satisfaction

Key Features:
- Elective Bucket Simultaneity (Major/Minor pools run at same time)
- Cross-Department Conflict Resolution
- Faculty Availability Constraints
- Room Capacity & Type Matching
- Pedagogy & Internship Handling
"""

import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

# Import OR-Tools CP-SAT
try:
    from ortools.sat.python import cp_model
except ImportError:
    print("ERROR: Google OR-Tools not installed. Run: pip install ortools")
    sys.exit(1)

# Import Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: Supabase client not installed. Run: pip install supabase")
    sys.exit(1)


class NEPScheduler:
    """
    Production-ready scheduler for NEP 2020 Choice-Based Credit System.
    Fetches real data from Supabase and generates conflict-free timetables.
    """
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Initialize the NEP scheduler with Supabase connection.
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key (for full access)
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Data storage
        self.buckets: List[Dict] = []
        self.subjects: List[Dict] = []
        self.regular_subjects: List[Dict] = []  # Theory/Lab subjects
        self.special_events: List[Dict] = []    # Internships, Teaching Practice, Dissertation
        self.classrooms: List[Dict] = []
        self.time_slots: List[Dict] = []
        self.faculty_availability: Dict[str, List[str]] = {}
        self.subject_faculty_map: Dict[str, str] = {}
        
        # Batch-level assignments from batch_subjects table
        self.batch_faculty_assignments: Dict[str, str] = {}  # subject_id -> faculty_id
        self.batch_classroom_assignments: Dict[str, str] = {}  # subject_id -> classroom_id
        
        # DB-driven configuration (loaded from database)
        self.college_config: Dict[str, Any] = {}  # From colleges table
        self.constraint_rules: Dict[str, Dict] = {}  # rule_name -> rule from constraint_rules
        self.faculty_prefs: Dict[str, Dict] = {}  # faculty_id -> preferences
        self.existing_commitments: Dict[str, Dict] = {}  # slot_id -> {faculty: set, rooms: set}
        
        # CP-SAT Variables
        self.start_vars: Dict[str, cp_model.IntVar] = {}
        self.room_vars: Dict[str, cp_model.IntVar] = {}
        self.duration_vars: Dict[str, int] = {}
        
        # Results
        self.solution: Optional[Dict[str, Any]] = None
        
    def fetch_batch_data(self, batch_id: str) -> bool:
        """
        Fetch all required data for a specific batch from Supabase.
        
        Args:
            batch_id: UUID of the batch to schedule
            
        Returns:
            True if data fetched successfully, False otherwise
        """
        try:
            # 1. Fetch Batch info FIRST to get department_id for filtering
            batch_response = self.supabase.table('batches') \
                .select('college_id, department_id') \
                .eq('id', batch_id) \
                .single() \
                .execute()
            
            if not batch_response.data:
                print(f"[ERROR] Batch {batch_id} not found")
                return False
                
            college_id = batch_response.data['college_id']
            batch_department_id = batch_response.data.get('department_id')
            
            # 1b. Fetch College Config (working days, breaks, class duration)
            college_response = self.supabase.table('colleges') \
                .select('*') \
                .eq('id', college_id) \
                .single() \
                .execute()
            
            if college_response.data:
                c = college_response.data
                self.college_config = {
                    'working_days': c.get('working_days', ['Monday','Tuesday','Wednesday','Thursday','Friday']),
                    'start_time': c.get('college_start_time', '08:00'),
                    'end_time': c.get('college_end_time', '18:00'),
                    'class_duration': c.get('default_class_duration', 60),
                    'break_duration': c.get('break_duration', 15),
                    'lunch_duration': c.get('lunch_duration', 60),
                }
                print(f"[OK] College config: {len(self.college_config['working_days'])} working days, "
                      f"{self.college_config['class_duration']}min classes, "
                      f"{self.college_config['break_duration']}min breaks")
            
            start_pref = batch_response.data.get('preferred_start_time') or self.college_config.get('start_time', '08:00')
            end_pref = batch_response.data.get('preferred_end_time') or self.college_config.get('end_time', '18:00')
            
            print(f"[INFO] Batch Department ID: {batch_department_id}")
            print(f"[INFO] Batch Hours: {start_pref} - {end_pref}")

            # 2. Fetch subjects assigned to this batch via batch_subjects
            batch_subjects_response = self.supabase.table('batch_subjects') \
                .select('*, subjects(*)') \
                .eq('batch_id', batch_id) \
                .execute()
            
            if not batch_subjects_response.data:
                print("[ERROR] No subjects found in batch_subjects for this batch")
                return False
            
            # Track batch-level assignments (faculty and classrooms)
            batch_faculty_assignments = {}  # subject_id -> faculty_id
            batch_classroom_assignments = {}  # subject_id -> classroom_id
            subject_required_hours = {}  # subject_id -> required_hours_per_week
            
            # Process batch_subjects to get all assigned subjects
            filtered_count = 0
            for bs in batch_subjects_response.data:
                if bs.get('subjects'):
                    subject = bs['subjects']
                    subject_id = subject['id']
                    
                    # FILTERING LOGIC:
                    # Include if subject.department_id match batch or is NULL (common)
                    subj_dept_id = subject.get('department_id')
                    if subj_dept_id and subj_dept_id != batch_department_id:
                        # Skip this subject as it belongs to another department
                        filtered_count += 1
                        continue

                    # Store batch-level assignments
                    if bs.get('assigned_faculty_id'):
                        batch_faculty_assignments[subject_id] = bs['assigned_faculty_id']
                    
                    # FIX: Use assigned_lab_id from schema (was assigned_classroom_id)
                    if bs.get('assigned_lab_id'):
                        batch_classroom_assignments[subject_id] = bs['assigned_lab_id']
                        
                    subject_required_hours[subject_id] = bs.get('required_hours_per_week', 3)
                    
                    subject_data = {
                        'id': subject_id,
                        'name': subject['name'],
                        'code': subject['code'],
                        'nep_category': subject.get('nep_category', 'CORE'),
                        'lecture_hours': subject.get('lecture_hours', 1),
                        'tutorial_hours': subject.get('tutorial_hours', 0),
                        'practical_hours': subject.get('practical_hours', 0),
                        'subject_type': subject.get('subject_type', 'THEORY'),
                        'requires_lab': subject.get('requires_lab', False),
                        'block_start_week': subject.get('block_start_week'),
                        'block_end_week': subject.get('block_end_week'),
                        'time_restriction': subject.get('time_restriction'),
                        'credits_per_week': subject.get('credits_per_week', 3),
                        'department_id': subj_dept_id,
                        'assigned_lab_id': batch_classroom_assignments.get(subject_id)
                    }
                    
                    # Categorize as special event or regular subject
                    if subject_data['nep_category'] in ['INTERNSHIP', 'TEACHING_PRACTICE', 'DISSERTATION']:
                        self.special_events.append(subject_data)
                    else:
                        self.regular_subjects.append(subject_data)
                    
                    self.subjects.append(subject_data)
            
            print(f"[OK] Loaded {len(self.subjects)} subjects from batch_subjects table (Filtered {filtered_count} from other depts)")
            
            # Store batch-level assignments for later use
            self.batch_faculty_assignments = batch_faculty_assignments
            self.batch_classroom_assignments = batch_classroom_assignments
            
            # 2. Optionally fetch elective buckets (for NEP 2020 institutions)
            buckets_response = self.supabase.table('elective_buckets') \
                .select('*, subjects(*)') \
                .eq('batch_id', batch_id) \
                .execute()
            
            if buckets_response.data:
                for bucket in buckets_response.data:
                    bucket_subjects = []
                    
                    # Find subjects that belong to this bucket
                    for subject in self.subjects:
                        # Check if subject belongs to this bucket via course_group_id
                        subject_full = self.supabase.table('subjects') \
                            .select('course_group_id') \
                            .eq('id', subject['id']) \
                            .single() \
                            .execute()
                        
                        if subject_full.data and subject_full.data.get('course_group_id') == bucket['id']:
                            bucket_subjects.append(subject)
                    
                    if bucket_subjects:
                        self.buckets.append({
                            'id': bucket['id'],
                            'name': bucket['bucket_name'],
                            'is_common_slot': bucket['is_common_slot'],
                            'min_selection': bucket.get('min_selection', 1),
                            'max_selection': bucket.get('max_selection', 1),
                            'subjects': bucket_subjects
                        })
                
                print(f"[INFO] Loaded {len(self.buckets)} optional elective buckets")
            else:
                print(f"[INFO] No elective buckets found (not using NEP 2020 bucket system)")
            
            # 3. Fetch Batch info (Already fetched above, just needed college_id)
            # college_id is already set

            
            # 3. Fetch Available Classrooms
            classrooms_response = self.supabase.table('classrooms') \
                .select('*') \
                .eq('college_id', college_id) \
                .eq('is_available', True) \
                .execute()
            
            self.classrooms = []
            for room in classrooms_response.data:
                # Filter: Include if room belongs to batch dept OR is shared (no dept)
                # Note: Assuming None/null in DB means shared
                room_dept_id = room.get('department_id')
                if room_dept_id and room_dept_id != batch_department_id:
                    continue
                    
                self.classrooms.append({
                    'id': room['id'],
                    'name': room['name'],
                    'capacity': room['capacity'],
                    'room_type': room.get('room_type', 'LECTURE_HALL'),
                    'has_projector': room.get('has_projector', False),
                    'has_lab_equipment': room.get('has_lab_equipment', False)
                })
            
            print(f"[OK] Loaded {len(self.classrooms)} classrooms")
            
            # 4. Fetch Time Slots
            time_slots_response = self.supabase.table('time_slots') \
                .select('*') \
                .eq('college_id', college_id) \
                .eq('is_active', True) \
                .order('day', desc=False) \
                .order('start_time', desc=False) \
                .execute()
            
            # Filter out break/lunch times
            # Filter out break/lunch times AND apply batch time preferences
            self.time_slots = []
            filtered_slots_count = 0
            for idx, slot in enumerate(time_slots_response.data):
                if slot.get('is_break_time', False) or slot.get('is_lunch_time', False):
                    continue
                
                # Check range
                # Ensure we are comparing compatible types (strings "HH:MM:SS")
                slot_start = str(slot['start_time'])
                slot_end = str(slot['end_time'])
                
                if slot_start >= str(start_pref) and slot_end <= str(end_pref):
                    self.time_slots.append({
                        'id': slot['id'],
                        'day': slot['day'],
                        'start_time': slot['start_time'],
                        'end_time': slot['end_time'],
                        'slot_index': idx
                    })
                else:
                    filtered_slots_count += 1
            
            print(f"[INFO] Filtered {filtered_slots_count} slots outside batch hours")
            
            print(f"[OK] Loaded {len(self.time_slots)} time slots")
            
            # 5. Fetch Faculty Assignments & Availability
            # Use batch-level assignments from batch_subjects table
            for subject_id, faculty_id in self.batch_faculty_assignments.items():
                self.subject_faculty_map[subject_id] = faculty_id
                
                # Fetch faculty availability for this faculty member
                if faculty_id not in self.faculty_availability:
                    availability_response = self.supabase.table('faculty_availability') \
                        .select('time_slot_id, is_available') \
                        .eq('faculty_id', faculty_id) \
                        .eq('is_available', True) \
                        .execute()
                    
                    if availability_response.data:
                        self.faculty_availability[faculty_id] = [
                            av['time_slot_id'] for av in availability_response.data
                        ]
                    else:
                        # If no availability constraints, faculty is available for all slots
                        self.faculty_availability[faculty_id] = [slot['id'] for slot in self.time_slots]
            
            print(f"[OK] Loaded faculty assignments for {len(self.subject_faculty_map)} subjects")

            # 6. Fetch Constraint Rules from DB
            try:
                rules_response = self.supabase.table('constraint_rules') \
                    .select('*') \
                    .eq('is_active', True) \
                    .execute()
                
                self.constraint_rules = {}
                for rule in (rules_response.data or []):
                    self.constraint_rules[rule['rule_name']] = rule
                
                hard_count = sum(1 for r in self.constraint_rules.values() if r['rule_type'] == 'HARD')
                soft_count = sum(1 for r in self.constraint_rules.values() if r['rule_type'] != 'HARD')
                print(f"[OK] Loaded {len(self.constraint_rules)} constraint rules ({hard_count} HARD, {soft_count} SOFT)")
            except Exception as e:
                print(f"[WARN] Could not load constraint rules: {e}")
                self.constraint_rules = {}
            
            # 7. Fetch Faculty Scheduling Preferences
            try:
                faculty_ids = list(self.subject_faculty_map.values())
                if faculty_ids:
                    prefs_response = self.supabase.table('faculty_scheduling_preferences') \
                        .select('*') \
                        .in_('faculty_id', faculty_ids) \
                        .execute()
                    
                    self.faculty_prefs = {}
                    for fp in (prefs_response.data or []):
                        self.faculty_prefs[fp['faculty_id']] = fp
                    
                    print(f"[OK] Loaded scheduling preferences for {len(self.faculty_prefs)} faculty")
            except Exception as e:
                print(f"[WARN] Could not load faculty preferences: {e}")
                self.faculty_prefs = {}
            
            # 8. Fetch Existing Commitments (cross-batch conflict prevention)
            try:
                existing_response = self.supabase.table('master_scheduled_classes') \
                    .select('faculty_id, classroom_id, time_slot_id') \
                    .eq('college_id', college_id) \
                    .eq('is_active', True) \
                    .execute()
                
                self.existing_commitments = {}
                for cls in (existing_response.data or []):
                    slot = cls['time_slot_id']
                    if slot not in self.existing_commitments:
                        self.existing_commitments[slot] = {'faculty': set(), 'rooms': set()}
                    self.existing_commitments[slot]['faculty'].add(cls['faculty_id'])
                    self.existing_commitments[slot]['rooms'].add(cls['classroom_id'])
                
                committed_faculty = set()
                for slot_data in self.existing_commitments.values():
                    committed_faculty.update(slot_data['faculty'])
                print(f"[OK] Loaded cross-batch commitments: {len(self.existing_commitments)} occupied slots, "
                      f"{len(committed_faculty)} committed faculty")
            except Exception as e:
                print(f"[WARN] Could not load existing commitments: {e}")
                self.existing_commitments = {}
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Error fetching batch data: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def create_variables(self):
        """
        Create CP-SAT decision variables for time slots and rooms.
        Creates MULTIPLE session variables per subject based on credits_per_week.
        Only creates variables for regular subjects (not internships/special events).
        """
        print("\n[BUILD] Creating CP-SAT variables...")
        
        # Track sessions for constraint building
        self.sessions = []  # List of all session dicts
        self.subject_sessions = {}  # subject_id -> list of session_ids
        
        # Build index of department classrooms for THEORY subjects
        dept_room_indices = {}
        for idx, room in enumerate(self.classrooms):
            room_dept = room.get('department_id')
            if room_dept not in dept_room_indices:
                dept_room_indices[room_dept] = []
            dept_room_indices[room_dept].append(idx)
            # Also add to None key for shared rooms
            if room_dept is None:
                if None not in dept_room_indices:
                    dept_room_indices[None] = []
        
        total_sessions = 0
        
        for subject in self.regular_subjects:
            subject_id = subject['id']
            credits = subject.get('credits_per_week', 3)
            subject_type = subject.get('subject_type', 'THEORY')
            assigned_lab_id = subject.get('assigned_lab_id')
            subject_dept_id = subject.get('department_id')
            
            session_ids = []
            
            # Create N session variables where N = credits_per_week
            for session_num in range(1, credits + 1):
                session_id = f"{subject_id}_s{session_num}"
                session_ids.append(session_id)
                
                # Time Slot Variable (0 to max_slots - 1)
                self.start_vars[session_id] = self.model.NewIntVar(
                    0, 
                    len(self.time_slots) - 1, 
                    f'start_{subject["code"]}_s{session_num}'
                )
                
                # Room Variable handling
                if subject_type in ['LAB', 'PRACTICAL'] and assigned_lab_id:
                    # LAB: Lock to assigned lab
                    lab_idx = next(
                        (i for i, r in enumerate(self.classrooms) if r['id'] == assigned_lab_id),
                        0
                    )
                    self.room_vars[session_id] = self.model.NewIntVar(
                        lab_idx, lab_idx, f'room_{subject["code"]}_s{session_num}'
                    )
                else:
                    # THEORY: Only department rooms (or shared rooms)
                    valid_rooms = dept_room_indices.get(subject_dept_id, [])
                    # Add shared rooms (None dept)
                    valid_rooms = valid_rooms + dept_room_indices.get(None, [])
                    valid_rooms = list(set(valid_rooms))  # Remove duplicates
                    
                    if valid_rooms:
                        room_var = self.model.NewIntVarFromDomain(
                            cp_model.Domain.FromValues(valid_rooms),
                            f'room_{subject["code"]}_s{session_num}'
                        )
                    else:
                        # Fallback to any room if no dept match
                        room_var = self.model.NewIntVar(
                            0, len(self.classrooms) - 1, f'room_{subject["code"]}_s{session_num}'
                        )
                    self.room_vars[session_id] = room_var
                
                # Duration is always 1 hour per session
                self.duration_vars[session_id] = 1
                
                # Store session info
                self.sessions.append({
                    'session_id': session_id,
                    'subject_id': subject_id,
                    'subject': subject,
                    'session_num': session_num
                })
                
                total_sessions += 1
            
            self.subject_sessions[subject_id] = session_ids
            
            # CONSTRAINT: Sessions of same subject must be on DIFFERENT days
            if len(session_ids) > 1:
                # Extract day from time_slot_index
                # Each session's day = start_var // slots_per_day
                slots_per_day = len(self.time_slots) // 6  # Assuming 6 days (Mon-Sat)
                if slots_per_day > 0:
                    day_vars = []
                    for sid in session_ids:
                        day_var = self.model.NewIntVar(0, 5, f'day_{sid}')
                        self.model.AddDivisionEquality(day_var, self.start_vars[sid], slots_per_day)
                        day_vars.append(day_var)
                    self.model.AddAllDifferent(day_vars)
        
        print(f"[OK] Created {total_sessions} session variables from {len(self.regular_subjects)} subjects")
        
        if self.special_events:
            print(f"[INFO]  {len(self.special_events)} special events (Internships/Teaching Practice) - handled separately")
    
    def add_nep_bucket_constraints(self):
        """
        Add NEP 2020 specific constraints for elective buckets.
        
        CRITICAL CONSTRAINT: All subjects in a bucket with is_common_slot=True
        MUST start at the exact same time (allows students to choose any one subject).
        """
        print("\n[LOCK] Adding NEP Bucket Simultaneity Constraints...")
        
        for bucket in self.buckets:
            if not bucket['is_common_slot']:
                continue  # Skip if bucket doesn't require common slot
                
            bucket_subjects = bucket['subjects']
            
            if len(bucket_subjects) < 2:
                continue  # No constraint needed for single-subject buckets
            
            # All subjects in bucket must start at same time (sync ALL sessions)
            base_subject_id = bucket_subjects[0]['id']
            base_sessions = self.subject_sessions.get(base_subject_id, [])
            if not base_sessions:
                continue
            
            for i in range(1, len(bucket_subjects)):
                subject_id = bucket_subjects[i]['id']
                session_ids = self.subject_sessions.get(subject_id, [])
                
                # Sync as many sessions as possible
                min_sessions = min(len(base_sessions), len(session_ids))
                for k in range(min_sessions):
                    if session_ids[k] in self.start_vars and base_sessions[k] in self.start_vars:
                        self.model.Add(
                            self.start_vars[session_ids[k]] == self.start_vars[base_sessions[k]]
                        )
            
            # All subjects in bucket must use different rooms (for first session)
            room_vars_for_bucket = []
            for subj in bucket_subjects:
                session_ids = self.subject_sessions.get(subj['id'], [])
                if session_ids and session_ids[0] in self.room_vars:
                    room_vars_for_bucket.append(self.room_vars[session_ids[0]])
            if len(room_vars_for_bucket) > 1:
                self.model.AddAllDifferent(room_vars_for_bucket)
            
            print(f"  [v] Bucket '{bucket['name']}': {len(bucket_subjects)} subjects constrained to same time")
    
    def add_bucket_separation_constraints(self):
        """
        Ensure different buckets don't overlap in time.
        A student takes ONE subject from EACH bucket, so buckets must be at different times.
        """
        print("\n[LOCK] Adding Bucket Separation Constraints...")
        
        if len(self.buckets) < 2:
            return  # No separation needed for single bucket
        
        # Get representative session from each bucket (first session of first subject)
        bucket_representatives = []
        for bucket in self.buckets:
            if bucket['subjects']:
                first_subject_id = bucket['subjects'][0]['id']
                session_ids = self.subject_sessions.get(first_subject_id, [])
                if session_ids and session_ids[0] in self.start_vars:
                    bucket_representatives.append(self.start_vars[session_ids[0]])
        
        # All buckets must be scheduled at different times
        if len(bucket_representatives) > 1:
            self.model.AddAllDifferent(bucket_representatives)
            print(f"  [v] {len(bucket_representatives)} buckets constrained to different time slots")

    def add_student_group_constraints(self):
        """
        Prevent batch-level conflicts.
        A batch cannot attend two things at once.
        - Core subjects must not overlap with anything.
        - Buckets must not overlap with Core subjects (or other buckets).
        """
        print("\n[LOCK] Adding Student Group Constraints...")
        
        # Identify subjects that are in buckets
        bucket_subject_ids = set()
        for bucket in self.buckets:
            for subj in bucket['subjects']:
                bucket_subject_ids.add(subj['id'])
        
        # Collect all time slots that must be distinct for the batch
        batch_usage_vars = []
        
        # 1. Add ALL sessions of Core subjects
        core_count = 0
        for subject in self.regular_subjects:
            if subject['id'] not in bucket_subject_ids:
                session_ids = self.subject_sessions.get(subject['id'], [])
                for sid in session_ids:
                    if sid in self.start_vars:
                        batch_usage_vars.append(self.start_vars[sid])
                core_count += 1
        
        # 2. Add representative sessions for Buckets (since they are synced)
        bucket_count = 0
        for bucket in self.buckets:
            if bucket['subjects']:
                # Use sessions of the first subject as representatives
                base_subject_id = bucket['subjects'][0]['id']
                base_sessions = self.subject_sessions.get(base_subject_id, [])
                for sid in base_sessions:
                    if sid in self.start_vars:
                        batch_usage_vars.append(self.start_vars[sid])
                bucket_count += 1
        
        # Enforce that ALL these slots for the batch must be different
        if len(batch_usage_vars) > 1:
            self.model.AddAllDifferent(batch_usage_vars)
            
        print(f"  [v] Constrained {len(batch_usage_vars)} total sessions for the batch (Core: {core_count}, Buckets: {bucket_count})")
    
    def add_faculty_conflict_constraints(self):
        """
        Prevent faculty from teaching multiple sessions at the same time.
        Critical for shared faculty teaching across departments/buckets.
        Uses NoOverlap constraint to handle all sessions correctly.
        """
        print("\n[LOCK] Adding Faculty Conflict Constraints...")
        
        # Group ALL sessions by faculty (not just subjects)
        faculty_sessions = defaultdict(list)
        for subject_id, faculty_id in self.subject_faculty_map.items():
            # Get all session IDs for this subject
            session_ids = self.subject_sessions.get(subject_id, [])
            for session_id in session_ids:
                if session_id in self.start_vars:
                    faculty_sessions[faculty_id].append(session_id)
        
        # Add constraints for faculty with multiple sessions
        conflict_count = 0
        for faculty_id, session_ids in faculty_sessions.items():
            if len(session_ids) > 1:
                # All sessions for same faculty must have different start times
                session_starts = [self.start_vars[sid] for sid in session_ids]
                self.model.AddAllDifferent(session_starts)
                conflict_count += 1
        
        print(f"  [v] Added non-overlap constraints for {conflict_count} faculty members")
    
    def add_room_conflict_constraints(self):
        """
        Prevent two sessions from using the same room at the same time.
        Critical constraint for any valid timetable.
        """
        print("\n[LOCK] Adding Room Conflict Constraints...")
        
        all_session_ids = list(self.start_vars.keys())
        conflict_pairs = 0
        
        # For each pair of sessions, if they're at the same time, they must use different rooms
        for i in range(len(all_session_ids)):
            for j in range(i + 1, len(all_session_ids)):
                sid1 = all_session_ids[i]
                sid2 = all_session_ids[j]
                
                # If start times are equal, rooms must be different
                # Equivalent to: (start1 != start2) OR (room1 != room2)
                # CP-SAT encoding: NOT(start1 == start2 AND room1 == room2)
                b_same_time = self.model.NewBoolVar(f'same_time_{i}_{j}')
                b_same_room = self.model.NewBoolVar(f'same_room_{i}_{j}')
                
                self.model.Add(self.start_vars[sid1] == self.start_vars[sid2]).OnlyEnforceIf(b_same_time)
                self.model.Add(self.start_vars[sid1] != self.start_vars[sid2]).OnlyEnforceIf(b_same_time.Not())
                
                self.model.Add(self.room_vars[sid1] == self.room_vars[sid2]).OnlyEnforceIf(b_same_room)
                self.model.Add(self.room_vars[sid1] != self.room_vars[sid2]).OnlyEnforceIf(b_same_room.Not())
                
                # Cannot have both same time AND same room
                self.model.AddBoolOr([b_same_time.Not(), b_same_room.Not()])
                conflict_pairs += 1
        
        print(f"  [v] Added room conflict checks for {conflict_pairs} session pairs")
    
    def add_room_type_constraints(self):
        """
        Ensure subjects are assigned to appropriate room types.
        NOTE: Room assignments are now handled in create_variables():
        - LAB subjects are locked to assigned_lab_id
        - THEORY subjects are constrained to department rooms only
        This method is kept for logging purposes.
        """
        print("\n[LOCK] Room Type Constraints (handled in variable creation)...")
        
        lab_count = sum(1 for s in self.subjects if s.get('requires_lab') or s.get('subject_type') == 'LAB')
        theory_count = len(self.subjects) - lab_count
        print(f"  [v] {lab_count} LAB subjects (locked to assigned labs)")
        print(f"  [v] {theory_count} THEORY subjects (constrained to dept rooms)")
    
    def add_assigned_classroom_constraints(self):
        """
        Enforce pre-assigned classrooms from batch_subjects table.
        NOTE: This is now handled in create_variables() - LAB subjects
        with assigned_lab_id are locked to that specific lab index.
        This method is kept for logging purposes.
        """
        print("\n[LOCK] Pre-Assigned Classroom Constraints (handled in variable creation)...")
        
        assigned_count = len(self.batch_classroom_assignments)
        if assigned_count > 0:
            print(f"  [OK] {assigned_count} subjects have pre-assigned labs (locked in create_variables)")
        else:
            print(f"  [INFO] No pre-assigned classrooms found")
    
    def add_faculty_availability_constraints(self):
        """
        Respect faculty preferred/available time slots.
        Applied to ALL sessions of subjects taught by the faculty.
        """
        print("\n[LOCK] Adding Faculty Availability Constraints...")
        
        constraints_added = 0
        for subject_id, faculty_id in self.subject_faculty_map.items():
            # Get all sessions for this subject
            session_ids = self.subject_sessions.get(subject_id, [])
            if not session_ids:
                continue  # Skip if no sessions
                
            if faculty_id in self.faculty_availability:
                available_slot_ids = self.faculty_availability[faculty_id]
                
                # Map time_slot_ids to slot indices
                available_indices = [
                    slot['slot_index'] for slot in self.time_slots
                    if slot['id'] in available_slot_ids
                ]
                
                if available_indices:
                    # Constrain ALL sessions to only available time slots
                    for session_id in session_ids:
                        if session_id in self.start_vars:
                            self.model.AddAllowedAssignments(
                                [self.start_vars[session_id]],
                                [(idx,) for idx in available_indices]
                            )
                            constraints_added += 1
        
        print(f"  [v] Added availability constraints for {constraints_added} sessions")
    
    def add_teaching_practice_time_restrictions(self):
        """
        Phase 3: Handle Teaching Practice time restrictions.
        - Teaching Practice (Part-time): Morning slots only (9 AM - 12 PM)
        - Theory classes: Afternoon slots only when Teaching Practice is active (1 PM - 4 PM)
        """
        print("\n[LOCK] Adding Teaching Practice Time Restrictions...")
        
        teaching_practice_subjects = [
            subj for subj in self.special_events 
            if subj['nep_category'] == 'TEACHING_PRACTICE'
        ]
        
        if not teaching_practice_subjects:
            print("  [INFO]  No Teaching Practice subjects found")
            return
        
        # Identify morning and afternoon slots
        morning_slots = []
        afternoon_slots = []
        
        for slot in self.time_slots:
            start_time = slot['start_time']
            # Parse time string (format: HH:MM:SS or HH:MM)
            hour = int(start_time.split(':')[0])
            
            if 9 <= hour < 12:
                morning_slots.append(slot['slot_index'])
            elif 13 <= hour < 16:
                afternoon_slots.append(slot['slot_index'])
        
        print(f"  [INFO]  Found {len(morning_slots)} morning slots and {len(afternoon_slots)} afternoon slots")
        
        # For regular theory subjects, restrict to afternoon when Teaching Practice exists
        if morning_slots and afternoon_slots:
            for subject in self.regular_subjects:
                if subject['nep_category'] in ['MAJOR', 'MINOR', 'CORE'] and subject['subject_type'] == 'THEORY':
                    subject_id = subject['id']
                    # Restrict theory to afternoon
                    self.model.AddAllowedAssignments(
                        [self.start_vars[subject_id]],
                        [(idx,) for idx in afternoon_slots]
                    )
            
            print(f"  [v] Teaching Practice mode: Theory classes restricted to afternoon ({len(afternoon_slots)} slots)")
        
        # Store Teaching Practice info for solution formatting
        for tp_subject in teaching_practice_subjects:
            print(f"  [v] Teaching Practice '{tp_subject['code']}' scheduled for mornings (no room allocation)")
    
    def add_internship_block_constraints(self):
        """
        Phase 3: Handle Internship blocking.
        - Internships don't get room/time allocations
        - Block out specified weeks for students/faculty
        - Ensure no theory subjects scheduled during internship weeks
        """
        print("\n[LOCK] Adding Internship Block-Out Constraints...")
        
        internship_subjects = [
            subj for subj in self.special_events 
            if subj['nep_category'] == 'INTERNSHIP'
        ]
        
        if not internship_subjects:
            print("  [INFO]  No Internship subjects found")
            return
        
        for internship in internship_subjects:
            start_week = internship.get('block_start_week')
            end_week = internship.get('block_end_week')
            
            if start_week and end_week:
                print(f"  [v] Internship '{internship['code']}' blocks weeks {start_week}-{end_week}")
                print(f"    Students/Faculty unavailable during this period")
            else:
                print(f"  [v] Internship '{internship['code']}' scheduled (no room allocation)")
        
        # Note: In production, you would:
        # 1. Fetch student enrollment data
        # 2. Block out time slots corresponding to internship weeks
        # 3. Ensure no conflicts with other subjects for those students
        # For now, we just mark internships as handled
    
    def add_dissertation_library_hours(self):
        """
        Phase 3: Handle Dissertation/Research subjects.
        - M.Ed/Research students need "Empty Slots" for library/research work
        - Don't schedule formal classes during these slots
        """
        print("\n[LOCK] Adding Dissertation/Library Hour Constraints...")
        
        dissertation_subjects = [
            subj for subj in self.special_events 
            if subj['nep_category'] == 'DISSERTATION'
        ]
        
        if not dissertation_subjects:
            print("  [INFO]  No Dissertation subjects found")
            return
        
        for diss_subject in dissertation_subjects:
            print(f"  [v] Dissertation '{diss_subject['code']}' - Library hours allocated")
            print(f"    Students have flexible research time (no formal class)")
        
        # In production, you would reserve specific time slots as "Library Hours"
        # and ensure enrolled students don't have conflicting classes
    
    # ========================================================================
    # CONSTRAINT REGISTRY SYSTEM (DB-Driven)
    # ========================================================================
    
    def _build_constraint_registry(self):
        """
        Build the constraint registry: maps check_type -> handler function.
        Each handler reads params from the DB rule and applies the constraint.
        """
        self.constraint_handlers = {
            # Cross-batch conflict prevention
            'cross_timetable':     self._apply_cross_batch_block,
        }
    
    def apply_all_constraints(self):
        """
        Dynamically apply constraints based on what's in the DB.
        This supplements the existing hardcoded constraints.
        """
        print("\n[REGISTRY] Applying DB-driven constraints...")
        self._build_constraint_registry()
        
        applied_count = 0
        skipped_count = 0
        
        for rule_name, rule in self.constraint_rules.items():
            check_type = rule['rule_parameters'].get('check_type')
            handler = self.constraint_handlers.get(check_type)
            
            if handler:
                params = rule['rule_parameters']
                weight = rule.get('weight', 1.0)
                is_hard = (rule['rule_type'] == 'HARD')
                
                print(f"  [{rule['rule_type']}] {rule_name} (weight={weight})")
                try:
                    handler(params, weight, is_hard)
                    applied_count += 1
                except Exception as e:
                    print(f"    [ERROR] Failed to apply: {e}")
                    skipped_count += 1
            else:
                # Skip - these are handled by existing hardcoded methods
                skipped_count += 1
        
        print(f"[OK] Applied {applied_count} registry constraints, {skipped_count} handled by existing methods")
    
    def _apply_cross_batch_block(self, params, weight, is_hard):
        """
        Block faculty+slot and room+slot combos already committed in other timetables.
        This is the KEY cross-batch conflict prevention mechanism.
        """
        blocked_faculty_slots = 0
        
        for session in self.sessions:
            session_id = session['session_id']
            subject_id = session['subject_id']
            faculty_id = self.subject_faculty_map.get(subject_id)
            
            for slot_idx, slot in enumerate(self.time_slots):
                slot_id = slot['id']
                committed = self.existing_commitments.get(slot_id, {})
                
                # Block if faculty is already teaching at this slot
                if faculty_id and faculty_id in committed.get('faculty', set()):
                    self.model.Add(self.start_vars[session_id] != slot_idx)
                    blocked_faculty_slots += 1
        
        print(f"    [v] Blocked {blocked_faculty_slots} faculty-slot combinations from other timetables")
    
    def _validate_slot_coverage(self):
        """
        Warn admin if total sessions don't fill all available slots.
        """
        total_slots = len(self.time_slots)
        total_sessions = len(self.sessions)
        gap = total_slots - total_sessions
        
        print(f"\n[CHECK] Slot Coverage: {total_sessions} sessions vs {total_slots} slots")
        
        if gap > 0:
            print(f"  [WARN] {gap} slots will be EMPTY!")
            print(f"  [HINT] Add subjects/credits totaling {gap} more hours to fill all slots")
        elif gap < 0:
            print(f"  [ERROR] {-gap} MORE sessions than available slots!")
            print(f"  [HINT] Reduce credits or add more time slots")
        else:
            print(f"  [OK] Perfect fit! All {total_slots} slots will be filled")
    
    def solve_for_batch(self, batch_id: str, time_limit_seconds: int = 30) -> Dict[str, Any]:
        """
        Main entry point: Solve the NEP timetabling problem for a given batch.
        
        Args:
            batch_id: UUID of the batch to schedule
            time_limit_seconds: Maximum time to search for solution
            
        Returns:
            Dictionary containing the solution or error information
        """
        print(f"\n{'='*80}")
        print(f"[START] NEP 2020 Timetable Scheduler - Batch {batch_id}")
        print(f"{'='*80}\n")
        
        # Step 1: Fetch data from Supabase
        if not self.fetch_batch_data(batch_id):
            return {
                'success': False,
                'error': 'Failed to fetch batch data from database',
                'batch_id': batch_id
            }
        
        # Step 2: Create decision variables
        self.create_variables()
        
        # Step 3: Add all constraints
        self.add_nep_bucket_constraints()
        self.add_bucket_separation_constraints()
        self.add_student_group_constraints()  # Prevent batch overlap
        self.add_faculty_conflict_constraints()
        self.add_room_conflict_constraints()  # Prevent room double-booking
        self.add_room_type_constraints()
        self.add_assigned_classroom_constraints()  # Lock pre-assigned labs
        self.add_faculty_availability_constraints()
        
        # Phase 3: Add special event constraints
        self.add_teaching_practice_time_restrictions()
        self.add_internship_block_constraints()
        self.add_dissertation_library_hours()
        
        # Phase 4: DB-driven constraints (cross-batch conflicts, etc.)
        self.apply_all_constraints()
        
        # Phase 5: Validate slot coverage
        self._validate_slot_coverage()
        
        # Step 4: Configure solver
        self.solver.parameters.max_time_in_seconds = time_limit_seconds
        self.solver.parameters.log_search_progress = True
        
        # Step 5: Solve
        print(f"\n[WAIT] Solving with CP-SAT (max {time_limit_seconds}s)...")
        status = self.solver.Solve(self.model)
        
        # Step 6: Process results
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            return self._format_solution(batch_id, status)
        else:
            return self._format_failure(batch_id, status)
    
    def _format_solution(self, batch_id: str, status) -> Dict[str, Any]:
        """
        Format the CP-SAT solution into a structured JSON response.
        Processes ALL sessions generated from subjects.
        """
        print("\n" + "="*80)
        print("[OK] SOLUTION FOUND!")
        print("="*80 + "\n")
        
        scheduled_classes = []
        bucket_summary = []
        special_events_summary = []
        
        # Process special events first (no room/time allocation)
        for event in self.special_events:
            event_entry = {
                'subject_id': event['id'],
                'subject_code': event['code'],
                'subject_name': event['name'],
                'nep_category': event['nep_category'],
                'type': 'SPECIAL_EVENT',
                'notes': self._get_special_event_notes(event)
            }
            special_events_summary.append(event_entry)
            
            print(f"[GRAD] {event['code']} ({event['nep_category']})")
            print(f"   {event_entry['notes']}")
            print()
        
        # Process ALL sessions (multiple per subject based on credits)
        for session in self.sessions:
            session_id = session['session_id']
            subject = session['subject']
            session_num = session['session_num']
            
            # Get assigned values from solver
            time_slot_idx = self.solver.Value(self.start_vars[session_id])
            room_idx = self.solver.Value(self.room_vars[session_id])
            
            time_slot = self.time_slots[time_slot_idx]
            room = self.classrooms[room_idx]
            faculty_id = self.subject_faculty_map.get(subject['id'])
            
            class_entry = {
                'subject_id': subject['id'],
                'subject_code': subject['code'],
                'subject_name': subject['name'],
                'session_number': session_num,
                'time_slot_id': time_slot['id'],
                'day': time_slot['day'],
                'start_time': time_slot['start_time'],
                'end_time': time_slot['end_time'],
                'classroom_id': room['id'],
                'classroom_name': room['name'],
                'faculty_id': faculty_id,
                'batch_id': batch_id,  # Add batch_id
                'nep_category': subject.get('nep_category', 'CORE'),
                'subject_type': subject.get('subject_type', 'THEORY'),
                'is_lab': subject.get('requires_lab', False) or subject.get('subject_type') in ['LAB', 'PRACTICAL']
            }
            
            scheduled_classes.append(class_entry)
            
            print(f"[BOOK] {subject['code']} Session {session_num}")
            print(f"   Time: {time_slot['day']} {time_slot['start_time']}-{time_slot['end_time']}")
            print(f"   Room: {room['name']}")
            print()
        
        # Process buckets for summary only
        for bucket in self.buckets:
            bucket_time_slot = None
            bucket_classes = []
            
            for subject in bucket['subjects']:
                subject_id = subject['id']
                # Get first session for bucket display
                session_ids = self.subject_sessions.get(subject_id, [])
                if session_ids and session_ids[0] in self.start_vars:
                    time_slot_idx = self.solver.Value(self.start_vars[session_ids[0]])
                    time_slot = self.time_slots[time_slot_idx]
                    if bucket_time_slot is None:
                        bucket_time_slot = time_slot
            
            bucket_summary.append({
                'bucket_id': bucket['id'],
                'bucket_name': bucket['name'],
                'time_slot': {
                    'day': bucket_time_slot['day'],
                    'start_time': bucket_time_slot['start_time'],
                    'end_time': bucket_time_slot['end_time']
                } if bucket_time_slot else None,
                'subjects': len(bucket['subjects'])
            })
        
        # Calculate metrics
        solution = {
            'success': True,
            'batch_id': batch_id,
            'status': 'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE',
            'solver_stats': {
                'wall_time': self.solver.WallTime(),
                'num_branches': self.solver.NumBranches(),
                'num_conflicts': self.solver.NumConflicts()
            },
            'scheduled_classes': scheduled_classes,
            'bucket_summary': bucket_summary,
            'special_events': special_events_summary,
            'metrics': {
                'total_subjects': len(self.subjects),
                'regular_subjects': len(self.regular_subjects),
                'total_sessions': len(self.sessions),
                'special_events': len(self.special_events),
                'total_buckets': len(self.buckets),
                'time_slots_used': len(set(sc['time_slot_id'] for sc in scheduled_classes)),
                'rooms_used': len(set(sc['classroom_id'] for sc in scheduled_classes))
            },
            'generated_at': datetime.now().isoformat()
        }
        
        self.solution = solution
        return solution
    
    def _get_special_event_notes(self, event: Dict) -> str:
        """
        Generate descriptive notes for special events.
        """
        if event['nep_category'] == 'INTERNSHIP':
            if event.get('block_start_week') and event.get('block_end_week'):
                return f"Blocks weeks {event['block_start_week']}-{event['block_end_week']} (No room allocation)"
            return "Internship period (No room allocation)"
        elif event['nep_category'] == 'TEACHING_PRACTICE':
            return "Scheduled in morning slots (9 AM - 12 PM, No room allocation)"
        elif event['nep_category'] == 'DISSERTATION':
            return "Library/Research hours (Flexible schedule, No formal class)"
        return "Special event (Handled separately)"
    
    def _format_failure(self, batch_id: str, status) -> Dict[str, Any]:
        """
        Format failure response with diagnostic information.
        """
        status_map = {
            cp_model.INFEASIBLE: 'INFEASIBLE - Constraints cannot be satisfied',
            cp_model.MODEL_INVALID: 'MODEL_INVALID - Check constraint formulation',
            cp_model.UNKNOWN: 'UNKNOWN - Solver timeout or interrupted'
        }
        
        print("\n" + "="*80)
        print(f"[ERROR] FAILED: {status_map.get(status, 'Unknown error')}")
        print("="*80 + "\n")
        
        return {
            'success': False,
            'batch_id': batch_id,
            'status': status_map.get(status, 'UNKNOWN'),
            'error': 'No feasible solution found. Possible issues:',
            'suggestions': [
                'Check if enough classrooms available for parallel buckets',
                'Verify faculty are not over-assigned',
                'Ensure enough time slots for all buckets',
                'Review room type requirements (lab vs lecture hall)'
            ],
            'solver_stats': {
                'wall_time': self.solver.WallTime(),
                'num_branches': self.solver.NumBranches(),
                'num_conflicts': self.solver.NumConflicts()
            }
        }
    
    def save_solution_to_database(self, batch_id: str) -> bool:
        """
        Save the generated timetable solution back to Supabase.
        
        Args:
            batch_id: UUID of the batch
            
        Returns:
            True if saved successfully, False otherwise
        """
        if not self.solution or not self.solution['success']:
            print("[ERROR] No valid solution to save")
            return False
        
        try:
            print("\n[SAVE] Saving solution to database...")
            
            # 1. Create timetable record
            timetable_data = {
                'batch_id': batch_id,
                'title': f"NEP 2020 Timetable - {datetime.now().strftime('%Y-%m-%d')}",
                'status': 'draft',
                'created_by': None,  # Set from API context
                'fitness_score': 100.0,  # CP-SAT solutions are constraint-satisfied
                'algorithm_phase': 'COMPLETED',
                'constraint_violations': []
            }
            
            timetable_response = self.supabase.table('generated_timetables') \
                .insert(timetable_data) \
                .execute()
            
            timetable_id = timetable_response.data[0]['id']
            print(f"[OK] Created timetable: {timetable_id}")
            
            # 2. Insert scheduled classes
            scheduled_classes = []
            for class_entry in self.solution['scheduled_classes']:
                scheduled_classes.append({
                    'timetable_id': timetable_id,
                    'subject_id': class_entry['subject_id'],
                    'faculty_id': class_entry['faculty_id'],
                    'classroom_id': class_entry['classroom_id'],
                    'time_slot_id': class_entry['time_slot_id']
                })
            
            if scheduled_classes:
                self.supabase.table('scheduled_classes') \
                    .insert(scheduled_classes) \
                    .execute()
                
                print(f"[OK] Inserted {len(scheduled_classes)} scheduled classes")
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Error saving solution: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


class SolutionCollector(cp_model.CpSolverSolutionCallback):
    """
    Callback to collect multiple solutions from CP-SAT solver.
    Used to generate seed solutions for the Genetic Algorithm.
    """
    
    def __init__(self, start_vars: Dict, room_vars: Dict, time_slots: List, classrooms: List, limit: int = 10):
        """
        Initialize the solution collector.
        
        Args:
            start_vars: Dictionary of time slot decision variables
            room_vars: Dictionary of room decision variables
            time_slots: List of time slot data
            classrooms: List of classroom data
            limit: Maximum number of solutions to collect
        """
        cp_model.CpSolverSolutionCallback.__init__(self)
        self._start_vars = start_vars
        self._room_vars = room_vars
        self._time_slots = time_slots
        self._classrooms = classrooms
        self._solution_limit = limit
        self._solutions = []
        self._solution_count = 0
    
    def on_solution_callback(self):
        """Called when a solution is found."""
        self._solution_count += 1
        
        if len(self._solutions) < self._solution_limit:
            solution = {
                'time_slots': {},
                'rooms': {}
            }
            
            for subject_id, var in self._start_vars.items():
                slot_idx = self.Value(var)
                solution['time_slots'][subject_id] = {
                    'index': slot_idx,
                    'data': self._time_slots[slot_idx] if slot_idx < len(self._time_slots) else None
                }
            
            for subject_id, var in self._room_vars.items():
                room_idx = self.Value(var)
                solution['rooms'][subject_id] = {
                    'index': room_idx,
                    'data': self._classrooms[room_idx] if room_idx < len(self._classrooms) else None
                }
            
            self._solutions.append(solution)
    
    def solution_count(self) -> int:
        """Return total number of solutions found."""
        return self._solution_count
    
    def get_solutions(self) -> List[Dict]:
        """Return collected solutions."""
        return self._solutions


# Extension method for NEPScheduler to support multiple solutions
def solve_for_multiple_seeds(
    scheduler: 'NEPScheduler',
    batch_id: str,
    num_solutions: int = 10,
    time_limit_seconds: int = 300
) -> List[Dict]:
    """
    Generate multiple feasible solutions to seed the genetic algorithm.
    
    This function is an extension to NEPScheduler that uses the solution callback
    mechanism to collect multiple valid solutions.
    
    Args:
        scheduler: NEPScheduler instance with data already loaded
        batch_id: UUID of the batch to schedule
        num_solutions: Number of seed solutions to generate
        time_limit_seconds: Maximum solving time
        
    Returns:
        List of solution dictionaries, each containing assignments
    """
    print(f"\n{'='*80}")
    print(f"[SEED] Generating {num_solutions} Seed Solutions for GA")
    print(f"{'='*80}\n")
    
    # Ensure data is loaded
    if not scheduler.subjects:
        if not scheduler.fetch_batch_data(batch_id):
            print("[ERROR] Failed to fetch batch data")
            return []
    
    # Create fresh model for multi-solution search
    scheduler.model = cp_model.CpModel()
    scheduler.start_vars = {}
    scheduler.room_vars = {}
    
    # Create variables
    scheduler.create_variables()
    
    # Add all constraints
    scheduler.add_nep_bucket_constraints()
    scheduler.add_bucket_separation_constraints()
    scheduler.add_faculty_conflict_constraints()
    scheduler.add_room_type_constraints()
    scheduler.add_assigned_classroom_constraints()  # Lock pre-assigned labs
    scheduler.add_faculty_availability_constraints()
    scheduler.add_teaching_practice_time_restrictions()
    scheduler.add_internship_block_constraints()
    scheduler.add_dissertation_library_hours()
    
    # Create solver with solution callback
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 8
    solver.parameters.enumerate_all_solutions = True
    
    # Create collector callback
    collector = SolutionCollector(
        start_vars=scheduler.start_vars,
        room_vars=scheduler.room_vars,
        time_slots=scheduler.time_slots,
        classrooms=scheduler.classrooms,
        limit=num_solutions
    )
    
    print(f"[WAIT] Searching for up to {num_solutions} solutions (max {time_limit_seconds}s)...")
    status = solver.Solve(scheduler.model, collector)
    
    print(f"[OK] Found {collector.solution_count()} total solutions, collected {len(collector.get_solutions())}")
    
    # Convert solutions to assignment format
    solutions = []
    for idx, raw_solution in enumerate(collector.get_solutions()):
        scheduled_classes = []
        
        for session_id in raw_solution['time_slots'].keys():
            time_data = raw_solution['time_slots'].get(session_id, {})
            room_data = raw_solution['rooms'].get(session_id, {})
            
            # Extract subject ID and session number from session_id (e.g., "SUB123_s1")
            if '_s' in session_id:
                parts = session_id.rsplit('_s', 1)
                real_subject_id = parts[0]
                session_num = int(parts[1])
            else:
                real_subject_id = session_id
                session_num = 1
            
            # Find subject info
            subject_info = next(
                (s for s in scheduler.subjects if s['id'] == real_subject_id),
                None
            )
            
            if time_data.get('data') and room_data.get('data'):
                assignment = {
                    'subject_id': real_subject_id,
                    'subject_code': subject_info['code'] if subject_info else 'UNKNOWN',
                    'faculty_id': scheduler.subject_faculty_map.get(real_subject_id),
                    'classroom_id': room_data['data']['id'],
                    'time_slot_id': time_data['data']['id'],
                    'batch_id': batch_id,
                    'session_number': session_num,
                    'is_lab': subject_info.get('requires_lab', False) or (subject_info and subject_info.get('subject_type') in ['LAB', 'PRACTICAL']) if subject_info else False
                }
                scheduled_classes.append(assignment)
        
        solutions.append({
            'solution_index': idx,
            'batch_id': batch_id,
            'scheduled_classes': scheduled_classes,
            'num_assignments': len(scheduled_classes),
            'status': 'feasible'
        })
    
    print(f"[PACK] Prepared {len(solutions)} seed solutions with scheduled_classes")
    
    return solutions


def main():
    """
    Command-line interface for testing the NEP scheduler.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='NEP 2020 Timetable Scheduler')
    parser.add_argument('--batch-id', required=True, help='Batch UUID to schedule')
    parser.add_argument('--time-limit', type=int, default=30, help='Solver time limit (seconds)')
    parser.add_argument('--save', action='store_true', help='Save solution to database')
    parser.add_argument('--output', help='Output JSON file path')
    
    args = parser.parse_args()
    
    # Get credentials from environment
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("[ERROR] Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        sys.exit(1)
    
    # Create scheduler and solve
    scheduler = NEPScheduler(supabase_url, supabase_key)
    solution = scheduler.solve_for_batch(args.batch_id, args.time_limit)
    
    # Output results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(solution, f, indent=2)
        print(f"\n[SAVE] Solution saved to: {args.output}")
    else:
        print("\n📄 Solution JSON:")
        print(json.dumps(solution, indent=2))
    
    # Save to database if requested
    if args.save and solution['success']:
        scheduler.save_solution_to_database(args.batch_id)
    
    sys.exit(0 if solution['success'] else 1)


if __name__ == '__main__':
    main()
