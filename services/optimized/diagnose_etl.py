"""Diagnostic script to check ETL data and faculty coverage."""
import sys
sys.path.insert(0, '.')

from etl.extractor import Extractor
from etl.transformer import Transformer
from etl.quality import DataQualityReport

BATCH_ID = "15b7a264-e228-4ef0-8234-26235c4416d8"
COLLEGE_ID = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f"

report = DataQualityReport()
extractor = Extractor()
raw = extractor.extract(BATCH_ID, COLLEGE_ID, report)

transformer = Transformer()
result = transformer.transform(raw, report)

batch = result['batch']
batches = [batch]
subjects = result['subjects']
faculty = result['faculty']
slots = result['time_slots']
rooms = result['classrooms']

print(f"Batches: {len(batches)}")
for b in batches:
    print(f"  {b.name}: subjects={b.subjects}, strength={b.strength}")

print(f"\nSubjects: {len(subjects)}")
total_hrs = 0
for s in subjects:
    total_hrs += s.hours_per_week
    print(f"  {s.name} ({s.code}): hrs={s.hours_per_week}, lab={s.is_lab}, req_quals={s.required_qualifications[:3]}")
print(f"  TOTAL hours needed: {total_hrs}")

print(f"\nFaculty: {len(faculty)}")
for f in faculty:
    quals = f.qualifications[:4] if f.qualifications else []
    print(f"  {f.name}: quals={quals} ({len(f.qualifications)} total)")

print(f"\nSlots: {len(slots)}, Rooms: {len(rooms)}")
lab_rooms = [r for r in rooms if r.is_lab]
print(f"Lab rooms: {len(lab_rooms)} — {[(r.name, r.capacity) for r in lab_rooms]}")

# Check faculty coverage
covered = 0
uncovered = []
for s in subjects:
    has = any(f.can_teach(s) for f in faculty)
    if has:
        covered += 1
    else:
        uncovered.append(s.name)
print(f"\nFaculty coverage: {covered}/{len(subjects)}")
if uncovered:
    print(f"Uncovered subjects: {uncovered}")

# Check batch-subject linkage
print("\n=== BATCH-SUBJECT LINKAGE ===")
for b in batches:
    print(f"\n{b.name} ({b.id}):")
    for sid in b.subjects:
        subj = next((s for s in subjects if s.id == sid), None)
        if subj:
            qualified = [f.name for f in faculty if f.can_teach(subj)]
            print(f"  {subj.name}: {subj.hours_per_week}hrs, qualified={qualified}")
        else:
            print(f"  {sid}: SUBJECT NOT FOUND!")
