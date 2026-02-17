# Complete Testing Guide for Optimized Scheduler

## 🚀 Quick Start Testing

### 1. Environment Setup

```bash
cd "d:\pallotti college docs\SIH 2025\prototype\academic_campass_2025\services\optimized"

# Activate virtual environment (if not already active)
python -m venv venv
.\venv\Scripts\activate

# Verify installation
pip list | findstr "ortools scipy scikit-learn"
```

### 2. Run Demo Pipeline (Fastest Test)

```bash
# Test the complete Hybrid GA+CP-SAT pipeline
python demo_hybrid_pipeline.py
```

**Expected Output:**
```
================================================================================
HYBRID GA+CPSAT SOLVER DEMONSTRATION
================================================================================

[STEP 1] Creating scheduling context...
  ✓ 30 time slots
  ✓ 5 rooms
  ✓ 5 subjects
  ✓ 3 faculty
  ✓ 2 batches
  ✓ 8 requirements

[STEP 2] Configuring Hybrid GA+CPSAT solver...
  ✓ Solver configured
    - Population: 50
    - Generations: 100
    - Mutation rate: 0.15

[STEP 3] Running optimization (60 seconds)...

======================================================================
HYBRID GA+CPSAT SOLVER STARTED
Total timeout: 60s (GA: 24s, CP-SAT: 36s)
======================================================================

[PHASE 1] Genetic Algorithm Exploration
----------------------------------------------------------------------
✓ GA completed in 24.3s
  Quality: 0.8234
  Assignments: 26

[PHASE 2] CP-SAT Refinement
----------------------------------------------------------------------
✓ CP-SAT completed in 35.1s
  Quality: 0.9156
  Improvement: +11.2%

======================================================================
OPTIMIZATION COMPLETE
======================================================================
Final Quality: 0.9156
Total Time: 59.4s
Assignments: 26/26 scheduled
```

### 3. Run Unit Tests

```bash
# Run all tests with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run specific test categories
pytest tests/test_models.py -v          # Core models
pytest tests/test_solvers.py -v         # All solvers
pytest tests/test_ga_hybrid.py -v       # Hybrid solver
pytest tests/test_integration.py -v     # End-to-end
pytest tests/test_features.py -v        # ML features
pytest tests/test_predictor.py -v       # ML predictor
```

**Expected Results:**
```
============ 150 passed in 45.23s ============
Coverage: 85%
```

### 4. Run Evaluation Module

```bash
# Run comprehensive evaluation with all metrics
python run_evaluation.py
```

This tests:
- ✅ Precision/Recall metrics
- ✅ ROC-AUC analysis
- ✅ Business KPIs
- ✅ Bias & Fairness metrics
- ✅ Explainability (SHAP values)

### 5. Run API Server Test

```bash
# Start the FastAPI server
uvicorn api.server:app --reload --port 8000
```

Then in another terminal:

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test schedule generation (mock data)
curl -X POST http://localhost:8000/api/v1/schedule \
  -H "Content-Type: application/json" \
  -d "{\"institution_id\": \"demo\", \"batch_ids\": [\"CSE_A\"]}"
```

---

## 🎯 Testing with Real Data

### Option A: Using Supabase Database (CSE 7th Semester Example)

**We've created a ready-to-use script: `test_real_data.py`**

1. **Install additional dependencies:**

```bash
pip install supabase python-dotenv
```

2. **Configure environment:**

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-anon-key-here
```

3. **Run the real data test:**

```bash
python test_real_data.py
```

**Expected Output:**

```
================================================================================
TIMETABLE GENERATION FOR CSE 7TH SEMESTER (Real Database Data)
================================================================================

[1/8] Searching for CSE 7th semester batch...
  ✓ Found batch: CSE Section A
    - Department: Computer Science
    - Semester: 7
    - Section: A
    - Strength: 60
    - Academic Year: 2025-26

[2/8] Fetching time slots...
  ✓ Loaded 30 time slots across 5 days

[3/8] Fetching classrooms...
  ✓ Loaded 15 classrooms (3 labs, 12 regular)

[4/8] Fetching subjects for batch...
  ✓ Loaded 8 subjects (6 theory, 2 labs)

[5/8] Fetching qualified faculty...
  ✓ Loaded 12 faculty members

[6/8] Creating scheduling context...
  ✓ Context created successfully
    - Institution: Demo College
    - Batch: CSE Section A (Semester 7)
    - Time Slots: 30
    - Classrooms: 15
    - Subjects: 8
    - Faculty: 12

[7/8] Running Hybrid GA+CP-SAT optimization...
--------------------------------------------------------------------------------
[Optimization logs...]
--------------------------------------------------------------------------------

  ✓ Optimization complete!
    - Quality Score: 0.9234
    - Total Assignments: 26
    - Solver: hybrid_ga_cpsat
    - Time Taken: 67.45s

  📊 Solution Summary:
    - Subjects scheduled: 8
      • Machine Learning: 4 classes
      • Cloud Computing: 3 classes
      • Big Data Analytics: 3 classes
      • ML Lab: 2 classes
      • [... more subjects ...]

[8/8] Saving timetable to database...
  ✓ Timetable created with ID: abc123-...
  ✓ Inserted 26 scheduled classes

================================================================================
✅ TIMETABLE GENERATION SUCCESSFUL!
================================================================================

Timetable ID: abc123-def456-ghi789
Quality Score: 0.9234
Total Classes: 26

You can now view this timetable in the database:
  - generated_timetables table (ID: abc123-def456-ghi789)
  - scheduled_classes table (timetable_id: abc123-def456-ghi789)
```

**What the script does:**

✅ Automatically finds CSE 7th semester batch in your database  
✅ Fetches all related data (time slots, rooms, subjects, faculty)  
✅ Transforms database records to scheduler models  
✅ Runs Hybrid GA+CP-SAT optimization  
✅ Saves generated timetable back to database  
✅ Creates records in `generated_timetables` and `scheduled_classes` tables

**Customize for different batches:**

Edit the script's `find_cse_7th_sem_batch()` method to search for:
- Different departments (change `'CSE'` filter)
- Different semesters (change `.eq('semester', 7)`)
- Specific batch names (add `.eq('name', 'Batch Name')`)

4. **Verify in Database:**

```sql
-- Check generated timetable
SELECT * FROM generated_timetables 
WHERE batch_id = 'your-batch-id' 
ORDER BY created_at DESC LIMIT 1;

-- View scheduled classes
SELECT 
  sc.*,
  s.name as subject_name,
  u.first_name || ' ' || u.last_name as faculty_name,
  c.name as classroom_name,
  ts.day, ts.start_time
FROM scheduled_classes sc
JOIN subjects s ON sc.subject_id = s.id
JOIN users u ON sc.faculty_id = u.id
JOIN classrooms c ON sc.classroom_id = c.id
JOIN time_slots ts ON sc.time_slot_id = ts.id
WHERE sc.timetable_id = 'your-timetable-id'
ORDER BY ts.day, ts.start_time;
```

### Option B: Using CSV/Excel Files

1. **Prepare data files:**

```
data/
  ├── time_slots.csv
  ├── rooms.csv
  ├── faculty.csv
  ├── batches.csv
  ├── subjects.csv
  └── requirements.csv
```

2. **Create ETL script:**

```python
# File: test_csv_data.py
import pandas as pd
from core.models import TimeSlot, Room, Faculty, Batch, Subject
from core.context import SchedulingContext
from solvers.hybrid_ga_cpsat import HybridGACPSATSolver

# Load CSV files
slots_df = pd.read_csv("data/time_slots.csv")
rooms_df = pd.read_csv("data/rooms.csv")
faculty_df = pd.read_csv("data/faculty.csv")
batches_df = pd.read_csv("data/batches.csv")
subjects_df = pd.read_csv("data/subjects.csv")
requirements_df = pd.read_csv("data/requirements.csv")

# Convert to model objects
time_slots = [
    TimeSlot(
        id=row['id'],
        day=row['day'],
        start_hour=row['start_hour'],
        start_minute=row['start_minute'],
        duration_minutes=row['duration_minutes']
    )
    for _, row in slots_df.iterrows()
]

rooms = [
    Room(
        id=row['id'],
        name=row['name'],
        capacity=row['capacity'],
        is_lab=row['is_lab']
    )
    for _, row in rooms_df.iterrows()
]

# ... similar for faculty, batches, subjects, requirements

# Create context and solve
context = SchedulingContext(
    institution_id="csv_test",
    semester=1,
    academic_year="2025-26",
    time_slots=time_slots,
    rooms=rooms,
    subjects=subjects,
    faculty=faculty,
    batches=batches,
    requirements=requirements
)

solver = HybridGACPSATSolver(context)
solution = solver.solve(timeout=300)

print(f"Quality: {solution.quality_score:.4f}")
print(f"Assignments: {len(solution.assignments)}")

# Export to CSV
assignments_data = []
for assignment in solution.assignments:
    assignments_data.append({
        'batch': assignment.batch_id,
        'subject': assignment.subject_id,
        'faculty': assignment.faculty_id,
        'room': assignment.room_id,
        'day': assignment.time_slot.day,
        'time': f"{assignment.time_slot.start_hour}:{assignment.time_slot.start_minute:02d}"
    })

result_df = pd.DataFrame(assignments_data)
result_df.to_csv("output/timetable.csv", index=False)
print("Timetable saved to output/timetable.csv")
```

---

## 📊 Performance Benchmarking

```bash
# Run comparison between solvers
python run_comparison.py
```

**Compares:**
- CP-SAT only
- GA only  
- Hybrid GA+CP-SAT
- Hybrid GA+CP-SAT + ML

**Expected Output:**
```
============================================================
SOLVER COMPARISON RESULTS
============================================================

Solver              Time(s)   Quality   Hard Violations
------------------------------------------------------------
CP-SAT              87.3      0.8234    0
GA                  45.2      0.7891    3
Hybrid GA+CPSAT     65.7      0.8945    0
Hybrid+ML           58.4      0.9102    0

Winner: Hybrid+ML (15.6% better than CP-SAT)
```

---

## 🐛 Debugging & Troubleshooting

### Enable Verbose Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)

from utils.logger import get_logger
logger = get_logger(__name__)
logger.setLevel(logging.DEBUG)
```

### Check System Health

```python
from utils.health import HealthChecker

checker = HealthChecker()
health = checker.check_all()

print(f"Database: {health['database']}")
print(f"Solvers: {health['solvers']}")
print(f"ML Models: {health['ml_models']}")
```

### Validate Input Data

```python
from utils.validation import Validator

validator = Validator()
issues = validator.validate_context(context)

if issues:
    for issue in issues:
        print(f"❌ {issue}")
else:
    print("✅ All validation checks passed")
```

---

## 📈 Monitoring During Testing

### Watch Metrics

```python
from utils.metrics import get_metrics_collector

collector = get_metrics_collector()

# After solving
stats = collector.get_all_stats()
print(f"Average solve time: {stats['solve_time']['mean']:.2f}s")
print(f"Quality range: {stats['quality']['min']:.2f} - {stats['quality']['max']:.2f}")
```

### Check Logs

```bash
# Tail the log file
tail -f logs/ensemble_scheduler_20260213.log

# Or on Windows
Get-Content logs\ensemble_scheduler_20260213.log -Wait -Tail 50
```

---

## ✅ Test Checklist

- [ ] Environment setup complete
- [ ] Demo pipeline runs successfully
- [ ] All unit tests pass (150/150)
- [ ] Integration tests pass
- [ ] Evaluation metrics calculated
- [ ] API server starts and responds
- [ ] Real data loading works (if applicable)
- [ ] Performance meets expectations (<120s for typical problem)
- [ ] Solution quality >0.85
- [ ] No hard constraint violations
- [ ] Logs are clean (no errors)
- [ ] Database persistence works (if applicable)

---

## 🎯 Next Steps After Testing

Once testing is successful:

1. **Production Configuration:**
   - Set `SCHEDULER_PROFILE=production`
   - Configure all 3 solvers
   - Enable parallel execution
   - Set appropriate timeouts

2. **Integration:**
   - Connect to frontend via API
   - Set up database persistence
   - Configure monitoring/alerting
   - Deploy to staging environment

3. **Performance Tuning:**
   - Adjust GA parameters
   - Tune constraint weights
   - Optimize database queries
   - Enable caching

4. **Monitoring:**
   - Set up Prometheus/Grafana
   - Configure alert thresholds
   - Enable distributed tracing
   - Monitor solution quality metrics

---

## 📞 Support

- **Logs:** Check `logs/` directory
- **Docs:** See `PIPELINE_ARCHITECTURE.md`, `IMPLEMENTATION_STATUS.md`
- **Tests:** Run `pytest -v` for detailed test output
- **Issues:** Enable DEBUG logging for troubleshooting
