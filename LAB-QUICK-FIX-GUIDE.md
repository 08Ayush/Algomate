# Quick Fix Guide: Lab Scheduling Issues

## 🎯 What Was Fixed

1. ✅ **Empty boxes in continuation slots** - Lab sessions now display properly in both hours
2. ✅ **Multiple labs on same day** - New constraint ensures max 1 lab per day
3. ✅ **Better distribution** - Labs scheduled on different days across the week

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Add New Constraint to Database (2 minutes)

Open **Supabase Dashboard** → **SQL Editor** → Copy and run this:

```sql
INSERT INTO constraint_rules (rule_name, rule_type, description, rule_parameters, weight, is_active) 
VALUES
    ('max_one_lab_per_day', 'HARD',
     'Maximum one lab session per day for a batch to ensure even distribution',
     '{"scope": "per_timetable", "resource": "batch", "check_type": "lab_per_day", "max_labs": 1}',
     85.0,
     true)
ON CONFLICT (rule_name) DO UPDATE SET
    description = EXCLUDED.description,
    rule_parameters = EXCLUDED.rule_parameters,
    weight = EXCLUDED.weight;
```

**Or use the pre-made file**:
- Open: `database/add-max-one-lab-constraint.sql`
- Copy entire contents
- Paste in Supabase SQL Editor
- Click **RUN**

✅ You should see: "✅ New constraint added successfully!"

---

### Step 2: Restart Dev Server (30 seconds)

In VS Code terminal:

```powershell
# Stop current server (Ctrl+C)
npm run dev
```

✅ Wait for "Ready on http://localhost:3000"

---

### Step 3: Test Timetable Generation (3 minutes)

1. **Navigate**: Admin → Hybrid Timetable → Generate
2. **Select**: Semester 7, CSE, Batch
3. **Click**: Generate Timetable
4. **View**: Click "View Timetable"

**Check These**:
- [ ] Lab sessions show in BOTH slots (no empty boxes)
- [ ] First slot has "2hr" purple badge
- [ ] Second slot has "↓" purple badge  
- [ ] Each day has maximum 1 lab
- [ ] Labs distributed across different days
- [ ] All 36 slots filled

---

## 📊 Expected Results

### Before Fix ❌
```
Monday:    [TSD Lab][TSD Lab]  [English Lab][English Lab]  [Theory]...
Tuesday:   [OS Lab][OS Lab]    [Theory][Theory][Theory]...
Wednesday: [Theory][Theory][  EMPTY  ][  EMPTY  ]...
```

### After Fix ✅
```
Monday:    [TSD Lab][TSD Lab]  [Theory][Theory]...
Tuesday:   [English Lab][English Lab]  [Theory][Theory]...
Wednesday: [OS Lab][OS Lab]  [Theory][Theory]...
```

---

## 🔍 Console Output to Look For

When generating timetable, you should see:

```
🔬 Step 1: Scheduling LAB sessions (continuous 2-hour slots)...
📋 Constraint: Maximum 1 lab per day, distributed across week
  ✅ 25CE505P LAB: Monday slots 0-1 (2 hours) - Session 1/1
  ✅ 25CE541P LAB: Tuesday slots 0-1 (2 hours) - Session 1/1
  ✅ 25CE502P LAB: Wednesday slots 0-1 (2 hours) - Session 1/1
✅ LAB scheduling: 3 sessions, Slots: 6/36
```

**Key indicators**:
- Each lab on different day ✅
- "Session 1/1" shows proper tracking ✅
- Total slots increases by 2 per lab ✅

---

## ⚙️ How It Works

### The Algorithm Now:

1. **Find First Available Day** (without lab):
   - Monday → Has lab? No → Schedule here
   
2. **Find 2 Consecutive Slots** on that day:
   - Slots 0-1 available? Yes → Perfect!
   
3. **Schedule Both Entries**:
   - Slot 0: Main lab entry (`is_continuation: false`)
   - Slot 1: Continuation entry (`is_continuation: true`)
   - Both have same subject/faculty/classroom info
   
4. **Mark Day as Used**:
   - Add "Monday" to `labScheduledDays` Set
   
5. **Move to Next Day**:
   - Find next day without lab (Tuesday)
   - Repeat process

### Visual Result:

**Slot 0 (Main Entry)**:
```
┌─────────────────────────┐
│ Technical Skill Dev - I │ ← Subject name
│ 25CE505P            2hr │ ← Code + Badge
│ 👤 Prof. Omesh Wadhwani │ ← Faculty
│ 📍 BF03                 │ ← Classroom
└─────────────────────────┘
```

**Slot 1 (Continuation)**:
```
┌─────────────────────────┐
│ Technical Skill Dev - I │ ← Same subject
│ 25CE505P             ↓  │ ← Code + Continuation badge
│ 👤 Prof. Omesh Wadhwani │ ← Same faculty
│ 📍 BF03                 │ ← Same classroom
└─────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: Still seeing empty boxes

**Check 1**: Verify constraint was added
```sql
SELECT * FROM constraint_rules WHERE rule_name = 'max_one_lab_per_day';
```
Should return 1 row.

**Check 2**: Clear browser cache
- Press `Ctrl + Shift + R` (hard refresh)
- Or `Ctrl + Shift + Delete` → Clear cache

**Check 3**: Check browser console
- Press `F12` → Console tab
- Look for API response errors

---

### Issue: Multiple labs still on same day

**Check 1**: Verify server restarted
- Look for "Ready on http://localhost:3000" in terminal
- If not, restart: `npm run dev`

**Check 2**: Check console logs
- Terminal should show: "📋 Constraint: Maximum 1 lab per day"
- If not showing, file changes may not be saved

**Check 3**: Regenerate timetable
- Delete old timetable
- Generate fresh one
- Old cached data won't have new constraint

---

### Issue: Labs scheduled but not enough days

**Scenario**: More than 6 lab subjects (only 6 days available)

**Console will show**:
```
⚠️ 25CE507P: No more days available for labs (3/4 scheduled)
```

**Solutions**:
1. Reduce number of lab subjects
2. Schedule some labs every other week
3. Lower constraint weight to allow exceptions

---

## 📁 Files Changed

### Modified:
1. ✅ `src/app/api/hybrid-timetable/generate/route.ts`
   - Lines ~390-460: Lab scheduling algorithm

2. ✅ `database/insert-constraint-rules.sql`
   - Added `max_one_lab_per_day` constraint

3. ✅ `database/new_schema.sql`
   - Added constraint to default INSERT

### Created:
4. ✅ `LAB-SCHEDULING-IMPROVEMENTS.md`
   - Full technical documentation

5. ✅ `database/add-max-one-lab-constraint.sql`
   - Quick SQL to add constraint

6. ✅ `LAB-QUICK-FIX-GUIDE.md` (this file)
   - Quick setup guide

---

## ✨ Summary

**What's New**:
- ✅ Lab continuation slots display properly
- ✅ Maximum 1 lab per day constraint
- ✅ Better lab distribution across week
- ✅ Improved visual indicators
- ✅ Better logging and debugging

**What's Next**:
1. Run the SQL (Step 1)
2. Restart server (Step 2)
3. Test generation (Step 3)
4. Verify results ✅

**Total Time**: ~5 minutes

---

## 📞 Need Help?

Check these files for more details:
- `LAB-SCHEDULING-IMPROVEMENTS.md` - Full technical details
- `TIMETABLE-GENERATION-IMPROVEMENTS.md` - Algorithm explanation
- `DATABASE-SETUP-STEPS.md` - Database setup guide

**Console Commands**:
```powershell
# Restart server
npm run dev

# Check for errors
# (Look in VS Code terminal output)
```

---

**Ready to test!** 🚀

Follow Steps 1-3 above and you should see:
- ✅ No empty boxes in timetable
- ✅ Max 1 lab per day
- ✅ Labs distributed evenly
- ✅ All 36 slots filled properly
