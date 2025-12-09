from ortools.sat.python import cp_model
import collections

class NEPTimetableSolver:
    def __init__(self, buckets, rooms, faculty_assignments, time_slots):
        """
        :param buckets: List of dictionaries representing NEP Buckets
                       Example: [{'id': 'major_pool', 'subjects': ['Math', 'History'], 'duration': 1}]
        :param rooms: List of room IDs ['R101', 'R102', 'Lab1']
        :param faculty_assignments: Dict mapping subject -> faculty_id
        :param time_slots: List of available time slot indices [0, 1, ... 8]
        """
        self.buckets = buckets
        self.rooms = rooms
        self.faculty_assignments = faculty_assignments
        self.time_slots = time_slots
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Variables
        self.starts = {} # stores start time var for each subject
        self.room_vars = {} # stores room var for each subject
        
    def create_variables(self):
        """Create Time and Room variables for every subject in every bucket."""
        for bucket in self.buckets:
            for subject in bucket['subjects']:
                # 1. Time Variable (0 to max_slots)
                self.starts[subject] = self.model.NewIntVar(
                    0, len(self.time_slots) - 1, f'start_{subject}'
                )
                
                # 2. Room Variable (Index of room list)
                self.room_vars[subject] = self.model.NewIntVar(
                    0, len(self.rooms) - 1, f'room_{subject}'
                )

    def add_nep_constraints(self):
        """
        The Secret Sauce: Enforcing NEP 2020 Structure.
        """
        
        # --- CONSTRAINT 1: The "Bucket Simultaneity" Rule ---
        # All subjects in the SAME bucket must start at the SAME time.
        # This allows a student to pick *any* one subject from the pool.
        for bucket in self.buckets:
            subjects = bucket['subjects']
            if len(subjects) > 1:
                base_subject = subjects[0]
                for i in range(1, len(subjects)):
                    # Force Start Time of Subject[i] == Start Time of Subject[0]
                    self.model.Add(
                        self.starts[subjects[i]] == self.starts[base_subject]
                    )

        # --- CONSTRAINT 2: No Overlap Between Different Buckets ---
        # A student takes 1 Major + 1 Minor. These buckets cannot happen at the same time.
        # We model this by ensuring the time_slots of different buckets are distinct.
        # (Simplified: Assuming single batch. For multi-batch, filter by batch_id)
        bucket_representatives = []
        for bucket in self.buckets:
            # We only need to check one subject per bucket because of Constraint 1
            bucket_representatives.append(self.starts[bucket['subjects'][0]])
        
        # Ensure all buckets are scheduled at different times
        self.model.AddAllDifferent(bucket_representatives)

        # --- CONSTRAINT 3: Room Conflicts ---
        # Multiple subjects running at the same time MUST have different rooms.
        # We use a NoOverlap constraint approach or simpler AllDifferent for fixed slots.
        
        # Strategy: We iterate through every possible time slot.
        # For a specific time T, if multiple subjects are scheduled, their rooms must be different.
        # (Optimization: In CP-SAT, interval variables are better, but this logic is clearer for prototypes)
        
        for t in self.time_slots:
            # Create a boolean "is_active" for each subject at time t
            active_subjects = []
            active_rooms = []
            
            for subject, start_var in self.starts.items():
                is_present = self.model.NewBoolVar(f'{subject}_at_{t}')
                self.model.Add(start_var == t).OnlyEnforceIf(is_present)
                self.model.Add(start_var != t).OnlyEnforceIf(is_present.Not())
                
                active_subjects.append(is_present)
                active_rooms.append(self.room_vars[subject])
            
            # If strictly one slot duration:
            # We collect all rooms for active subjects and enforce AllDifferent
            # Note: This part requires "Reservoir Constraint" or simpler AllDifferent via Implication
            # For simplicity in this snippet, we assume buckets don't overlap, so we check intra-bucket rooms:
            pass 

        # --- CONSTRAINT 3 (Simpler): Intra-Bucket Room Uniqueness ---
        # Since we forced all subjects in a bucket to be at the same time,
        # their rooms MUST be different just based on the bucket list.
        for bucket in self.buckets:
            subjects = bucket['subjects']
            self.model.AddAllDifferent([self.room_vars[s] for s in subjects])

        # --- CONSTRAINT 4: Faculty Availability ---
        # A faculty member cannot be teaching two subjects at the same time.
        # This handles the "Teacher of Science Pedagogy" also teaching "Physics Major".
        faculty_usage = collections.defaultdict(list)
        for subject, fac_id in self.faculty_assignments.items():
            faculty_usage[fac_id].append(self.starts[subject])
            
        for fac_id, subject_times in faculty_usage.items():
            # If a teacher has multiple subjects, those subjects must have different start times
            self.model.AddAllDifferent(subject_times)

    def solve(self):
        status = self.solver.Solve(self.model)
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            print("✅ NEP Optimized Schedule Found:")
            for bucket in self.buckets:
                time_val = self.solver.Value(self.starts[bucket['subjects'][0]])
                print(f"\n📂 Bucket: {bucket['id']} @ Slot {time_val}")
                for subj in bucket['subjects']:
                    room_idx = self.solver.Value(self.room_vars[subj])
                    print(f"   - {subj}: Room {self.rooms[room_idx]}")
        else:
            print("❌ No solution found. Check constraints.")

# ==========================================
# 🚀 MOCK DATA FROM YOUR J&K PDF
# ==========================================
# [cite_start]Based on "Course Structure ITEP_M.Ed._B.Ed..compressed.pdf" [cite: 406]

# Define the "Buckets" for Semester 1
itep_sem1_buckets = [
    # 1. The Core Course (Everyone attends together)
    {
        'id': 'CORE_FOUNDATION',
        'subjects': ['Education_Evolution'], # 9FDEDUT0101
        'duration': 1
    },
    # 2. The Major Pool (Students choose ONE, so these must be simultaneous)
    {
        'id': 'MAJOR_POOL_SEM1',
        'subjects': ['Major_English', 'Major_History', 'Major_PolSci', 'Major_Geography'], 
        'duration': 1
    },
    # 3. The AEC Pool (Language Choice)
    {
        'id': 'AEC_POOL_SEM1',
        'subjects': ['Hindi_AEC', 'Urdu_AEC'],
        'duration': 1
    }
]

# Rooms available in the college
college_rooms = ['Room_101', 'Room_102', 'Room_103', 'Room_104', 'Lang_Lab_1', 'Lang_Lab_2']

# Faculty Mapping (Notice 'Dr_Sharma' teaches two things to test conflict)
faculty_map = {
    'Education_Evolution': 'Dr_Rakesh',
    'Major_English': 'Prof_Gupta',
    'Major_History': 'Dr_Sharma',       # <--- Busy Teacher
    'Major_PolSci': 'Prof_Khan',
    'Major_Geography': 'Prof_Singh',
    'Hindi_AEC': 'Dr_Sharma',           # <--- Same Teacher (Conflict if scheduled with History)
    'Urdu_AEC': 'Prof_Rizvi'
}

# Run Solver
solver = NEPTimetableSolver(itep_sem1_buckets, college_rooms, faculty_map, list(range(5)))
solver.create_variables()
solver.add_nep_constraints()
solver.solve()