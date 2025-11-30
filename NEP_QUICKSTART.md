# NEP 2020 Scheduler - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Python Dependencies

```bash
# Install required Python packages
pip install -r requirements.txt

# Or install individually:
pip install ortools supabase python-dotenv
```

### Step 2: Verify Setup

```bash
# Run verification script
python verify_nep_setup.py
```

Expected output:
```
✓ Python version: 3.x.x
✓ Google OR-Tools installed
✓ Supabase client installed
✓ Environment variables configured
✓ Supabase connection successful
✓ NEP Scheduler module can be imported
```

### Step 3: Test with Mock Data

```bash
# Run test with mock J&K ITEP data
python test_nep_scheduler.py
```

Expected output:
```
✅ SOLUTION FOUND!

📚 Major Discipline Pool
   ⏰ Time: 9:00-10:00
   Subject                   Room            Faculty
   ------------------------------------------------------------
   Major_English            Room_A          Dr_Patel
   Major_History            Room_B          Dr_Sharma
   Major_Math               Room_C          Prof_Singh
   Major_Science            Room_D          Dr_Gupta
```

### Step 4: Run Database Migration

```sql
-- In Supabase SQL Editor, run:
\i database/new_implementation_schema.sql
```

This creates:
- `elective_buckets` table
- Updates `subjects` table with NEP fields
- Creates `student_course_selections` table

### Step 5: Create Test Batch & Buckets

#### Option A: Using API

```bash
# Create a bucket via API
curl -X POST http://localhost:3000/api/elective-buckets \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "your-batch-uuid",
    "bucket_name": "Semester 1 Major Pool",
    "is_common_slot": true,
    "min_selection": 1,
    "max_selection": 1,
    "subject_ids": ["subject-uuid-1", "subject-uuid-2"]
  }'
```

#### Option B: Using SQL

```sql
-- Create a test batch
INSERT INTO batches (id, name, college_id, department_id, semester)
VALUES (gen_random_uuid(), 'ITEP 2024 Batch A', 'your-college-id', 'your-dept-id', 1);

-- Create a bucket
INSERT INTO elective_buckets (batch_id, bucket_name, is_common_slot)
VALUES ('batch-uuid', 'Semester 1 Major Pool', TRUE);

-- Link subjects to bucket
UPDATE subjects 
SET course_group_id = 'bucket-uuid'
WHERE id IN ('subject-1', 'subject-2', 'subject-3');
```

### Step 6: Generate Timetable

#### Option A: Using Python CLI

```bash
python services/scheduler/nep_scheduler.py \
  --batch-id "your-batch-uuid" \
  --time-limit 30 \
  --save \
  --output solution.json
```

#### Option B: Using API

```bash
curl -X POST http://localhost:3000/api/nep-scheduler \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "your-batch-uuid",
    "time_limit": 30,
    "save_to_db": true
  }'
```

#### Option C: Using React UI

```tsx
// In your Next.js page
import NEPSchedulerPage from '@/components/NEPScheduler';

export default function SchedulePage() {
  return <NEPSchedulerPage batchId="your-batch-uuid" />;
}
```

---

## 📋 Checklist

- [ ] Python 3.8+ installed
- [ ] `pip install -r requirements.txt` completed
- [ ] `python verify_nep_setup.py` passes all checks
- [ ] `python test_nep_scheduler.py` generates solution
- [ ] Database migration applied
- [ ] Test batch created in Supabase
- [ ] Elective buckets configured
- [ ] Subjects linked to buckets
- [ ] Time slots configured for college
- [ ] Classrooms added to database
- [ ] Faculty availability set up
- [ ] First timetable generated successfully

---

## 🆘 Common Issues

### Issue: "Python not found"

**Solution**:
```bash
# Windows
winget install Python.Python.3.11

# Mac
brew install python

# Linux
apt-get install python3
```

### Issue: "pip command not found"

**Solution**:
```bash
python -m pip install -r requirements.txt
```

### Issue: "No buckets configured"

**Solution**: You need to create elective buckets before generating timetables. Use the API or SQL to create at least one bucket with subjects.

### Issue: "INFEASIBLE - No solution"

**Possible causes**:
1. Not enough classrooms for parallel subjects
2. Faculty assigned to too many subjects at once
3. Not enough time slots

**Solution**: Check the `suggestions` field in the error response for specific guidance.

---

## 📚 Next Steps

After successful setup:

1. **Configure Real Data**: Replace test data with your college's actual departments, subjects, faculty
2. **Set Faculty Availability**: Update faculty preferred time slots
3. **Student Enrollment**: Have students select their Major/Minor choices
4. **Generate Production Timetables**: Run scheduler for all batches
5. **Review & Publish**: Faculty review and approve generated timetables

---

## 📖 Documentation

- Full documentation: `NEP_SCHEDULER_README.md`
- Implementation roadmap: `IMPLEMENTATION_ROADMAP.md`
- Database schema: `database/new_implementation_schema.sql`

---

## 🤝 Support

If you encounter issues:
1. Check terminal logs for detailed error messages
2. Review the troubleshooting section in `NEP_SCHEDULER_README.md`
3. Verify all checklist items above are complete
