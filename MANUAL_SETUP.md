# 🎯 MANUAL SETUP INSTRUCTIONS - Events System

Follow these steps carefully to set up the event management system.

---

## ✅ **STEP 1: Configure Supabase Credentials**

1. Create a file named `.env.local` in the root directory:
   ```
   F:\Timetable scheduler (SIH)\new_ayush\academic_campass_2025\.env.local
   ```

2. Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Get your credentials from:
   - Go to https://app.supabase.com
   - Select your project
   - Click "Settings" → "API"
   - Copy "Project URL" and "anon public" key

---

## ✅ **STEP 2: Deploy Database Schema to Supabase**

### **Option A: Using Supabase Dashboard (Recommended)**

1. Open Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Open this file: `database/events_schema.sql`
6. **Copy ALL 450+ lines** from the file
7. **Paste** into Supabase SQL Editor
8. Click **"Run"** (or press Ctrl+Enter)
9. Wait for completion (should take 2-5 seconds)
10. Look for success messages

**Expected Result:**
```
✅ event_type enum created
✅ event_status enum created
✅ events table created
✅ event_registrations table created
✅ event_notifications table created
✅ Indexes created
✅ Triggers created
✅ RLS policies enabled
```

### **Option B: Manual Table Creation**

If you prefer, you can copy the key parts manually:

**1. Create ENUMs:**
```sql
CREATE TYPE event_type AS ENUM (
    'workshop', 'seminar', 'conference', 'cultural', 
    'sports', 'technical', 'orientation', 'examination', 
    'meeting', 'other'
);

CREATE TYPE event_status AS ENUM (
    'pending', 'approved', 'rejected', 'completed', 'cancelled'
);
```

**2. Create Events Table:**
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type event_type NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue VARCHAR(255) NOT NULL,
    expected_participants INTEGER DEFAULT 0,
    max_registrations INTEGER DEFAULT 0,
    current_participants INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT FALSE,
    budget_allocated DECIMAL(15,2) DEFAULT 0,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    status event_status DEFAULT 'pending',
    priority_level INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT TRUE,
    has_conflict BOOLEAN DEFAULT FALSE,
    conflicting_events UUID[],
    queue_position INTEGER,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**3. Run remaining parts from events_schema.sql** (triggers, indexes, RLS policies)

---

## ✅ **STEP 3: Insert Sample Events**

### **Option A: Using the Script**

After configuring .env.local, run:
```bash
node insert-sample-events.js
```

### **Option B: Manual SQL Insert**

Run this SQL in Supabase SQL Editor:

```sql
-- Get a faculty user ID first
SELECT id, department_id FROM users WHERE role = 'faculty' LIMIT 1;

-- Replace USER_ID and DEPT_ID with values from above query
INSERT INTO events (
    title, description, event_type, department_id, created_by,
    start_date, end_date, start_time, end_time, venue,
    expected_participants, budget_allocated, 
    contact_person, contact_email, contact_phone,
    status, priority_level, is_public, registration_required, max_registrations
) VALUES 
(
    'AI/ML Workshop - Introduction to Machine Learning',
    'Hands-on workshop covering the fundamentals of Artificial Intelligence and Machine Learning. Topics include neural networks, deep learning, and practical applications using Python and TensorFlow.',
    'workshop',
    'DEPT_ID',  -- Replace with your department_id
    'USER_ID',  -- Replace with your user id
    '2025-10-15',
    '2025-10-15',
    '09:00:00',
    '17:00:00',
    'Auditorium',
    200,
    15000,
    'Dr. John Smith',
    'john.smith@college.edu',
    '+1 234 567 8900',
    'approved',
    3,
    TRUE,
    TRUE,
    250
),
(
    'Annual Cultural Fest 2025 - TechnoFiesta',
    'Join us for the biggest cultural celebration of the year! Featuring music performances, dance competitions, drama presentations, and art exhibitions from talented students across all departments.',
    'cultural',
    'DEPT_ID',  -- Replace with your department_id
    'USER_ID',  -- Replace with your user id
    '2025-10-20',
    '2025-10-22',
    '10:00:00',
    '20:00:00',
    'Main Ground',
    500,
    50000,
    'Prof. Sarah Johnson',
    'sarah.johnson@college.edu',
    '+1 234 567 8901',
    'pending',
    4,
    TRUE,
    FALSE,
    0
);
```

**Verify insertion:**
```sql
SELECT id, title, status, start_date, venue FROM events ORDER BY created_at DESC;
```

---

## ✅ **STEP 4: Test the UI**

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Login as faculty user** at:
   ```
   http://localhost:3080/login
   ```

3. **Navigate to events page:**
   ```
   http://localhost:3080/faculty/events
   ```

4. **You should see:**
   - 📊 Statistics: 2 Total Events, 1 Pending, 1 Approved
   - 📅 Calendar with events on Oct 15, 20-22
   - 📝 List view with 2 event cards

---

## ✅ **STEP 5: Test Create Event Functionality**

1. Click **"Create Event"** button (top right)
2. Fill in the form:
   ```
   Title: "Python Programming Workshop"
   Type: Workshop
   Start Date: 2025-10-25
   End Date: 2025-10-25
   Start Time: 10:00
   End Time: 16:00
   Venue: Lab 101
   Expected Participants: 50
   ```
3. Click **"Create Event"**
4. You should be redirected back to events page
5. The new event should appear in the list

---

## ✅ **STEP 6: Test Edit/Delete**

### **Edit Event:**
1. Click on any event card to open modal
2. Click **"Edit"** button
3. Modify any field
4. Save changes
5. Verify changes appear in list

### **Delete Event:**
1. Click on any event card
2. Click **"Delete"** button
3. Confirm deletion
4. Event should disappear from list

---

## 🔍 **Verification Checklist**

Check each item:

- [ ] `.env.local` file created with Supabase credentials
- [ ] Events schema deployed (events table exists)
- [ ] Sample events inserted (2 events in database)
- [ ] Development server running
- [ ] Can login as faculty user
- [ ] Events page displays correctly
- [ ] Statistics show: 2 Total, 1 Pending, 1 Approved
- [ ] Calendar shows events on correct dates
- [ ] Can open event modal and see details
- [ ] "Create Event" button works
- [ ] Can create new event successfully
- [ ] New event appears in list
- [ ] Can edit existing event
- [ ] Can delete event

---

## ❌ **Troubleshooting**

### **Problem: "Missing Supabase credentials"**
**Solution:** Create `.env.local` file with correct credentials

### **Problem: "events table does not exist"**
**Solution:** Run the SQL schema in Supabase SQL Editor

### **Problem: "No faculty user found"**
**Solution:** Create a faculty user in your database first

### **Problem: Events page is blank**
**Solution:** 
- Check browser console (F12) for errors
- Check Network tab for failed API calls
- Verify you're logged in as faculty
- Check that events table has data

### **Problem: Cannot create event**
**Solution:**
- Check all required fields are filled
- Verify dates are valid (end >= start)
- Check browser console for API errors
- Verify department_id is set

### **Problem: "401 Unauthorized" errors**
**Solution:**
- Clear localStorage: `localStorage.clear()`
- Login again
- Check that user role is 'faculty'

---

## 📊 **Expected Database Structure**

After setup, you should have:

```
Database Tables:
├── events (with 2 sample records)
├── event_registrations (empty)
└── event_notifications (empty)

Triggers:
├── check_event_conflicts() - Auto conflict detection
├── update_event_participants() - Auto participant count
└── send_event_notification() - Auto notifications

Indexes:
├── idx_events_department
├── idx_events_created_by
├── idx_events_dates
├── idx_events_status
├── idx_events_venue
└── ... (10 more indexes)

RLS Policies:
├── events_select_policy
├── events_insert_policy
├── events_update_policy
├── events_delete_policy
└── ... (more policies)
```

---

## 🎉 **Success!**

If all steps completed successfully:
- ✅ Database schema deployed
- ✅ Sample events inserted
- ✅ UI displays events correctly
- ✅ Can create new events
- ✅ Can edit/delete events
- ✅ Conflict detection working

**Your event management system is now fully operational!**

---

## 📁 **File Locations**

```
academic_campass_2025/
├── database/
│   └── events_schema.sql          ← Database schema (run this in Supabase)
├── src/
│   ├── app/
│   │   ├── api/events/route.ts    ← API endpoints
│   │   └── faculty/
│   │       └── events/
│   │           ├── page.tsx        ← Events list page
│   │           └── create/
│   │               └── page.tsx    ← Create event form
│   └── components/
│       └── events/
│           ├── EventCalendar.tsx   ← Calendar component
│           └── EventDetailModal.tsx ← Event details modal
├── insert-sample-events.js         ← Sample data script
├── EVENTS_SETUP_GUIDE.md          ← Detailed setup guide
└── MANUAL_SETUP.md                ← This file
```

---

**Need help? Check the troubleshooting section or review the console for error messages!**
