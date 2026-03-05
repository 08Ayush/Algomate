import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from storage.supabase_client import _query

COLLEGE = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'

# THEORY subjects where rhpw != cpw
rows = _query("""
SELECT bs.required_hours_per_week as rhpw, s.credits_per_week as cpw,
       s.code, s.name, s.subject_type, b.name as batch, b.semester
FROM batch_subjects bs
JOIN subjects s ON s.id = bs.subject_id
JOIN batches b ON b.id = bs.batch_id
WHERE b.college_id = %s AND s.subject_type = 'THEORY'
  AND bs.required_hours_per_week != s.credits_per_week
ORDER BY b.semester, s.code
""", (COLLEGE,))
print(f"THEORY subjects with rhpw != cpw: {len(rows)}")
for r in rows:
    code = r["code"]
    name = r["name"][:40]
    rhpw = r["rhpw"]
    cpw = r["cpw"]
    batch = r["batch"]
    sem = r["semester"]
    print(f"  Sem{sem} {code:14s} {name:40s} rhpw={rhpw} cpw={cpw} batch={batch}")

print()

# LAB/PRACTICAL subjects where rhpw != 1 (should be 1 for most labs)
rows2 = _query("""
SELECT bs.required_hours_per_week as rhpw, s.credits_per_week as cpw,
       s.code, s.name, s.subject_type, b.name as batch, b.semester
FROM batch_subjects bs
JOIN subjects s ON s.id = bs.subject_id
JOIN batches b ON b.id = bs.batch_id
WHERE b.college_id = %s AND s.subject_type IN ('LAB', 'PRACTICAL')
ORDER BY b.semester, s.code
""", (COLLEGE,))
print(f"LAB/PRACTICAL subjects: {len(rows2)}")
for r in rows2:
    code = r["code"]
    name = r["name"][:40]
    rhpw = r["rhpw"]
    cpw = r["cpw"]
    stype = r["subject_type"]
    batch = r["batch"]
    sem = r["semester"]
    flag = " <-- CHECK" if rhpw != 1 else ""
    print(f"  Sem{sem} {code:14s} {stype:10s} {name:40s} rhpw={rhpw} cpw={cpw}{flag}")

print()

# Also check: what about theory subjects with cpw that seem high?
rows3 = _query("""
SELECT s.code, s.name, s.credits_per_week, s.subject_type,
       COUNT(DISTINCT b.id) as batch_count,
       COUNT(DISTINCT bs.assigned_faculty_id) FILTER (WHERE bs.assigned_faculty_id IS NOT NULL) as with_faculty
FROM subjects s
JOIN batch_subjects bs ON bs.subject_id = s.id
JOIN batches b ON b.id = bs.batch_id
WHERE b.college_id = %s
GROUP BY s.id, s.code, s.name, s.credits_per_week, s.subject_type
ORDER BY s.subject_type, s.code
""", (COLLEGE,))
print(f"Subject scheduling summary ({len(rows3)} unique subjects in batches):")
for r in rows3:
    code = r["code"]
    name = r["name"][:35]
    cpw = r["credits_per_week"]
    stype = r["subject_type"]
    bc = r["batch_count"]
    wf = r["with_faculty"]
    fac_status = "OK" if wf > 0 else "NO FACULTY"
    print(f"  {stype:10s} {code:14s} {name:35s} cpw={cpw} batches={bc} {fac_status}")
