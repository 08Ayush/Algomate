"""
NEP Scheduler Quick Test
========================
Tests the scheduler with mock data without requiring database setup.

Usage:
    python test_nep_scheduler.py
"""

from ortools.sat.python import cp_model
import json

class MockNEPScheduler:
    """Simplified NEP scheduler for testing without database."""
    
    def __init__(self):
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Mock data from J&K ITEP curriculum
        self.buckets = [
            {
                'id': 'core_1',
                'name': 'Foundation (Core)',
                'is_common_slot': False,
                'subjects': ['Education_Evolution', 'Psychology_of_Learning']
            },
            {
                'id': 'major_pool_1',
                'name': 'Major Discipline Pool',
                'is_common_slot': True,  # All run simultaneously
                'subjects': ['Major_English', 'Major_History', 'Major_Math', 'Major_Science']
            },
            {
                'id': 'aec_pool_1',
                'name': 'Language Enhancement (AEC)',
                'is_common_slot': True,
                'subjects': ['Hindi_AEC', 'Urdu_AEC', 'English_AEC']
            }
        ]
        
        self.rooms = ['Room_A', 'Room_B', 'Room_C', 'Room_D', 'Room_E', 'Lab_1']
        self.time_slots = list(range(5))  # 0-4 representing different time slots
        
        # Faculty assignments (intentional conflict: Dr_Sharma teaches 2 subjects)
        self.faculty_map = {
            'Education_Evolution': 'Dr_Kumar',
            'Psychology_of_Learning': 'Prof_Sharma',
            'Major_English': 'Dr_Patel',
            'Major_History': 'Dr_Sharma',  # Same as Hindi_AEC
            'Major_Math': 'Prof_Singh',
            'Major_Science': 'Dr_Gupta',
            'Hindi_AEC': 'Dr_Sharma',  # Conflict!
            'Urdu_AEC': 'Prof_Khan',
            'English_AEC': 'Dr_Johnson'
        }
        
        self.starts = {}
        self.rooms_vars = {}
    
    def create_variables(self):
        """Create decision variables."""
        all_subjects = []
        for bucket in self.buckets:
            all_subjects.extend(bucket['subjects'])
        
        for subject in all_subjects:
            self.starts[subject] = self.model.NewIntVar(
                0, len(self.time_slots) - 1, f'start_{subject}'
            )
            self.rooms_vars[subject] = self.model.NewIntVar(
                0, len(self.rooms) - 1, f'room_{subject}'
            )
    
    def add_bucket_constraints(self):
        """Add bucket simultaneity and room uniqueness constraints."""
        print("\n🔒 Adding Bucket Constraints...")
        
        for bucket in self.buckets:
            if not bucket['is_common_slot']:
                continue
            
            subjects = bucket['subjects']
            if len(subjects) < 2:
                continue
            
            # All subjects in bucket must start at same time
            base = subjects[0]
            for i in range(1, len(subjects)):
                self.model.Add(self.starts[subjects[i]] == self.starts[base])
            
            # All subjects must use different rooms
            self.model.AddAllDifferent([self.rooms_vars[s] for s in subjects])
            
            print(f"  ✓ {bucket['name']}: {len(subjects)} subjects at same time, different rooms")
    
    def add_bucket_separation(self):
        """Ensure different buckets don't overlap."""
        print("\n🔒 Adding Bucket Separation Constraints...")
        
        if len(self.buckets) < 2:
            return
        
        # Get one representative subject from each bucket
        representatives = [self.starts[bucket['subjects'][0]] for bucket in self.buckets]
        
        # All buckets must be at different times
        self.model.AddAllDifferent(representatives)
        print(f"  ✓ {len(self.buckets)} buckets constrained to different time slots")
    
    def add_faculty_conflicts(self):
        """Prevent faculty from teaching multiple subjects at once."""
        print("\n🔒 Adding Faculty Conflict Constraints...")
        
        from collections import defaultdict
        faculty_subjects = defaultdict(list)
        
        for subject, faculty in self.faculty_map.items():
            faculty_subjects[faculty].append(subject)
        
        for faculty, subjects in faculty_subjects.items():
            if len(subjects) > 1:
                # Faculty's subjects must have different start times
                self.model.AddAllDifferent([self.starts[s] for s in subjects])
                print(f"  ✓ {faculty} teaches {len(subjects)} subjects - no conflicts allowed")
    
    def solve(self):
        """Solve the scheduling problem."""
        print("\n" + "="*70)
        print("🚀 NEP 2020 Mock Scheduler Test")
        print("="*70)
        
        print(f"\n📊 Problem Size:")
        print(f"   - Buckets: {len(self.buckets)}")
        print(f"   - Total Subjects: {sum(len(b['subjects']) for b in self.buckets)}")
        print(f"   - Available Rooms: {len(self.rooms)}")
        print(f"   - Time Slots: {len(self.time_slots)}")
        
        self.create_variables()
        self.add_bucket_constraints()
        self.add_bucket_separation()
        self.add_faculty_conflicts()
        
        print("\n⏳ Solving with CP-SAT...")
        self.solver.parameters.max_time_in_seconds = 10
        
        status = self.solver.Solve(self.model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            self.print_solution()
            return True
        else:
            print("\n❌ No solution found!")
            return False
    
    def print_solution(self):
        """Display the generated timetable."""
        print("\n" + "="*70)
        print("✅ SOLUTION FOUND!")
        print("="*70)
        
        time_slot_names = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '2:00-3:00', '3:00-4:00']
        
        for bucket in self.buckets:
            print(f"\n📚 {bucket['name']}")
            
            # Get the time slot for this bucket
            time_idx = self.solver.Value(self.starts[bucket['subjects'][0]])
            time_name = time_slot_names[time_idx]
            
            print(f"   ⏰ Time: {time_name}")
            print(f"   {'Subject':<25} {'Room':<15} {'Faculty':<20}")
            print(f"   {'-'*60}")
            
            for subject in bucket['subjects']:
                room_idx = self.solver.Value(self.rooms_vars[subject])
                room = self.rooms[room_idx]
                faculty = self.faculty_map[subject]
                
                print(f"   {subject:<25} {room:<15} {faculty:<20}")
        
        print("\n" + "="*70)
        print("📈 Solver Statistics:")
        print(f"   - Wall Time: {self.solver.WallTime():.2f}s")
        print(f"   - Branches: {self.solver.NumBranches()}")
        print(f"   - Conflicts: {self.solver.NumConflicts()}")
        print("="*70)

def main():
    """Run the mock scheduler test."""
    scheduler = MockNEPScheduler()
    success = scheduler.solve()
    
    if success:
        print("\n✅ Test passed! The scheduler is working correctly.")
        print("\nKey observations:")
        print("- Major Pool subjects are at the same time (students choose 1)")
        print("- AEC Pool subjects are at the same time (students choose 1)")
        print("- Dr. Sharma's subjects (History & Hindi) are at different times (no conflict)")
        print("- All subjects have unique rooms when scheduled simultaneously")
        return 0
    else:
        print("\n❌ Test failed!")
        return 1

if __name__ == '__main__':
    import sys
    sys.exit(main())
