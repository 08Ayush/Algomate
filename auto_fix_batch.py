"""
Inspect and Cleanup Mixed Batch Data
Finds batches that contain '24DS401T' (Data Science subject) but appear to be CSE batches.
"""
import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

sb = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

print("Searching for contaminations...")

# 1. Get DS Subject ID
subj = sb.table('subjects').select('id, code').eq('code', '24DS401T').execute()
if not subj.data:
    print("Subject 24DS401T not found.")
    exit()
ds_id = subj.data[0]['id']

# 2. Find links
links = sb.table('batch_subjects').select('id, batch_id, batches(id, name, department_id, semester)').eq('subject_id', ds_id).execute()

for link in links.data:
    batch = link['batches']
    b_name = batch['name']
    b_id = batch['id']
    print(f"Batch: {b_name} (Sem {batch['semester']}) ID: {b_id}")
    
    # Heuristic: If it looks like CSE
    if 'CSE' in b_name or 'Computer' in b_name:
        print("  [!] DETECTED CSE BATCH WITH DS SUBJECT")
        
        # List all subjects
        subs = sb.table('batch_subjects').select('id, subjects(code, name, credits_per_week)').eq('batch_id', b_id).execute()
        print(f"  Total Subjects: {len(subs.data)}")
        
        to_delete = []
        for s in subs.data:
            code = s['subjects']['code']
            if code.startswith('24DS'):
                to_delete.append(s['id'])
                print(f"    - To Remove: {code} ({s['subjects']['name']})")
            elif code.startswith('25CE'):
                print(f"    - Keep: {code}")
            else:
                print(f"    - Keep (Unknown): {code}")
        
        if to_delete:
            print(f"  Total to remove: {len(to_delete)}")
            # Perform deletion
            # Uncomment to execute
            print("  Deleting...")
            for row_id in to_delete:
                sb.table('batch_subjects').delete().eq('id', row_id).execute()
            print("  Cleanup Done.")
        else:
            print("  No DS subjects found (strange).")

print("Scan complete.")
