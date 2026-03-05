import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from storage.supabase_client import _query

COLLEGE = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f'

# Show exactly what would be deleted: batch_subjects where subject dept != batch dept
rows = _query("""
SELECT 
  b.name as batch_name,
  b.semester,
  bd.code as batch_dept,
  s.code,
  s.name as subject_name,
  sd.code as subject_dept,
  b.department_id as batch_dept_id,
  s.department_id as subject_dept_id
FROM batch_subjects bs
JOIN subjects s ON s.id = bs.subject_id
JOIN batches b ON b.id = bs.batch_id
LEFT JOIN departments bd ON bd.id = b.department_id
LEFT JOIN departments sd ON sd.id = s.department_id
WHERE b.college_id = %s
  AND s.department_id IS NOT NULL
  AND b.department_id IS NOT NULL
  AND s.department_id != b.department_id
ORDER BY b.semester, b.name, s.code
""", (COLLEGE,))

print(f"=== batch_subjects with DEPT MISMATCH (would be deleted): {len(rows)} rows ===")
for r in rows:
    print(f"  [{r['batch_dept']:8s}] {r['batch_name'][:40]:40s} Sem{r['semester']} | {r['code']:14s} (dept={r['subject_dept']})")

print()

# Also check: 24ES/25ES subjects - what is their dept?
es_rows = _query("""
SELECT DISTINCT s.code, s.name, d.code as dept, s.department_id
FROM subjects s
LEFT JOIN departments d ON d.id = s.department_id
WHERE s.college_id = %s AND (s.code LIKE '24ES%' OR s.code LIKE '25ES%')
ORDER BY s.code
""", (COLLEGE,))
print(f"=== Engineering Sciences subjects dept mapping ===")
for r in es_rows:
    print(f"  {r['code']:14s} dept={r['dept']} id={r['department_id']}")
