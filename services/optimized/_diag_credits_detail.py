from storage.supabase_client import _query, _execute

BATCH_ID = "abbdd58e-f543-4e82-acbf-e813df03e23c"

rows = _query("""
    SELECT s.id, s.code, s.name,
           s.credit_value, s.credits_per_week,
           s.lecture_hours, s.tutorial_hours,
           s.practical_hours, s.lab_hours, s.weekly_hours,
           bs.required_hours_per_week
    FROM batch_subjects bs
    JOIN subjects s ON s.id = bs.subject_id
    WHERE bs.batch_id = %s
    ORDER BY s.code
""", (BATCH_ID,))

print(f"{'CODE':<15} {'credit_value':>12} {'cred/wk':>7} {'lec':>4} {'tut':>4} {'prac':>5} {'lab':>4} {'wkly':>5} {'req_hrs':>7}  NAME")
print("-" * 110)
for r in rows:
    print(
        f"{str(r['code'] or ''):<15}"
        f" {str(r['credit_value'] or ''):>12}"
        f" {str(r['credits_per_week'] or ''):>7}"
        f" {str(r['lecture_hours'] or ''):>4}"
        f" {str(r['tutorial_hours'] or ''):>4}"
        f" {str(r['practical_hours'] or ''):>5}"
        f" {str(r['lab_hours'] or ''):>4}"
        f" {str(r['weekly_hours'] or ''):>5}"
        f" {str(r['required_hours_per_week'] or ''):>7}"
        f"  {r['name']}"
    )
