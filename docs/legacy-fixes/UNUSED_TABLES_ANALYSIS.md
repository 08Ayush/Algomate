# Database Tables Usage Analysis
**Generated:** November 24, 2025  
**Database:** Supabase PostgreSQL

---

## ✅ ACTIVELY USED TABLES (In CRUD Operations)

### **Core User Management**
1. **`users`** ✅ - Login, registration, profile management
2. **`colleges`** ✅ - College setup and management
3. **`departments`** ✅ - Department CRUD operations
4. **`student_batch_enrollment`** ✅ - Student-batch associations

### **Academic Structure**
5. **`batches`** ✅ - Batch creation and management
6. **`subjects`** ✅ - Subject CRUD operations
7. **`classrooms`** ✅ - Classroom management
8. **`time_slots`** ✅ - Time slot configuration
9. **`batch_subjects`** ✅ - Curriculum setup
10. **`faculty_qualified_subjects`** ✅ - Faculty-subject mapping

### **Timetable Generation**
11. **`timetable_generation_tasks`** ✅ - Task tracking for timetable generation
12. **`generated_timetables`** ✅ - Generated timetable storage
13. **`scheduled_classes`** ✅ - Individual class schedules
14. **`workflow_approvals`** ✅ - Approval workflow tracking (used in review-queue)

### **Events System**
15. **`events`** ✅ - Event creation and management (recently implemented)

---

## ⚠️ PARTIALLY IMPLEMENTED / UI ONLY

### **Notifications**
- **`notifications`** ⚠️ - Table exists, UI components present, but NO actual INSERT operations
  - Header shows notification dropdown
  - No API route to create notifications
  - No notifications sent on timetable approval/rejection
  - **Status:** UI placeholder only

---

## ❌ COMPLETELY UNUSED TABLES (No CRUD Operations)

### **1. Algorithm & Performance Tracking**
- **`algorithm_execution_metrics`** ❌
  - **Purpose:** Track CP-SAT and GA algorithm performance metrics
  - **Fields:** Execution time, memory usage, fitness scores, constraint violations
  - **Status:** Never inserted into, no queries
  - **Impact:** Low (analytics only)

### **2. Resource Management**
- **`resource_utilization_summary`** ❌
  - **Purpose:** Track faculty/classroom/time slot utilization across timetables
  - **Fields:** Total hours, utilization %, capacity status, conflict counts
  - **Status:** Empty table, no calculations performed
  - **Impact:** Medium (optimization insights lost)

### **3. Cross-Department Coordination**
- **`cross_department_conflicts`** ❌
  - **Purpose:** Detect shared resource conflicts between departments
  - **Fields:** Faculty/classroom double bookings, timing conflicts
  - **Status:** No conflict detection logic implemented
  - **Impact:** High (could cause real scheduling conflicts)

- **`master_accepted_timetables`** ❌
  - **Purpose:** College-wide published timetable registry
  - **Fields:** Occupied resources, conflict tracking, version control
  - **Status:** Never used, timetables stay in `generated_timetables`
  - **Impact:** High (no global conflict prevention)

- **`master_scheduled_classes`** ❌
  - **Purpose:** Global class schedule index for conflict detection
  - **Fields:** Resource hashes, cross-department visibility
  - **Status:** Never populated
  - **Impact:** High (departments can't see each other's schedules)

### **4. Access Control & Permissions**
- **`timetable_access_control`** ❌
  - **Purpose:** Fine-grained permissions for timetable viewing/editing
  - **Fields:** User/batch/department/college level access
  - **Status:** No permission checks implemented
  - **Impact:** Low (basic role-based access working)

### **5. Audit & Compliance**
- **`audit_logs`** ❌
  - **Purpose:** Track all database changes for compliance
  - **Fields:** Old/new values, user actions, IP addresses
  - **Status:** Trigger exists but minimal logging
  - **Impact:** Medium (no audit trail)

### **6. Faculty Management**
- **`faculty_availability`** ❌
  - **Purpose:** Track faculty preferred/unavailable time slots
  - **Fields:** Availability type, preference weights, effective dates
  - **Status:** No UI to set availability, not used in scheduling
  - **Impact:** Medium (faculty preferences ignored)

### **7. Constraint System**
- **`constraint_rules`** ❌ (Has sample data but not enforced)
  - **Purpose:** Configurable hard/soft constraints for algorithm
  - **Sample Rules Inserted:** 14 rules (no_batch_overlap, distribute_subjects_evenly, etc.)
  - **Status:** Rules exist in DB but algorithm doesn't read them
  - **Impact:** High (constraints hardcoded instead of flexible)

### **8. Events System (Extended Features)**
- **`event_registrations`** ❌
  - **Purpose:** Track user registrations for events
  - **Status:** No registration functionality built
  - **Impact:** Low (events work without registrations)

- **`event_notification_tracking`** ❌
  - **Purpose:** Track event notification delivery
  - **Status:** No event notifications sent
  - **Impact:** Low (manual event checking)

### **9. Assignment System**
- **`assignment_notifications`** ❌
  - **Purpose:** Faculty assignment creation system
  - **Status:** Complete table structure but no UI/API
  - **Impact:** Medium (missing feature)

- **`assignment_notification_tracking`** ❌
  - **Purpose:** Track assignment notification delivery
  - **Status:** Depends on assignments (also unused)
  - **Impact:** Low (feature not built)

### **10. Exam System**
- **`exam_notifications`** ❌
  - **Purpose:** Exam scheduling and notification system
  - **Status:** Complete table structure but no implementation
  - **Impact:** Medium (separate feature not built)

- **`exam_notification_tracking`** ❌
  - **Purpose:** Track exam notification delivery
  - **Status:** Depends on exams (also unused)
  - **Impact:** Low (feature not built)

---

## 📊 SUMMARY STATISTICS

| Category | Count | Status |
|----------|-------|--------|
| **Actively Used Tables** | 15 | ✅ Working |
| **Partially Implemented** | 1 | ⚠️ UI only, no backend |
| **Completely Unused** | 18 | ❌ No CRUD operations |
| **Total Tables** | 34 | - |
| **Utilization Rate** | **44%** | Only 15 of 34 tables in use |

---

## 🎯 PRIORITY RECOMMENDATIONS

### **HIGH PRIORITY (Affects Core Functionality)**
1. **Implement `master_accepted_timetables` & `master_scheduled_classes`**
   - **Why:** Prevents cross-department conflicts for shared resources (faculty/classrooms)
   - **Risk:** Two departments can currently schedule same faculty at same time
   - **Effort:** High (requires publish workflow changes)

2. **Implement `cross_department_conflicts`**
   - **Why:** Detect and resolve resource conflicts between departments
   - **Risk:** Silent conflicts causing real-world scheduling issues
   - **Effort:** Medium (conflict detection logic)

3. **Activate `constraint_rules` in algorithm**
   - **Why:** Make constraints configurable instead of hardcoded
   - **Current State:** 14 rules inserted but never read by algorithm
   - **Effort:** Medium (algorithm refactor to read rules)

### **MEDIUM PRIORITY (Improves Experience)**
4. **Implement `notifications` system fully**
   - **Why:** Users need real-time updates on approvals/rejections
   - **Current State:** UI exists but no notification creation
   - **Effort:** Low (simple INSERT operations + API route)

5. **Implement `faculty_availability`**
   - **Why:** Respect faculty time preferences in scheduling
   - **Current State:** UI exists in user preferences but not used
   - **Effort:** Medium (UI + algorithm integration)

6. **Implement `resource_utilization_summary`**
   - **Why:** Analytics for optimal resource allocation
   - **Current State:** Empty, no calculations
   - **Effort:** Medium (background job to calculate)

### **LOW PRIORITY (Nice to Have)**
7. **`algorithm_execution_metrics`** - Performance analytics
8. **`audit_logs`** - Enhanced audit trail (basic logging exists)
9. **`event_registrations`** - Event RSVP system
10. **`assignment_notifications`** - Assignment management feature
11. **`exam_notifications`** - Exam scheduling feature

---

## 🔧 CLEANUP RECOMMENDATIONS

### **Option 1: Keep for Future Features**
Keep unused tables if features are planned:
- Assignment system
- Exam management
- Event registrations
- Advanced analytics

### **Option 2: Remove Unused Tables**
Drop tables to reduce complexity:
```sql
-- Remove unimplemented features
DROP TABLE IF EXISTS assignment_notification_tracking CASCADE;
DROP TABLE IF EXISTS assignment_notifications CASCADE;
DROP TABLE IF EXISTS exam_notification_tracking CASCADE;
DROP TABLE IF EXISTS exam_notifications CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS event_notification_tracking CASCADE;

-- Remove unused analytics
DROP TABLE IF EXISTS algorithm_execution_metrics CASCADE;
DROP TABLE IF EXISTS resource_utilization_summary CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE; -- Keep if compliance needed

-- Keep but implement critical tables:
-- master_accepted_timetables (CRITICAL)
-- master_scheduled_classes (CRITICAL)
-- cross_department_conflicts (CRITICAL)
-- constraint_rules (IMPORTANT - already has data)
-- notifications (IMPORTANT - UI ready)
-- faculty_availability (USEFUL)
-- timetable_access_control (LOW priority)
```

---

## 🚨 CRITICAL ISSUE: Cross-Department Conflicts

**Current Problem:**
- Multiple departments can publish timetables independently
- No global registry of published schedules
- Shared resources (faculty, classrooms) can be double-booked
- No conflict detection across departments

**Solution Required:**
Implement the master timetable system:
```typescript
// When publishing a timetable:
1. Check master_scheduled_classes for resource conflicts
2. If conflicts exist, create entries in cross_department_conflicts
3. Require resolution before final publish
4. Copy to master_accepted_timetables on successful publish
5. Populate master_scheduled_classes for future conflict checks
```

---

## 📋 NEXT STEPS

### **Immediate (Week 1)**
- [ ] Implement notifications system (low effort, high user value)
- [ ] Document cross-department conflict risks
- [ ] Plan master timetable system architecture

### **Short-term (Month 1)**
- [ ] Build master timetable registry
- [ ] Implement conflict detection
- [ ] Activate constraint rules in algorithm

### **Long-term (Quarter 1)**
- [ ] Faculty availability system
- [ ] Resource utilization analytics
- [ ] Advanced audit logging
- [ ] Decide on assignments/exams features (build or remove)

---

## 🏗️ ARCHITECTURAL NOTES

**Why Tables Were Created But Not Used:**
1. **Over-engineering:** Schema designed for comprehensive LMS/ERP system
2. **MVP Approach:** Core timetable generation built first
3. **Time Constraints:** Extended features postponed
4. **Complexity:** Some features (master timetable) require significant logic

**Schema Quality:** ⭐⭐⭐⭐⭐ Excellent design, proper constraints, well-indexed

**Recommendation:** Don't drop tables yet. Implement critical features (master timetable) first, then decide on optional features (assignments/exams) based on user needs.
