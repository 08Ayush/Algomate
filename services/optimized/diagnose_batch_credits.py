"""
Diagnostic script to verify credit-based scheduling for a specific batch.
"""
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from storage.supabase_client import SupabaseSchedulerClient

def analyze_batch_credits(batch_id: str, college_id: str):
    client = SupabaseSchedulerClient()
    
    print("="*80)
    print(f"CREDIT-BASED SCHEDULING ANALYSIS")
    print(f"Batch: {batch_id}")
    print("="*80)
    
    # Fetch batch_subjects data
    bs_response = (
        client.client.table("batch_subjects")
        .select("subject_id, required_hours_per_week, subjects(name, code, credits_per_week, credit_value, subject_type)")
        .eq("batch_id", batch_id)
        .execute()
    )
    
    batch_subjects = bs_response.data if bs_response.data else []
    
    print(f"\nTotal subjects in batch: {len(batch_subjects)}\n")
    
    total_theory_hours = 0
    total_lab_hours = 0
    total_classes_expected = 0
    
    print(f"{'Subject':<40} {'Type':<10} {'Credits':<8} {'Expected Classes':<18} {'DB Hours':<10}")
    print("-" * 100)
    
    for bs in batch_subjects:
        subject = bs.get('subjects', {})
        if not subject:
            continue
            
        name = subject.get('name', 'Unknown')[:38]
        code = subject.get('code', 'N/A')
        credits = subject.get('credits_per_week', 0)
        credit_val = subject.get('credit_value', 0)
        sub_type = subject.get('subject_type', 'THEORY')
        db_hours = bs.get('required_hours_per_week', 0)
        
        # Calculate expected classes based on credit-to-hours rule
        if sub_type in ['LAB', 'PRACTICAL']:
            # Lab: 1 credit = 2 hours, but scheduled as 1 block
            expected_classes = credits  # 1 lab session per credit (2-hour blocks)
            total_lab_hours += credits * 2
        else:
            # Theory: 1 credit = 1 hour = 1 class
            expected_classes = credits
            total_theory_hours += credits
        
        total_classes_expected += expected_classes
        
        print(f"{name:<40} {sub_type:<10} {credits:<8} {expected_classes:<18} {db_hours:<10}")
    
    print("-" * 100)
    print(f"\n{'SUMMARY':<40}")
    print(f"  Theory hours total:     {total_theory_hours}")
    print(f"  Lab hours total:        {total_lab_hours}")
    print(f"  Total classes expected: {total_classes_expected}")
    print(f"  Available time slots:   48 (6 days × 8 slots)")
    print(f"  Utilization:            {total_classes_expected}/48 = {(total_classes_expected/48)*100:.1f}%")
    
    if total_classes_expected > 48:
        print(f"\n  ⚠️  WARNING: Over-allocated! Need {total_classes_expected - 48} more slots")
    elif total_classes_expected == 48:
        print(f"\n  ⚠️  WARNING: 100% utilization - zero flexibility for good scheduling")
    else:
        print(f"\n  ✅ OK: {48 - total_classes_expected} slots available for optimization")
    
    print("\n" + "="*80)
    
    # Check faculty assignments
    with_faculty = [bs for bs in batch_subjects if bs.get('assigned_faculty_id')]
    print(f"\nFaculty Assignment Status:")
    print(f"  Subjects with assigned faculty: {len(with_faculty)}/{len(batch_subjects)}")
    
    if len(with_faculty) < len(batch_subjects):
        print(f"  ⚠️  {len(batch_subjects) - len(with_faculty)} subjects lack faculty assignment!")
        print(f"      → This may cause random faculty assignment and conflicts")

if __name__ == "__main__":
    # Current batch with low score
    batch_id = "15b7a264-e228-4ef0-8234-26235c4416d8"
    college_id = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f"
    
    analyze_batch_credits(batch_id, college_id)
    
    print("\n" + "="*80)
    print("COMPARING WITH SUCCESSFUL BATCH")
    print("="*80)
    
    # Previous successful batch
    success_batch_id = "abbdd58e-f543-4e82-acbf-e813df03e23c"
    analyze_batch_credits(success_batch_id, college_id)
