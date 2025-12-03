# 🎯 Event Management System - Quick Setup Guide

This guide will help you set up the event management system with database tables and sample data.

---

## 📋 Prerequisites

✅ Supabase account and project created
✅ `.env.local` file with Supabase credentials
✅ At least one faculty user in the database

---

## 🚀 Setup Steps

### **Step 1: Deploy Database Schema**

1. Open your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Open the file: `database/events_schema.sql`
6. **Copy ALL contents** of the file
7. **Paste** into the SQL Editor
8. Click **"Run"** button
9. Wait for execution to complete
10. Verify you see success messages (green checkmarks)

**What this creates:**
- ✅ `events` table with 30+ columns
- ✅ `event_registrations` table
- ✅ `event_notifications` table
- ✅ Event type and status ENUMs
- ✅ Automatic conflict detection trigger
- ✅ Participant counting trigger
- ✅ Notification system trigger
- ✅ 15+ performance indexes
- ✅ Row Level Security (RLS) policies

---

### **Step 2: Insert Sample Events**

After the schema is deployed, run this command in your terminal:

```bash
node insert-sample-events.js
```

**What this does:**
- ✅ Finds a faculty user in your database
- ✅ Creates 2 sample events:
  1. **AI/ML Workshop** (Approved, Oct 15)
  2. **Cultural Fest** (Pending, Oct 20-22)
- ✅ Verifies events were inserted correctly

**Expected Output:**
```
🚀 Inserting Sample Events...

📋 Step 1: Finding faculty user...
✅ Found faculty user: John Doe
   Email: john.doe@college.edu

📋 Step 2: Inserting events...

1. Creating: "AI/ML Workshop - Introduction to Machine Learning"
   ✅ Created successfully!
   📍 Event ID: abc123...

2. Creating: "Annual Cultural Fest 2025 - TechnoFiesta"
   ✅ Created successfully!
   📍 Event ID: def456...

🎉 Sample events inserted successfully!
```

---

### **Step 3: Test the UI**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to events page:**
   ```
   http://localhost:3080/faculty/events
   ```

3. **You should see:**
   - 📊 Statistics dashboard (2 Total Events, 1 Pending, 1 Approved)
   - 📅 Calendar view with events displayed
   - 📝 List view with event cards
   - ➕ "Create Event" button

---

### **Step 4: Test CRUD Operations**

#### **View Events**
- Switch between Calendar and List views
- Filter by status (All, Pending, Approved, Rejected)
- Click on an event to see full details

#### **Create Event**
1. Click **"Create Event"** button
2. Fill in the form:
   - Title (required)
   - Type (required)
   - Date & Time (required)
   - Venue (required)
   - Other optional fields
3. Click **"Create Event"**
4. Check if event appears in the list

#### **Edit Event**
1. Open an event modal
2. Click **"Edit"** button
3. Modify fields
4. Save changes

#### **Delete Event**
1. Open an event modal
2. Click **"Delete"** button
3. Confirm deletion
4. Verify event is removed

---

## 🔍 Troubleshooting

### **Issue: "Events table not found"**

**Solution:**
- Go back to Step 1 and run the SQL schema
- Make sure there are no errors in SQL execution
- Check that all triggers and functions were created

### **Issue: "No faculty user found"**

**Solution:**
Create a faculty user first:
```sql
INSERT INTO users (
  email, password, role, first_name, last_name, department_id
) VALUES (
  'faculty@test.com', 
  '$2a$10$...', -- hashed password
  'faculty', 
  'Test', 
  'Faculty',
  (SELECT id FROM departments LIMIT 1)
);
```

### **Issue: "Cannot read properties of null"**

**Solution:**
- Clear localStorage: `localStorage.clear()`
- Login again as faculty user
- Check browser console for errors

### **Issue: Events not displaying**

**Solution:**
1. Open browser DevTools (F12)
2. Check Network tab for API calls
3. Verify `/api/events` returns data
4. Check Console for JavaScript errors
5. Verify RLS policies allow reading events

---

## 📊 Database Schema Overview

### **Events Table**
```sql
- id (UUID, Primary Key)
- title (VARCHAR 255, Required)
- description (TEXT)
- event_type (ENUM: workshop, seminar, conference, etc.)
- department_id (UUID, FK to departments)
- created_by (UUID, FK to users)
- start_date, end_date (DATE, Required)
- start_time, end_time (TIME, Required)
- venue (VARCHAR 255, Required)
- expected_participants (INTEGER)
- budget_allocated (DECIMAL)
- contact_person, contact_email, contact_phone
- status (ENUM: pending, approved, rejected, completed, cancelled)
- priority_level (1-5)
- has_conflict (BOOLEAN)
- conflicting_events (UUID[])
- queue_position (INTEGER)
- approved_by, rejected_by (UUID, FK to users)
- created_at, updated_at (TIMESTAMP)
```

### **Automatic Features**
- ✅ **Conflict Detection**: Automatically detects overlapping events in same venue
- ✅ **Queue Management**: Assigns queue position when conflicts exist
- ✅ **Participant Counting**: Updates count when users register/unregister
- ✅ **Notifications**: Sends alerts when event status changes
- ✅ **Timestamps**: Auto-updates created_at and updated_at

---

## 🎨 UI Features

### **Events Page**
- 📊 Statistics Dashboard (Total, Pending, Approved, Rejected, Completed)
- 📅 Calendar View (Monthly calendar with event indicators)
- 📝 List View (Card-based event list)
- 🔍 Status Filter (Filter by event status)
- ➕ Create Event Button

### **Event Modal**
- ℹ️ Full event details
- 📍 Venue and date information
- 👥 Participant count
- ⚠️ Conflict warnings
- 🎯 Queue position (if conflicted)
- 📞 Contact information
- ✏️ Edit button (if owner)
- 🗑️ Delete button (if owner)
- ✅ Approve button (if admin/HOD)
- ❌ Reject button (if admin/HOD)

### **Create Event Form**
- 📝 All event fields with validation
- 📅 Date/time pickers
- 🎯 Priority level selector
- 👥 Registration settings
- 💰 Budget allocation
- 📞 Contact information
- ✅ Automatic conflict checking

---

## 📄 Files Created

1. `src/app/faculty/events/create/page.tsx` - Create event form
2. `src/components/events/EventCalendar.tsx` - Calendar component
3. `src/components/events/EventDetailModal.tsx` - Event detail modal
4. `src/app/api/events/route.ts` - API endpoints (GET/POST/PUT/DELETE)
5. `database/events_schema.sql` - Complete database schema
6. `insert-sample-events.js` - Sample data insertion script
7. `EVENTS_SETUP_GUIDE.md` - This file

---

## 🎉 Success Criteria

✅ Schema deployed without errors
✅ 2 sample events inserted
✅ Events page displays statistics
✅ Calendar shows events correctly
✅ Event details modal opens
✅ Create event form works
✅ Can edit/delete own events
✅ Conflict detection working

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for errors
2. Check Network tab for API responses
3. Verify database schema is deployed
4. Ensure user is logged in as faculty
5. Check that events table has RLS policies

---

## 🚀 Next Steps

After setup is complete:
1. Create more events to test functionality
2. Test conflict detection by creating overlapping events
3. Test approval workflow (if you have HOD/admin account)
4. Customize event types in the schema if needed
5. Add more sample data for testing

---

**Happy Event Managing! 🎊**
