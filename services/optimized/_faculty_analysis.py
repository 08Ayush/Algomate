"""Quick faculty & dept analysis"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from storage.supabase_client import _query

COLLEGE = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f"

# Departments
depts = _query("SELECT id, name FROM departments WHERE college_id = %s", (COLLEGE,))
print("=== DEPARTMENTS ===")
for d in depts:
    print(f"  {d['id']} = {d['name']}")

# Faculty
fac = _query("SELECT id, first_name, last_name, department_id FROM users WHERE college_id = %s AND role = 'faculty'", (COLLEGE,))
print(f"\n=== FACULTY ({len(fac)}) ===")
for f in fac:
    dept_name = next((d['name'] for d in depts if d['id'] == f['department_id']), 'NULL')
    fname = f"{f['first_name'] or ''} {f['last_name'] or ''}".strip()
    print(f"  {fname:30s} dept={dept_name}")

# Faculty qualifications
fqs = _query("""SELECT fqs.faculty_id, fqs.subject_id, u.first_name, u.last_name
    FROM faculty_qualified_subjects fqs
    JOIN users u ON u.id = fqs.faculty_id
    WHERE u.college_id = %s""", (COLLEGE,))
print(f"\n=== FACULTY QUALIFICATIONS ({len(fqs)}) ===")
for f in fqs[:50]:
    fname = f"{f['first_name'] or ''} {f['last_name'] or ''}".strip()
    print(f"  {fname:25s} → subject: {f['subject_id'][:12]}...")

# Batch_subjects stats
no_fac = _query("""SELECT COUNT(*) as c FROM batch_subjects bs 
    JOIN batches b ON b.id = bs.batch_id 
    WHERE b.college_id = %s AND bs.assigned_faculty_id IS NULL""", (COLLEGE,))
has_fac = _query("""SELECT COUNT(*) as c FROM batch_subjects bs 
    JOIN batches b ON b.id = bs.batch_id 
    WHERE b.college_id = %s AND bs.assigned_faculty_id IS NOT NULL""", (COLLEGE,))
print(f"\n=== BATCH_SUBJECTS FACULTY STATUS ===")
print(f"  WITH assigned_faculty: {has_fac[0]['c']}")
print(f"  WITHOUT assigned_faculty: {no_fac[0]['c']}")

# Which batches have full faculty assignment?
print(f"\n=== PER-BATCH FACULTY COVERAGE ===")
batches = _query("SELECT id, name, semester FROM batches WHERE college_id = %s ORDER BY semester", (COLLEGE,))
for b in batches:
    total = _query("SELECT COUNT(*) as c FROM batch_subjects WHERE batch_id = %s", (b['id'],))
    assigned = _query("SELECT COUNT(*) as c FROM batch_subjects WHERE batch_id = %s AND assigned_faculty_id IS NOT NULL", (b['id'],))
    t = total[0]['c']
    a = assigned[0]['c']
    status = "COMPLETE" if a == t else f"MISSING {t-a}/{t}"
    print(f"  {b['name']:45s} sem={b['semester']} → {a}/{t} assigned | {status}")

# Time slots: are there 120-min slots?
print(f"\n=== TIME SLOTS ===")
slots = _query("SELECT day, start_time, end_time, duration, is_active FROM time_slots WHERE college_id = %s ORDER BY day, start_time", (COLLEGE,))
slot_60 = [s for s in slots if s['duration'] == 60]
slot_120 = [s for s in slots if s['duration'] == 120]
print(f"  60-min slots: {len(slot_60)}")
print(f"  120-min slots: {len(slot_120)}")
for s in slot_120:
    print(f"    {s['day']:10s} {s['start_time']}-{s['end_time']} active={s.get('is_active', True)}")

# Classrooms
rooms = _query("SELECT id, name, is_lab, capacity FROM classrooms WHERE college_id = %s", (COLLEGE,))
labs = [r for r in rooms if r['is_lab']]
regular = [r for r in rooms if not r['is_lab']]
print(f"\n=== CLASSROOMS ===")
print(f"  Total: {len(rooms)} (labs: {len(labs)}, regular: {len(regular)})")
for r in rooms:
    print(f"  {r['name']:25s} lab={r['is_lab']} cap={r['capacity']}")
