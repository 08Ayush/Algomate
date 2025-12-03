# Quick Console Check

Run this in your browser console (F12) right now:

```javascript
// Check the last save response
console.log('Last save response:', JSON.stringify(window.lastSaveResponse, null, 2));

// Or manually trigger and capture
const user = JSON.parse(localStorage.getItem('user'));
console.log('=== USER INFO ===');
console.log('User ID:', user?.id || user?.userId);
console.log('Email:', user?.email);
console.log('Department ID:', user?.department_id || user?.departmentId);
console.log('College ID:', user?.college_id || user?.collegeId);
console.log('Full user:', user);

// Test API call with detailed logging
fetch('/api/timetables', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assignments: [{
      subject: { id: 'test', name: 'Test', subjectType: 'THEORY' },
      faculty: { id: 'test', firstName: 'Test', lastName: 'User' },
      timeSlot: { id: '1', day: 'Monday', startTime: '09:00', endTime: '10:00' },
      duration: 1
    }],
    createdBy: user?.id || user?.userId,
    semester: 3,
    academicYear: '2025-26',
    title: 'Debug Test'
  })
})
.then(r => r.json())
.then(data => {
  console.log('=== API RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error('=== ERROR ===', err));
```

Share the output, especially the "API RESPONSE" section!
