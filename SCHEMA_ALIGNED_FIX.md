# Schema-Aligned Timetable Save Fix

## Problem Summary
The manual scheduling save was failing with "Missing: college ID" error because the API routes were not aligned with the actual database schema defined in `database/new_schema.sql`.

## Root Causes

### 1. **Incorrect Schema Understanding**
The old `/api/timetables` route was trying to insert directly into `generated_timetables` without creating the required `timetable_generation_tasks` record first.

### 2. **Missing Required Fields**
According to the schema, `generated_timetables` requires:
- `generation_task_id` (UUID, NOT NULL, FK to timetable_generation_tasks)
- `batch_id` (UUID, NOT NULL, FK to batches)
- `title`, `academic_year`, `semester`, `fitness_score`, `status`, `created_by`

### 3. **Incorrect scheduled_classes Structure**
The schema requires different fields than what was being sent:
- `batch_id` (REQUIRED)
- `credit_hour_number` (REQUIRED - sequential number)
- `class_type` (enum: THEORY, LAB, PRACTICAL, TUTORIAL)
- `session_duration` (integer in minutes)

## Database Schema Structure (from new_schema.sql)

### Workflow Overview
```
1. timetable_generation_tasks  (the generation/creation task)
       ↓
2. generated_timetables        (the timetable record)
       ↓
3. scheduled_classes           (individual class assignments)
       ↓
4. workflow_approvals          (approval workflow tracking)
       ↓
5. notifications               (user notifications)
```

### Tables and Required Fields

#### timetable_generation_tasks
```sql
CREATE TABLE timetable_generation_tasks (
    id UUID PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id),
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL,
    status generation_task_status DEFAULT 'PENDING',
    current_phase algorithm_phase DEFAULT 'INITIALIZING',
    progress INT DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    -- ... more fields
);
```

#### generated_timetables
```sql
CREATE TABLE generated_timetables (
    id UUID PRIMARY KEY,
    generation_task_id UUID NOT NULL REFERENCES timetable_generation_tasks(id),
    title VARCHAR(255) NOT NULL,
    batch_id UUID NOT NULL REFERENCES batches(id),
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL,
    fitness_score DECIMAL(10,4) NOT NULL DEFAULT 0,
    generation_method VARCHAR(20) DEFAULT 'HYBRID',
    status timetable_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    version INT NOT NULL DEFAULT 1,
    -- ... more fields
);
```

#### scheduled_classes
```sql
CREATE TABLE scheduled_classes (
    id UUID PRIMARY KEY,
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id),
    batch_id UUID NOT NULL REFERENCES batches(id),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    faculty_id UUID NOT NULL REFERENCES users(id),
    classroom_id UUID NOT NULL REFERENCES classrooms(id),
    time_slot_id UUID NOT NULL REFERENCES time_slots(id),
    credit_hour_number INT NOT NULL,
    class_type subject_type DEFAULT 'THEORY',
    session_duration INT DEFAULT 60,
    is_recurring BOOLEAN DEFAULT TRUE,
    -- ... more fields
);
```

#### workflow_approvals
```sql
CREATE TABLE workflow_approvals (
    id UUID PRIMARY KEY,
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id),
    workflow_step VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    comments TEXT,
    rejection_reason TEXT,
    approval_level VARCHAR(50),
    -- ... more fields
);
```

## Solutions Implemented

### 1. Updated /api/timetables/route.ts (POST)

#### Step 1: Validate and Get Batch
```typescript
// Batch_id is REQUIRED by schema - must find or fail
let finalBatchId = batchId;
if (!finalBatchId) {
  const { data: batches } = await supabase
    .from('batches')
    .select('id')
    .eq('department_id', departmentId)
    .eq('semester', semester)
    .eq('academic_year', academicYear)
    .eq('is_active', true)
    .limit(1);
  
  if (batches && batches.length > 0) {
    finalBatchId = batches[0].id;
  } else {
    return error: 'No active batch found for this semester';
  }
}
```

#### Step 2: Create Generation Task
```typescript
const { data: task } = await supabase
  .from('timetable_generation_tasks')
  .insert({
    task_name: title || `Manual Timetable - Semester ${semester}`,
    batch_id: finalBatchId,
    academic_year: academicYear,
    semester: semester,
    status: 'COMPLETED',        // Manual creation is done
    current_phase: 'COMPLETED',
    progress: 100,
    created_by: createdBy,
    started_at: new Date(),
    completed_at: new Date(),
    solutions_generated: 1,
    best_fitness_score: 100.0
  })
  .select()
  .single();
```

#### Step 3: Create Timetable Record
```typescript
const timetableData = {
  generation_task_id: task.id,  // REQUIRED FK
  title: title,
  batch_id: finalBatchId,       // REQUIRED FK
  academic_year: academicYear,
  semester: semester,
  fitness_score: 100.0,
  constraint_violations: [],
  optimization_metrics: { method: 'manual_creation' },
  generation_method: 'HYBRID',
  status: 'draft',
  created_by: createdBy,
  version: 1
};
```

#### Step 4: Create Scheduled Classes
```typescript
const scheduledClasses = assignments.map((assignment, index) => ({
  timetable_id: timetable.id,
  batch_id: finalBatchId,               // REQUIRED
  subject_id: assignment.subject.id,
  faculty_id: assignment.faculty.id,
  classroom_id: assignment.classroom || null,
  time_slot_id: assignment.timeSlot.id,
  credit_hour_number: index + 1,        // REQUIRED sequential
  class_type: assignment.subject.subjectType || 'THEORY',
  session_duration: (assignment.duration || 1) * 60,
  is_recurring: true,
  notes: `${assignment.subject.name} - Faculty`
}));
```

#### Step 5: Create Workflow Record
```typescript
await supabase
  .from('workflow_approvals')
  .insert({
    timetable_id: timetable.id,
    workflow_step: 'created',
    performed_by: createdBy,
    comments: 'Manual timetable created',
    approval_level: 'creator'
  });
```

### 2. Updated /api/timetables/publish/route.ts

#### Workflow Steps Mapping
```typescript
switch (action) {
  case 'submit_for_review':
    newStatus = 'pending_approval';
    workflowStep = 'submitted_for_review';
    break;
    
  case 'approve':
    newStatus = 'published';
    workflowStep = 'approved';
    updateData.approved_by = publisherId;
    updateData.approved_at = new Date();
    break;
    
  case 'reject':
    newStatus = 'rejected';
    workflowStep = 'rejected';
    updateData.review_notes = reason;
    break;
}
```

#### Create Workflow Approval Record
```typescript
await supabase
  .from('workflow_approvals')
  .insert({
    timetable_id: timetableId,
    workflow_step: workflowStep,
    performed_by: publisherId,
    comments: reason || `Timetable ${workflowStep}`,
    rejection_reason: action === 'reject' ? reason : null,
    approval_level: action === 'approve' ? 'publisher' : 'creator'
  });
```

#### Send Notifications
```typescript
await supabase
  .from('notifications')
  .insert({
    recipient_id: timetable.created_by,
    sender_id: publisherId,
    type: action === 'approve' ? 'timetable_published' : 'approval_request',
    title: action === 'approve' ? 'Timetable Published ✅' : 'Timetable Rejected ❌',
    message: `Your timetable "${timetable.title}" ...`,
    related_id: timetableId
  });
```

### 3. Updated GET Endpoint
Now queries with proper relations:
```typescript
.select(`
  *,
  batch:batches(id, name, semester, section, department_id),
  created_by_user:users!created_by(first_name, last_name, email),
  generation_task:timetable_generation_tasks(task_name, status, progress)
`)
```

## Testing Instructions

### Test 1: Manual Timetable Creation

1. **Open Browser Console (F12)**

2. **Navigate to Manual Scheduling Page**

3. **Create Assignments** (at least one)

4. **Enter Timetable Title**

5. **Click "Save Draft"**

6. **Expected Console Output:**
```
📥 Received timetable save request: {
  assignmentsCount: 3,
  createdBy: "abc-123",
  academicYear: "2025-26",
  semester: 3,
  departmentId: "dept-456",
  collegeId: "college-789"
}
🔍 No batch_id provided, searching for existing batch...
✅ Found existing batch: batch-uuid
📝 Creating generation task...
✅ Created generation task: task-uuid
💾 Creating timetable with data: { ... }
✅ Created timetable: timetable-uuid
📝 Creating 3 scheduled classes...
Sample class data (first assignment): { ... }
✅ Successfully created 3 scheduled classes
✅ Workflow approval record created
```

7. **Success Response:**
```json
{
  "success": true,
  "timetable": {
    "id": "...",
    "title": "...",
    "status": "draft",
    "batch_id": "...",
    "task_id": "..."
  },
  "message": "Timetable saved successfully",
  "classes_created": 3
}
```

### Test 2: Submit for Review

1. **After saving, click "Submit for Review"**

2. **Expected Console Output:**
```
📤 Sending timetable save request for review: { ... }
📥 Save response: { success: true, ... }
📤 Publish/Approval request: {
  timetableId: "...",
  action: "submit_for_review",
  publisherId: "..."
}
💾 Updating timetable status to: pending_approval
✅ Timetable status updated successfully
✅ Workflow approval record created
```

3. **Success Response:**
```json
{
  "success": true,
  "status": "pending_approval",
  "message": "Timetable submitted for review successfully"
}
```

### Test 3: Verify in Database

#### Check Supabase Dashboard:

1. **timetable_generation_tasks**
   - Find record with status='COMPLETED'
   - Should have your task_name, batch_id, created_by

2. **generated_timetables**
   - Find record with your title
   - Should have generation_task_id (FK to task above)
   - Status should be 'draft' or 'pending_approval'

3. **scheduled_classes**
   - Should have X records (X = number of assignments)
   - Each should have timetable_id, batch_id, subject_id, faculty_id, etc.

4. **workflow_approvals**
   - Should have 2 records:
     * One with workflow_step='created'
     * One with workflow_step='submitted_for_review'

### Test 4: Error Scenarios

#### No Batch Exists
```
❌ Error: No active batch found for semester 3. Please create a batch first.
```

#### Missing User Fields
```
❌ Missing user fields: {
  userId: undefined,
  departmentId: "...",
  collegeId: "...",
  missingFields: ["user ID"]
}
```

## Common Issues and Solutions

### Issue: "No active batch found"
**Solution:** Create a batch first in the system:
```sql
INSERT INTO batches (
  name, department_id, college_id, semester, 
  academic_year, section, is_active
) VALUES (
  'CSE Semester 3 - Section A', 'dept-id', 'college-id', 
  3, '2025-26', 'A', true
);
```

### Issue: "User information is incomplete"
**Solution:** Check user object in localStorage:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
console.log('User:', user);
// Must have: id (or userId), department_id (or departmentId), college_id (or collegeId)
```

### Issue: scheduled_classes insert fails
**Check:**
- All subject_ids exist in subjects table
- All faculty_ids exist in users table with role='faculty'
- All time_slot_ids exist in time_slots table
- classroom_id is either null or valid UUID

## Database Query to Check Everything

```sql
-- Check if timetable was created properly
SELECT 
  gt.id,
  gt.title,
  gt.status,
  gt.batch_id,
  gt.generation_task_id,
  tgt.task_name,
  tgt.status as task_status,
  (SELECT COUNT(*) FROM scheduled_classes WHERE timetable_id = gt.id) as classes_count,
  (SELECT COUNT(*) FROM workflow_approvals WHERE timetable_id = gt.id) as workflow_count
FROM generated_timetables gt
JOIN timetable_generation_tasks tgt ON gt.generation_task_id = tgt.id
WHERE gt.created_at > NOW() - INTERVAL '1 hour'
ORDER BY gt.created_at DESC
LIMIT 5;
```

## Files Modified

1. **src/app/api/timetables/route.ts**
   - Complete rewrite to match schema
   - Creates generation_task first
   - Proper batch_id handling
   - Creates workflow_approvals record
   - Schema-aligned scheduled_classes

2. **src/app/api/timetables/publish/route.ts**
   - Updated workflow_approvals structure
   - Proper notification format
   - Schema-aligned field names

3. **src/components/ManualSchedulingComponent.tsx**
   - Flexible user property names
   - Enhanced logging
   - Better error messages

## Next Steps

1. ✅ Test manual timetable creation
2. ✅ Test submit for review workflow
3. ✅ Verify database records created properly
4. ✅ Test approval/rejection flow
5. ⏳ Test with AI-generated timetables
6. ⏳ Implement batch creation UI (if needed)

## Schema Compliance Checklist

- [x] generation_task_id FK properly set
- [x] batch_id validated and required
- [x] scheduled_classes has all required fields
- [x] workflow_approvals follows schema
- [x] notifications follow schema
- [x] Status transitions follow timetable_status enum
- [x] Proper rollback on errors
- [x] Comprehensive logging added
