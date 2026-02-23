import logging
logging.disable(logging.CRITICAL)
from storage.supabase_client import get_supabase_client
client = get_supabase_client()

codes = ['25CE503T', '25CE504T', '25CE531M']
for code in codes:
    s = client.table('subjects').select('id, name, department_id, semester').eq('code', code).execute()
    if s.data:
        subj = s.data[0]
        print(f"Subject: {subj['code']} | Name: {subj['name']} | Dept: {subj['department_id'][:8]} | Sem: {subj['semester']}")
        
        # Find active batches for this dept and sem
        b = client.table('batches').select('id, name').eq('department_id', subj['department_id']).eq('semester', subj['semester']).eq('is_active', True).execute()
        for batch in b.data:
            link = client.table('batch_subjects').select('id').eq('batch_id', batch['id']).eq('subject_id', subj['id']).execute()
            print(f"  Batch: {batch['name']} | Linked: {'Yes' if link.data else 'No'}")
