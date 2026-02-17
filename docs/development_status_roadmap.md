# Adaptive Scheduler: Development Status & Optimization Roadmap

## 1. Work Completed (Current State)

We have successfully transitioned the scheduling engine from a rigid, hardcoded script to a flexible, production-ready system driven entirely by database configuration.

### ✅ Architecture: Zero Hardcoding
- **College Config**: Working days, timings, and durations are loaded dynamically from `colleges` table.
- **Constraint Registry**: Rules are no longer `if/else` blocks in code. They are registered handlers mapped to `constraint_rules` in the DB. Toggling a rule is as simple as setting `is_active = false`.
- **Data-Driven**: All constraints (faculty hours, gaps, distribution) read parameters directly from DB JSON fields.

### ✅ Reliability & Correctness
- **Cross-Batch Conflict Prevention**: The scheduler now "looks before leaping". It checks `master_scheduled_classes` for existing commitments to prevent double-booking faculty/rooms across different batches.
- **Slot Validation**: Added pre-solve validation to warn if Total Sessions < Total Slots (preventing "empty slot" bugs).
- **Encoder Fix**: Resolved the critical mismatch between the CP-SAT solver output and the Genetic Algorithm encoder (`assignments` vs `scheduled_classes`).

### ✅ Code Quality
- **Modularization**: Separated constraint logic into distinct handlers.
- **Logging**: Enhanced logging for easier debugging of constraint application and solver progress.

---

## 2. Roadmap: Speeding Up the Process (Optimization)

To handle larger colleges and reduce generation time (currently ~30-60s per batch), we should focus on the following optimizations:

### 🚀 A. Solver Performance Tuning
**Current Status:** Uses default CP-SAT search with 8 workers.
- **Action:** Experiment with search heuristics.
  - *Why:* Defaults are good, but domain-specific heuristics (e.g., scheduling difficult subjects first) can speed up convergence by 50%+.
  - *Try:* `solver.parameters.search_branching = cp_model.FIXED_SEARCH`
- **Action:** Optimize `num_search_workers`.
  - *Why:* 8 workers might cause excessive context switching on smaller VMs.
  - *Test:* Benchmark 4 vs 8 workers.

### ⚡ B. Algorithm Optimization (The "Hot Path")
**Current Status:** `fitness_calculator.py` evaluates every chromosome significantly.
- **Action:** Profile the GA loop.
  - *Why:* In Python, loops are slow. The fitness function is called thousands of times.
  - *Fix:* Use **Numba** (`@jit`) or **Cython** to compile the fitness calculation to machine code. This typically yields **10x-100x speedups** for numerical loops.
- **Action:** Vectorization.
  - *Why:* Use NumPy array operations instead of list comprehensions for score calculation.

### 🔄 C. Parallel Execution Strategy
**Current Status:** Sequential processing (one batch at a time via API).
- **Action:** Asynchronous Job Queue.
  - *Why:* Users shouldn't wait for HTTP requests.
  - *Fix:* Use a task queue (e.g., Celery, BullMQ, or just robust DB-polling workers) to process multiple batches concurrently on separate worker nodes.
- **Action:** Batch Grouping.
  - *Why:* Groups of batches (e.g., all 1st Year CSE) check for conflicts against *each other*.
  - *Fix:* Solve a "Department" as a single large model OR solve sequentially but hold a shared "locked slots" memory in Redis to allow concurrent solving without DB read/write race conditions.

### 💾 D. Database & Data Fetching
**Current Status:** Fetches all config/constraints for every single batch request.
- **Action:** In-Memory Caching (Redis/Memcached).
  - *Why:* `college_config`, `time_slots`, and `constraint_rules` rarely change.
  - *Fix:* Cache these for 5-10 minutes. Saves ~300ms-500ms per request.
- **Action:** Input Data pruning.
  - *Why:* Currently we might be fetching more rows than needed.
  - *Fix:* Ensure we only fetch faculty/rooms relevant to the specific Department/Batch. (Partially done, can be tighter).

## 3. Immediate "Low Hanging Fruit"
1.  **Reduce Search Space**: If a subject *must* be in a specific room type (e.g., Lab), pre-filter the domain variable to *only* those rooms. (Currently checks all, then constrains).
2.  **Warm Start**: Use the previous best solution as a "hint" for the solver if re-generating a similar batch.
