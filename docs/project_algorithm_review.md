# Academic Compass Project Review & Hybrid Algorithm Analysis

## 1. Executive Summary
**Review Date:** Jan 2026
**Project Status:** Frontend and Database Schema are well-structured and production-ready. However, the core **"Hybrid AI Algorithm"** described in the documentation is **not fully integrated** into the application flow.

- **Current Behavior:** The system uses a **TypeScript-based Greedy Heuristic** to generate timetables.
- **Python Engine:** A CP-SAT solver implementation exists (`nep_scheduler.py`) but is **disconnected** from the main application.
- **Advanced AI:** Genetic Algorithm (GA) and Reinforcement Learning (RL) components are either missing (GA) or exist only as mismatched simulations (RL).

---

## 2. Current Scheduling Logic (The Reality)
When a user clicks "Generate Timetable", the application hits `/api/hybrid-timetable/generate`.
**Implementation:** `src/app/api/hybrid-timetable/generate/route.ts`

**Mechanism:**
1.  **Phase 1 (Heuristic Construction):**
    *   **Labs**: Finds continuous 2-hour slots, enforcing "max 1 lab per day".
    *   **Theory**: Iterates through empty slots and assigns available faculty/subject pairs.
    *   **Logic**: Pure **Greedy Algorithm**. It fills the first available slot that satisfies hard constraints (room availability, faculty availability).
2.  **Phase 2 ("GA" Optimization - Misnamed):**
    *   The code calls this "GA Optimization", but it is actually a **Weighted Greedy Refinement**.
    *   It loops through remaining empty slots and tries to fill them based on a "Soft Constraint Score" (Faculty preference, workload balance).
    *   **No Evolutionary Computation** (Selection, Crossover, Mutation) occurs here.

**Verdict:** The current system generates valid, conflict-free timetables for simple cases but lacks the global optimization capabilities of a true CP-SAT or Genetic Algorithm solver.

---

## 3. Hybrid Algorithm Status (README vs. Codebase)

| Component | README Claim | Codebase Reality | Status |
|-----------|--------------|------------------|--------|
| **CP-SAT Solver** | "Google OR-Tools for hard constraints" | **Implemented** in `services/scheduler/nep_scheduler.py`. Contains logic for NEP buckets, conflicts, and constraints. **BUT**: It is never called by the API. | ⚠️ Disconnected |
| **Genetic Algorithm** | "DEAP (Python) for optimization" | **Missing**. No Python file uses `deap`. The TS "GA" implementation is a heuristic loop, not a Genetic Algorithm. | ❌ Missing |
| **Reinforcement Learning** | "Stable Baselines3 for improvement" | **Mock Implementation**. `services/rl/timetable_gym_env.py` exists but uses `random` to simulate fitness improvement. It is not connected to real timetable data. | ⚠️ Mock Only |
| **Integration** | "Python subprocess calls" | **Missing**. The Next.js API routes do not contain any `child_process` logic to execution Python scripts. | ❌ Missing |

---

## 4. Code Quality Review

### ✅ Strengths
*   **Database Schema**: `new_schema.sql` is robust, handling NEP 2020 requirements (Major/Minor buckets), multi-college, and detailed constraints.
*   **CP-SAT Python Script**: `services/scheduler/nep_scheduler.py` is well-written. It correctly correctly maps Supabase data to CP-SAT variables and constraints. If connected, it would work well.
*   **Frontend**: The UI is polished (as verified in previous tasks).

### ⚠️ Critical Gaps
*   **False Advertising in Logic**: Variables and logs in `route.ts` refer to "Hybrid Algorithm" and "GA", masking the fact that it's a simple heuristic.
*   **Missing Integration Bridge**: There is no code to bridge the Next.js backend with the Python analysis engine.

---

## 5. Recommendations & Next Steps

To align the project with its goals ("Hybrid AI Engine"):

### Step 1: Connect the CP-SAT Engine (High Priority)
The `nep_scheduler.py` is ready. We should:
1.  Modify `src/app/api/hybrid-timetable/generate/route.ts` to spawn a Python subprocess.
2.  Pass `batch_id` to `nep_scheduler.py`.
3.  Let Python solve the constraints and save to Supabase.
4.  API should return the results from DB.

### Step 2: Implement Real Genetic Algorithm (Medium Priority)
If optimization beyond CP-SAT is needed:
1.  Create `services/scheduler/genetic_optimizer.py` using `deap`.
2.  Takes the CP-SAT solution as the initial population.
3.  Mutates time slots to improve "Soft Constraints" (Faculty preference, spread).

### Step 3: Deprecate Mock RL (Low Priority)
The current RL code (`timetable_gym_env.py`) simulates a fake problem. Unless there is a concrete plan to train on thousands of historical timetables, RL is overkill and currently fake. It's better to remove it or label it "Experimental/Research" to avoid confusion.

### Proposed Action Plan
1.  **Refactor API**: Update the generate route to call `python services/scheduler/nep_scheduler.py`.
2.  **Verify Python Environment**: Ensure `ortools` and `supabase` are installed in the hosting environment.
