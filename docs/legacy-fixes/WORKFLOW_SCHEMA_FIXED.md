# Workflow Schema Fixes Applied

## Problem
The application was trying to use fields that don't exist in the `workflow_approvals` table:
- ❌ `current_stage` (doesn't exist)
- ❌ `status` (doesn't exist)  
- ❌ `submitted_at` (doesn't exist)
- ❌ `reviewed_at` (doesn't exist)
- ❌ `reviewed_by` (doesn't exist)
- ❌ `notes` (doesn't exist)

## Actual Schema (database/new_schema.sql)

```sql
CREATE TABLE workflow_approvals (
    id UUID PRIMARY KEY,
    timetable_id UUID NOT NULL REFERENCES generated_timetables(id),
    workflow_step VARCHAR(50) NOT NULL,  -- 'created', 'submitted_for_review', 'reviewed', 'approved', 'published', 'rejected'
    performed_by UUID NOT NULL REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    comments TEXT,
    rejection_reason TEXT,
    approval_level VARCHAR(50),
    assigned_to UUID REFERENCES users(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Key Differences

| ❌ Old Code | ✅ Actual Schema |
|------------|-----------------|
| `current_stage` | `workflow_step` |
| `status` field | No status field (use workflow_step) |
| `submitted_at` | `performed_at` |
| `reviewed_at` | `performed_at` |
| `reviewed_by` | `performed_by` |
| `notes` | `comments` |
| UPDATE records | INSERT new records (append-only log) |

## Changes Made

### 1. **src/app/faculty/timetables/page.tsx**

#### handleSubmitForReview Function

**Before (WRONG):**
```typescript
const { error: workflowError } = await supabase
  .from('workflow_approvals')
  .update({ 
    status: 'pending_review',
    current_stage: 'hod',
    submitted_at: new Date().toISOString()
  })
  .eq('timetable_id', timetableId);
```

**After (CORRECT):**
```typescript
const { error: workflowError } = await supabase
  .from('workflow_approvals')
  .insert({ 
    timetable_id: timetableId,
    workflow_step: 'submitted_for_review',
    performed_by: user.id,
    comments: 'Submitted for review by creator'
  });
```

### 2. **src/app/faculty/review-queue/page.tsx**

#### PendingTimetable Interface
**Before:**
```typescript
interface PendingTimetable {
  // ...
  workflow_status: string;
  current_stage: string;  // ❌ Doesn't exist
}
```

**After:**
```typescript
interface PendingTimetable {
  // ...
  workflow_status: string;
  // ❌ Removed current_stage
}
```

#### fetchPendingTimetables Function

**Before (WRONG):**
```typescript
const { data, error } = await supabase
  .from('generated_timetables')
  .select(`
    id,
    title,
    batches!inner(name),
    users!inner(first_name),
    workflow_approvals!inner(status, current_stage, submitted_at)
  `)
  .eq('status', 'pending_approval')
  .order('workflow_approvals(submitted_at)', { ascending: false });
```

**After (CORRECT):**
```typescript
// Fetch timetables
const { data, error } = await supabase
  .from('generated_timetables')
  .select('*')
  .eq('status', 'pending_approval')
  .order('created_at', { ascending: false });

// Then fetch related data separately
const { data: workflowData } = await supabase
  .from('workflow_approvals')
  .select('performed_at')
  .eq('timetable_id', tt.id)
  .eq('workflow_step', 'submitted_for_review')
  .order('performed_at', { ascending: false })
  .limit(1)
  .single();
```

#### handleApprove Function

**Before (WRONG):**
```typescript
const { error: workflowError } = await supabase
  .from('workflow_approvals')
  .update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id
  })
  .eq('timetable_id', timetableId);
```

**After (CORRECT):**
```typescript
const { error: workflowError } = await supabase
  .from('workflow_approvals')
  .insert({
    timetable_id: timetableId,
    workflow_step: 'approved',
    performed_by: user.id,
    comments: 'Approved and published by publisher'
  });
```

#### handleReject Function

**Before (WRONG):**
```typescript
const { error: workflowError } = await supabase
  .from('workflow_approvals')
  .update({
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    notes: reason
  })
  .eq('timetable_id', timetableId);
```

**After (CORRECT):**
```typescript
const { error: workflowError } = await supabase
  .from('workflow_approvals')
  .insert({
    timetable_id: timetableId,
    workflow_step: 'rejected',
    performed_by: user.id,
    comments: reason,
    rejection_reason: reason
  });
```

## Workflow Logic

### Append-Only Design
The `workflow_approvals` table is designed as an **append-only audit log**:
- ✅ Each action creates a **new record** (INSERT)
- ❌ Never UPDATE existing records
- ✅ Full history is preserved

### Workflow Steps
1. **created** - Initial timetable creation
2. **submitted_for_review** - Creator submits for approval
3. **reviewed** - Publisher reviews (optional step)
4. **approved** - Publisher approves
5. **published** - Timetable goes live
6. **rejected** - Publisher rejects with reason

### Complete Flow Example
```
timetable_id  workflow_step            performed_by  performed_at
------------- ----------------------   ------------- -----------------
abc-123       created                  creator-id    2025-10-10 09:00
abc-123       submitted_for_review     creator-id    2025-10-10 10:00
abc-123       approved                 publisher-id  2025-10-10 11:00
abc-123       published                publisher-id  2025-10-10 11:01
```

## Testing

1. ✅ **Submit for Review**
   - Creates timetable in `draft` status
   - Click "Submit for Review"
   - Should insert workflow record with `workflow_step: 'submitted_for_review'`
   - Timetable status changes to `pending_approval`
   - No errors about `current_stage`

2. ✅ **Approve Timetable**
   - Publisher views pending timetables
   - Clicks "Approve & Publish"
   - Should insert workflow record with `workflow_step: 'approved'`
   - Timetable status changes to `published`

3. ✅ **Reject Timetable**
   - Publisher clicks "Reject"
   - Enters rejection reason
   - Should insert workflow record with `workflow_step: 'rejected'`
   - Reason stored in both `comments` and `rejection_reason`
   - Timetable status changes to `rejected`

## Benefits

✅ **Schema Compliance** - Code matches actual database structure
✅ **Full Audit Trail** - Every workflow action is logged
✅ **No Lost History** - Append-only means nothing is overwritten
✅ **Better Debugging** - Can see exactly what happened and when
✅ **No More Errors** - All field names match schema

---

**Date:** October 10, 2025  
**Files Modified:**
- `src/app/faculty/timetables/page.tsx`
- `src/app/faculty/review-queue/page.tsx`

**Error Fixed:**
- ❌ "Could not find the 'current_stage' column" → ✅ Using correct `workflow_step` field
