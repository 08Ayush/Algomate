"""Run the full evaluation module and print all metric values."""

import json
from core.models import (
    TimeSlot, Room, Faculty, Subject, Batch,
    Solution, Assignment, ConstraintViolation, ConstraintType,
)
from core.context import SchedulingContext, InstitutionConfig
from evaluation.runner import SchedulerEvaluator

# ── Build test data ─────────────────────────────────────────────────
slots = []
for day in range(5):
    for hour in [9, 10, 11, 14, 15, 16]:
        slots.append(TimeSlot(
            id=f"slot_{day}_{hour}", day=day,
            start_hour=hour, start_minute=0,
            duration_minutes=60, is_lab_slot=False,
        ))

rooms = [
    Room(id="room_101", name="Room 101", capacity=60, room_type="classroom",
         building="Main", floor=1, facilities=["projector", "whiteboard"]),
    Room(id="lab_201", name="Lab 201", capacity=30, room_type="lab",
         building="Tech", floor=2, facilities=["computers", "projector"]),
    Room(id="room_301", name="Room 301", capacity=100, room_type="seminar_hall",
         building="Main", floor=3, facilities=["projector", "audio_system"]),
]

faculty = [
    Faculty(id="fac_001", name="Dr. Smith", department="Computer Science",
            designation="Professor", max_hours_per_week=18, min_hours_per_week=12,
            qualifications=["PhD", "Data Structures", "Algorithms"]),
    Faculty(id="fac_002", name="Prof. Johnson", department="Computer Science",
            designation="Associate Professor", max_hours_per_week=20,
            min_hours_per_week=15, qualifications=["MSc", "Database Systems", "Web Development"]),
    Faculty(id="fac_003", name="Dr. Williams", department="Mathematics",
            designation="Assistant Professor", max_hours_per_week=16,
            min_hours_per_week=10, qualifications=["PhD", "Linear Algebra"]),
]

subjects = [
    Subject(id="sub_ds", name="Data Structures", code="CS201", credits=4,
            hours_per_week=4, is_lab=False, required_qualifications=["Data Structures"]),
    Subject(id="sub_ds_lab", name="DS Lab", code="CS201L", credits=2,
            hours_per_week=2, is_lab=True, required_qualifications=["Data Structures"]),
    Subject(id="sub_web", name="Web Development", code="CS301", credits=3,
            hours_per_week=3, is_lab=False, required_qualifications=["Web Development"]),
    Subject(id="sub_math", name="Linear Algebra", code="MA201", credits=3,
            hours_per_week=3, is_lab=False, is_elective=True,
            required_qualifications=["Linear Algebra"]),
]

batches = [
    Batch(id="batch_cse_3a", name="CSE 3A", department="Computer Science",
          semester=3, strength=60, program="B.Tech", year=2,
          subjects=["sub_ds", "sub_ds_lab", "sub_web", "sub_math"]),
    Batch(id="batch_cse_3b", name="CSE 3B", department="Computer Science",
          semester=3, strength=55, program="B.Tech", year=2,
          subjects=["sub_ds", "sub_ds_lab"]),
]

config = InstitutionConfig(
    id="test", name="Test Institution",
    working_days=6, slots_per_day=8,
    slot_duration=60, lunch_break_start=13, lunch_break_duration=60,
)

ctx = SchedulingContext(
    institution=config, time_slots=slots, rooms=rooms,
    faculty=faculty, batches=batches, subjects=subjects,
)

# ── Build a realistic solution ──────────────────────────────────────
assignments = [
    # DS theory (4 hours) - Mon 9,10,11 + Tue 9
    Assignment(id="a0", batch_id="batch_cse_3a", subject_id="sub_ds",
               faculty_id="fac_001", room_id="room_101", time_slot=slots[0], is_lab_session=False),
    Assignment(id="a1", batch_id="batch_cse_3a", subject_id="sub_ds",
               faculty_id="fac_001", room_id="room_101", time_slot=slots[1], is_lab_session=False),
    Assignment(id="a2", batch_id="batch_cse_3a", subject_id="sub_ds",
               faculty_id="fac_001", room_id="room_101", time_slot=slots[2], is_lab_session=False),
    Assignment(id="a3", batch_id="batch_cse_3a", subject_id="sub_ds",
               faculty_id="fac_001", room_id="room_101", time_slot=slots[6], is_lab_session=False),
    # DS Lab (2 hours) - Tue 10,11
    Assignment(id="a4", batch_id="batch_cse_3a", subject_id="sub_ds_lab",
               faculty_id="fac_001", room_id="lab_201", time_slot=slots[7], is_lab_session=True),
    Assignment(id="a5", batch_id="batch_cse_3a", subject_id="sub_ds_lab",
               faculty_id="fac_001", room_id="lab_201", time_slot=slots[8], is_lab_session=True),
    # Web Dev (3 hours) - Wed 9,10,11
    Assignment(id="a6", batch_id="batch_cse_3a", subject_id="sub_web",
               faculty_id="fac_002", room_id="room_101", time_slot=slots[12], is_lab_session=False),
    Assignment(id="a7", batch_id="batch_cse_3a", subject_id="sub_web",
               faculty_id="fac_002", room_id="room_101", time_slot=slots[13], is_lab_session=False),
    Assignment(id="a8", batch_id="batch_cse_3a", subject_id="sub_web",
               faculty_id="fac_002", room_id="room_101", time_slot=slots[14], is_lab_session=False),
    # Linear Algebra (3 hours) - Thu 9,10 + Fri 9
    Assignment(id="a9", batch_id="batch_cse_3a", subject_id="sub_math",
               faculty_id="fac_003", room_id="room_301", time_slot=slots[18], is_lab_session=False),
    Assignment(id="a10", batch_id="batch_cse_3a", subject_id="sub_math",
               faculty_id="fac_003", room_id="room_301", time_slot=slots[19], is_lab_session=False),
    Assignment(id="a11", batch_id="batch_cse_3a", subject_id="sub_math",
               faculty_id="fac_003", room_id="room_301", time_slot=slots[24], is_lab_session=False),
]

# Add a soft violation to make it realistic
violations = [
    ConstraintViolation(
        constraint_type=ConstraintType.FACULTY_PREFERENCE,
        severity=0.3,
        description="Dr. Smith assigned to non-preferred afternoon slot",
        affected_assignments=["a3"],
    ),
]

sol = Solution(
    id="eval_solution_001",
    assignments=assignments,
    quality_score=0.82,
    constraint_violations=violations,
    solver_name="hybrid_ga_cpsat",
    predicted_quality=0.80,
    quality_confidence=0.75,
    execution_time=4.5,
)

import sys

# ── Run evaluation ──────────────────────────────────────────────────
evaluator = SchedulerEvaluator(ctx)
report = evaluator.evaluate(sol)

# Write all output to file since terminal may buffer
with open("eval_results_output.txt", "w") as f:
    old_stdout = sys.stdout
    sys.stdout = f
    report.print_summary()
    print("\n\n=== FULL METRICS (JSON) ===")
    print(json.dumps(report.to_dict(), indent=2, default=str))
    sys.stdout = old_stdout

print("Results written to eval_results_output.txt")
