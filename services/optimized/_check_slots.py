"""Check time_slots schema and is_lab_slot values"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from storage.supabase_client import _query

COLLEGE = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f"

cols = _query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'time_slots' ORDER BY ordinal_position")
print("=== TIME_SLOTS COLUMNS ===")
for c in cols:
    print(f"  {c['column_name']:25s} {c['data_type']}")

slots = _query("SELECT * FROM time_slots WHERE college_id = %s ORDER BY day, start_time", (COLLEGE,))
print(f"\nTotal slots: {len(slots)}")

lab_slots = [s for s in slots if s.get("is_lab_slot")]
nonlab_slots = [s for s in slots if not s.get("is_lab_slot")]
print(f"Lab slots (is_lab_slot=True): {len(lab_slots)}")
print(f"Non-lab slots: {len(nonlab_slots)}")

def dur(s):
    st = s["start_time"]
    et = s["end_time"]
    if hasattr(st, "hour"):
        return (et.hour * 60 + et.minute) - (st.hour * 60 + st.minute)
    return 0

print("\n--- Lab slots ---")
for s in lab_slots:
    d = dur(s)
    print(f"  {s['day']:10s} {s['start_time']}-{s['end_time']} dur={d}min active={s.get('is_active')}")

print("\n--- Non-lab slots (first 15) ---")
for s in nonlab_slots[:15]:
    d = dur(s)
    print(f"  {s['day']:10s} {s['start_time']}-{s['end_time']} dur={d}min active={s.get('is_active')}")

# Summary: what's actually getting fed to the solver?
active_60 = [s for s in slots if s.get("is_active") is not False and dur(s) == 60]
active_120 = [s for s in slots if s.get("is_active") is not False and dur(s) == 120]
active_lab = [s for s in active_60 if s.get("is_lab_slot")]
active_nonlab = [s for s in active_60 if not s.get("is_lab_slot")]
print(f"\n=== SOLVER INPUT SUMMARY ===")
print(f"Active 60-min slots: {len(active_60)} (lab_slot={len(active_lab)}, non_lab={len(active_nonlab)})")
print(f"Active 120-min slots: {len(active_120)} (excluded by extractor)")
print(f"\nIf active_lab=0, lab subjects CANNOT be scheduled because solver requires is_lab_slot=True!")
