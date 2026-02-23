# Manual Scheduling Save Fix

## Problem
When clicking "Save Draft" or "Submit for Review" in the Manual Scheduling page, users were getting the error:
```
Error saving timetable: Missing required fields
```

## Root Causes Identified

### 1. **Missing Field Validation**
The manual scheduling component was not validating that the user object contained all required fields (`id`, `department_id`, `college_id`) before sending the request.

### 2. **Missing batch_id Field**
The database schema for `generated_timetables` table requires a `batch_id`, but the manual scheduling component wasn't providing it. The API route was also not handling the case where `batch_id` might be missing.

### 3. **Insufficient Error Logging**
There was minimal console logging, making it difficult to debug where the save process was failing.

## Solutions Implemented

### 1. Enhanced ManualSchedulingComponent.tsx

#### Added User Field Validation
```typescript
// Validate required user fields
if (!user?.id || !user?.department_id || !user?.college_id) {
  alert('User information is incomplete. Please log in again.');
  console.error('Missing user fields:', { 
    userId: user?.id, 
    departmentId: user?.department_id, 
    collegeId: user?.college_id 
  });
  return;
}
```

#### Added Detailed Request Logging
```typescript
const payload = {
  assignments,
  createdBy: user.id,
  academicYear: '2025-26',
  semester: selectedSemester,
  departmentId: user.department_id,
  collegeId: user.college_id,
  title: timetableTitle.trim()
};

console.log('📤 Sending timetable save request:', payload);
```

#### Added Response Logging
```typescript
const data = await response.json();
console.log('📥 Save response:', data);
```

### 2. Enhanced /api/timetables/route.ts

#### Added Automatic batch_id Resolution
The API now attempts to find an appropriate batch when one isn't provided:

```typescript
// Get batch_id if not provided (try to find an existing batch for this semester/department)
let finalBatchId = batchId;
if (!finalBatchId) {
  console.log('🔍 No batch_id provided, searching for existing batch...');
  const { data: batches } = await supabase
    .from('batches')
    .select('id')
    .eq('department_id', departmentId)
    .eq('current_semester', semester)
    .limit(1);
  
  if (batches && batches.length > 0) {
    finalBatchId = batches[0].id;
    console.log('✅ Found existing batch:', finalBatchId);
  } else {
    console.log('⚠️ No batch found for semester', semester);
  }
}
```

#### Added Conditional batch_id Insertion
The timetable data object is now built dynamically, only including `batch_id` if one is available:

```typescript
const timetableData: any = {
  title: title || `Semester ${semester} Timetable - ${academicYear}`,
  created_by: createdBy,
  academic_year: academicYear,
  semester,
  department_id: departmentId,
  college_id: collegeId,
  status: 'draft',
  generation_method: 'manual',
  total_classes: assignments.length,
  fitness_score: 100.0,
  algorithm_details: {
    method: 'manual_creation',
    created_at: new Date().toISOString(),
    total_assignments: assignments.length
  }
};

// Only add batch_id if we have one
if (finalBatchId) {
  timetableData.batch_id = finalBatchId;
}
```

#### Enhanced Error Logging
Added comprehensive logging throughout the save process:

```typescript
console.log('📥 Received timetable save request:', {
  assignmentsCount: assignments?.length,
  createdBy,
  academicYear,
  semester,
  departmentId,
  collegeId,
  batchId,
  title
});

console.log('💾 Creating timetable with data:', timetableData);
console.log('✅ Created timetable:', timetable.id);
console.log('📝 Creating', assignments.length, 'scheduled classes...');
console.log('✅ Successfully created', scheduledClasses.length, 'scheduled classes');
```

#### Improved Error Messages
Error responses now include more detailed information:

```typescript
return NextResponse.json(
  { 
    error: 'Missing required fields',
    details: {
      assignments: !!assignments,
      createdBy: !!createdBy,
      academicYear: !!academicYear,
      semester: !!semester,
      departmentId: !!departmentId,
      collegeId: !!collegeId
    }
  },
  { status: 400 }
);
```

## Testing Steps

### 1. Test Save Draft
1. Navigate to `/faculty/manual-scheduling`
2. Select a semester
3. Create at least one timetable assignment
4. Enter a timetable title
5. Click "Save Draft"
6. **Expected Result**: Success message appears, console shows detailed logs
7. **Verify**: Check Supabase `generated_timetables` table for new record
8. **Verify**: Check Supabase `scheduled_classes` table for assignment records

### 2. Test Submit for Review
1. Follow steps 1-4 from above
2. Click "Submit for Review" instead
3. **Expected Result**: Success message about submission
4. **Verify**: Timetable status is set to appropriate review state
5. **Verify**: Publisher/HOD receives notification (if implemented)

### 3. Test Error Scenarios

#### Missing User Information
1. Temporarily modify user object to remove `department_id`
2. Try to save
3. **Expected Result**: Alert about incomplete user information
4. **Expected Console**: Log showing which fields are missing

#### Missing Timetable Title
1. Don't enter a title
2. Try to save
3. **Expected Result**: Alert requesting title

#### No Assignments
1. Don't create any assignments
2. Try to save
3. **Expected Result**: Alert requesting at least one assignment

## Console Output Examples

### Successful Save
```
📤 Sending timetable save request: {
  assignmentsCount: 5,
  createdBy: "abc123-...",
  academicYear: "2025-26",
  semester: 3,
  departmentId: "817ba459-...",
  collegeId: "xyz789-...",
  title: "CSE Semester 3 - Week 1"
}
📥 Received timetable save request: { ... }
🔍 No batch_id provided, searching for existing batch...
✅ Found existing batch: def456-...
💾 Creating timetable with data: { ... }
✅ Created timetable: ghi789-...
📝 Creating 5 scheduled classes...
Sample class data: { ... }
✅ Successfully created 5 scheduled classes
```

### Error Scenario
```
📤 Sending timetable save request: { ... }
📥 Received timetable save request: { ... }
❌ Missing required fields: {
  hasAssignments: true,
  hasCreatedBy: false,
  hasAcademicYear: true,
  hasSemester: true,
  hasDepartmentId: true,
  hasCollegeId: true
}
```

## Database Schema Considerations

The `generated_timetables` table requires the following fields:
- `title` (string)
- `created_by` (UUID) - FK to users table
- `academic_year` (string)
- `semester` (integer)
- `department_id` (UUID) - FK to departments table
- `college_id` (UUID) - FK to colleges table
- `batch_id` (UUID, nullable) - FK to batches table
- `status` (string) - 'draft', 'pending_approval', 'published'
- `generation_method` (string) - 'manual' or 'ai'
- `total_classes` (integer)
- `fitness_score` (float)

## Additional Notes

### Future Improvements
1. **Batch Selection UI**: Add a batch selector in the manual scheduling interface so users can explicitly choose which batch the timetable is for
2. **Validation Enhancement**: Add frontend validation to check all required fields before making API call
3. **Progress Indicators**: Add loading spinners with progress messages during save operation
4. **Success Feedback**: Replace basic alerts with toast notifications or better UI feedback
5. **Draft Recovery**: Add auto-save functionality to prevent loss of work

### Known Limitations
- If no batch exists for the selected semester, the timetable is saved without a `batch_id`
- Users must be logged in with complete profile information (department_id and college_id)
- Manual timetables always get a fitness_score of 100.0

## Troubleshooting

### Still getting "Missing required fields"?
1. Open browser console (F12)
2. Check the `📤 Sending timetable save request` log
3. Verify all fields are present and have values (not null/undefined)
4. Check user object has `id`, `department_id`, and `college_id`

### "Failed to create timetable"?
1. Check console for `❌ Error creating timetable` message
2. Look at the error details provided
3. Verify database permissions for `generated_timetables` table
4. Check if `batch_id` is causing constraint issues

### "Failed to create scheduled classes"?
1. Check console for `❌ Error creating scheduled classes` message
2. Verify each assignment has valid `subject_id`, `faculty_id`, and `time_slot_id`
3. Check database permissions for `scheduled_classes` table
4. Ensure `classroom_id` is either valid UUID or null

## Files Modified
1. `src/components/ManualSchedulingComponent.tsx` - Added validation and logging
2. `src/app/api/timetables/route.ts` - Added batch_id resolution and enhanced logging

## Deployment Notes
- No database migrations required
- No environment variable changes needed
- Changes are backward compatible
- Existing timetables are not affected
