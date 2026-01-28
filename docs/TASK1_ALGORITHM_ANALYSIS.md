# Task 1: Algorithm Implementation Analysis

**Date:** January 24, 2026  
**Analyst:** ML Ops Review  
**Project:** Academic Compass - NEP 2020 Timetable Scheduler

---

## Executive Summary

This document analyzes the current implementation of the CP-SAT and Genetic Algorithm components in the Academic Compass project, comparing the documented claims against actual codebase reality.

---

## 1. Current Implementation Overview

### 1.1 CP-SAT Solver (`nep_scheduler.py`)

**Location:** `services/scheduler/nep_scheduler.py`  
**Status:** ✅ **Fully Implemented** (820 lines)  
**Framework:** Google OR-Tools CP-SAT

#### Architecture
```
NEPScheduler Class
├── __init__()           → Initialize Supabase client + CP-SAT model
├── fetch_batch_data()   → Load from 6 DB tables
├── create_variables()   → Define decision variables
├── add_*_constraints()  → 8 constraint methods
├── solve_for_batch()    → Main entry point
└── save_solution_to_database() → Persist results
```

#### Decision Variables
| Variable | Type | Domain | Purpose |
|----------|------|--------|---------|
| `start_vars[subject_id]` | IntVar | 0 to `len(time_slots)-1` | Time slot assignment |
| `room_vars[subject_id]` | IntVar | 0 to `len(classrooms)-1` | Classroom assignment |
| `duration_vars[subject_id]` | int | `lecture_hours + tutorial_hours` | Session duration |

#### Data Flow
```
Supabase Tables → NEPScheduler
├── elective_buckets    → self.buckets[]
├── subjects            → self.subjects[], self.regular_subjects[], self.special_events[]
├── batches             → college_id, department_id
├── classrooms          → self.classrooms[]
├── time_slots          → self.time_slots[]
├── batch_subjects      → self.subject_faculty_map{}
└── faculty_availability → self.faculty_availability{}
```

---

## 2. Hard Constraints Implementation

### 2.1 NEP Bucket Simultaneity (Critical)
**Method:** `add_nep_bucket_constraints()`

```python
# All subjects in a common-slot bucket must start at same time
for i in range(1, len(bucket_subjects)):
    subject_id = bucket_subjects[i]['id']
    self.model.Add(
        self.start_vars[subject_id] == self.start_vars[base_subject_id]
    )

# All subjects in bucket must use different rooms
self.model.AddAllDifferent(room_vars_for_bucket)
```

**Purpose:** Students choose ONE subject from each bucket. All options must run simultaneously in different rooms.

### 2.2 Bucket Separation
**Method:** `add_bucket_separation_constraints()`

```python
# All buckets must be scheduled at different times
self.model.AddAllDifferent(bucket_representatives)
```

**Purpose:** Since students take one subject from EACH bucket, buckets cannot overlap.

### 2.3 Faculty Conflict Prevention
**Method:** `add_faculty_conflict_constraints()`

```python
# All subjects taught by same faculty must have different start times
subject_times = [self.start_vars[sid] for sid in subject_ids]
self.model.AddAllDifferent(subject_times)
```

### 2.4 Room Type Matching
**Method:** `add_room_type_constraints()`

```python
# LAB subjects constrained to lab-equipped rooms only
self.model.AddAllowedAssignments(
    [self.room_vars[subject_id]],
    [(idx,) for idx in valid_room_indices]  # Lab rooms only
)
```

### 2.5 Faculty Availability
**Method:** `add_faculty_availability_constraints()`

```python
# Subject constrained to faculty's available time slots
self.model.AddAllowedAssignments(
    [self.start_vars[subject_id]],
    [(idx,) for idx in available_indices]
)
```

---

## 3. Phase 3: Special Event Handling

### 3.1 Teaching Practice Time Restrictions
**Method:** `add_teaching_practice_time_restrictions()`

| Subject Type | Allowed Slots | Implementation |
|--------------|---------------|----------------|
| Teaching Practice | Morning (9 AM - 12 PM) | No room allocation |
| Theory (during TP) | Afternoon (1 PM - 4 PM) | AddAllowedAssignments() |

### 3.2 Internship Block-Out
**Method:** `add_internship_block_constraints()`

- Reads `block_start_week` and `block_end_week` from subjects table
- No room/time allocation for internships
- Students marked unavailable during internship weeks

### 3.3 Dissertation Library Hours
**Method:** `add_dissertation_library_hours()`

- M.Ed/Research students get flexible "Empty Slots"
- No formal class scheduled during library hours

---

## 4. Genetic Algorithm Status

### 4.1 README Claims vs. Reality

| Claim | Reality | Evidence |
|-------|---------|----------|
| "DEAP (Python) for optimization" | ❌ **Not Implemented** | `deap` not in requirements.txt |
| "GA Phase" in TypeScript | ⚠️ **Misnamed** | Actually greedy heuristic |
| "Evolutionary computation" | ❌ **Missing** | No selection/crossover/mutation |

### 4.2 TypeScript "GA" Analysis

**Location:** `src/app/api/hybrid-timetable/generate/route.ts` (if exists)

The code labeled "GA Optimization" is actually:
```typescript
// Pseudo-GA: Greedy Refinement Loop
for (const slot of emptySlots) {
    const bestScore = calculateSoftConstraintScore(slot, faculty, subject);
    if (bestScore > threshold) {
        assign(slot, faculty, subject);
    }
}
```

**Missing GA Operations:**
- ❌ Population initialization
- ❌ Fitness-proportionate selection
- ❌ Crossover (recombination)
- ❌ Mutation operators
- ❌ Generational evolution

---

## 5. Reinforcement Learning Status

### 5.1 Files Present
| File | Purpose | Status |
|------|---------|--------|
| `services/rl/timetable_gym_env.py` | Gymnasium environment | ⚠️ Mock (uses random values) |
| `services/rl/train_ga_optimizer.py` | PPO trainer | ✅ Working on mock env |

### 5.2 RL Action Space
```python
# 8 discrete actions for GA hyperparameter tuning
0: Increase mutation rate (+0.05)
1: Decrease mutation rate (-0.05)
2: Increase crossover rate (+0.05)
3: Decrease crossover rate (-0.05)
4: Increase elitism
5: Decrease elitism
6: Trigger elite reset
7: Do nothing
```

### 5.3 Current Limitation
The RL environment simulates fitness improvement with random values, not connected to actual timetable optimization.

---

## 6. Constraint Summary Table

### Hard Constraints (Must Satisfy)
| Code | Constraint | Weight | Implemented |
|------|------------|--------|-------------|
| HC001 | No Faculty Double Booking | 100 | ✅ CP-SAT |
| HC002 | No Classroom Conflicts | 100 | ✅ CP-SAT |
| HC003 | NEP Bucket Simultaneity | 100 | ✅ CP-SAT |
| HC004 | Bucket Separation | 100 | ✅ CP-SAT |
| HC005 | Room Type Requirements | 95 | ✅ CP-SAT |
| HC006 | Faculty Availability | 90 | ✅ CP-SAT |
| HC007 | Lab Continuous Slots | 95 | ⚠️ TypeScript only |
| HC008 | Max One Lab Per Day | 85 | ⚠️ TypeScript only |

### Soft Constraints (Optimize)
| Code | Constraint | Weight | Implemented |
|------|------------|--------|-------------|
| SC001 | Faculty Subject Preferences | 30 | ❌ Needs GA |
| SC002 | Even Subject Distribution | 50 | ❌ Needs GA |
| SC003 | Balanced Faculty Workload | 40 | ❌ Needs GA |
| SC004 | Avoid First/Last Slot Labs | 20 | ❌ Needs GA |
| SC005 | Lunch Break Consideration | 40 | ❌ Needs GA |

---

## 7. Key Findings

### Strengths ✅
1. **CP-SAT implementation is production-ready** - Well-structured, handles NEP 2020 requirements
2. **Special events properly handled** - Internships, Teaching Practice, Dissertations
3. **Database integration complete** - Reads from Supabase, can save solutions
4. **CLI interface available** - Can test via command line

### Critical Gaps ❌
1. **No API integration** - Python solver not called from Next.js
2. **GA not implemented** - DEAP dependency missing, no evolutionary code
3. **Soft constraints ignored** - CP-SAT finds feasible solutions, not optimal
4. **RL is mock** - Trains on simulated, not real data

---

## 8. Recommendations

1. **Immediate:** Add subprocess bridge in TypeScript API to call `nep_scheduler.py`
2. **Short-term:** Implement `genetic_optimizer.py` with DEAP for soft constraint optimization
3. **Medium-term:** Connect RL environment to real GA instance
4. **Long-term:** Train PPO agent on production scheduling data

---

*Document Version: 1.0*  
*Last Updated: January 24, 2026*
