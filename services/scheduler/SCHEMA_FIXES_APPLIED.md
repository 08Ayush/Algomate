# Schema Fixes Applied - February 7, 2026

## ✅ All Database Schema Mismatches Resolved

### Summary
All column name mismatches between the code and `database/new_schema.sql` have been identified and fixed.

---

## Changes Made

### 1. Fixed: `timetable_generation_tasks.progress_message` → `current_message`

**File**: `services/scheduler/api.py`

#### Change 1: Line 244 (SELECT query)
```python
# BEFORE:
result = supabase.table("timetable_generation_tasks").select(
    "id, status, progress_message, created_at, updated_at"
).eq("id", task_id).single().execute()

# AFTER:
result = supabase.table("timetable_generation_tasks").select(
    "id, status, current_message, created_at, updated_at"
).eq("id", task_id).single().execute()
```

#### Change 2: Line 262 (Message retrieval)
```python
# BEFORE:
message=task_data.get("progress_message"),

# AFTER:
message=task_data.get("current_message"),
```

#### Change 3: Line 288 (UPDATE query)
```python
# BEFORE:
supabase.table("timetable_generation_tasks").update({
    "status": "cancelled",
    "progress_message": "Cancelled by user",
    "updated_at": datetime.now().isoformat()
}).eq("id", task_id).execute()

# AFTER:
supabase.table("timetable_generation_tasks").update({
    "status": "cancelled",
    "current_message": "Cancelled by user",
    "updated_at": datetime.now().isoformat()
}).eq("id", task_id).execute()
```

---

### 2. Fixed: `generated_timetables.task_id` → `generation_task_id`

**File**: `services/scheduler/api.py`

#### Change: Line 253 (WHERE clause)
```python
# BEFORE:
timetable_result = supabase.table("generated_timetables").select(
    "id, fitness_score"
).eq("task_id", task_id).limit(1).execute()

# AFTER:
timetable_result = supabase.table("generated_timetables").select(
    "id, fitness_score"
).eq("generation_task_id", task_id).limit(1).execute()
```

**Note**: The INSERT statement in `hybrid_orchestrator.py` was already using the correct column name `generation_task_id`.

---

### 3. Fixed: `scheduled_classes.is_lab_session` → `class_type` ENUM

**File**: `services/scheduler/chromosome_encoder.py`

#### Change: Lines 196-206 (Encoding from database)
```python
# BEFORE:
for record in scheduled_classes:
    gene = Gene(
        subject_id=record["subject_id"],
        faculty_id=record["faculty_id"],
        classroom_id=record["classroom_id"],
        time_slot_id=record["time_slot_id"],
        batch_id=record["batch_id"],
        is_lab=record.get("is_lab_session", False)
    )
    genes.append(gene)

# AFTER:
for record in scheduled_classes:
    # Handle class_type ENUM from database (THEORY, LAB, PRACTICAL, TUTORIAL)
    class_type = record.get("class_type", "THEORY")
    is_lab = class_type in ["LAB", "PRACTICAL"]
    
    gene = Gene(
        subject_id=record["subject_id"],
        faculty_id=record["faculty_id"],
        classroom_id=record["classroom_id"],
        time_slot_id=record["time_slot_id"],
        batch_id=record["batch_id"],
        is_lab=is_lab
    )
    genes.append(gene)
```

**Note**: The `decode_to_db()` method was already correct, properly mapping to `class_type` with values "LAB" or "THEORY".

---

### 4. Verified: `algorithm_execution_metrics.convergence_generation`

**File**: `services/scheduler/hybrid_orchestrator.py`

**Status**: ✅ Already Correct

The code correctly uses the `metrics_json` JSONB column to store convergence data:

```python
# Line ~482-485
self.supabase.table("algorithm_execution_metrics").insert({
    "generation_task_id": task_id,
    # ... other fields ...
    "metrics_json": {
        "convergence_generation": ga_stats.convergence_generation,
        "total_evaluations": ga_stats.total_evaluations,
        "fitness_history": ga_stats.fitness_history[-10:]
    }
}).execute()
```

---

## Database Schema Reference (from `new_schema.sql`)

### Relevant Table Columns:

**`timetable_generation_tasks`:**
- ✅ `current_message TEXT` (NOT progress_message)
- ✅ `status generation_task_status` (ENUM: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED)

**`generated_timetables`:**
- ✅ `generation_task_id UUID` (NOT task_id)
- ✅ `status timetable_status` (ENUM: draft, generating, optimizing, pending_approval, published, rejected)

**`scheduled_classes`:**
- ✅ `class_type subject_type` (ENUM: THEORY, LAB, PRACTICAL, TUTORIAL) (NOT is_lab_session)

**`algorithm_execution_metrics`:**
- ✅ `metrics_json JSONB` (stores convergence_generation and other stats)

---

## Testing Recommendations

### 1. Test Task Creation
```python
# Should now succeed without column errors
result = orchestrator.run(
    batch_id="test-batch-id",
    college_id="test-college-id",
    created_by="test-user-id"
)
```

### 2. Test Status Retrieval
```python
# Should now retrieve current_message correctly
status = await get_task_status(task_id)
print(status.message)  # Should show task status message
```

### 3. Test Timetable Lookup
```python
# Should now find timetables by generation_task_id
timetables = supabase.table("generated_timetables").select("*").eq("generation_task_id", task_id).execute()
print(f"Found {len(timetables.data)} timetables")
```

### 4. Test Class Type Handling
```python
# Should correctly interpret LAB/PRACTICAL as lab sessions
chromosome = encoder.encode_from_db(scheduled_classes)
lab_count = sum(1 for gene in chromosome.genes if gene.is_lab)
print(f"Lab sessions: {lab_count}")
```

---

## Verification Checklist

- [x] All `progress_message` references changed to `current_message`
- [x] All `task_id` references for generated_timetables changed to `generation_task_id`
- [x] `is_lab_session` handling changed to use `class_type` ENUM
- [x] `metrics_json` usage verified as correct
- [x] No Python syntax errors after changes
- [x] Documentation updated in HYBRID_SCHEDULER_FAILURE_ANALYSIS.md

---

## Impact Assessment

**Before Fixes:**
- ❌ All database writes were failing silently
- ❌ Task status updates not persisting
- ❌ Timetable lookups failing to find records
- ❌ Lab session data not being read correctly

**After Fixes:**
- ✅ Database writes should succeed
- ✅ Task status updates will persist correctly
- ✅ Timetable lookups will find associated records
- ✅ Lab sessions will be properly identified

---

## Next Steps

1. **Run End-to-End Test**: Execute full scheduling pipeline with a small test batch
2. **Monitor Logs**: Check for any remaining database errors
3. **Verify Database Records**: Confirm all tables have correct data after scheduling
4. **Address Remaining Issues**: Focus on fitness scores and incomplete scheduling problems

---

**Last Updated**: February 7, 2026  
**Applied By**: AI Assistant  
**Verified Against**: `database/new_schema.sql`  
**Status**: ✅ All Changes Applied Successfully
