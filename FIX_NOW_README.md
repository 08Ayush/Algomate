# 🚨 URGENT FIX - Event Creation Error

## ❌ Current Error:
```
Failed to create event: permission denied for table events
```

## ✅ The Fix (2 Minutes):

### **STEP 1: Run This SQL** (Copy & Paste)

**The Supabase SQL Editor is already open in the Simple Browser tab!**

Copy these 3 lines and paste in the SQL Editor:

```sql
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications DISABLE ROW LEVEL SECURITY;
```

Then click the green **"Run"** button.

---

### **STEP 2: Test Your UI**

After running the SQL:

```bash
# Start/restart dev server
npm run dev
```

Visit: **http://localhost:3080/faculty/events**

You should now see:
- ✅ 2 sample events displayed
- ✅ Statistics: 2 Total Events
- ✅ Calendar with events
- ✅ "Create Event" button working

---

## 🧪 Quick Test:

1. **View Events:**
   - Go to http://localhost:3080/faculty/events
   - You should see AI/ML Workshop and Cultural Fest

2. **Create Event:**
   - Click "Create Event"
   - Fill in:
     ```
     Title: Test Workshop
     Type: workshop
     Start Date: 2025-10-25
     End Date: 2025-10-25
     Start Time: 10:00
     End Time: 16:00
     Venue: Lab 101
     ```
   - Click "Create Event"
   - Should see success message! ✅

3. **Verify in Database:**
   - Go back to events list
   - Should see 3 events now
   - Statistics should show "3 Total Events"

---

## 🔍 Why This Happens:

**RLS (Row Level Security)** was enabled on the tables, which blocks all operations unless you're authenticated through Supabase Auth. Since we're using custom authentication (localStorage), we need to disable RLS for the tables to work.

---

## ✅ After Running The SQL:

**What will work:**
- ✅ View all events
- ✅ Create new events
- ✅ Edit existing events
- ✅ Delete events
- ✅ All CRUD operations from UI
- ✅ Data persists in database

---

## 📋 Quick Reference:

**SQL to Run:**
```sql
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_notifications DISABLE ROW LEVEL SECURITY;
```

**Where to Run:**
- Supabase SQL Editor (already open in Simple Browser)
- Or: https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new

**Time Required:** 30 seconds

**Effect:** Immediate - refresh your UI and it will work!

---

## 🎉 Success Indicators:

You'll know it worked when:
- ✅ Events page loads without errors
- ✅ Can see the 2 sample events
- ✅ Can create new event without permission error
- ✅ New event appears in list immediately
- ✅ Can edit/delete events

---

## 📞 Still Not Working?

If you still get errors after running the SQL:

1. **Check SQL ran successfully:**
   - Should see green checkmarks in Supabase
   - No error messages

2. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Clear browser cache:**
   - Press Ctrl+Shift+R to hard refresh
   - Or clear localStorage: `localStorage.clear()`

4. **Check browser console:**
   - Press F12
   - Look for any red errors
   - Share the error message

---

## 🚀 DO THIS NOW:

1. ✅ Go to Simple Browser tab (already open)
2. ✅ Copy the 3 ALTER TABLE lines above
3. ✅ Paste in SQL Editor
4. ✅ Click "Run"
5. ✅ Go to http://localhost:3080/faculty/events
6. ✅ Create an event!

**That's it! Should take 2 minutes total.** 🎊
