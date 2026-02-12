"""Compare GA-generated schedule evaluation: BEFORE vs AFTER improvements.

Runs the GA solver on realistic test data and evaluates the output
through the full evaluation pipeline, writing results for comparison.
"""

import json
import sys
import time
from core.models import (
    TimeSlot, Room, Faculty, Subject, Batch,
    Solution, Assignment, ConstraintViolation, ConstraintType,
)
from core.context import SchedulingContext, InstitutionConfig
from evaluation.runner import SchedulerEvaluator
from solvers.genetic_algorithm import GeneticAlgorithmSolver, GAConfig


# ── Build realistic test data ───────────────────────────────────────
slots = []
for day in range(5):
    for hour in [9, 10, 11, 14, 15, 16]:
        slots.append(TimeSlot(
            id=f"slot_{day}_{hour}", day=day,
            start_hour=hour, start_minute=0,
            duration_minutes=60, is_lab_slot=(hour >= 14),
        ))

rooms = [
    Room(id="room_101", name="Room 101", capacity=60, room_type="classroom",
         building="Main", floor=1, facilities=["projector", "whiteboard"]),
    Room(id="room_102", name="Room 102", capacity=60, room_type="classroom",
         building="Main", floor=1, facilities=["projector"]),
    Room(id="lab_201", name="Lab 201", capacity=60, room_type="lab",
         building="Tech", floor=2, facilities=["computers", "projector"]),
    Room(id="lab_202", name="Lab 202", capacity=60, room_type="lab",
         building="Tech", floor=2, facilities=["computers"]),
    Room(id="room_301", name="Room 301", capacity=100, room_type="seminar_hall",
         building="Main", floor=3, facilities=["projector", "audio_system"]),
]

faculty = [
    Faculty(id="fac_001", name="Dr. Smith", department="Computer Science",
            designation="Professor", max_hours_per_week=18, min_hours_per_week=8,
            qualifications=["PhD", "Data Structures", "Algorithms"]),
    Faculty(id="fac_002", name="Prof. Johnson", department="Computer Science",
            designation="Associate Professor", max_hours_per_week=20,
            min_hours_per_week=8, qualifications=["MSc", "Database Systems", "Web Development"]),
    Faculty(id="fac_003", name="Dr. Williams", department="Mathematics",
            designation="Assistant Professor", max_hours_per_week=16,
            min_hours_per_week=6, qualifications=["PhD", "Linear Algebra"]),
    Faculty(id="fac_004", name="Dr. Patel", department="Computer Science",
            designation="Assistant Professor", max_hours_per_week=18,
            min_hours_per_week=8, qualifications=["PhD", "Data Structures", "Database Systems"]),
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
          semester=3, strength=55, program="B.Tech", year=2,
          subjects=["sub_ds", "sub_ds_lab", "sub_web", "sub_math"]),
    Batch(id="batch_cse_3b", name="CSE 3B", department="Computer Science",
          semester=3, strength=50, program="B.Tech", year=2,
          subjects=["sub_ds", "sub_ds_lab", "sub_web"]),
]

config = InstitutionConfig(
    id="test", name="Test Institution",
    working_days=5, slots_per_day=6,
    slot_duration=60, lunch_break_start=12, lunch_break_duration=60,
)

ctx = SchedulingContext(
    institution=config, time_slots=slots, rooms=rooms,
    faculty=faculty, batches=batches, subjects=subjects,
)

# ── Run GA solver ───────────────────────────────────────────────────
ga_config = GAConfig(
    population_size=150,
    generations=600,
    mutation_rate=0.15,
    crossover_rate=0.8,
    tournament_size=5,
    elite_size=5,
    timeout=45,
)

print("Running GA solver on test data...")
t0 = time.time()
solver = GeneticAlgorithmSolver(ctx, ga_config)
solution = solver.solve(timeout=45)
elapsed = time.time() - t0
print(f"GA solver finished in {elapsed:.2f}s — {len(solution.assignments)} assignments, "
      f"quality={solution.quality_score:.4f}")

# ── Determine expected hours ────────────────────────────────────────
total_expected = 0
for batch in batches:
    for sid in batch.subjects:
        subj = ctx.get_subject(sid)
        if subj:
            total_expected += subj.hours_per_week
print(f"Expected total hours: {total_expected}  |  Scheduled: {len(solution.assignments)}")

lab_assigned = sum(1 for a in solution.assignments if a.is_lab_session)
lab_expected = sum(
    ctx.get_subject(sid).hours_per_week
    for b in batches for sid in b.subjects
    if ctx.get_subject(sid) and ctx.get_subject(sid).is_lab
)
print(f"Lab hours expected: {lab_expected}  |  Lab hours assigned: {lab_assigned}")

# ── Evaluate ────────────────────────────────────────────────────────
evaluator = SchedulerEvaluator(ctx)
report = evaluator.evaluate(solution)

# Write results
with open("eval_ga_comparison.txt", "w") as f:
    old = sys.stdout
    sys.stdout = f
    report.print_summary()
    print("\n\n=== FULL METRICS (JSON) ===")
    print(json.dumps(report.to_dict(), indent=2, default=str))
    sys.stdout = old

print("\nFull results written to eval_ga_comparison.txt")

# ── Quick summary table ─────────────────────────────────────────────
d = report.to_dict()
pr = d.get("precision_recall", {})
bk = d.get("business_kpis", {})
bf = d.get("bias_fairness", {})

print("\n" + "="*60)
print("  KEY METRICS SUMMARY (GA-generated schedule)")
print("="*60)
rows = [
    ("Precision",            f"{pr.get('precision', 0):.4f}"),
    ("Recall",               f"{pr.get('recall', 0):.4f}"),
    ("F1 Score",             f"{pr.get('f1', 0):.4f}"),
    ("Lab Precision",        f"{pr.get('lab_precision', 0):.4f}"),
    ("Lab Recall",           f"{pr.get('lab_recall', 0):.4f}"),
    ("Schedule Complete",    f"{bk.get('schedule_completeness', 0)*100:.1f}%"),
    ("Faculty Utilisation",  f"{bk.get('faculty_utilization_mean', 0)*100:.1f}%"),
    ("Room Utilisation",     f"{bk.get('room_utilization_mean', 0)*100:.1f}%"),
    ("Overall KPI",          f"{bk.get('overall_kpi_score', 0):.2f} / 100"),
    ("Workload Gini",        f"{bf.get('workload_gini', 0):.4f}"),
    ("Workload CV",          f"{bf.get('workload_cv', 0):.4f}"),
    ("Fairness Score",       f"{bf.get('overall_fairness_score', 0):.2f} / 100"),
]
for name, val in rows:
    print(f"  {name:<22s} {val}")
print("="*60)

# ── Lab Consecutive Block Verification ──────────────────────────────
print("\n" + "="*60)
print("  LAB CONSECUTIVE BLOCK VERIFICATION")
print("="*60)
lab_assignments = [a for a in solution.assignments if a.is_lab_session]
# Group by (batch, subject)
from collections import defaultdict
lab_groups = defaultdict(list)
for a in lab_assignments:
    lab_groups[(a.batch_id, a.subject_id)].append(a)

all_consecutive = True
for (batch_id, subj_id), assigns in sorted(lab_groups.items()):
    assigns.sort(key=lambda a: (a.time_slot.day, a.time_slot.start_hour))
    hours_info = []
    for a in assigns:
        ts = a.time_slot
        hours_info.append(f"Day{ts.day} {ts.start_hour}:00-{ts.end_hour}:{ts.end_minute:02d}")
    
    # Check consecutive pairs
    consecutive = True
    for i in range(0, len(assigns) - 1, 2):
        a1 = assigns[i]
        a2 = assigns[i + 1]
        if (a1.time_slot.day != a2.time_slot.day or
            a1.time_slot.end_hour != a2.time_slot.start_hour or
            a1.time_slot.end_minute != a2.time_slot.start_minute):
            consecutive = False
            all_consecutive = False
    
    status = "CONSECUTIVE" if consecutive else "NOT CONSECUTIVE"
    subj_name = ctx.get_subject(subj_id).name if ctx.get_subject(subj_id) else subj_id
    print(f"  {batch_id} | {subj_name}: [{', '.join(hours_info)}] -> {status}")

print(f"\n  Overall lab blocks consecutive: {'YES' if all_consecutive else 'NO'}")
print("="*60)
