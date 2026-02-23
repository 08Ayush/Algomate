# 🔍 DEBUG TIME SLOT MAPPING ISSUE

## Problem
The API is trying to map frontend time slots to database time slots but failing to find matches.

## Step 1: Check Database Time Slots

**Run this in Supabase SQL Editor:**

```sql
-- Check what time slots exist in your database
SELECT 
  id,
  day,
  start_time,
  end_time,
  college_id,
  is_active
FROM time_slots
WHERE is_active = true
ORDER BY day, start_time
LIMIT 50;
```

**What to check:**
1. Do you have time slots?
2. What format is `start_time`? (e.g., "09:00:00", "09:00", "9:00")
3. What are the exact day names? (e.g., "Monday", "MONDAY", "monday")

---

## Step 2: Check What Frontend is Sending

**Run this in your browser console (F12) before clicking Save:**

```javascript
// Add this temporarily to see what data is being sent
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('/api/timetables')) {
    console.log('🔍 REQUEST TO API:', args[0]);
    if (args[1] && args[1].body) {
      const body = JSON.parse(args[1].body);
      console.log('📤 Request body:', body);
      console.log('📤 First assignment time slot:', body.assignments[0]?.timeSlot);
    }
  }
  return originalFetch.apply(this, args);
};
```

Then click "Save Draft" and check the console for the time slot format being sent.

---

## Step 3: Common Mismatches

### Issue A: Time Format
- **Frontend sends:** `"09:00"` (2 digits)
- **Database has:** `"9:00"` (1 digit) or `"09:00:00"` (with seconds)

### Issue B: Day Name Case
- **Frontend sends:** `"Monday"` (capitalized)
- **Database has:** `"MONDAY"` (all caps) or `"monday"` (lowercase)

### Issue C: College ID
- The API fetches time slots filtered by `college_id`
- If college_id doesn't match, NO time slots are returned

---

## Quick Fix Test

**If you want to test immediately, run this SQL to see the exact mapping keys:**

```sql
-- This shows the exact keys the API will try to match
SELECT 
  day || '-' || start_time as mapping_key,
  id,
  day,
  start_time,
  end_time
FROM time_slots
WHERE college_id = (
  SELECT college_id FROM users WHERE id = 'd448a49d-5627-4782-87c7-fe34f72fab35'
)
AND is_active = true
ORDER BY day, start_time;
```

**The `mapping_key` column shows exactly what the API is looking for.**

Example: If you see `Monday-09:00:00`, then frontend must send `day: "Monday"` and `startTime: "09:00:00"`.

---

## Step 4: Share Results

**Please share:**
1. Output from SQL query (first 10 rows is enough)
2. Console output showing what frontend is sending
3. I'll then fix the mapping logic to handle the format correctly

