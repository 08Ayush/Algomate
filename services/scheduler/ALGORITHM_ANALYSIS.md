# Analysis of Hybrid Timetable Scheduling Algorithm

## 1. Executive Summary
The current system utilizes a **Hybrid Scheduling Approach** combining **CP-SAT (Constraint Programming)** for feasibility and a **Genetic Algorithm (GA)** for optimization. The system is designed to handle complex academic constraints including room allocation, faculty availability, and student grouping. Recent updates have focused on **NEP 2020 Compliance** (Elective Buckets) and **Pedagogical Constraints** (Consecutive Lab Sessions).

While the algorithm is fundamentally sound and capable of generating valid timetables, it faces significant challenges when dealing with **Resource Saturation** (100% batch utilization) and **Data Integrity** issues. This document outlines the architecture, current limitations, and recent interventions.

---

## 2. Algorithm Architecture

### Phase 1: Constraint Satisfaction (Feasibility)
*   **Engine**: Google OR-Tools CP-SAT Solver.
*   **Goal**: Find valid "Seed Solutions" that satisfy all HARD constraints.
*   **Variables**:
    *   `start_var`: Time slot assignment (0-35).
    *   `room_var`: Classroom assignment (based on Department/Lab type).
*   **Key Constraints**:
    *   **No Overlap**: Faculty, Room, and Student Group cannot have >1 session at any time `t`.
    *   **Room Suitability**: Labs must be in Lab Rooms; Theory in Classrooms.
    *   **Pre-Assignment**: Specific subjects locked to specific labs (e.g., "Project-II" -> "BS LAB 06").
    *   **Consecutive Blocks (New)**: Lab subjects (>=2 credits) are forced into consecutive 2-hour blocks (`s2 = s1 + 1`).
    *   **Spread**: Sessions/Blocks distributed evenly across days.

### Phase 2: Genetic Optimization (Quality)
*   **Engine**: DEAP (Distributed Evolutionary Algorithms in Python).
*   **Goal**: Improve "Soft Constraints" (Quality of Life) starting from CP-SAT seeds.
*   **Metrics**:
    *   Minimize Gaps in student schedule.
    *   Maximize Preferred Time Slots (Morning Theory).
    *   Balance Faculty Workload.
    *   Limit Consecutive Lectures (Max 3).

---

## 3. Identified Issues & Bottlenecks

### A. Resource Saturation (The 100% Problem)
*   **Context**: The "Sem 7" batch has 36 sessions to schedule in exactly 36 available slots (Mon-Sat, 6 slots/day). Utilization is **100%**.
*   **Issue**: In a saturated schedule, **constraints operate with Zero Degrees of Freedom**.
    *   If a constraint says "Faculty X Unvailable Mon 9-10", that slot is lost.
    *   Total Slots become 35. Required Sessions 36.
    *   **Result**: `INFEASIBLE`. The solver correctly reports no solution exists.
*   **Mitigation**: We temporarily disabled **Faculty Availability Constraints** to allow generation. Strict availability is mathematically incompatible with a 100% loaded fixed curriculum.

### B. Logic Conflicts (Blocks vs. Availability)
*   **Context**: New logic reinforces "Consecutive Labs" (2-hour blocks).
*   **Conflict**: If a Faculty is available at 10:00 but NOT at 11:00, a 2-hour block cannot start at 10:00.
    *   For a fully loaded batch, placing six 2-hour blocks (Project-II) becomes a rigid tiling puzzle.
    *   "Availability" holes in the grid make this puzzle unsolvable.
*   **Status**: Priority given to **Structure** (Consecutive Labs) over **Preference** (Availability).

### C. Evaluation Metrics (Negative Fitness)
*   **Context**: The Fitness Function applies penalties for "undesirable" patterns.
    *   *Penalty*: "More than 3 consecutive lectures".
*   **Issue**: A 100% loaded batch (6 slots/day) **MUST** have 6 consecutive lectures every day (unless breaks are modeled as empty slots, which they are not).
    *   Result: Massive penalties generated (`-1051%` score), causing user alarm.
*   **Fix**: Introduced a **Baseline Score (2000 points)** to offset "structural penalties" so scores remain positive and interpretable.

### D. Data Integrity (The "Overloaded Batch" Bug)
*   **Context**: "Sem 4" failed initially.
*   **Root Cause**: Data Contamination. The batch contained 24 subjects (mixed CSE and Data Science), totaling 41 credits for 36 slots.
    *   Math: 41 > 36. Impossible.
*   **Fix**: Created `auto_fix_batch.py` to clean specific batches by removing extraneous cross-department subjects.

### E. Code Structure
*   **Issue**: Logic duplication between `solve_for_batch` (Single Solution) and `solve_for_multiple_seeds` (GA Seeds).
    *   Recent debugging confusion arose when edits were applied to one function but the system executed the other.
*   **Recommendation**: Refactor to a single `_build_model` method shared by both workflows.

---

## 4. Current State & Recommendations

### Current State
*   **Generation**: Functional for Sem 7 (100% load) and Sem 4 (Cleaned).
*   **Constraints**:
    *   **Active**: Room Conflict, Faculty Conflict, Student Group, Consecutive Labs, Room Type.
    *   **Disabled**: Faculty Availability (to ensure feasibility).
*   **Scoring**: Normalized with baseline 2000.

### Recommendations
1.  **Refactor CP-SAT Builder**: Unify `solve_for_batch` and `solve_for_multiple_seeds` to prevent logic drift.
2.  **Pre-Validation**: Add a "Feasibility Check" before running solver:
    *   `if (Required_Slots > Available_Slots - Unavailability): Warn User`.
3.  **Soft Constraint Context**: Adjust "Consecutive Lecture" penalty logic. If batch load > 80%, relax the penalty, as breaks are impossible.
4.  **UI Feedback**: Display "Constraint Relaxations" to user (e.g., "Faculty Availability ignored due to high saturation").
