# Critical Debug - Run This Now!

Your user exists, so the error is happening later in the process. We need to see the ACTUAL error from the API.

## Run this in Browser Console (F12):

```javascript
fetch('/api/timetables', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assignments: [{
      subject: { 
        id: 'test-subject-id',  // Temporary test ID
        name: 'Test Subject', 
        subjectType: 'THEORY' 
      },
      faculty: { 
        id: 'd448a49d-5627-4782-87c7-fe34f72fab35',  // Your actual user ID
        firstName: 'Prof.', 
        lastName: 'Yogita' 
      },
      timeSlot: { 
        id: '1', 
        day: 'Monday', 
        startTime: '09:00', 
        endTime: '10:00' 
      },
      duration: 1
    }],
    createdBy: 'd448a49d-5627-4782-87c7-fe34f72fab35',  // Your actual user ID
    semester: 3,
    academicYear: '2025-26',
    title: 'Debug Test'
  })
})
.then(async response => {
  const data = await response.json();
  console.log('=== FULL ERROR RESPONSE ===');
  console.log('Status:', response.status);
  console.log('Success:', data.success);
  console.log('Error:', data.error);
  console.log('Details:', data.details);
  console.log('Hint:', data.hint);
  console.log('Code:', data.code);
  console.log('\n=== COMPLETE RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error('Fetch error:', err));
```

**Copy and paste the ENTIRE output here!**

Specifically look for the "Details:" and "Hint:" fields - they will tell us EXACTLY what's failing.

## Most Likely Issues:

### 1. No Batch for Semester 3
Check if batch exists:
```sql
SELECT id, name, semester, is_active
FROM batches
WHERE semester = 3 AND is_active = true;
```

If empty, create one:
```sql
INSERT INTO batches (
  name, 
  college_id, 
  department_id, 
  semester, 
  academic_year,
  is_active
) VALUES (
  'CSE Semester 3 Batch A',
  (SELECT id FROM colleges WHERE code = 'SVPCET'),
  (SELECT id FROM departments WHERE code = 'CSE' LIMIT 1),
  3,
  '2025-26',
  true
) RETURNING id, name;
```

### 2. Permission Denied on timetable_generation_tasks
```sql
-- Grant all permissions
GRANT ALL ON timetable_generation_tasks TO anon, authenticated, service_role;

-- Disable RLS if enabled
ALTER TABLE timetable_generation_tasks DISABLE ROW LEVEL SECURITY;
```

---

**DO THE FETCH TEST ABOVE FIRST - IT WILL SHOW THE EXACT ERROR!**
