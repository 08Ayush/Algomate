# 🎯 COMPLETE SETUP - Ready to Execute

## ✅ Status Check:
- ✅ `.env` file exists with Supabase credentials
- ✅ Faculty user found: Prof. Yogita Nikhare (nikhare@svpcet.edu.in)
- ✅ Department ID: 817ba459-92f5-4a7c-ba0f-82ec6e441f9a
- ❌ Events table NOT created yet (needs to be deployed)

---

## 🚀 STEP-BY-STEP: Deploy Events System

### **STEP 1: Deploy Database Schema** (5 minutes)

#### **Option A: Using Supabase Dashboard (Easiest)**

1. **Open this URL in your browser:**
   ```
   https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new
   ```

2. **Open the schema file:**
   - Navigate to: `database/events_schema.sql`
   - Or use VS Code to open it

3. **Copy ALL contents:**
   - Press `Ctrl+A` to select all
   - Press `Ctrl+C` to copy
   - You should copy 450+ lines

4. **Paste in Supabase SQL Editor:**
   - Go back to browser (Supabase SQL Editor)
   - Click in the editor area
   - Press `Ctrl+V` to paste

5. **Run the schema:**
   - Click the green "Run" button (or press `Ctrl+Enter`)
   - Wait 2-5 seconds for completion

6. **Verify success:**
   You should see green checkmarks and messages like:
   ```
   ✅ CREATE TYPE event_type
   ✅ CREATE TYPE event_status  
   ✅ CREATE TABLE events
   ✅ CREATE TABLE event_registrations
   ✅ CREATE TABLE event_notifications
   ✅ CREATE INDEX ...
   ✅ CREATE TRIGGER ...
   ```

#### **Option B: Quick SQL Copy-Paste**

If you want to copy the SQL directly, here are the most important parts:

**Copy and run this in Supabase SQL Editor:**

\`\`\`sql
-- 1. Create ENUMs
CREATE TYPE event_type AS ENUM (
    'workshop', 'seminar', 'conference', 'cultural', 
    'sports', 'technical', 'orientation', 'examination', 
    'meeting', 'other'
);

CREATE TYPE event_status AS ENUM (
    'pending', 'approved', 'rejected', 'completed', 'cancelled'
);

-- 2. Create events table
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
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (start_date <= end_date),
    CONSTRAINT valid_times CHECK (start_time < end_time),
    CONSTRAINT valid_priority CHECK (priority_level >= 1 AND priority_level <= 5)
);

-- 3. Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 4. Create basic policies
CREATE POLICY events_select_policy ON events
    FOR SELECT USING (true);

CREATE POLICY events_insert_policy ON events
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY events_update_policy ON events
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY events_delete_policy ON events
    FOR DELETE USING (created_by = auth.uid());
\`\`\`

**⚠️ Note:** This is a simplified version. For full features (triggers, indexes, etc.), use the complete `events_schema.sql` file.

---

### **STEP 2: Insert Sample Events** (30 seconds)

After deploying the schema, run this command in your terminal:

\`\`\`bash
node insert-sample-events.js
\`\`\`

**Expected Output:**
\`\`\`
🚀 Inserting Sample Events...

📋 Step 1: Finding faculty user...
✅ Found faculty user: Prof. Yogita Nikhare
   Email: nikhare@svpcet.edu.in

📋 Step 2: Inserting events...

1. Creating: "AI/ML Workshop - Introduction to Machine Learning"
   ✅ Created successfully!
   📍 Event ID: abc123...

2. Creating: "Annual Cultural Fest 2025 - TechnoFiesta"
   ✅ Created successfully!
   📍 Event ID: def456...

📋 Step 3: Verifying events in database...
✅ Found 2 events in database
\`\`\`

---

### **STEP 3: Start Development Server** (Start testing!)

\`\`\`bash
npm run dev
\`\`\`

Then visit: **http://localhost:3080/faculty/events**

---

### **STEP 4: Test Everything** ✅

When you visit the events page, you should see:

**📊 Statistics Dashboard:**
- Total Events: 2
- Pending Review: 1
- Approved: 1
- Rejected: 0
- Completed: 0

**📅 Calendar View:**
- October 15: AI/ML Workshop (Approved)
- October 20-22: Cultural Fest (Pending)

**📝 List View:**
- 2 event cards with details

**➕ Create Event Button:**
- Click to open form
- Fill in details
- Submit to create new event

---

## 🧪 Testing Checklist

Test these features in order:

### ✅ View Events
- [ ] See 2 sample events in list
- [ ] See events on calendar (Oct 15, 20-22)
- [ ] Statistics show correct counts
- [ ] Can switch between Calendar and List views
- [ ] Can filter by status

### ✅ Event Details
- [ ] Click on event to open modal
- [ ] See all event information
- [ ] See status badge (Approved/Pending)
- [ ] See contact information
- [ ] Modal displays correctly

### ✅ Create Event
- [ ] Click "Create Event" button
- [ ] Form opens with all fields
- [ ] Fill in required fields:
  - Title: "Test Workshop"
  - Type: Workshop
  - Start Date: 2025-10-25
  - End Date: 2025-10-25
  - Start Time: 10:00
  - End Time: 16:00
  - Venue: "Lab 101"
- [ ] Click "Create Event"
- [ ] Success message appears
- [ ] Redirected back to events page
- [ ] New event appears in list (now 3 total)

### ✅ Edit Event
- [ ] Click on any event
- [ ] Click "Edit" button in modal
- [ ] Modify some fields
- [ ] Save changes
- [ ] Changes appear in event list

### ✅ Delete Event
- [ ] Click on any event
- [ ] Click "Delete" button
- [ ] Confirm deletion
- [ ] Event removed from list
- [ ] Statistics updated

---

## 🎯 Quick Command Reference

\`\`\`bash
# Deploy schema (manual - use Supabase Dashboard)
# Open: https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new
# Copy contents of: database/events_schema.sql
# Paste and Run

# Insert sample events
node insert-sample-events.js

# Start dev server
npm run dev

# Visit events page
# http://localhost:3080/faculty/events
\`\`\`

---

## ❌ Troubleshooting

### Problem: "events table does not exist"
**Status:** This is the current issue!
**Solution:** Complete STEP 1 above (Deploy Database Schema)

### Problem: "Cannot find the table 'public.events'"
**Solution:** Run the events_schema.sql in Supabase SQL Editor

### Problem: Events not showing in UI
**Solution:** 
1. Check browser console (F12)
2. Check Network tab for API calls
3. Verify you're logged in as faculty
4. Try refreshing the page

### Problem: Cannot create event
**Solution:**
1. Fill all required fields (marked with *)
2. Ensure dates are valid
3. Check browser console for errors

---

## 📊 What You'll Get After Setup

\`\`\`
Database:
├── events table (with 2 sample events)
│   ├── AI/ML Workshop (Approved, Oct 15)
│   └── Cultural Fest (Pending, Oct 20-22)
├── event_registrations table (empty)
└── event_notifications table (empty)

UI Features:
├── Statistics Dashboard (real-time counts)
├── Calendar View (monthly calendar with events)
├── List View (event cards)
├── Create Event Form (full-featured)
├── Event Detail Modal (with edit/delete)
└── Status Filters (All, Pending, Approved, etc.)

Automatic Features:
├── Conflict Detection (overlapping events)
├── Queue Management (automatic positioning)
├── Participant Counting (auto-update)
└── Notifications (status changes)
\`\`\`

---

## 🎉 Success Criteria

You'll know it's working when:

✅ Events page loads without errors
✅ See "2 Total Events" in statistics
✅ See 2 events in calendar/list
✅ Can click and view event details
✅ "Create Event" button works
✅ Can create, edit, and delete events

---

## 📞 Current Status

**Ready for STEP 1:**
- Your Supabase project: `hwfdzrqfesebmuzgqmpe`
- Direct SQL Editor link: https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new
- Schema file ready: `database/events_schema.sql`
- Faculty user ready: Prof. Yogita Nikhare
- Sample data script ready: `insert-sample-events.js`

**Next Action:** 
👉 Go to the Supabase link above and run the schema!

---

## 🚀 Let's Get Started!

**Right now, do this:**

1. **Open in new tab:** https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new
2. **Open file:** database/events_schema.sql
3. **Copy all (Ctrl+A, Ctrl+C)**
4. **Paste in Supabase (Ctrl+V)**
5. **Click Run button**
6. **Wait for success ✅**
7. **Run:** `node insert-sample-events.js`
8. **Run:** `npm run dev`
9. **Visit:** http://localhost:3080/faculty/events
10. **Celebrate!** 🎉

---

**Everything is ready! Just need to run the SQL schema in Supabase Dashboard!** ✨
