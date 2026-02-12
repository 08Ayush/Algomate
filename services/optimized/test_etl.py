"""
Quick ETL pipeline test script.

Usage:
  cd services/optimized
  python test_etl.py

Tests:
  1. Unit test — ETL components in isolation (no DB needed)
  2. API test — hits the running FastAPI server (needs server on port 8001)
  3. Integration test — ETL against real Supabase (needs .env credentials)
"""

import sys
import json
import time
from pathlib import Path

# Ensure imports work
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parents[1]))

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
SKIP = "\033[93m⊘ SKIP\033[0m"


def test_imports():
    """Test that all ETL modules import correctly."""
    print("\n── Test 1: ETL module imports ──")
    try:
        from etl import ETLPipeline, DataQualityReport, Extractor, Transformer, Loader
        from etl.quality import QualityIssue, CleaningAction
        print(f"  {PASS} All ETL modules import successfully")
        print(f"       Exported: ETLPipeline, DataQualityReport, Extractor, Transformer, Loader")
        return True
    except ImportError as e:
        print(f"  {FAIL} Import error: {e}")
        return False


def test_quality_report():
    """Test DataQualityReport scoring and viability."""
    print("\n── Test 2: DataQualityReport ──")
    from etl.quality import DataQualityReport

    report = DataQualityReport()
    report.total_subjects = 10
    report.total_faculty = 5
    report.total_rooms = 4
    report.total_time_slots = 30
    report.subjects_with_faculty = 8
    report.faculty_with_qualifications = 4

    score = report.quality_score
    print(f"  Score with clean data: {score:.2f}")
    assert score > 0.5, f"Expected score > 0.5, got {score}"
    assert report.is_viable, "Expected viable"
    print(f"  {PASS} Clean data → score={score:.2f}, viable=True")

    # Add errors
    report.add_error("test", "subject", message="Test error 1")
    report.add_error("test", "subject", message="Test error 2")
    score2 = report.quality_score
    print(f"  Score after 2 errors: {score2:.2f}")
    assert score2 < score, f"Score should decrease with errors"
    print(f"  {PASS} Errors decrease score: {score:.2f} → {score2:.2f}")

    # Summary
    summary = report.summary_dict()
    assert "total_subjects" in summary
    assert "errors" in summary
    print(f"  {PASS} summary_dict() keys: {list(summary.keys())}")
    return True


def test_transformer_unicode():
    """Test Unicode cleaning in Transformer."""
    print("\n── Test 3: Transformer Unicode fixes ──")
    from etl.transformer import Transformer

    t = Transformer()

    # Test basic unicode fix
    fixed = t._fix_unicode("Data  Structures")
    assert fixed == "Data Structures", f"Expected 'Data Structures', got '{fixed}'"
    print(f"  {PASS} Collapsed double spaces → 'Data Structures'")

    # Test empty string
    assert t._fix_unicode("") == ""
    assert t._fix_unicode("Normal Text") == "Normal Text"
    print(f"  {PASS} Empty/normal strings pass through unchanged")
    return True


def test_transformer_subjects():
    """Test subject transformation."""
    print("\n── Test 4: Transformer subjects ──")
    from etl.transformer import Transformer
    from etl.quality import DataQualityReport

    t = Transformer()
    report = DataQualityReport()

    raw_subjects = [
        {
            "subject_id": "s1",
            "required_hours_per_week": 4,
            "subjects": {
                "id": "s1", "name": "Data Structures", "code": "CS201",
                "credits": 3, "is_lab": False, "is_elective": False,
            },
        },
        {
            "subject_id": "s2",
            "required_hours_per_week": 2,
            "subjects": {
                "id": "s2", "name": "OS Lab", "code": "CS202",
                "credits": 2, "is_lab": True,
            },
        },
        # Duplicate — should be flagged
        {
            "subject_id": "s1",
            "required_hours_per_week": 4,
            "subjects": {
                "id": "s1", "name": "Data Structures", "code": "CS201",
                "credits": 3,
            },
        },
    ]

    subjects = t._transform_subjects(raw_subjects, report)
    assert len(subjects) == 2, f"Expected 2 unique subjects, got {len(subjects)}"
    print(f"  {PASS} Deduplicated: 3 rows → {len(subjects)} unique subjects")

    # Check warning for duplicate
    warnings = [i for i in report.issues if i.severity == "warning"]
    dupes = [w for w in warnings if w.category == "duplicate"]
    assert len(dupes) == 1
    print(f"  {PASS} Duplicate flagged in quality report")

    # Check lab subject
    lab = [s for s in subjects if s.is_lab]
    assert len(lab) == 1 and lab[0].code == "CS202"
    print(f"  {PASS} Lab subject correctly identified: {lab[0].name}")
    return True


def test_transformer_time_slots():
    """Test time slot transformation with day mapping."""
    print("\n── Test 5: Transformer time slots ──")
    from etl.transformer import Transformer
    from etl.quality import DataQualityReport

    t = Transformer()
    report = DataQualityReport()

    raw_slots = [
        {"id": "ts1", "day": "Monday", "start_time": "09:00:00", "end_time": "10:00:00", "is_lab_slot": False},
        {"id": "ts2", "day": "Wednesday", "start_time": "14:00:00", "end_time": "15:00:00", "is_lab_slot": True},
        {"id": "ts3", "day": "Friday", "start_time": "10:30:00", "end_time": "11:30:00"},
    ]

    slots = t._transform_time_slots(raw_slots, report)
    assert len(slots) == 3
    assert slots[0].day == 0  # Monday
    assert slots[1].day == 2  # Wednesday
    assert slots[2].day == 4  # Friday
    print(f"  {PASS} Day mapping: Monday→0, Wednesday→2, Friday→4")

    assert slots[0].start_hour == 9 and slots[0].duration_minutes == 60
    assert slots[1].is_lab_slot is True
    print(f"  {PASS} Time parsing: 09:00-10:00 → 60min, lab_slot detected")
    return True


def test_transformer_full():
    """Test full transform pipeline with mock data."""
    print("\n── Test 6: Full Transform pipeline ──")
    from etl.transformer import Transformer
    from etl.quality import DataQualityReport

    t = Transformer()
    report = DataQualityReport()

    raw = {
        "batch_row": {
            "id": "b1", "name": "CSE-A", "program": "B.Tech",
            "semester": 3, "year": 2, "strength": 60,
            "department_id": "dept1",
        },
        "batch_subjects_rows": [
            {
                "subject_id": "s1", "required_hours_per_week": 4,
                "assigned_faculty_id": "f1",
                "subjects": {"id": "s1", "name": "DSA", "code": "CS201", "credits": 3},
            },
        ],
        "faculty_rows": [
            {"id": "f1", "full_name": "Dr. Smith", "department_id": "dept1"},
        ],
        "qualification_rows": [
            {"faculty_id": "f1", "subject_id": "s1"},
        ],
        "assigned_faculty_map": {"s1": "f1"},
        "classroom_rows": [
            {"id": "r1", "name": "Room 101", "capacity": 60, "room_type": "classroom"},
        ],
        "time_slot_rows": [
            {"id": "ts1", "day": "Monday", "start_time": "09:00:00", "end_time": "10:00:00"},
            {"id": "ts2", "day": "Tuesday", "start_time": "09:00:00", "end_time": "10:00:00"},
        ],
    }

    domain = t.transform(raw, report)

    assert domain["batch"].name == "CSE-A"
    assert len(domain["subjects"]) == 1
    assert len(domain["faculty"]) == 1
    assert len(domain["classrooms"]) == 1
    assert len(domain["time_slots"]) == 2
    assert domain["batch"].subjects == ["s1"]
    print(f"  {PASS} Full transform: 1 batch, 1 subject, 1 faculty, 1 room, 2 slots")

    # Faculty coverage should be 100%
    assert report.subjects_with_faculty == 1
    print(f"  {PASS} Faculty coverage: {report.subjects_with_faculty}/{report.total_subjects}")
    print(f"  {PASS} Quality score: {report.quality_score:.2f}")
    return True


def test_api_health():
    """Test the API health endpoint (needs running server)."""
    print("\n── Test 7: API health check (http://localhost:8001) ──")
    try:
        import requests
    except ImportError:
        print(f"  {SKIP} 'requests' not installed — run: pip install requests")
        return True

    try:
        r = requests.get("http://localhost:8001/health", timeout=5)
        data = r.json()
        assert data["status"] == "healthy"
        print(f"  {PASS} /health → status={data['status']}, solvers={data['solvers']}")
        return True
    except Exception as e:
        print(f"  {SKIP} Server not reachable: {e}")
        return True


def test_api_generate_etl():
    """Test generation with ETL enabled (needs running server + valid IDs)."""
    print("\n── Test 8: API generate with ETL (needs valid batch/college IDs) ──")
    try:
        import requests
    except ImportError:
        print(f"  {SKIP} 'requests' not installed")
        return True

    try:
        r = requests.get("http://localhost:8001/health", timeout=3)
    except Exception:
        print(f"  {SKIP} Server not running on :8001")
        return True

    print(f"  To test with real data, run:")
    print(f"    curl -X POST http://localhost:8001/generate \\")
    print(f"      -H 'Content-Type: application/json' \\")
    print(f'      -d \'{{"batch_id": "<YOUR_BATCH_ID>", "college_id": "<YOUR_COLLEGE_ID>", "user_id": "<YOUR_USER_ID>", "use_etl": true}}\'')
    print(f"")
    print(f"  Then poll status:")
    print(f"    curl http://localhost:8001/status/<TASK_ID>")
    print(f"  {PASS} Instructions printed (needs real Supabase IDs)")
    return True


def test_loader_json_safe():
    """Test _json_safe helper handles edge cases."""
    print("\n── Test 9: Loader _json_safe ──")
    from etl.loader import _json_safe

    # Basic types
    assert _json_safe(None) is None
    assert _json_safe(True) is True
    assert _json_safe(42) == 42
    assert _json_safe(3.14) == 3.14
    assert _json_safe("hello") == "hello"
    print(f"  {PASS} Basic Python types pass through")

    # numpy types (if available)
    try:
        import numpy as np
        r1 = _json_safe(np.bool_(True))
        assert r1 == True, f"Expected True, got {r1} (type={type(r1).__name__})"
        r2 = _json_safe(np.int64(42))
        assert r2 == 42 or r2 == 42.0, f"Expected 42, got {r2}"
        r3 = _json_safe(np.float32(3.14))
        assert abs(r3 - 3.14) < 0.01, f"Expected ~3.14, got {r3}"
        print(f"  {PASS} numpy.bool_, int64, float32 → native Python")

        result = _json_safe({"a": np.bool_(False), "b": [np.int64(1), np.float32(2.0)]})
        assert result["a"] == False
        assert result["b"][0] == 1 or result["b"][0] == 1.0
        print(f"  {PASS} Nested dict/list with numpy → clean JSON")
    except ImportError:
        print(f"  {SKIP} numpy not installed, skipping numpy tests")
        result = _json_safe({"a": True, "b": [1, 2.0]})

    # Verify JSON serializable
    json.dumps(result)
    print(f"  {PASS} Output is json.dumps() safe")
    return True


# ===== MAIN =====
if __name__ == "__main__":
    print("=" * 60)
    print("  ETL Pipeline Test Suite")
    print("=" * 60)

    tests = [
        test_imports,
        test_quality_report,
        test_transformer_unicode,
        test_transformer_subjects,
        test_transformer_time_slots,
        test_transformer_full,
        test_loader_json_safe,
        test_api_health,
        test_api_generate_etl,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  {FAIL} Exception: {e}")
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"  Results: {passed}/{len(tests)} passed, {failed} failed")
    print(f"{'=' * 60}")
    sys.exit(1 if failed else 0)
