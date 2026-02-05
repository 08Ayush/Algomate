# Database Schema Technical Analysis
## Academic Compass 2025 - Multi-College Management System

---

## 1. Overall Schema Understanding

### Domain & Purpose
This database powers a **comprehensive multi-college academic management platform** with advanced features including:
- Multi-tenant college management (multiple institutions on one platform)
- Automated timetable generation using hybrid algorithms (CP-SAT + Genetic Algorithm)
- NEP 2020 compliance (National Education Policy)
- Assignment and examination management with proctoring
- Event management and conflict resolution
- Subject allocation system for electives
- Resource utilization tracking

### Major Functional Modules

| Module | Table Count | Purpose |
|--------|-------------|---------|
| **Core Management** | 8 | Colleges, departments, users, courses, classrooms |
| **Curriculum & Subjects** | 6 | Subjects, elective buckets, batch subjects, bucket subjects |
| **Batch & Enrollment** | 4 | Batches, student enrollment, course selections |
| **Timetable Generation** | 11 | Tasks, generated timetables, scheduled classes, conflicts, metrics |
| **Faculty Management** | 4 | Qualifications, availability, preferences, assignments |
| **Assignment System** | 9 | Assignments, questions, submissions, answers, proctoring, analytics |
| **Exam & Notifications** | 6 | Exam notifications, assignment notifications, tracking |
| **Events System** | 3 | Events, registrations, notifications |
| **Access Control & Audit** | 5 | RLS policies, workflow approvals, access control, audit logs |
| **Master Timetables** | 4 | Published timetables, master scheduled classes, cross-department conflicts |
| **Supporting Tables** | 7 | Time slots, constraint rules, notifications, utilization summary |

**Total Tables: ~67 tables**

---

## 2. Table-wise Purpose Explanation

### 2.1 Core Foundation Tables (Multi-College Architecture)

#### `colleges`
- **Purpose**: Root entity for multi-tenancy. Each college is a separate organization.
- **Key Features**: Working days, college timings, academic year, principal/registrar references
- **Relationships**: Parent to all college-specific data
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `departments`
- **Purpose**: Organizational units within colleges (CSE, ECE, Education, etc.)
- **Relationships**: FK to colleges, referenced by batches, subjects, users
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `users`
- **Purpose**: Universal user table for all roles (super_admin, college_admin, admin, hod, faculty, student)
- **Key Features**: Role-based attributes, faculty preferences, algorithm weights, NEP 2020 fields
- **Relationships**: Referenced by virtually all tables as creator/owner
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `courses`
- **Purpose**: Academic programs (B.Ed, M.Ed, ITEP, B.Tech, etc.)
- **Relationships**: FK to colleges, referenced by batches, users
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `classrooms`
- **Purpose**: Physical/virtual teaching spaces with capacity and equipment
- **Relationships**: FK to colleges, referenced by scheduled classes, events, exams
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

---

### 2.2 Curriculum & Subject Management

#### `subjects`
- **Purpose**: Academic subjects with NEP 2020 categorization (MAJOR, MINOR, ELECTIVE, etc.)
- **Key Features**: Credit system, lab requirements, NEP category, special events support
- **Relationships**: FK to college, department, course; referenced extensively
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `elective_buckets`
- **Purpose**: Subject pools for NEP 2020 elective selection (e.g., "Sem 1 Humanities Major Pool")
- **Relationships**: FK to college, batch; referenced by bucket_subjects, subject_allotments
- **Type**: Core business table (NEP 2020)
- **Status**: ✅ ACTIVELY USED

#### `bucket_subjects`
- **Purpose**: Links subjects to buckets with capacity management
- **Key Features**: Max capacity tracking, current enrollment
- **Relationships**: FK to elective_buckets, subjects
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `batch_subjects`
- **Purpose**: Assigns subjects to batches with required hours per week
- **Relationships**: FK to batches, subjects, faculty (assigned)
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

---

### 2.3 Batch & Student Management

#### `batches`
- **Purpose**: Student cohorts by department, semester, and academic year
- **Key Features**: Admission year tracking, semester validity dates, batch year
- **Relationships**: FK to college, department, course; core scheduling entity
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `student_batch_enrollment`
- **Purpose**: Many-to-many relationship between students and batches
- **Relationships**: FK to users (students), batches
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `student_course_selections`
- **Purpose**: NEP 2020 subject selections (Major/Minor choices)
- **Relationships**: FK to users (students), subjects
- **Type**: Core business table (NEP 2020)
- **Status**: ✅ ACTIVELY USED

#### `subject_allotments_permanent`
- **Purpose**: Permanent subject allotment records with priority ranking
- **Key Features**: CGPA-based allocation, algorithm tracking
- **Relationships**: FK to students, buckets, subjects
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

---

### 2.4 Timetable Generation System (Core Algorithm Module)

#### `time_slots`
- **Purpose**: Discrete time periods for scheduling (e.g., 9:00-10:00 Monday)
- **Key Features**: Break/lunch time markers, slot ordering
- **Relationships**: FK to colleges; referenced by scheduled classes
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `timetable_generation_tasks`
- **Purpose**: Tracks algorithm execution for batch timetable generation
- **Key Features**: Status tracking, phase monitoring, fitness scores
- **Relationships**: FK to batches, users (creator)
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `generated_timetables`
- **Purpose**: Algorithm-generated timetable versions with fitness metrics
- **Key Features**: Constraint violations tracking, optimization metrics
- **Relationships**: FK to batches, colleges; parent to scheduled_classes
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `scheduled_classes`
- **Purpose**: Individual class periods in a timetable
- **Relationships**: FK to timetable, batch, subject, faculty, classroom, time_slot
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `master_accepted_timetables`
- **Purpose**: Published/approved timetables (production version)
- **Key Features**: Version control, effective date ranges, resource occupation tracking
- **Relationships**: FK to generated_timetables (original), batches, colleges
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED (Production timetables)

#### `master_scheduled_classes`
- **Purpose**: Classes from published timetables (production schedule)
- **Relationships**: FK to master_timetables, scheduled_classes (original), all resources
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED (Production schedule)

#### `constraint_rules`
- **Purpose**: Hard/soft constraints for timetable algorithm
- **Key Features**: Rule parameters, weights, active/inactive toggle
- **Relationships**: College-wide configuration
- **Type**: Configuration table
- **Status**: ✅ ACTIVELY USED

#### `algorithm_execution_metrics`
- **Purpose**: Performance metrics for algorithm runs (CP-SAT + GA)
- **Key Features**: Execution times, constraint satisfaction rates, utilization metrics
- **Relationships**: FK to generation_tasks
- **Type**: Analytics/log table
- **Status**: ✅ ACTIVELY USED

#### `ga_population_snapshots`
- **Purpose**: Genetic algorithm population data for analysis
- **Relationships**: FK to generation_tasks
- **Type**: Analytics/log table
- **Status**: ✅ ACTIVELY USED (Algorithm debugging)

#### `cross_department_conflicts`
- **Purpose**: Detects resource conflicts between departments
- **Key Features**: Faculty/classroom/time slot conflicts across timetables
- **Relationships**: FK to master_timetables, departments, scheduled classes
- **Type**: Supporting table
- **Status**: ✅ ACTIVELY USED (Multi-department scheduling)

---

### 2.5 Faculty Management

#### `faculty_qualified_subjects`
- **Purpose**: Subjects each faculty member can teach with proficiency levels
- **Relationships**: FK to users (faculty), subjects
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `faculty_availability`
- **Purpose**: Faculty availability for specific time slots
- **Relationships**: FK to users (faculty), time_slots
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `faculty_scheduling_preferences`
- **Purpose**: Soft constraint preferences (consecutive hours, lunch breaks, etc.)
- **Relationships**: FK to users (faculty)
- **Type**: Configuration table
- **Status**: ✅ ACTIVELY USED

#### `faculty_subject_assignments`
- **Purpose**: Pre-assigned faculty-subject-batch mappings
- **Relationships**: FK to faculty, subjects, batches
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

---

### 2.6 Assignment & Examination System

#### `assignments`
- **Purpose**: Assignment metadata with proctoring configuration
- **Key Features**: MCQ/MSQ/Essay/Coding types, proctoring settings, scheduling
- **Relationships**: FK to colleges, batches, subjects, creators
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `assignment_questions`
- **Purpose**: Questions within assignments with JSONB data storage
- **Relationships**: FK to assignments
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `assignment_submissions`
- **Purpose**: Student submission tracking with auto-grading support
- **Relationships**: FK to assignments, students, batches
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `submission_answers`
- **Purpose**: Individual answers for each question
- **Relationships**: FK to submissions, questions
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `proctoring_violations`
- **Purpose**: Logs browser-based proctoring violations
- **Relationships**: FK to submissions
- **Type**: Audit/log table
- **Status**: ✅ ACTIVELY USED

#### `assignment_attachments`
- **Purpose**: File attachments for assignments
- **Relationships**: FK to assignments
- **Type**: Supporting table
- **Status**: ✅ ACTIVELY USED

#### `coding_test_cases`
- **Purpose**: Test cases for coding questions
- **Relationships**: FK to questions
- **Type**: Supporting table
- **Status**: ✅ ACTIVELY USED

#### `assignment_analytics`
- **Purpose**: Cached analytics per assignment
- **Relationships**: FK to assignments
- **Type**: Analytics table
- **Status**: ✅ ACTIVELY USED

#### `submission_question_grades`
- **Purpose**: Detailed grading per question in submissions
- **Relationships**: FK to submissions, questions
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

---

### 2.7 Notifications & Communication

#### `notifications`
- **Purpose**: General notification system
- **Relationships**: FK to users (recipients)
- **Type**: Supporting table
- **Status**: ✅ ACTIVELY USED

#### `assignment_notifications`
- **Purpose**: Assignment-specific notification metadata
- **Relationships**: FK to subjects, batches, departments, colleges
- **Type**: Feature-specific table
- **Status**: ⚠️ POTENTIALLY REDUNDANT (overlaps with `assignments` table)

#### `assignment_notification_tracking`
- **Purpose**: Tracks delivery of assignment notifications
- **Relationships**: FK to assignment_notifications, users
- **Type**: Feature-specific table
- **Status**: ⚠️ POTENTIALLY REDUNDANT

#### `exam_notifications`
- **Purpose**: Exam scheduling and notification data
- **Relationships**: FK to subjects, batches, departments, colleges, classrooms
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `exam_notification_tracking`
- **Purpose**: Tracks delivery of exam notifications
- **Relationships**: FK to exam_notifications, users
- **Type**: Supporting table
- **Status**: ✅ ACTIVELY USED

---

### 2.8 Events Management

#### `events`
- **Purpose**: Institutional events with conflict detection
- **Key Features**: Registration limits, queue system, conflict tracking
- **Relationships**: FK to departments, classrooms, creators, approvers
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `event_registrations`
- **Purpose**: Many-to-many event registrations
- **Relationships**: FK to events, users
- **Type**: Core business table
- **Status**: ✅ ACTIVELY USED

#### `event_notifications`
- **Purpose**: Event-specific notifications
- **Relationships**: FK to events, users
- **Type**: Supporting table
- **Status**: ✅ ACTIVELY USED

---

### 2.9 Access Control & Workflow

#### `timetable_access_control`
- **Purpose**: Granular access control for timetables
- **Relationships**: FK to users, timetables, batches
- **Type**: Access control table
- **Status**: ✅ ACTIVELY USED

#### `workflow_approvals`
- **Purpose**: Multi-step approval workflow for timetables
- **Relationships**: FK to timetables, approvers
- **Type**: Supporting table
- **Status**: ✅ ACTIVELY USED

#### `audit_logs`
- **Purpose**: System-wide audit trail
- **Relationships**: FK to users
- **Type**: Audit/log table
- **Status**: ✅ ACTIVELY USED

---

### 2.10 Resource Management

#### `resource_utilization_summary`
- **Purpose**: Analytics on faculty/classroom/resource utilization
- **Key Features**: Hourly tracking, over/under-utilization flags
- **Relationships**: FK to colleges
- **Type**: Analytics table
- **Status**: ✅ ACTIVELY USED (Resource optimization)

---

## 3. Unused / Untouched Tables Detection

### 3.1 Potentially Redundant Tables

#### ❌ `assignment_notifications` + `assignment_notification_tracking`
**Why appears redundant:**
- The `assignments` table already contains notification-related fields (notify_students, scheduled_start, etc.)
- The general `notifications` table can handle assignment notifications
- This creates a separate notification system specifically for assignments

**Intended for:**
- A legacy or alternative notification system
- Backward compatibility with an older module

**Recommendation:**
- **CONSOLIDATE**: Merge functionality into `assignments` + `notifications`
- **OR CLARIFY**: If this serves a specific business requirement (e.g., batch notifications vs. individual), document it clearly

**Risk Level:** Medium (data duplication)

---

### 3.2 Tables That May Be Underutilized

#### ⚠️ `system_settings` (referenced but not defined in schema)
**Status:** Mentioned in comments but table definition is missing from provided schema
**Recommendation:** Add table definition or remove references

---

### 3.3 Feature-Specific Tables (Future Expansion)

#### ✅ `coding_test_cases`
**Status:** Present for coding assignments, likely used when assignment type is 'CODING'
**Recommendation:** Keep for feature completeness

#### ✅ `proctoring_violations`
**Status:** Used when proctoring is enabled on assignments
**Recommendation:** Keep for proctoring feature

---

## 4. Redundancy & Optimization Insights

### 4.1 Duplicate Functionality

| Issue | Tables Involved | Impact | Recommendation |
|-------|----------------|--------|----------------|
| **Notification Duplication** | `assignment_notifications`, `exam_notifications`, `event_notifications`, `notifications` | Medium | Create unified notification architecture with polymorphic associations |
| **Scheduled Classes Duplication** | `scheduled_classes`, `master_scheduled_classes` | Low | Intentional (draft vs. production), but ensure sync logic is robust |
| **Timetable Duplication** | `generated_timetables`, `master_accepted_timetables` | Low | Intentional (draft vs. production) |

### 4.2 Missing Indexes (Performance Concerns)

**High-Impact Missing Indexes:**
```sql
-- Missing composite indexes for frequent joins
CREATE INDEX idx_scheduled_classes_resource_lookup 
ON scheduled_classes(faculty_id, classroom_id, time_slot_id, day_of_week);

CREATE INDEX idx_master_scheduled_classes_resource_lookup 
ON master_scheduled_classes(faculty_id, classroom_id, time_slot_id, day_of_week);

-- Missing index for notification queries
CREATE INDEX idx_notifications_type_status 
ON notifications(notification_type, is_read, created_at);
```

### 4.3 Data Type Concerns

**Potential Issues:**
1. **UUID[] arrays** in multiple tables (e.g., `occupied_faculty_ids`) - Consider normalization for better queryability
2. **TEXT[] arrays** for syllabus topics - JSONB might be more flexible
3. **JSONB fields** are well-utilized but ensure GIN indexes exist where needed

### 4.4 Constraint Analysis

**Missing Constraints:**
- No CHECK constraint on `batches.semester` (should be 1-8 or 1-10)
- No CHECK constraint on `users.current_semester` for students
- Missing UNIQUE constraint on `faculty_subject_assignments` to prevent duplicate assignments

**Recommended Additions:**
```sql
ALTER TABLE batches ADD CONSTRAINT check_semester_range 
CHECK (semester >= 1 AND semester <= 8);

ALTER TABLE users ADD CONSTRAINT check_student_semester 
CHECK (role != 'student' OR current_semester IS NULL OR current_semester BETWEEN 1 AND 8);
```

---

## 5. Schema Quality Assessment

### 5.1 Strengths ✅

1. **Multi-tenancy Ready**: Proper college_id FK in all tables
2. **Comprehensive Indexing**: Good coverage on frequently queried columns
3. **Row-Level Security (RLS)**: Implemented for data isolation
4. **Audit Trail**: audit_logs + updated_at triggers on all tables
5. **NEP 2020 Compliance**: Proper handling of MAJOR/MINOR/ELECTIVE categories
6. **Algorithm Observability**: Detailed metrics and snapshot tables
7. **Soft Deletes**: is_active flags prevent data loss

### 5.2 Weaknesses ⚠️

1. **Notification System Fragmentation**: Multiple overlapping notification tables
2. **Missing Cascade Rules**: Some FK constraints lack ON DELETE behavior specification
3. **Array Columns**: UUID[] and TEXT[] make relational queries harder
4. **JSONB Overuse**: Some JSONB fields could be normalized for better type safety
5. **View Dependencies**: `subject_allotments_detailed` references non-existent `subject_allotments` table

---

## 6. Final Summary

### 6.1 Actively Used Tables (61 tables)

**Core Infrastructure (8):**
- colleges, departments, users, courses, classrooms, time_slots, batches, constraint_rules

**Curriculum (6):**
- subjects, elective_buckets, bucket_subjects, batch_subjects, student_course_selections, subject_allotments_permanent

**Timetable System (11):**
- timetable_generation_tasks, generated_timetables, scheduled_classes, master_accepted_timetables, master_scheduled_classes, algorithm_execution_metrics, ga_population_snapshots, cross_department_conflicts, workflow_approvals, timetable_access_control, resource_utilization_summary

**Faculty (4):**
- faculty_qualified_subjects, faculty_availability, faculty_scheduling_preferences, faculty_subject_assignments

**Assignments (9):**
- assignments, assignment_questions, assignment_submissions, submission_answers, submission_question_grades, proctoring_violations, assignment_attachments, coding_test_cases, assignment_analytics

**Exams (2):**
- exam_notifications, exam_notification_tracking

**Events (3):**
- events, event_registrations, event_notifications

**Enrollment (1):**
- student_batch_enrollment

**Supporting (4):**
- notifications, audit_logs, workflow_approvals, resource_utilization_summary

---

### 6.2 Redundant / Review Required Tables (2)

| Table | Status | Action |
|-------|--------|--------|
| `assignment_notifications` | ⚠️ Redundant | Consolidate into `assignments` + `notifications` |
| `assignment_notification_tracking` | ⚠️ Redundant | Merge tracking into general notification system |

---

### 6.3 Missing Referenced Tables (1)

| Table | Issue | Action |
|-------|-------|--------|
| `subject_allotments` | Referenced in view but not defined | Either create table or fix view to use `subject_allotments_permanent` |

---

## 7. Actionable Recommendations

### Priority 1 (Critical) 🔴

1. **Fix Missing Table Issue**
   - Create `subject_allotments` table OR update `subject_allotments_detailed` view to use `subject_allotments_permanent`

2. **Add Missing Constraints**
   ```sql
   ALTER TABLE batches ADD CONSTRAINT check_semester_range 
   CHECK (semester >= 1 AND semester <= 8);
   ```

3. **Add Performance Indexes**
   - Add composite indexes on scheduled_classes for resource conflict checking

### Priority 2 (High) 🟡

4. **Consolidate Notification System**
   - Merge assignment_notifications into assignments table
   - Use polymorphic notification system with general notifications table

5. **Normalize Array Columns**
   - Convert `occupied_faculty_ids`, `occupied_classroom_ids` to junction tables for better queryability

6. **Add Missing FK Cascade Rules**
   - Review all FK constraints and add appropriate ON DELETE behavior

### Priority 3 (Medium) 🟢

7. **Documentation**
   - Add COMMENT ON TABLE/COLUMN for complex JSONB structures
   - Document the draft vs. production timetable workflow

8. **Schema Cleanup**
   - Remove unused columns if any exist
   - Consolidate similar enum types

### Priority 4 (Low) 🔵

9. **Future Enhancements**
   - Consider partitioning audit_logs by date for performance
   - Add materialized views for complex analytics queries
   - Implement database-level encryption for sensitive fields

---

## 8. Database Health Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **Schema Design** | 8.5/10 | Well-structured, minor redundancies |
| **Normalization** | 8/10 | Mostly normalized, some denormalization justified |
| **Indexing** | 8/10 | Good coverage, room for optimization |
| **Constraints** | 7/10 | Good FK coverage, missing some CHECK constraints |
| **Performance** | 8/10 | RLS optimized, good trigger usage |
| **Scalability** | 9/10 | Multi-tenant ready, proper isolation |
| **Maintainability** | 7/10 | Some complexity in notification system |
| **Security** | 9/10 | RLS implemented, audit logs present |

**Overall Score: 8.1/10** - Production-ready with minor improvements needed

---

## 9. Conclusion

This database schema represents a **mature, well-architected academic management system** with advanced features like automated timetable generation and NEP 2020 compliance. The multi-college architecture is properly implemented with RLS for data isolation.

**Key Takeaways:**
- ✅ Core functionality is solid and production-ready
- ⚠️ Minor redundancies in notification system need consolidation
- 🔧 Performance can be improved with targeted index additions
- 📚 Documentation would improve maintainability

The schema is **production-ready** with the critical fix (subject_allotments table/view) and recommended for deployment after addressing Priority 1 items.

---

**Analysis Generated:** February 1, 2026  
**Schema Version:** PYGRAM 2025 - FINAL MULTI-COLLEGE PRODUCTION SCHEMA  
**Total Tables Analyzed:** 67  
**Total Indexes:** 73+  
**RLS Policies:** 25+
