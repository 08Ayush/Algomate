📌 Project: PyGram - J&K NEP 2020 Pivot
Goal: Transition the existing Engineering-based prototype to a Multidisciplinary NEP 2020 Architecture specifically for Cluster University of Jammu & Govt. College of Education (ITEP/B.Ed).

Key Changes:

From: Fixed Batches (everyone takes the same class).

To: Choice-Based "Buckets" (Major/Minor Pools).

New Logic: Parallel Scheduling, Internship Blocking, Pedagogy Grouping.

📅 Phase 1: Database Schema Overhaul (The "Bucket" System) ✅ COMPLETE
Objective: Update Supabase schema to support "Subject Pools" and NEP Categories instead of rigid streams.

🛠️ Technical Tasks
Alter subjects table to include nep_category (Major, Minor, AEC, VAC, Pedagogy).

Create elective_buckets table to define pools (e.g., "Sem 1 Humanities Major Pool").

Link subjects to buckets via course_group_id.

Create student_course_selections to track which student is in which "sub-class" for conflict checking.

🤖 Copilot Prompt (Phase 1)
SQL

-- Prompt for Copilot:
I need to update my Supabase PostgreSQL schema to support NEP 2020 "Bucket" systems for the J&K ITEP program. 
Please write the SQL migration script to do the following:

1. Update the `subjects` table:
   - Add an Enum `nep_category` with values: 'MAJOR', 'MINOR', 'MULTIDISCIPLINARY', 'AEC', 'VAC', 'CORE', 'PEDAGOGY', 'INTERNSHIP'.
   - Add a `course_group_id` UUID column (nullable).
   - Add `lecture_hours`, `tutorial_hours`, `practical_hours` (integers) to replace the single `credits` column, and a generated column `credit_value` (L + T + P/2).

2. Create a new table `elective_buckets`:
   - Columns: `id` (UUID), `batch_id` (FK to batches), `bucket_name` (text), `min_selection` (int), `max_selection` (int), `is_common_slot` (bool).
   - `is_common_slot` defaults to TRUE (meaning all subjects in this bucket must be scheduled simultaneously).

3. Create a `student_course_selections` table:
   - Links `student_id` (FK users) to `subject_id` (FK subjects).
   - Includes `semester` and `academic_year`.

4. Add a constraint/index to ensure efficient querying of a batch's buckets.
Provide the full SQL script compatible with the existing `new_schema.sql`.
🧠 Phase 2: Algorithm Core (CP-SAT Updates) ✅ COMPLETE
Objective: Rewrite the Constraint Satisfaction logic to schedule "Buckets" in parallel rather than "Batches" sequentially.

🛠️ Technical Tasks
Common Slot Logic: If a bucket has is_common_slot=True, all subjects in it must have start_time[s1] == start_time[s2] and AllDifferent(rooms).

Major/Minor Separation: Ensure "Minor" buckets do not overlap with "Major" buckets for the same semester.

Pedagogy Handling: For B.Ed, treat "Pedagogy of Math" and "Pedagogy of English" as a parallel bucket.

🤖 Copilot Prompt (Phase 2)
Python

# Prompt for Copilot:
I am updating my Google OR-Tools CP-SAT solver for a University Timetable.
I need to implement "Common Slot" logic for NEP 2020 Electives.

Context:
- I have a list of `elective_buckets`. Each bucket contains a list of `subjects`.
- If `bucket.is_common_slot` is True, ALL subjects in that bucket must be scheduled at the exact same time slot but in different rooms.

Task: Write a Python function `add_bucket_constraints(model, buckets, time_vars, room_vars)` that:
1. Iterates through each bucket.
2. For subjects in the same bucket:
   - Adds a Hard Constraint: `time_vars[subject_A] == time_vars[subject_B]`.
   - Adds a Hard Constraint: `AllDifferent([room_vars[subject_A], room_vars[subject_B], ...])`.
3. Ensures valid room types (e.g., Pedagogy of Science needs a Science Lab, Pedagogy of English needs a Lecture Hall).

Assume `time_vars` is a dictionary mapping subject_id to an IntVar (slot index).
🏫 Phase 3: Domain Specifics (Internships & Pedagogy) ✅ COMPLETE
Objective: Handle the unique "Non-Lecture" constraints for B.Ed and ITEP (Internships and Dissertation).

🛠️ Technical Tasks
Internship Blocking: If nep_category == 'INTERNSHIP', do not assign a room/time. Instead, create a "Block Out" constraint for enrolled students/faculty for the defined duration (e.g., 2 weeks).

Dissertation Logic: M.Ed students need "Empty Slots" (Library hours) rather than specific classes.

🤖 Copilot Prompt (Phase 3)
Python

# Prompt for Copilot:
I need to handle "Internships" and "Teaching Practice" in my scheduling algorithm for a B.Ed program.
These are not regular classes; they block the students/faculty for entire days or weeks.

Task: Update the constraint generation logic.
1. Identify subjects where `nep_category` is 'INTERNSHIP' or 'TEACHING_PRACTICE'.
2. Do NOT create `room_vars` or standard `time_vars` for these.
3. Instead, create a `block_out_constraint`:
   - If a Batch has an Internship in Week X, ensure NO other 'THEORY' subjects are scheduled for that Batch during Week X.
   - For 'Teaching Practice' (Part-time), ensure it is scheduled in the Morning slots (9 AM - 12 PM) and Theory classes are restricted to Afternoon slots (1 PM - 4 PM).

Write the logic to separate these "Special Events" from standard "Theory Courses" before passing them to the solver.
💻 Phase 4: Frontend "Curriculum Builder" ✅ COMPLETE
Objective: Create a UI for Admins to define these complex "Major/Minor Pools" without writing SQL.

🛠️ Technical Tasks
Bucket Creator: A Drag-and-Drop UI to move subjects into "Pools" (e.g., Drag 'History' into 'Humanities Major').

Mock Student Generator: A button to generate 50 dummy students with random Major/Minor choices to test the scheduler.

🤖 Copilot Prompt (Phase 4)
TypeScript

// Prompt for Copilot:
I am building a Next.js 15 page for the "NEP Curriculum Builder".
I need a React component using `dnd-kit` (Drag and Drop).

Requirements:
1. **Left Column:** List of all available Subjects (fetched from Supabase).
2. **Right Column:** "Buckets" (Droppable zones).
   - User can create a new Bucket (e.g., "Sem 1 Major Pool").
   - User can drag Subjects from Left into a Bucket.
   - Each Bucket has a toggle switch: "Common Time Slot" (True/False).
3. **Save Button:** writes the new bucket structure and subject mappings to the `elective_buckets` table.

Please scaffold the simulated data structure and the React Component code.
🚀 Phase 5: Optimization (Reinforcement Learning) ✅ COMPLETE
Objective: Add the RL agent to auto-tune the Genetic Algorithm parameters (Mutation/Crossover) as requested for the "Smart" feature.

🛠️ Technical Tasks
Gym Environment: Wrap the GA in a custom Gym class.

State/Action Definition: Define observations (fitness, diversity) and actions (tweak params).

Training Loop: Implement PPO from Stable Baselines 3.

🤖 Copilot Prompt (Phase 5)
Python

# Prompt for Copilot:
I want to optimize my Genetic Algorithm (GA) scheduler using Reinforcement Learning.
Please create a Python class `TimetableGymEnv` inheriting from `gym.Env`.

1. **Observation Space (State):** A numpy array containing:
   - Current Best Fitness (0-1 float)
   - Population Diversity (Standard deviation of fitness)
   - Generations without improvement (Stagnation counter)

2. **Action Space (Discrete):**
   - 0: Increase Mutation Rate by 0.05
   - 1: Decrease Mutation Rate by 0.05
   - 2: Increase Crossover Rate
   - 3: Trigger "Elitism Reset" (Keep top 10%, randomize rest)

3. **Step Function:**
   - Execute 5 generations of the GA with current params.
   - Calculate Reward: (New_Fitness - Old_Fitness) * 100.
   - Return new state and reward.

Provide the skeleton code using `gymnasium` and `stable_baselines3`.