# Script to insert constraint registry methods into nep_scheduler.py
import os

# Read the constraint registry methods
with open(r'd:\COMP\academic_campass_2025\services\scheduler\constraint_registry_methods.py', 'r', encoding='utf-8') as f:
    registry_methods = f.read()

# Read the main scheduler file
with open(r'd:\COMP\academic_campass_2025\services\scheduler\nep_scheduler.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with "def solve_for_batch"
insert_line = None
for i, line in enumerate(lines):
    if '    def solve_for_batch(self, batch_id: str, time_limit_seconds: int = 30)' in line:
        insert_line = i
        break

if insert_line is None:
    print("ERROR: Could not find solve_for_batch method")
    exit(1)

print(f"Found solve_for_batch at line {insert_line + 1}")

# Insert the registry methods before solve_for_batch
lines.insert(insert_line, registry_methods)

# Write back
with open(r'd:\COMP\academic_campass_2025\services\scheduler\nep_scheduler.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Successfully inserted constraint registry methods")
print(f"New file has {len(lines)} lines")
