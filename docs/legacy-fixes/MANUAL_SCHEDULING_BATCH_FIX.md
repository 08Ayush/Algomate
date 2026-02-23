# Manual Scheduling Batch Fix

## Problem
When clicking "Submit for Review" in the AI Creator Manual Scheduling page, users encountered this error:
```
Error saving timetable: No active batch found for semester 1. Please create a batch first.
```

However, the same "Submit for Review" button in the `/faculty/timetables` page worked fine.

## Root Cause
The issue was that:
1. **Manual Scheduling** component was creating a NEW timetable and needed a `batchId` to save it
2. **Timetables page** was only updating an EXISTING timetable's status (no batch needed)

The API route `/api/timetables` requires a `batch_id` when creating a new timetable because it's a foreign key constraint in the database schema.

## Solution Implemented

### 1. Added Batch State Management
```typescript
const [selectedBatch, setSelectedBatch] = useState<any>(null);
const [batches, setBatches] = useState<any[]>([]);
```

### 2. Added Batch Loading Function
```typescript
const loadBatches = async () => {
  // Load batches for the selected semester
  const { data: batchData } = await supabase
    .from('batches')
    .select('id, name, semester, academic_year, department_id, college_id')
    .eq('semester', selectedSemester)
    .eq('is_active', true);
  
  setBatches(batchData || []);
  
  // Auto-select first batch
  if (batchData && batchData.length > 0) {
    setSelectedBatch(batchData[0]);
  }
};
```

### 3. Added useEffect to Load Batches
```typescript
useEffect(() => {
  loadBatches();
}, [selectedSemester, user]);
```

### 4. Updated Save Functions
Both `saveSchedule()` and `handleSubmitForReview()` now:

**Check for batch:**
```typescript
if (!selectedBatch) {
  alert('Please wait for batch information to load, or create a batch for this semester first.');
  return;
}
```

**Include batchId in payload:**
```typescript
const payload = {
  assignments,
  createdBy: userId,
  academicYear: '2025-26',
  semester: selectedSemester,
  batchId: selectedBatch.id,  // ← Added this!
  ...(departmentId && { departmentId }),
  ...(collegeId && { collegeId }),
  title: timetableTitle.trim()
};
```

### 5. Added Visual Batch Indicator
In the UI, right after the semester selector, users now see:

✅ **When batch is found:**
```
🟢 Batch: CSE-2025-Sem1 (or whatever the batch name is)
```

❌ **When no batch exists:**
```
🔴 No batch found - Please create a batch first
```

## How It Works Now

1. User selects a semester (e.g., Semester 1)
2. Component automatically loads all active batches for that semester
3. First available batch is auto-selected
4. Batch name is displayed in green indicator
5. When user clicks "Save" or "Submit for Review", the `batchId` is included
6. API successfully creates the timetable with proper batch linkage

## If User Gets the Error Still

The user needs to **create a batch** first:
1. Go to `/faculty/batches`
2. Click "Create New Batch"
3. Fill in:
   - Batch Name (e.g., "CSE-2025-Sem1")
   - Semester: 1
   - Academic Year: 2025-26
   - Department: Select your department
   - Set as Active: ✓
4. Click "Create Batch"
5. Return to Manual Scheduling
6. Batch will now appear and auto-select

## Files Modified
- `src/components/ManualSchedulingComponent.tsx`
  - Added batch state variables
  - Added `loadBatches()` function
  - Added useEffect to load batches on semester change
  - Updated `saveSchedule()` to require and include batchId
  - Updated `handleSubmitForReview()` to require and include batchId
  - Added batch indicator UI in semester selection section

## Testing
1. ✅ Select semester 1
2. ✅ Verify green batch indicator appears
3. ✅ Create timetable assignments
4. ✅ Enter timetable title
5. ✅ Click "Submit for Review"
6. ✅ Should succeed with message: "Timetable submitted for review successfully!"

## Database Schema Reference
```sql
CREATE TABLE generated_timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batches(id),  -- REQUIRED!
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    status timetable_status NOT NULL DEFAULT 'draft',
    academic_year VARCHAR(20) NOT NULL,
    semester INTEGER NOT NULL,
    -- ... other fields
);
```

The `batch_id` is a **required foreign key**, which is why the timetable couldn't be saved without it.
