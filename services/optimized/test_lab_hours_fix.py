"""
Test script to verify lab hours doubling fix.

Tests that subjects with is_lab=True and required_hours_per_week=1
get hours_per_week=2 (doubled).
"""

from etl.transformer import Transformer
from etl.quality import DataQualityReport


def test_lab_hours_calculation():
    """Test that labs get doubled hours."""
    transformer = Transformer()
    report = DataQualityReport(batch_id="test", college_id="test")
    
    # Simulate batch_subjects row for a lab subject
    batch_subjects_rows = [
        {
            "batch_id": "test-batch",
            "subject_id": "lab-subject-1",
            "assigned_faculty_id": None,
            "required_hours_per_week": 1,  # Admin set this to 1 credit
            "subjects": {
                "id": "lab-subject-1",
                "name": "Database Lab",
                "code": "CS401P",
                "subject_type": "LAB",  # This is a lab
                "credits_per_week": 1,
                "credit_value": 1.0,
                "requires_lab": True,
                "lab_hours": 2,
                "lecture_hours": 0,
                "tutorial_hours": 0,
                "practical_hours": 2,
                "is_elective": False,
            }
        },
        {
            "batch_id": "test-batch",
            "subject_id": "theory-subject-1",
            "assigned_faculty_id": None,
            "required_hours_per_week": 3,  # Theory with 3 hours
            "subjects": {
                "id": "theory-subject-1",
                "name": "Data Structures",
                "code": "CS301T",
                "subject_type": "THEORY",
                "credits_per_week": 3,
                "credit_value": 3.0,
                "requires_lab": False,
                "lab_hours": 0,
                "lecture_hours": 3,
                "tutorial_hours": 0,
                "practical_hours": 0,
                "is_elective": False,
            }
        },
        {
            "batch_id": "test-batch",
            "subject_id": "practical-subject-1",
            "assigned_faculty_id": None,
            "required_hours_per_week": 2,  # Practical with 2 credits
            "subjects": {
                "id": "practical-subject-1",
                "name": "Mini Project",
                "code": "CS402P",
                "subject_type": "PRACTICAL",
                "credits_per_week": 2,
                "credit_value": 1.0,
                "requires_lab": False,
                "lab_hours": 0,
                "lecture_hours": 0,
                "tutorial_hours": 0,
                "practical_hours": 2,
                "is_elective": False,
            }
        },
    ]
    
    subjects = transformer._transform_subjects(batch_subjects_rows, report)
    
    print("=" * 60)
    print("LAB HOURS DOUBLING TEST")
    print("=" * 60)
    
    for subject in subjects:
        print(f"\nSubject: {subject.name} ({subject.code})")
        print(f"  is_lab: {subject.is_lab}")
        print(f"  credits: {subject.credits}")
        print(f"  hours_per_week: {subject.hours_per_week}")
        
        # Verify expectations
        if subject.code == "CS401P":  # Lab
            expected = 2  # 1 credit * 2 slots
            status = "✓" if subject.hours_per_week == expected else "✗"
            print(f"  Expected: {expected} hours (1 lab credit = 2 slots) {status}")
        elif subject.code == "CS301T":  # Theory
            expected = 3  # 3 credits * 1 slot each
            status = "✓" if subject.hours_per_week == expected else "✗"
            print(f"  Expected: {expected} hours (3 theory credits = 3 slots) {status}")
        elif subject.code == "CS402P":  # Practical
            expected = 4  # 2 credits * 2 slots each
            status = "✓" if subject.hours_per_week == expected else "✗"
            print(f"  Expected: {expected} hours (2 practical credits = 4 slots) {status}")
    
    print("\n" + "=" * 60)
    
    # Verify all passed
    lab_subject = next(s for s in subjects if s.code == "CS401P")
    theory_subject = next(s for s in subjects if s.code == "CS301T")
    practical_subject = next(s for s in subjects if s.code == "CS402P")
    
    assert lab_subject.hours_per_week == 2, f"Lab subject should have 2 hours, got {lab_subject.hours_per_week}"
    assert theory_subject.hours_per_week == 3, f"Theory subject should have 3 hours, got {theory_subject.hours_per_week}"
    assert practical_subject.hours_per_week == 4, f"Practical subject should have 4 hours, got {practical_subject.hours_per_week}"
    
    print("\n✓ ALL TESTS PASSED!\n")
    return True


if __name__ == "__main__":
    try:
        test_lab_hours_calculation()
    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}\n")
        import traceback
        traceback.print_exc()
        exit(1)
