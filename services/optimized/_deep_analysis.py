"""Deep analysis: subjects.json + live DB (batch_subjects, batches, faculty) to find all scheduling gaps."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))

# ── Load subjects.json ──
with open(r"c:\Users\parit\Downloads\subjects.json", "r") as f:
    subjects = json.load(f)

COLLEGE = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f"

# Build lookup
subj_by_id = {s["id"]: s for s in subjects}

# ── Pull live DB data ──
from storage.supabase_client import _query

batches = _query("SELECT id, name, semester, department_id, course_id FROM batches WHERE college_id = %s ORDER BY semester, name", (COLLEGE,))
print(f"=== BATCHES ({len(batches)}) ===")
for b in batches:
    print(f"  {b['name']:40s} sem={b['semester']} dept={b['department_id']} course={b['course_id']}")

batch_subjects = _query("""
    SELECT bs.id, bs.batch_id, bs.subject_id, bs.required_hours_per_week, bs.assigned_faculty_id,
           b.name as batch_name, b.semester as batch_semester, b.department_id as batch_dept
    FROM batch_subjects bs
    JOIN batches b ON b.id = bs.batch_id
    WHERE b.college_id = %s
    ORDER BY b.semester, b.name, bs.subject_id
""", (COLLEGE,))
print(f"\n=== BATCH_SUBJECTS ({len(batch_subjects)}) ===")

# ── Cross-reference: subjects in batch_subjects vs subjects table ──
print("\n" + "="*100)
print("CROSS-REFERENCE: batch_subjects vs subjects.json")
print("="*100)

# Group batch_subjects by batch
from collections import defaultdict
bs_by_batch = defaultdict(list)
for bs in batch_subjects:
    bs_by_batch[bs['batch_id']].append(bs)

for batch in batches:
    bid = batch['id']
    bsubs = bs_by_batch.get(bid, [])
    if not bsubs:
        print(f"\n  BATCH: {batch['name']} (sem {batch['semester']}) — NO SUBJECTS ASSIGNED!")
        continue
    
    total_hours = 0
    total_credits = 0
    print(f"\n  BATCH: {batch['name']} (sem {batch['semester']}, dept={batch['department_id'][:8]}...)")
    print(f"  {'Code':14s} {'Type':10s} {'Name':42s} {'cpw':>3s} {'rhpw':>4s} {'dur':>4s} {'lab_h':>5s} {'cv':>4s} {'req_lab':>7s} {'faculty':>8s} {'Issues'}")
    print(f"  {'-'*14} {'-'*10} {'-'*42} {'-'*3} {'-'*4} {'-'*4} {'-'*5} {'-'*4} {'-'*7} {'-'*8} {'-'*30}")
    
    for bs in bsubs:
        sid = bs['subject_id']
        s = subj_by_id.get(sid)
        if not s:
            print(f"  ??? subject_id={sid} NOT FOUND in subjects.json!")
            continue
        
        cpw = s.get('credits_per_week') or 0
        if isinstance(cpw, str): cpw = float(cpw)
        rhpw = bs.get('required_hours_per_week') or 0
        if isinstance(rhpw, str): rhpw = float(rhpw)
        dur = s.get('preferred_duration') or 60
        lab_h = s.get('lab_hours') or 0
        cv = s.get('credit_value') or 0
        if isinstance(cv, str): cv = float(cv)
        req_lab = s.get('requires_lab', False)
        faculty = "YES" if bs.get('assigned_faculty_id') else "NONE"
        stype = s.get('subject_type', '?')
        
        issues = []
        # LAB/PRACTICAL specific issues
        if stype in ('LAB', 'PRACTICAL'):
            if dur != 120:
                issues.append(f"dur={dur}→120")
            if not req_lab:
                issues.append("req_lab=F→T")
            if lab_h == 0:
                issues.append("lab_h=0→2")
            if rhpw < 2:
                issues.append(f"rhpw={rhpw}→2")
        # General issues
        if not bs.get('assigned_faculty_id'):
            issues.append("NO FACULTY!")
        if s.get('department_id') and batch['department_id'] and s['department_id'] != batch['department_id']:
            issues.append(f"DEPT MISMATCH(subj={s['department_id'][:8]} batch={batch['department_id'][:8]})")
        
        issue_str = " | ".join(issues) if issues else "OK"
        total_hours += rhpw
        total_credits += cv
        
        print(f"  {s['code']:14s} {stype:10s} {s['name'][:42]:42s} {cpw:>3.0f} {rhpw:>4.0f} {dur:>4d} {lab_h:>5} {cv:>4.1f} {str(req_lab):>7s} {faculty:>8s} {issue_str}")
    
    print(f"  TOTALS: scheduling_hours/wk = {total_hours:.0f}, credit_value_sum = {total_credits:.1f}")

# ── Check departments ──
print("\n" + "="*100)
print("DEPARTMENT ANALYSIS")
print("="*100)
depts = _query("SELECT id, name FROM departments WHERE college_id = %s", (COLLEGE,))
for d in depts:
    print(f"  {d['id']} = {d['name']}")
    # Count subjects with this dept
    count = sum(1 for s in subjects if s.get('department_id') == d['id'])
    print(f"    → {count} subjects in subjects table")
    # Count batches with this dept
    bcount = sum(1 for b in batches if b.get('department_id') == d['id'])
    print(f"    → {bcount} batches")

# Subjects with NULL department
null_dept = [s for s in subjects if not s.get('department_id')]
print(f"\n  Subjects with NULL department_id: {len(null_dept)}")
for s in sorted(null_dept, key=lambda x: (x['semester'], x['code'])):
    print(f"    Sem{s['semester']} {s['code']:14s} {s['name'][:50]}")

# ── Faculty qualifications ──
print("\n" + "="*100)
print("FACULTY QUALIFICATIONS CHECK")
print("="*100)
fqs = _query("""SELECT fqs.faculty_id, fqs.subject_id, u.full_name 
    FROM faculty_qualified_subjects fqs 
    JOIN users u ON u.id = fqs.faculty_id 
    WHERE u.college_id = %s""", (COLLEGE,))
print(f"Total faculty_qualified_subjects records: {len(fqs)}")

# Check which batch_subjects have no qualified faculty
subjects_needing_faculty = set()
for bs in batch_subjects:
    if not bs.get('assigned_faculty_id'):
        subjects_needing_faculty.add(bs['subject_id'])

print(f"\nSubjects with NO assigned_faculty_id in batch_subjects: {len(subjects_needing_faculty)}")
for sid in subjects_needing_faculty:
    s = subj_by_id.get(sid, {})
    # Check if there's a qualified faculty
    qualified = [f for f in fqs if f['subject_id'] == sid]
    q_str = f"qualified: {', '.join(f['full_name'] for f in qualified)}" if qualified else "NO QUALIFIED FACULTY EITHER"
    print(f"  {s.get('code','???'):14s} {s.get('name','???')[:45]:45s} sem={s.get('semester','')} | {q_str}")

# ── Time slots check ──
print("\n" + "="*100)
print("TIME SLOTS FOR LABS (120-min slots)")
print("="*100)
slots_120 = _query("SELECT * FROM time_slots WHERE college_id = %s AND duration = 120 ORDER BY day, start_time", (COLLEGE,))
print(f"120-min time slots: {len(slots_120)}")
for sl in slots_120:
    print(f"  {sl['day']:10s} {sl['start_time']}-{sl['end_time']} active={sl.get('is_active', True)}")

slots_60 = _query("SELECT COUNT(*) as cnt FROM time_slots WHERE college_id = %s AND duration = 60", (COLLEGE,))
print(f"60-min time slots: {slots_60[0]['cnt']}")

# ── GENERATE COMPREHENSIVE FIX SQL ──
print("\n" + "="*100)
print("COMPREHENSIVE FIX SQL")
print("="*100)

# 1. Fix LAB subjects
print("""
-- ═══════════════════════════════════════════════════════════════════
-- 1. Fix ALL LAB subjects: requires_lab, lab_hours, preferred_duration
-- ═══════════════════════════════════════════════════════════════════
UPDATE subjects SET
    requires_lab = true,
    lab_hours = 2,
    preferred_duration = 120,
    max_continuous_hours = 2
WHERE subject_type = 'LAB'
  AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f';

-- ═══════════════════════════════════════════════════════════════════
-- 2. Fix ALL PRACTICAL subjects: same as LAB
-- ═══════════════════════════════════════════════════════════════════
UPDATE subjects SET
    requires_lab = true,
    lab_hours = 2,
    preferred_duration = 120,
    max_continuous_hours = 2
WHERE subject_type = 'PRACTICAL'
  AND college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f';

-- ═══════════════════════════════════════════════════════════════════
-- 3. Fix batch_subjects: LAB/PRACTICAL need required_hours_per_week = 2
--    (one 2-hour session per week)
-- ═══════════════════════════════════════════════════════════════════
UPDATE batch_subjects bs SET
    required_hours_per_week = 2
FROM subjects s
WHERE bs.subject_id = s.id
  AND s.subject_type IN ('LAB', 'PRACTICAL')
  AND s.college_id = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'
  AND (bs.required_hours_per_week IS NULL OR bs.required_hours_per_week < 2);
""")

# 2. Fix NULL department_ids
if null_dept:
    print("-- ═══════════════════════════════════════════════════════════════════")
    print("-- 4. Fix subjects with NULL department_id")
    print("-- ═══════════════════════════════════════════════════════════════════")
    # Group by code prefix to guess department
    for s in sorted(null_dept, key=lambda x: x['code']):
        code = s['code']
        # Guess department from code prefix
        if code.startswith('24DS') or code.startswith('25CE'):
            dept_guess = "CSE/DS dept"
        elif code.startswith('24ES') or code.startswith('25ES'):
            dept_guess = "Engineering Sciences dept"
        elif code.startswith('5') or code.startswith('9'):
            dept_guess = "B.Ed/Education dept"
        else:
            dept_guess = "UNKNOWN"
        print(f"-- {code}: {s['name'][:50]} → {dept_guess}")
    
    print(f"""
-- Example: Set department_id for engineering subjects
-- UPDATE subjects SET department_id = '<your-cse-dept-id>' 
--   WHERE code LIKE '24DS%' AND department_id IS NULL 
--   AND college_id = '{COLLEGE}';
""")
