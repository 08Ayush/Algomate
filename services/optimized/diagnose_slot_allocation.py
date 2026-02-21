"""
Diagnostic script to check if batch subject hours exceed available time slots
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from storage.supabase_client import SupabaseSchedulerClient


async def diagnose_allocation():
    """Check if we're over-allocating subjects to batches."""
    scheduler_client = SupabaseSchedulerClient()
    client = scheduler_client.client
    
    print("\n" + "="*70)
    print("SLOT ALLOCATION DIAGNOSIS")
    print("="*70)
    
    # Get time slots
    slots_response = client.table('time_slots').select('*').execute()
    time_slots = slots_response.data if slots_response else []
    
    # Group by day to count slots per day
    slots_by_day = {}
    for slot in time_slots:
        day = slot.get('day', 0)  # Some schemas may use 'day' or 'day_of_week'
        if day not in slots_by_day:
            slots_by_day[day] = []
        slots_by_day[day].append(slot)
    
    print(f"\n📊 Time Slots Available:")
    total_slots_per_week = 0
    for day, slots in sorted(slots_by_day.items()):
        print(f"  Day {day}: {len(slots)} slots")
        total_slots_per_week += len(slots)
    print(f"  TOTAL PER WEEK: {total_slots_per_week} slots")
    
    # Get all batches with their subjects
    batches_response = client.table('batches').select('*').execute()
    batches = batches_response.data if batches_response else []
    
    print(f"\n📚 Analyzing {len(batches)} batches...\n")
    
    for batch in batches:
        batch_id = batch['id']
        batch_name = batch['name']
        
        # Get batch subjects
        bs_response = client.table('batch_subjects').select(
            'subject_id, required_hours_per_week, subjects(name, credits_per_week, credit_value, subject_type)'
        ).eq('batch_id', batch_id).execute()
        
        batch_subjects = bs_response.data if bs_response else []
        
        if not batch_subjects:
            continue
        
        total_hours_required = 0
        subjects_breakdown = []
        
        for bs in batch_subjects:
            subject = bs.get('subjects')
            if not subject:
                continue
            
            # Calculate hours same way transformer does
            required_hours = bs.get('required_hours_per_week')
            credits = subject.get('credits_per_week') or subject.get('credit_value') or 0
            subject_type = subject.get('subject_type', 'THEORY')
            is_lab = subject_type in ['LAB', 'PRACTICAL']
            
            if required_hours and int(required_hours) > 0:
                hours = int(required_hours)
                if is_lab:
                    hours = hours * 2  # Lab credits need 2 slots each
            elif credits > 0:
                hours = int(credits) * 2 if is_lab else int(credits)
            else:
                hours = 3  # Default
            
            total_hours_required += hours
            subjects_breakdown.append({
                'name': subject['name'],
                'credits': int(credits),
                'is_lab': is_lab,
                'hours': hours
            })
        
        # Calculate utilization
        utilization_pct = (total_hours_required / total_slots_per_week * 100) if total_slots_per_week > 0 else 0
        
        print(f"{'='*70}")
        print(f"Batch: {batch_name}")
        print(f"{'='*70}")
        print(f"  Total hours required: {total_hours_required}")
        print(f"  Available slots/week: {total_slots_per_week}")
        print(f"  Utilization: {utilization_pct:.1f}%")
        
        if utilization_pct > 90:
            print(f"  ⚠️  WARNING: Very high utilization! May cause scheduling conflicts.")
        elif utilization_pct > 100:
            print(f"  ❌ ERROR: OVER-ALLOCATED! {total_hours_required - total_slots_per_week} hours over capacity!")
        else:
            print(f"  ✅ OK: Sufficient slots available")
        
        print(f"\n  Subject Breakdown:")
        for subj in subjects_breakdown:
            lab_marker = "🧪" if subj['is_lab'] else "📖"
            print(f"    {lab_marker} {subj['name']:<40} {subj['credits']:>2} credits → {subj['hours']:>2} hours/week")
        print()


if __name__ == "__main__":
    asyncio.run(diagnose_allocation())
