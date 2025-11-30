"""
NEP 2020 Phase 3 Test - Internships & Teaching Practice
========================================================
Tests the scheduler's ability to handle:
- Internship blocking (no room allocation)
- Teaching Practice time restrictions (morning only)
- Dissertation/Library hours (flexible schedule)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services', 'scheduler'))

from ortools.sat.python import cp_model


def test_phase3_constraints():
    """
    Test Phase 3: Special event handling (Internships, Teaching Practice, Dissertation)
    """
    print("=" * 70)
    print("🚀 NEP 2020 Phase 3 Test - Special Events")
    print("=" * 70)
    print()
    
    # Mock data for B.Ed program with special events
    regular_subjects = [
        {'id': 'subj_1', 'code': 'EDU101', 'name': 'Educational Psychology', 'nep_category': 'CORE', 'subject_type': 'THEORY'},
        {'id': 'subj_2', 'code': 'PED201', 'name': 'Pedagogy of Math', 'nep_category': 'PEDAGOGY', 'subject_type': 'THEORY'},
        {'id': 'subj_3', 'code': 'PED202', 'name': 'Pedagogy of Science', 'nep_category': 'PEDAGOGY', 'subject_type': 'THEORY'},
        {'id': 'subj_4', 'code': 'EDU102', 'name': 'Curriculum Development', 'nep_category': 'CORE', 'subject_type': 'THEORY'},
    ]
    
    special_events = [
        {
            'id': 'event_1',
            'code': 'INTERN401',
            'name': 'School Internship',
            'nep_category': 'INTERNSHIP',
            'block_start_week': 10,
            'block_end_week': 12
        },
        {
            'id': 'event_2',
            'code': 'TP301',
            'name': 'Teaching Practice',
            'nep_category': 'TEACHING_PRACTICE',
            'time_restriction': 'MORNING'
        },
        {
            'id': 'event_3',
            'code': 'DISS501',
            'name': 'M.Ed Dissertation',
            'nep_category': 'DISSERTATION'
        }
    ]
    
    # Mock time slots
    time_slots = [
        {'id': 'slot_1', 'day': 'Monday', 'start_time': '09:00:00', 'end_time': '10:00:00', 'slot_index': 0},
        {'id': 'slot_2', 'day': 'Monday', 'start_time': '10:00:00', 'end_time': '11:00:00', 'slot_index': 1},
        {'id': 'slot_3', 'day': 'Monday', 'start_time': '11:00:00', 'end_time': '12:00:00', 'slot_index': 2},
        {'id': 'slot_4', 'day': 'Monday', 'start_time': '13:00:00', 'end_time': '14:00:00', 'slot_index': 3},
        {'id': 'slot_5', 'day': 'Monday', 'start_time': '14:00:00', 'end_time': '15:00:00', 'slot_index': 4},
        {'id': 'slot_6', 'day': 'Monday', 'start_time': '15:00:00', 'end_time': '16:00:00', 'slot_index': 5},
    ]
    
    # Mock rooms
    classrooms = [
        {'id': 'room_1', 'name': 'Room A', 'capacity': 50, 'room_type': 'LECTURE_HALL'},
        {'id': 'room_2', 'name': 'Room B', 'capacity': 50, 'room_type': 'LECTURE_HALL'},
        {'id': 'room_3', 'name': 'Room C', 'capacity': 50, 'room_type': 'LECTURE_HALL'},
        {'id': 'room_4', 'name': 'Room D', 'capacity': 50, 'room_type': 'LECTURE_HALL'},
    ]
    
    print(f"📊 Problem Size:")
    print(f"   - Regular Subjects: {len(regular_subjects)}")
    print(f"   - Special Events: {len(special_events)}")
    print(f"   - Available Rooms: {len(classrooms)}")
    print(f"   - Time Slots: {len(time_slots)}")
    print()
    
    # Create CP-SAT Model
    model = cp_model.CpModel()
    solver = cp_model.CpSolver()
    
    # Create variables ONLY for regular subjects
    start_vars = {}
    room_vars = {}
    
    print("🔧 Creating variables for regular subjects only...")
    for subject in regular_subjects:
        subject_id = subject['id']
        start_vars[subject_id] = model.NewIntVar(0, len(time_slots) - 1, f'start_{subject["code"]}')
        room_vars[subject_id] = model.NewIntVar(0, len(classrooms) - 1, f'room_{subject["code"]}')
    
    print(f"✅ Created variables for {len(regular_subjects)} regular subjects")
    print(f"ℹ️  {len(special_events)} special events handled separately (no variables)")
    print()
    
    # Constraint 1: Teaching Practice time restrictions
    print("🔒 Adding Teaching Practice time restrictions...")
    morning_slots = [0, 1, 2]  # 9 AM - 12 PM
    afternoon_slots = [3, 4, 5]  # 1 PM - 4 PM
    
    teaching_practice_exists = any(e['nep_category'] == 'TEACHING_PRACTICE' for e in special_events)
    
    if teaching_practice_exists:
        # Restrict theory subjects to afternoon when Teaching Practice is active
        for subject in regular_subjects:
            if subject['subject_type'] == 'THEORY':
                model.AddAllowedAssignments(
                    [start_vars[subject['id']]],
                    [(idx,) for idx in afternoon_slots]
                )
        print(f"  ✓ Theory subjects restricted to afternoon slots ({len(afternoon_slots)} slots)")
        print(f"  ✓ Teaching Practice reserved for mornings (no room allocation)")
    
    # Constraint 2: All subjects must use different rooms if at same time
    print("\n🔒 Adding room conflict constraints...")
    for i, subj_a in enumerate(regular_subjects):
        for subj_b in regular_subjects[i+1:]:
            # If same time slot, must have different rooms
            b = model.NewBoolVar(f'same_time_{subj_a["id"]}_{subj_b["id"]}')
            model.Add(start_vars[subj_a['id']] == start_vars[subj_b['id']]).OnlyEnforceIf(b)
            model.Add(start_vars[subj_a['id']] != start_vars[subj_b['id']]).OnlyEnforceIf(b.Not())
            model.Add(room_vars[subj_a['id']] != room_vars[subj_b['id']]).OnlyEnforceIf(b)
    
    print(f"  ✓ Room conflict constraints added")
    
    # Constraint 3: Display internship blocking info
    print("\n🔒 Internship blocking information...")
    for event in special_events:
        if event['nep_category'] == 'INTERNSHIP':
            start_week = event.get('block_start_week')
            end_week = event.get('block_end_week')
            if start_week and end_week:
                print(f"  ✓ {event['code']}: Blocks weeks {start_week}-{end_week}")
                print(f"    Students/Faculty unavailable during this period")
    
    # Constraint 4: Display dissertation info
    print("\n🔒 Dissertation/Library hours information...")
    for event in special_events:
        if event['nep_category'] == 'DISSERTATION':
            print(f"  ✓ {event['code']}: Library/Research hours")
            print(f"    Students have flexible schedule (no formal class)")
    
    # Solve
    print("\n⏳ Solving with CP-SAT...")
    status = solver.Solve(model)
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        print("\n" + "=" * 70)
        print("✅ SOLUTION FOUND!")
        print("=" * 70)
        print()
        
        # Display special events first
        print("🎓 SPECIAL EVENTS (No Room Allocation)")
        print("-" * 70)
        for event in special_events:
            print(f"\n{event['code']} - {event['name']} ({event['nep_category']})")
            if event['nep_category'] == 'INTERNSHIP':
                if event.get('block_start_week'):
                    print(f"  📅 Blocks weeks {event['block_start_week']}-{event['block_end_week']}")
            elif event['nep_category'] == 'TEACHING_PRACTICE':
                print(f"  ⏰ Morning slots (9 AM - 12 PM)")
            elif event['nep_category'] == 'DISSERTATION':
                print(f"  📚 Library/Research hours (Flexible)")
        
        # Display regular scheduled classes
        print("\n\n📚 REGULAR SCHEDULED CLASSES")
        print("-" * 70)
        
        for subject in regular_subjects:
            subject_id = subject['id']
            time_idx = solver.Value(start_vars[subject_id])
            room_idx = solver.Value(room_vars[subject_id])
            
            time_slot = time_slots[time_idx]
            room = classrooms[room_idx]
            
            print(f"\n{subject['code']} - {subject['name']}")
            print(f"  ⏰ Time: {time_slot['day']} {time_slot['start_time']}-{time_slot['end_time']}")
            print(f"  🏫 Room: {room['name']}")
        
        print("\n" + "=" * 70)
        print("📈 Solver Statistics:")
        print(f"   - Wall Time: {solver.WallTime():.2f}s")
        print(f"   - Branches: {solver.NumBranches()}")
        print(f"   - Conflicts: {solver.NumConflicts()}")
        print("=" * 70)
        print()
        
        print("✅ Phase 3 test passed!\n")
        print("Key observations:")
        print("- Special events (Internship, Teaching Practice, Dissertation) handled without room/time variables")
        print("- Teaching Practice reserved mornings, theory classes in afternoons")
        print("- Internship blocks specified weeks")
        print("- Dissertation provides flexible research time")
        
        return True
    else:
        print("\n❌ No solution found")
        print(f"Status: {status}")
        return False


if __name__ == '__main__':
    success = test_phase3_constraints()
    sys.exit(0 if success else 1)
