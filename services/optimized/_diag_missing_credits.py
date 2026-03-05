"""Diagnose which subjects/credits were not scheduled in the latest timetable."""
from storage.supabase_client import _query

BATCH_ID = "abbdd58e-f543-4e82-acbf-e813df03e23c"

# 1. All subjects for this batch
subjects = _query("""
    SELECT s.id, s.name, s.code,
           s.credit_value, s.credits_per_week,
           s.lecture_hours, s.tutorial_hours, s.practical_hours, s.lab_hours, s.weekly_hours,
           COALESCE(bs.required_hours_per_week, s.credits_per_week, s.weekly_hours) AS required_hours,
           bs.assigned_faculty_id
    FROM batch_subjects bs
    JOIN subjects s ON s.id = bs.subject_id
    WHERE bs.batch_id = %s
    ORDER BY s.name
""", (BATCH_ID,))

print("=== BATCH SUBJECTS ===")
total_credits = 0
total_required = 0
for s in subjects:
    c = float(s["credit_value"] or 0)
    r = int(s["required_hours"] or 0)
    total_credits += c
    total_required += r
    print(f"  {str(s['code']):20} | credit_value={c} | req_hrs/wk={r} | {s['name']}")
print(f"\n  TOTAL declared credits : {total_credits}")
print(f"  TOTAL required hrs/wk  : {total_required}")

# 2. Latest timetable
timetables = _query("""
    SELECT id, title, created_at, status
    FROM generated_timetables
    WHERE batch_id = %s
    ORDER BY created_at DESC LIMIT 1
""", (BATCH_ID,))

if not timetables:
    print("\nNo timetable found for this batch.")
    raise SystemExit(1)

tt = timetables[0]
tt_id = tt["id"]
print(f"\n=== LATEST TIMETABLE ===")
print(f"  id     : {tt_id}")
print(f"  title  : {tt['title']}")
print(f"  status : {tt['status']}")

# 3. Scheduled sessions per subject (count only; is_continuation sessions still count as separate DB rows)
scheduled = _query("""
    SELECT s.id, s.name, s.code, s.credit_value,
           COUNT(sc.id) AS scheduled_sessions
    FROM scheduled_classes sc
    JOIN subjects s ON s.id = sc.subject_id
    WHERE sc.timetable_id = %s
    GROUP BY s.id, s.name, s.code, s.credit_value
    ORDER BY s.name
""", (tt_id,))

print("\n=== SCHEDULED SESSIONS PER SUBJECT ===")
total_scheduled = 0
scheduled_map = {}
for r in scheduled:
    code = r["code"]
    sessions = r["scheduled_sessions"] or 0
    scheduled_map[str(r["id"])] = sessions
    total_scheduled += sessions
    gap = float(r["credit_value"] or 0) - sessions
    flag = "  <<< UNDER-SCHEDULED" if gap > 0 else ("  <<< OVER" if gap < 0 else "")
    print(f"  {str(code):20} | credit_value={r['credit_value']} | scheduled={sessions}{flag}")
print(f"\n  TOTAL scheduled sessions : {total_scheduled}")

# 4. Completely unscheduled subjects
print("\n=== SUBJECTS WITH ZERO SESSIONS ===")
scheduled_subject_ids = {str(r["id"]) for r in scheduled}
missing_credits = 0
for s in subjects:
    if str(s["id"]) not in scheduled_subject_ids:
        c = float(s["credit_value"] or 0)
        missing_credits += c
        print(f"  *** UNSCHEDULED: {s['code']} | {s['name']} | credits={c}")

if missing_credits == 0:
    print("  (none completely unscheduled)")

# 5. Summary gap
gap_total = total_required - total_scheduled
print(f"\n=== SUMMARY ===")
print(f"  Required hrs/wk   : {total_required}")
print(f"  Scheduled sessions: {total_scheduled}")
print(f"  Gap               : {gap_total} session(s) not scheduled")
