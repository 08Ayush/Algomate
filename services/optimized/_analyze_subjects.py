"""Analyze subjects.json exported from DB to identify scheduling issues."""
import json, os, sys

with open(r"c:\Users\parit\Downloads\subjects.json", "r") as f:
    subjects = json.load(f)

print(f"Total subjects: {len(subjects)}\n")

# ── 1. Overview by type ──
from collections import Counter, defaultdict
type_counts = Counter(s["subject_type"] for s in subjects)
print("=== BY TYPE ===")
for t, c in sorted(type_counts.items()):
    print(f"  {t:12s}: {c}")

# ── 2. Overview by semester ──
sem_counts = Counter(s["semester"] for s in subjects)
print("\n=== BY SEMESTER ===")
for s in sorted(sem_counts):
    print(f"  Sem {s}: {sem_counts[s]} subjects")

# ── 3. Unique departments ──
dept_ids = set(s.get("department_id") or "NULL" for s in subjects)
print(f"\n=== DEPARTMENTS ({len(dept_ids)}) ===")
for d in sorted(dept_ids):
    count = sum(1 for s in subjects if (s.get("department_id") or "NULL") == d)
    print(f"  {d}: {count} subjects")

# ── 4. KEY PROBLEMS ──
print("\n" + "="*80)
print("PROBLEM ANALYSIS")
print("="*80)

# 4a. LABs with wrong settings
print("\n--- LAB subjects with issues ---")
labs = [s for s in subjects if s["subject_type"] == "LAB"]
for s in sorted(labs, key=lambda x: (x["semester"], x["code"])):
    issues = []
    if not s.get("requires_lab"):
        issues.append("requires_lab=FALSE")
    if s.get("lab_hours", 0) == 0:
        issues.append("lab_hours=0")
    if s.get("preferred_duration", 60) != 120:
        issues.append(f"preferred_duration={s.get('preferred_duration')} (should be 120)")
    if s.get("credits_per_week", 0) < 2:
        issues.append(f"credits_per_week={s.get('credits_per_week')} (should be >=2 for 2hr lab)")
    
    issue_str = " | ".join(issues) if issues else "OK"
    print(f"  Sem{s['semester']} {s['code']:12s} {s['name'][:45]:45s} cpw={s.get('credits_per_week',0)} dur={s.get('preferred_duration',0)} lab_h={s.get('lab_hours',0)} req_lab={s.get('requires_lab')} | {issue_str}")

# 4b. PRACTICAL subjects
print("\n--- PRACTICAL subjects ---")
pracs = [s for s in subjects if s["subject_type"] == "PRACTICAL"]
for s in sorted(pracs, key=lambda x: (x["semester"], x["code"])):
    issues = []
    if not s.get("requires_lab"):
        issues.append("requires_lab=FALSE")
    if s.get("lab_hours", 0) == 0:
        issues.append("lab_hours=0")
    if s.get("preferred_duration", 60) != 120:
        issues.append(f"preferred_duration={s.get('preferred_duration')} (should be 120)")
    issue_str = " | ".join(issues) if issues else "OK"
    print(f"  Sem{s['semester']} {s['code']:12s} {s['name'][:45]:45s} cpw={s.get('credits_per_week',0)} dur={s.get('preferred_duration',0)} lab_h={s.get('lab_hours',0)} req_lab={s.get('requires_lab')} | {issue_str}")

# 4c. THEORY subjects summary
print("\n--- THEORY subjects summary ---")
theory = [s for s in subjects if s["subject_type"] == "THEORY"]
for s in sorted(theory, key=lambda x: (x["semester"], x["code"])):
    issues = []
    if s.get("requires_lab"):
        issues.append("requires_lab=TRUE (theory shouldn't need lab)")
    if s.get("preferred_duration", 60) != 60:
        issues.append(f"preferred_duration={s.get('preferred_duration')} (should be 60)")
    if s.get("credits_per_week", 0) == 0:
        issues.append("credits_per_week=0!")
    issue_str = " | ".join(issues) if issues else "OK"
    print(f"  Sem{s['semester']} {s['code']:12s} {s['name'][:45]:45s} cpw={s.get('credits_per_week',0)} dur={s.get('preferred_duration',0)} lec_h={s.get('lecture_hours',0)} wkly={s.get('weekly_hours',0)} cv={s.get('credit_value',0)} | {issue_str}")

# ── 5. Semester 4 deep dive (our test batch) ──
print("\n" + "="*80)
print("SEMESTER 4 DEEP DIVE (test batch)")
print("="*80)
sem4 = [s for s in subjects if s["semester"] == 4]
total_cpw = 0
total_cv = 0
for s in sorted(sem4, key=lambda x: x["code"]):
    cpw = s.get("credits_per_week", 0) or 0
    cv = s.get("credit_value", 0) or 0
    total_cpw += cpw
    total_cv += cv
    print(f"  {s['code']:12s} {s['subject_type']:10s} {s['name'][:40]:40s} cpw={cpw} cv={cv} dur={s.get('preferred_duration',0)} lab_h={s.get('lab_hours',0)} lec={s.get('lecture_hours',0)} tut={s.get('tutorial_hours',0)} prac={s.get('practical_hours',0)} wkly={s.get('weekly_hours',0)} req_lab={s.get('requires_lab')}")
print(f"\n  TOTALS: credits_per_week (scheduling hours) = {total_cpw}, credit_value (display) = {total_cv}")
print(f"  Expected: ~25-30 scheduling hours/week for a full semester")

# ── 6. Check what the scheduler actually uses ──
print("\n" + "="*80)
print("WHAT THE SCHEDULER NEEDS (per subject)")
print("="*80)
print("""
For THEORY subjects:
  - credits_per_week = number of 1-hour lectures per week (e.g., 3 for a 3L subject)
  - preferred_duration = 60 (1 hour)
  - requires_lab = false
  - lab_hours = 0

For LAB subjects:
  - credits_per_week = number of 2-hour lab sessions per week (usually 1, meaning ONE 2-hr block)
  - BUT batch_subjects.required_hours_per_week should = 2 (actual hours)
  - preferred_duration = 120 (2 hours continuous)
  - requires_lab = true
  - lab_hours = 2 (actual lab hours per session)
  
For PRACTICAL subjects:
  - Same as LAB: preferred_duration=120, requires_lab=true, lab_hours=2
""")

# ── 7. Generate FIX SQL ──
print("\n" + "="*80)
print("RECOMMENDED FIX SQL")
print("="*80)

# Fix all LABs
print("\n-- Fix ALL LAB subjects")
print("""UPDATE subjects SET
    requires_lab = true,
    lab_hours = 2,
    preferred_duration = 120,
    max_continuous_hours = 2
WHERE subject_type = 'LAB'
  AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f';""")

# Fix all PRACTICALs
print("\n-- Fix ALL PRACTICAL subjects") 
print("""UPDATE subjects SET
    requires_lab = true,
    lab_hours = 2,
    preferred_duration = 120,
    max_continuous_hours = 2
WHERE subject_type = 'PRACTICAL'
  AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f';""")

# Fix batch_subjects for labs
print("\n-- Fix batch_subjects: LAB/PRACTICAL should have required_hours_per_week = 2")
print("""UPDATE batch_subjects bs SET
    required_hours_per_week = 2
FROM subjects s
WHERE bs.subject_id = s.id
  AND s.subject_type IN ('LAB', 'PRACTICAL')
  AND s.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND bs.required_hours_per_week < 2;""")
