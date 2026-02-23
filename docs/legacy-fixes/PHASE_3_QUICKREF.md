# Phase 3 Quick Reference Guide

## 🚀 Using Special Events in NEP Scheduler

### 1. Create an Internship

```sql
-- Add internship subject
INSERT INTO subjects (
    code, 
    name, 
    nep_category, 
    block_start_week, 
    block_end_week,
    lecture_hours,
    college_id,
    department_id
) VALUES (
    'INTERN401',
    'School Internship Program',
    'INTERNSHIP',
    10,  -- Starts week 10
    12,  -- Ends week 12
    0,   -- No lecture hours (external placement)
    'your-college-uuid',
    'your-dept-uuid'
);
```

### 2. Create Teaching Practice

```sql
-- Add teaching practice subject
INSERT INTO subjects (
    code, 
    name, 
    nep_category,
    time_restriction,
    lecture_hours,
    college_id,
    department_id
) VALUES (
    'TP301',
    'Teaching Practice',
    'TEACHING_PRACTICE',
    'MORNING',  -- Restricted to morning slots
    4,          -- 4 hours per week
    'your-college-uuid',
    'your-dept-uuid'
);
```

### 3. Create Dissertation/Research Hours

```sql
-- Add dissertation subject
INSERT INTO subjects (
    code, 
    name, 
    nep_category,
    special_event_notes,
    lecture_hours,
    college_id,
    department_id
) VALUES (
    'DISS501',
    'M.Ed Research Dissertation',
    'DISSERTATION',
    'Self-directed research with weekly advisor meetings',
    0,  -- No formal class hours
    'your-college-uuid',
    'your-dept-uuid'
);
```

---

## 📊 Running the Scheduler with Special Events

### Python CLI

```bash
python services/scheduler/nep_scheduler.py \
  --batch-id "your-batch-uuid" \
  --time-limit 30 \
  --save \
  --output solution.json
```

### API Call

```bash
curl -X POST http://localhost:3000/api/nep-scheduler \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "your-batch-uuid",
    "time_limit": 30,
    "save_to_db": true
  }'
```

---

## 📋 Solution Format Example

```json
{
  "success": true,
  "batch_id": "batch-uuid",
  "scheduled_classes": [
    {
      "subject_code": "EDU101",
      "time_slot": "Monday 13:00-14:00",
      "classroom": "Room A"
    }
  ],
  "special_events": [
    {
      "subject_code": "INTERN401",
      "nep_category": "INTERNSHIP",
      "notes": "Blocks weeks 10-12 (No room allocation)"
    },
    {
      "subject_code": "TP301",
      "nep_category": "TEACHING_PRACTICE",
      "notes": "Scheduled in morning slots (9 AM - 12 PM, No room allocation)"
    }
  ],
  "metrics": {
    "regular_subjects": 4,
    "special_events": 2
  }
}
```

---

## 🔍 Troubleshooting

### Issue: Theory classes still in morning

**Cause**: No Teaching Practice subject exists in batch  
**Solution**: Ensure Teaching Practice subject is linked to the batch via `batch_subjects` table

### Issue: Internship not blocking weeks

**Cause**: `block_start_week` or `block_end_week` is NULL  
**Solution**: Update subject:
```sql
UPDATE subjects 
SET block_start_week = 10, block_end_week = 12 
WHERE code = 'INTERN401';
```

### Issue: Dissertation showing as regular class

**Cause**: `nep_category` not set correctly  
**Solution**: Update subject:
```sql
UPDATE subjects 
SET nep_category = 'DISSERTATION' 
WHERE code = 'DISS501';
```

---

## ✅ Validation Checklist

Before deploying:

- [ ] Run migration: `phase3_schema_migration.sql`
- [ ] Test with mock data: `python test_nep_phase3.py`
- [ ] Verify backward compatibility: `python test_nep_scheduler.py`
- [ ] Check special events appear in solution
- [ ] Confirm no room allocation for special events
- [ ] Validate time restrictions work correctly

---

## 📚 See Also

- [PHASE_3_COMPLETE.md](./PHASE_3_COMPLETE.md) - Full documentation
- [NEP_SCHEDULER_README.md](./NEP_SCHEDULER_README.md) - Complete scheduler guide
- [NEP_QUICKSTART.md](./NEP_QUICKSTART.md) - Setup instructions
