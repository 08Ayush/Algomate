"""
Diagnostic script to check faculty qualification data for the batch.
"""
import sys
from pathlib import Path

# Add optimized package to path
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from storage.supabase_client import SupabaseSchedulerClient

def main():
    batch_id = "abbdd58e-f543-4e82-acbf-e813df03e23c"
    college_id = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f"
    
    client = SupabaseSchedulerClient()
    
    print("="*80)
    print(f"FACULTY QUALIFICATION DIAGNOSTIC FOR BATCH: {batch_id}")
    print("="*80)
    
    # 1. Check faculty_qualified_subjects table
    print("\n1. Checking faculty_qualified_subjects table...")
    qual_rows = []
    try:
        qual_response = (
            client.client.table("faculty_qualified_subjects")
            .select("faculty_id, subject_id, users!faculty_id(full_name, department_id)")
            .execute()
        )
        qual_rows = qual_response.data if qual_response.data else []
        print(f"   Total qualification records in DB: {len(qual_rows)}")
        
        if qual_rows:
            print(f"   Sample (first 5):")
            for qr in qual_rows[:5]:
                fac_name = qr.get('users', {}).get('full_name', 'Unknown') if qr.get('users') else 'Unknown'
                print(f"     - Faculty: {fac_name}, Subject ID: {qr.get('subject_id')}")
        else:
            print("   ⚠️ WARNING: faculty_qualified_subjects table is EMPTY!")
            
    except Exception as e:
        print(f"   ❌ ERROR fetching qualifications: {e}")
    
    # 2. Check batch_subjects.assigned_faculty_id
    print("\n2. Checking batch_subjects.assigned_faculty_id...")
    bs_rows = []
    with_faculty = []
    try:
        bs_response = (
            client.client.table("batch_subjects")
            .select("subject_id, assigned_faculty_id, subjects(name, code)")
            .eq("batch_id", batch_id)
            .execute()
        )
        bs_rows = bs_response.data if bs_response.data else []
        with_faculty = [r for r in bs_rows if r.get("assigned_faculty_id")]
        without_faculty = [r for r in bs_rows if not r.get("assigned_faculty_id")]
        
        print(f"   Total subjects in batch: {len(bs_rows)}")
        print(f"   Subjects WITH assigned faculty: {len(with_faculty)}")
        print(f"   Subjects WITHOUT assigned faculty: {len(without_faculty)}")
        
        if with_faculty:
            print(f"   Subjects with assigned faculty:")
            for bs in with_faculty:
                sub_name = bs.get('subjects', {}).get('name', 'Unknown') if bs.get('subjects') else 'Unknown'
                print(f"     - {sub_name} → Faculty ID: {bs.get('assigned_faculty_id')}")
        else:
            print("   ⚠️ WARNING: NO subjects have assigned_faculty_id set!")
            
    except Exception as e:
        print(f"   ❌ ERROR fetching batch_subjects: {e}")
    
    # 3. Check subjects.required_qualifications
    print("\n3. Checking subjects.required_qualifications...")
    try:
        subject_ids = [r.get("subject_id") for r in bs_rows if r.get("subject_id")]
        if subject_ids:
            sub_response = (
                client.client.table("subjects")
                .select("id, name, code, required_qualifications")
                .in_("id", subject_ids)
                .execute()
            )
            sub_rows = sub_response.data if sub_response.data else []
            
            with_req_quals = [s for s in sub_rows if s.get("required_qualifications")]
            without_req_quals = [s for s in sub_rows if not s.get("required_qualifications")]
            
            print(f"   Subjects WITH required_qualifications: {len(with_req_quals)}")
            print(f"   Subjects WITHOUT required_qualifications: {len(without_req_quals)}")
            
            if with_req_quals:
                print(f"   Subjects with required qualifications:")
                for s in with_req_quals[:5]:
                    print(f"     - {s.get('name')}: {s.get('required_qualifications')}")
            else:
                print("   ⚠️ WARNING: NO subjects have required_qualifications defined!")
                
    except Exception as e:
        print(f"   ❌ ERROR fetching subjects: {e}")
    
    # 4. Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    if not qual_rows and not with_faculty:
        print("❌ CRITICAL: Faculty qualifications are COMPLETELY EMPTY!")
        print("   → No records in faculty_qualified_subjects table")
        print("   → No assigned_faculty_id in batch_subjects")
        print("   → Faculty.qualifications will be [] → can_teach() always returns False")
        print("\nRECOMMENDED FIX:")
        print("   1. Populate faculty_qualified_subjects table, OR")
        print("   2. Set assigned_faculty_id in batch_subjects table")
    elif qual_rows:
        print(f"✅ {len(qual_rows)} qualification records found in faculty_qualified_subjects")
    elif with_faculty:
        print(f"✅ {len(with_faculty)} subjects have assigned_faculty_id")
    
    print("="*80)

if __name__ == "__main__":
    main()
