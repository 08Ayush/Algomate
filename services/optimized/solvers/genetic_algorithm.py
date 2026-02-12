"""Genetic Algorithm solver for timetable optimization."""

import random
import copy
import time
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass

from core.models import Solution, Assignment, TimeSlot, Room, Faculty, Subject
from core.context import SchedulingContext
from core.config import SolverConfig


@dataclass
class GAConfig:
    """Configuration for Genetic Algorithm."""
    population_size: int = 100
    generations: int = 500
    mutation_rate: float = 0.15
    crossover_rate: float = 0.8
    tournament_size: int = 5
    elite_size: int = 5
    timeout: int = 60


class GeneticAlgorithmSolver:
    """Genetic Algorithm for timetable scheduling."""
    
    def __init__(self, context: SchedulingContext, config: Optional[GAConfig] = None):
        """Initialize GA solver.
        
        Args:
            context: Scheduling context
            config: GA configuration (optional)
        """
        self.context = context
        self.config = config or GAConfig()
        self.generation = 0
        self.best_fitness_history = []
        
    def solve(self, timeout: Optional[int] = None) -> Solution:
        """Solve using genetic algorithm following industry-standard flow.
        
        Standard GA Flow:
        1. Initialize Population
        2. Evaluate Fitness
        3. LOOP until stop condition:
           a. Select Parents
           b. Crossover
           c. Mutation
           d. Create New Generation
           e. Evaluate New Generation
           f. Check Stop Condition
        
        Args:
            timeout: Maximum time in seconds (overrides config)
            
        Returns:
            Best solution found
        """
        start_time = time.time()
        max_time = timeout or self.config.timeout
        
        # ============================================================
        # STEP 1: Initialize Population
        # ============================================================
        population = self._initialize_population()
        
        # ============================================================
        # STEP 2: Evaluate Fitness
        # ============================================================
        fitness_scores = [self._evaluate_fitness(individual) for individual in population]
        
        # Track best solution
        best_idx = np.argmin(fitness_scores)
        best_solution = copy.deepcopy(population[best_idx])
        best_fitness = fitness_scores[best_idx]
        self.best_fitness_history = [best_fitness]
        
        # ============================================================
        # EVOLUTION LOOP
        # ============================================================
        for generation in range(self.config.generations):
            self.generation = generation
            
            # Check stop condition (timeout)
            if time.time() - start_time > max_time:
                break
            
            # --------------------------------------------------------
            # STEP 3: Select Parents
            # --------------------------------------------------------
            parents = self._selection(population, fitness_scores)
            
            # --------------------------------------------------------
            # STEP 4: Crossover
            # --------------------------------------------------------
            offspring = []
            for i in range(0, len(parents) - 1, 2):
                if random.random() < self.config.crossover_rate:
                    child1, child2 = self._crossover(parents[i], parents[i + 1])
                    offspring.extend([child1, child2])
                else:
                    # No crossover - copy parents directly
                    offspring.extend([copy.deepcopy(parents[i]), copy.deepcopy(parents[i + 1])])
            
            # --------------------------------------------------------
            # STEP 5: Mutation
            # --------------------------------------------------------
            for individual in offspring:
                if random.random() < self.config.mutation_rate:
                    self._mutate(individual)
            
            # --------------------------------------------------------
            # STEP 6: Create New Generation
            # --------------------------------------------------------
            # Elitism: Keep best N solutions from current generation
            elite_indices = np.argsort(fitness_scores)[:self.config.elite_size]
            new_generation = [copy.deepcopy(population[i]) for i in elite_indices]
            
            # Add offspring to fill population
            remaining_slots = self.config.population_size - len(new_generation)
            new_generation.extend(offspring[:remaining_slots])
            
            # If offspring not enough, fill with random from current population
            while len(new_generation) < self.config.population_size:
                new_generation.append(copy.deepcopy(random.choice(population)))
            
            # --------------------------------------------------------
            # STEP 2 (repeated): Evaluate Fitness of New Generation
            # --------------------------------------------------------
            population = new_generation
            fitness_scores = [self._evaluate_fitness(individual) for individual in population]
            
            # --------------------------------------------------------
            # Update best solution
            # --------------------------------------------------------
            current_best_idx = np.argmin(fitness_scores)
            current_best_fitness = fitness_scores[current_best_idx]
            
            if current_best_fitness < best_fitness:
                best_solution = copy.deepcopy(population[current_best_idx])
                best_fitness = current_best_fitness
            
            # Track convergence
            self.best_fitness_history.append(best_fitness)
            
            # --------------------------------------------------------
            # STEP 7: Check Stop Condition
            # --------------------------------------------------------
            # Check for convergence (no improvement in last 50 generations)
            if len(self.best_fitness_history) > 50:
                recent_improvement = abs(self.best_fitness_history[-1] - self.best_fitness_history[-50])
                if recent_improvement < 0.001:  # Less than 0.1% improvement
                    break  # Converged
        
        # Set metadata
        best_solution.solver_name = "genetic_algorithm"
        best_solution.metadata['ga'] = {
            'generations': self.generation + 1,
            'final_population_size': len(population),
            'convergence_history': self.best_fitness_history[-10:],
            'converged': len(self.best_fitness_history) > 50 and 
                        abs(self.best_fitness_history[-1] - self.best_fitness_history[-50]) < 0.001,
            'best_fitness': float(best_fitness)
        }

        # Log penalty breakdown for the best solution
        self._evaluate_soft_constraints(best_solution, debug=True)
        
        return best_solution
    
    def _initialize_population(self) -> List[Solution]:
        """Create initial population of random solutions."""
        population = []
        
        for _ in range(self.config.population_size):
            solution = self._generate_random_solution()
            population.append(solution)
        
        return population
    
    def _generate_random_solution(self) -> Solution:
        """Generate a random feasible solution with load-aware faculty selection.

        Lab subjects are scheduled in consecutive 2-hour blocks.
        """
        assignments = []

        # Track usage to avoid obvious conflicts
        faculty_slots = {}  # (faculty_id, slot_id) -> used
        room_slots = {}     # (room_id, slot_id) -> used
        batch_slots = {}    # (batch_id, slot_id) -> used
        faculty_load: Dict[str, int] = {f.id: 0 for f in self.context.faculty}

        # Pre-compute consecutive slot pairs for lab scheduling
        consec_pairs = self._build_consecutive_pairs()

        # Separate lab vs theory requirements
        lab_reqs: List[Dict] = []   # will be scheduled in 2-hr blocks
        theory_reqs: List[Dict] = []

        for batch in self.context.batches:
            for subject_id in batch.subjects:
                subject = self.context.get_subject(subject_id)
                if not subject:
                    continue
                if subject.is_lab:
                    # Group lab hours into 2-hour blocks
                    full_blocks = subject.hours_per_week // 2
                    remainder = subject.hours_per_week % 2
                    for _ in range(full_blocks):
                        lab_reqs.append({
                            'batch_id': batch.id,
                            'subject_id': subject.id,
                            'is_lab': True,
                            'block_size': 2,
                        })
                    if remainder:
                        lab_reqs.append({
                            'batch_id': batch.id,
                            'subject_id': subject.id,
                            'is_lab': True,
                            'block_size': 1,
                        })
                else:
                    for _ in range(subject.hours_per_week):
                        theory_reqs.append({
                            'batch_id': batch.id,
                            'subject_id': subject.id,
                            'is_lab': False,
                            'block_size': 1,
                        })

        # Schedule labs first (harder to place), then theory
        random.shuffle(lab_reqs)
        random.shuffle(theory_reqs)
        all_reqs = lab_reqs + theory_reqs

        for req in all_reqs:
            valid_faculty = self._get_qualified_faculty(req['subject_id'])
            valid_rooms = self._get_suitable_rooms(req['subject_id'], req['batch_id'])

            if not valid_faculty or not valid_rooms:
                continue

            # Sort faculty by current load (ascending)
            valid_faculty_sorted = sorted(valid_faculty, key=lambda f: faculty_load.get(f.id, 0))

            if req['block_size'] == 2:
                # ── Lab 2-hour block: find a consecutive pair ──
                random.shuffle(consec_pairs)
                placed = False
                for slot_a, slot_b in consec_pairs:
                    # Both slots must be free for this batch
                    if ((req['batch_id'], slot_a.id) in batch_slots or
                        (req['batch_id'], slot_b.id) in batch_slots):
                        continue

                    # Pick least-loaded faculty
                    for faculty in valid_faculty_sorted:
                        if ((faculty.id, slot_a.id) in faculty_slots or
                            (faculty.id, slot_b.id) in faculty_slots):
                            continue

                        # Find a room free for both slots
                        random.shuffle(valid_rooms)
                        for room in valid_rooms:
                            if ((room.id, slot_a.id) not in room_slots and
                                (room.id, slot_b.id) not in room_slots):

                                # Place both hours
                                for i, slot in enumerate([slot_a, slot_b]):
                                    a = Assignment(
                                        id=f"a_{len(assignments)}",
                                        batch_id=req['batch_id'],
                                        subject_id=req['subject_id'],
                                        faculty_id=faculty.id,
                                        room_id=room.id,
                                        time_slot=slot,
                                        is_lab_session=True,
                                    )
                                    assignments.append(a)
                                    faculty_slots[(faculty.id, slot.id)] = True
                                    room_slots[(room.id, slot.id)] = True
                                    batch_slots[(req['batch_id'], slot.id)] = True

                                faculty_load[faculty.id] = faculty_load.get(faculty.id, 0) + 2
                                placed = True
                                break
                        if placed:
                            break
                    if placed:
                        break
            else:
                # ── Theory / single-hour lab remainder ──
                valid_slots = list(self.context.time_slots)
                max_attempts = 50
                for _ in range(max_attempts):
                    if len(valid_faculty_sorted) > 1 and random.random() < 0.7:
                        half = max(1, len(valid_faculty_sorted) // 2)
                        faculty = random.choice(valid_faculty_sorted[:half])
                    else:
                        faculty = random.choice(valid_faculty_sorted)
                    room = random.choice(valid_rooms)
                    slot = random.choice(valid_slots)

                    if ((faculty.id, slot.id) not in faculty_slots and
                        (room.id, slot.id) not in room_slots and
                        (req['batch_id'], slot.id) not in batch_slots):

                        assignment = Assignment(
                            id=f"a_{len(assignments)}",
                            batch_id=req['batch_id'],
                            subject_id=req['subject_id'],
                            faculty_id=faculty.id,
                            room_id=room.id,
                            time_slot=slot,
                            is_lab_session=req['is_lab'],
                        )
                        assignments.append(assignment)
                        faculty_slots[(faculty.id, slot.id)] = True
                        room_slots[(room.id, slot.id)] = True
                        batch_slots[(req['batch_id'], slot.id)] = True
                        faculty_load[faculty.id] = faculty_load.get(faculty.id, 0) + 1
                        break
        
        solution = Solution(
            id=f"ga_sol_{random.randint(1000, 9999)}",
            assignments=assignments,
            quality_score=0.0,
            constraint_violations=[],
            solver_name="genetic_algorithm"
        )
        
        return solution
    
    def _selection(self, population: List[Solution], fitness_scores: List[float]) -> List[Solution]:
        """Tournament selection."""
        selected = []
        
        for _ in range(len(population)):
            # Random tournament
            tournament_indices = random.sample(range(len(population)), self.config.tournament_size)
            tournament_fitness = [fitness_scores[i] for i in tournament_indices]
            
            # Select best from tournament
            winner_idx = tournament_indices[np.argmin(tournament_fitness)]
            selected.append(copy.deepcopy(population[winner_idx]))
        
        return selected
    
    def _crossover(self, parent1: Solution, parent2: Solution) -> Tuple[Solution, Solution]:
        """Two-point crossover preserving feasibility."""
        # Create children
        child1 = Solution(
            id=f"ga_child_{random.randint(1000, 9999)}",
            assignments=[],
            quality_score=0.0,
            constraint_violations=[],
            solver_name="genetic_algorithm"
        )
        child2 = Solution(
            id=f"ga_child_{random.randint(1000, 9999)}",
            assignments=[],
            quality_score=0.0,
            constraint_violations=[],
            solver_name="genetic_algorithm"
        )
        
        # Group assignments by batch
        p1_by_batch = self._group_by_batch(parent1)
        p2_by_batch = self._group_by_batch(parent2)
        
        # For each batch, randomly choose parent
        all_batches = set(list(p1_by_batch.keys()) + list(p2_by_batch.keys()))
        
        for batch_id in all_batches:
            if random.random() < 0.5:
                # Child1 gets from parent1, child2 from parent2
                if batch_id in p1_by_batch:
                    child1.assignments.extend([copy.deepcopy(a) for a in p1_by_batch[batch_id]])
                if batch_id in p2_by_batch:
                    child2.assignments.extend([copy.deepcopy(a) for a in p2_by_batch[batch_id]])
            else:
                # Child1 gets from parent2, child2 from parent1
                if batch_id in p2_by_batch:
                    child1.assignments.extend([copy.deepcopy(a) for a in p2_by_batch[batch_id]])
                if batch_id in p1_by_batch:
                    child2.assignments.extend([copy.deepcopy(a) for a in p1_by_batch[batch_id]])
        
        # Repair conflicts
        child1 = self._repair_conflicts(child1)
        child2 = self._repair_conflicts(child2)
        
        return child1, child2
    
    def _mutate(self, individual: Solution) -> Solution:
        """Mutate solution with multiple operators (in-place).
        
        Industry standard: Mutation modifies individual in-place.
        """
        if not individual.assignments:
            return individual
        
        # Apply mutation operators with probability
        # Note: We apply mutations in-place, not creating copies
        
        # Operator 1: Swap time slots
        if random.random() < 0.5:  # 50% chance
            self._mutate_swap_slots(individual)
        
        # Operator 2: Change room
        if random.random() < 0.3:  # 30% chance
            self._mutate_change_room(individual)
        
        # Operator 3: Change faculty
        if random.random() < 0.2:  # 20% chance
            self._mutate_change_faculty(individual)
        
        return individual
    
    def _mutate_swap_slots(self, solution: Solution) -> None:
        """Swap time slots of two random assignments (in-place).
        
        Lab-aware: if a selected assignment is part of a consecutive lab pair,
        the entire 2-hour block is swapped together to preserve continuity.
        """
        if len(solution.assignments) < 2:
            return
        
        idx1, idx2 = random.sample(range(len(solution.assignments)), 2)
        a1 = solution.assignments[idx1]
        a2 = solution.assignments[idx2]
        
        # Check if either assignment is a lab session
        a1_is_lab = getattr(a1, 'is_lab_session', False)
        a2_is_lab = getattr(a2, 'is_lab_session', False)
        
        if not a1_is_lab and not a2_is_lab:
            # Neither is lab — simple swap
            a1.time_slot, a2.time_slot = a2.time_slot, a1.time_slot
            return
        
        # Find lab partners (the other hour of the 2-hr block)
        def find_lab_partner_idx(idx: int, assignment) -> int:
            """Find the index of the consecutive lab partner for this assignment."""
            subj_id = assignment.subject_id
            batch_id = assignment.batch_id
            faculty_id = assignment.faculty_id
            slot = assignment.time_slot
            
            for i, other in enumerate(solution.assignments):
                if i == idx:
                    continue
                if (getattr(other, 'is_lab_session', False) and
                    other.subject_id == subj_id and
                    other.batch_id == batch_id and
                    other.faculty_id == faculty_id):
                    # Check if consecutive (other follows this or this follows other)
                    o_slot = other.time_slot
                    if slot.day == o_slot.day:
                        if (slot.end_hour == o_slot.start_hour and
                            slot.end_minute == o_slot.start_minute):
                            return i
                        if (o_slot.end_hour == slot.start_hour and
                            o_slot.end_minute == slot.start_minute):
                            return i
            return -1
        
        if a1_is_lab and a2_is_lab:
            # Both are labs — find their partners and swap both pairs
            p1_idx = find_lab_partner_idx(idx1, a1)
            p2_idx = find_lab_partner_idx(idx2, a2)
            
            if p1_idx >= 0 and p2_idx >= 0 and len({idx1, idx2, p1_idx, p2_idx}) == 4:
                # Swap both pairs: (a1,p1) <-> (a2,p2)
                p1 = solution.assignments[p1_idx]
                p2 = solution.assignments[p2_idx]
                a1.time_slot, a2.time_slot = a2.time_slot, a1.time_slot
                p1.time_slot, p2.time_slot = p2.time_slot, p1.time_slot
            # else: overlapping indices or no partners — skip swap
            return
        
        # One is lab, one is theory — skip to avoid breaking lab blocks
        # (swapping a single lab hour with theory would break consecutive pair)
        return
    
    def _mutate_change_room(self, solution: Solution) -> None:
        """Change room of random assignment (in-place)."""
        if not solution.assignments:
            return
        
        idx = random.randint(0, len(solution.assignments) - 1)
        assignment = solution.assignments[idx]
        
        # Get valid rooms
        valid_rooms = self._get_suitable_rooms(assignment.subject_id, assignment.batch_id)
        if valid_rooms:
            new_room = random.choice(valid_rooms)
            assignment.room_id = new_room.id
    
    def _mutate_change_faculty(self, solution: Solution) -> None:
        """Change faculty of random assignment, preferring least-loaded (in-place)."""
        if not solution.assignments:
            return

        # Build current load map
        load: Dict[str, int] = {f.id: 0 for f in self.context.faculty}
        for a in solution.assignments:
            load[a.faculty_id] = load.get(a.faculty_id, 0) + 1

        idx = random.randint(0, len(solution.assignments) - 1)
        assignment = solution.assignments[idx]

        valid_faculty = self._get_qualified_faculty(assignment.subject_id)
        if valid_faculty:
            # Prefer least-loaded faculty to improve fairness
            valid_faculty.sort(key=lambda f: load.get(f.id, 0))
            # 80% chance pick from bottom quartile, 20% random
            if random.random() < 0.8 and len(valid_faculty) > 1:
                quarter = max(1, len(valid_faculty) // 4)
                new_faculty = random.choice(valid_faculty[:quarter])
            else:
                new_faculty = random.choice(valid_faculty)
            assignment.faculty_id = new_faculty.id
    
    def _repair_conflicts(self, solution: Solution) -> Solution:
        """Repair constraint violations with rescheduling.

        Instead of silently dropping conflicting assignments, attempt to
        reschedule them into a free slot/room/faculty combination so that
        batch coverage is preserved.

        Lab-aware: lab assignments are rescheduled as consecutive 2-hour
        blocks.  If one half of a lab pair is dropped, the other half is
        also pulled out and both are rescheduled together.
        """
        seen_faculty_slots = set()
        seen_room_slots = set()
        seen_batch_slots = set()

        valid_assignments = []
        dropped = []

        for assignment in solution.assignments:
            faculty_slot = (assignment.faculty_id, assignment.time_slot.id)
            room_slot = (assignment.room_id, assignment.time_slot.id)
            batch_slot = (assignment.batch_id, assignment.time_slot.id)

            if (faculty_slot not in seen_faculty_slots and
                room_slot not in seen_room_slots and
                batch_slot not in seen_batch_slots):
                valid_assignments.append(assignment)
                seen_faculty_slots.add(faculty_slot)
                seen_room_slots.add(room_slot)
                seen_batch_slots.add(batch_slot)
            else:
                dropped.append(assignment)

        # If one half of a lab pair is dropped, pull out the other half too
        dropped_lab_keys = set()
        for assign in dropped:
            if getattr(assign, 'is_lab_session', False):
                dropped_lab_keys.add((assign.batch_id, assign.subject_id, assign.faculty_id))

        if dropped_lab_keys:
            still_valid = []
            for assign in valid_assignments:
                key = (assign.batch_id, assign.subject_id, assign.faculty_id)
                if getattr(assign, 'is_lab_session', False) and key in dropped_lab_keys:
                    # Pull partner out so the pair can be rescheduled together
                    dropped.append(assign)
                    seen_faculty_slots.discard((assign.faculty_id, assign.time_slot.id))
                    seen_room_slots.discard((assign.room_id, assign.time_slot.id))
                    seen_batch_slots.discard((assign.batch_id, assign.time_slot.id))
                else:
                    still_valid.append(assign)
            valid_assignments = still_valid

        # Group dropped lab assignments into pairs for block rescheduling
        lab_groups = {}
        theory_dropped = []
        for assign in dropped:
            if getattr(assign, 'is_lab_session', False):
                key = (assign.batch_id, assign.subject_id)
                lab_groups.setdefault(key, []).append(assign)
            else:
                theory_dropped.append(assign)

        # Reschedule lab groups as consecutive 2-hour blocks
        consecutive_pairs = self._build_consecutive_pairs()
        for key, lab_assigns in lab_groups.items():
            # Take pairs of assignments for 2-hour blocks
            pairs_to_schedule = [lab_assigns[i:i+2] for i in range(0, len(lab_assigns), 2)]
            for pair in pairs_to_schedule:
                if len(pair) < 2:
                    # Odd leftover — schedule as single (penalty will flag it)
                    theory_dropped.append(pair[0])
                    continue
                placed = False
                random.shuffle(consecutive_pairs)
                for slot_a, slot_b in consecutive_pairs:
                    batch_slot_a = (pair[0].batch_id, slot_a.id)
                    batch_slot_b = (pair[0].batch_id, slot_b.id)
                    if batch_slot_a in seen_batch_slots or batch_slot_b in seen_batch_slots:
                        continue

                    # Find a free faculty for both slots
                    faculties = self._get_qualified_faculty(pair[0].subject_id)
                    random.shuffle(faculties)
                    chosen_faculty = None
                    for fac in faculties:
                        if ((fac.id, slot_a.id) not in seen_faculty_slots and
                            (fac.id, slot_b.id) not in seen_faculty_slots):
                            chosen_faculty = fac
                            break
                    if chosen_faculty is None:
                        continue

                    # Find a free room for both slots
                    rooms = self._get_suitable_rooms(pair[0].subject_id, pair[0].batch_id)
                    random.shuffle(rooms)
                    chosen_room = None
                    for room in rooms:
                        if ((room.id, slot_a.id) not in seen_room_slots and
                            (room.id, slot_b.id) not in seen_room_slots):
                            chosen_room = room
                            break
                    if chosen_room is None:
                        continue

                    # Place the 2-hour block
                    for assign, slot in zip(pair, [slot_a, slot_b]):
                        assign.time_slot = slot
                        assign.faculty_id = chosen_faculty.id
                        assign.room_id = chosen_room.id
                        valid_assignments.append(assign)
                        seen_faculty_slots.add((chosen_faculty.id, slot.id))
                        seen_room_slots.add((chosen_room.id, slot.id))
                        seen_batch_slots.add((assign.batch_id, slot.id))
                    placed = True
                    break
                if not placed:
                    # Fall back to individual placement
                    theory_dropped.extend(pair)

        # Try to reschedule each dropped theory / fallback assignment
        for assign in theory_dropped:
            placed = False
            random.shuffle(self.context.time_slots)
            for slot in self.context.time_slots:
                batch_slot = (assign.batch_id, slot.id)
                if batch_slot in seen_batch_slots:
                    continue  # batch already busy

                # Find a free faculty for that slot
                faculties = self._get_qualified_faculty(assign.subject_id)
                random.shuffle(faculties)
                chosen_faculty = None
                for fac in faculties:
                    if (fac.id, slot.id) not in seen_faculty_slots:
                        chosen_faculty = fac
                        break
                if chosen_faculty is None:
                    continue

                # Find a free room for that slot
                rooms = self._get_suitable_rooms(assign.subject_id, assign.batch_id)
                random.shuffle(rooms)
                chosen_room = None
                for room in rooms:
                    if (room.id, slot.id) not in seen_room_slots:
                        chosen_room = room
                        break
                if chosen_room is None:
                    continue

                # Reschedule
                assign.time_slot = slot
                assign.faculty_id = chosen_faculty.id
                assign.room_id = chosen_room.id
                valid_assignments.append(assign)
                seen_faculty_slots.add((chosen_faculty.id, slot.id))
                seen_room_slots.add((chosen_room.id, slot.id))
                seen_batch_slots.add((assign.batch_id, slot.id))
                placed = True
                break
            # If not placed, assignment is dropped (schedule infeasible with
            # available resources).  Fitness function will penalise heavily.

        solution.assignments = valid_assignments
        return solution
    
    def _evaluate_fitness(self, solution: Solution) -> float:
        """Evaluate fitness (lower is better).

        Components:
          - Hard constraint violations (x10,000 each)
          - Soft constraint penalties (coverage, balance, gaps, rooms, labs)
        """
        fitness = 0.0

        # Hard constraints (heavy penalty)
        hard_violations = self._count_hard_violations(solution)
        fitness += hard_violations * 10000

        # Soft constraints
        soft_penalty = self._evaluate_soft_constraints(solution)
        fitness += soft_penalty

        # Update solution quality score (normalised 0-1)
        if hard_violations == 0:
            # Dynamic normalisation based on problem size
            n_assignments = max(len(solution.assignments), 1)
            n_faculty = max(len(self.context.faculty), 1)
            # Expected penalty grows roughly with problem size
            expected_max = n_assignments * 30 + n_faculty * 120 + 1000
            normalised = min(soft_penalty / expected_max, 1.0)
            solution.quality_score = max(0.0, 1.0 - normalised)
        else:
            solution.quality_score = 0.0

        return fitness
    
    def _count_hard_violations(self, solution: Solution) -> int:
        """Count hard constraint violations."""
        violations = 0
        
        # Faculty overlap
        faculty_slots = {}
        for assign in solution.assignments:
            key = (assign.faculty_id, assign.time_slot.id)
            if key in faculty_slots:
                violations += 1
            faculty_slots[key] = True
        
        # Room overlap
        room_slots = {}
        for assign in solution.assignments:
            key = (assign.room_id, assign.time_slot.id)
            if key in room_slots:
                violations += 1
            room_slots[key] = True
        
        # Batch overlap
        batch_slots = {}
        for assign in solution.assignments:
            key = (assign.batch_id, assign.time_slot.id)
            if key in batch_slots:
                violations += 1
            batch_slots[key] = True
        
        return violations
    
    def _evaluate_soft_constraints(self, solution: Solution, debug: bool = False) -> float:
        """Evaluate soft constraints with comprehensive penalty terms.

        Penalty terms (lower is better):
          1. Faculty workload imbalance      (CV-based)
          2. Student idle-gap minimisation
          3. Batch coverage completeness     (missing hours)
          4. Faculty min/max hour violations  (overload/underload/idle)
          5. Room utilisation & capacity-waste
          6. Lab-in-correct-room enforcement
          7. Morning/afternoon balance per faculty
          8. Department load balance
        """
        penalty = 0.0
        _dbg = {}  # penalty breakdown for debug logging

        # ── 1. Faculty workload imbalance (CV-based) ────────────
        p1 = 0.0
        faculty_loads: Dict[str, int] = {}
        for assign in solution.assignments:
            faculty_loads[assign.faculty_id] = faculty_loads.get(assign.faculty_id, 0) + 1

        # Include idle faculty with 0 load
        for fac in self.context.faculty:
            if fac.id not in faculty_loads:
                faculty_loads[fac.id] = 0

        if faculty_loads:
            loads = list(faculty_loads.values())
            mean_load = np.mean(loads) if loads else 0
            std_dev = np.std(loads) if len(loads) > 1 else 0
            cv = (std_dev / mean_load) if mean_load > 0 else 0
            penalty += cv * 50  # stronger than before: target CV < 0.3

        # ── 2. Student gaps ─────────────────────────────────────
        batch_schedules: Dict[str, list] = {}
        for assign in solution.assignments:
            if assign.batch_id not in batch_schedules:
                batch_schedules[assign.batch_id] = []
            batch_schedules[assign.batch_id].append(assign.time_slot)

        for batch_id, slots in batch_schedules.items():
            slots_by_day: Dict[int, list] = {}
            for slot in slots:
                if slot.day not in slots_by_day:
                    slots_by_day[slot.day] = []
                slots_by_day[slot.day].append(slot.start_minute)

            for day_slots in slots_by_day.values():
                sorted_slots = sorted(day_slots)
                for i in range(len(sorted_slots) - 1):
                    gap = sorted_slots[i + 1] - sorted_slots[i]
                    if gap > 60:  # More than 1 hour gap
                        penalty += (gap - 60) / 60

        # ── 3. Batch coverage completeness ──────────────────────
        # Penalise every missing teaching hour heavily
        subj_batch_hours: Dict[str, int] = {}  # "batch|subject" -> scheduled
        for assign in solution.assignments:
            key = f"{assign.batch_id}|{assign.subject_id}"
            subj_batch_hours[key] = subj_batch_hours.get(key, 0) + 1

        total_missing = 0
        for batch in self.context.batches:
            for sid in batch.subjects:
                subj = self.context.get_subject(sid)
                if subj:
                    scheduled = subj_batch_hours.get(f"{batch.id}|{sid}", 0)
                    missing = max(0, subj.hours_per_week - scheduled)
                    total_missing += missing

        penalty += total_missing * 500  # heavy: each missing hour

        # ── 4. Faculty min/max hour violations + idle penalty ─
        # Only penalise idle faculty that COULD teach something in this batch
        needed_faculty_ids = set()
        for batch in self.context.batches:
            for sid in batch.subjects:
                subj = self.context.get_subject(sid)
                if subj:
                    for fac in self.context.faculty:
                        if fac.can_teach(subj):
                            needed_faculty_ids.add(fac.id)

        # Scale the effective min_hours down when total workload can't
        # satisfy every faculty's min.  Example: 40 hrs / 15 faculty = 2.7
        total_hours = sum(s.hours_per_week for s in self.context.subjects)
        n_needed = max(len(needed_faculty_ids), 1)
        fair_share = total_hours / n_needed  # average possible load

        idle_count = 0
        for fac in self.context.faculty:
            hours = faculty_loads.get(fac.id, 0)
            if hours > fac.max_hours_per_week:
                penalty += (hours - fac.max_hours_per_week) * 200
            elif hours == 0 and fac.id in needed_faculty_ids:
                # Only penalise idle faculty who are qualified for batch subjects
                idle_count += 1
                penalty += 100
            elif 0 < hours < fac.min_hours_per_week:
                # Scale effective min to what's actually achievable
                effective_min = min(fac.min_hours_per_week, fair_share * 1.5)
                if hours < effective_min:
                    penalty += (effective_min - hours) * 30

        # Extra penalty when many needed faculty are idle
        if idle_count > 1:
            penalty += idle_count * 50

        # ── 5. Room utilisation & capacity-waste ────────────────
        rooms_used = set(a.room_id for a in solution.assignments)
        total_rooms = len(self.context.rooms)
        if total_rooms > 0 and len(solution.assignments) > 0:
            # Penalise spreading across too many rooms
            min_rooms_needed = max(1, len(solution.assignments) // len(self.context.time_slots) + 1)
            excess_rooms = max(0, len(rooms_used) - min_rooms_needed)
            penalty += excess_rooms * 15

            # Capacity-waste: prefer tightest-fit rooms
            for assign in solution.assignments:
                room = self.context.get_room(assign.room_id)
                batch = self.context.batch_map.get(assign.batch_id)
                if room and batch and batch.strength > 0:
                    waste = (room.capacity - batch.strength) / batch.strength
                    if waste > 0.5:  # >50% wasted capacity
                        penalty += waste * 5

        # ── 6. Lab-in-correct-room ──────────────────────────────
        # Only penalise if there actually ARE lab rooms available
        has_lab_rooms = any(r.is_lab for r in self.context.rooms)
        if has_lab_rooms:
            for assign in solution.assignments:
                if assign.is_lab_session:
                    room = self.context.get_room(assign.room_id)
                    if room and not room.is_lab:
                        penalty += 100  # lab scheduled in non-lab room

        # ── 6b. Lab sessions must be consecutive (2-hr blocks) ──
        # Group lab assignments by (batch, subject, day)
        lab_day_slots: Dict[str, List[int]] = {}  # "batch|subj|day" -> [start_minutes]
        for assign in solution.assignments:
            if assign.is_lab_session:
                key = f"{assign.batch_id}|{assign.subject_id}|{assign.time_slot.day}"
                lab_day_slots.setdefault(key, []).append(
                    assign.time_slot.start_hour * 60 + assign.time_slot.start_minute
                )

        # For each batch+subject, check that lab hours form consecutive blocks
        lab_batch_subj: Dict[str, List[Assignment]] = {}
        for assign in solution.assignments:
            if assign.is_lab_session:
                key = f"{assign.batch_id}|{assign.subject_id}"
                lab_batch_subj.setdefault(key, []).append(assign)

        for key, assigns in lab_batch_subj.items():
            # Only enforce consecutive penalty when the subject has ≥2 hrs/week
            # (a 1-hr lab cannot form a 2-hr block)
            if len(assigns) < 2:
                continue  # nothing to pair

            # Sort all lab assignments for this batch+subject by (day, start)
            sorted_labs = sorted(
                assigns,
                key=lambda a: (a.time_slot.day, a.time_slot.start_hour * 60 + a.time_slot.start_minute)
            )
            # They should come in pairs of 2 consecutive slots on the same day
            i = 0
            while i < len(sorted_labs) - 1:
                a = sorted_labs[i]
                b = sorted_labs[i + 1]
                a_end = a.time_slot.start_hour * 60 + a.time_slot.start_minute + a.time_slot.duration_minutes
                b_start = b.time_slot.start_hour * 60 + b.time_slot.start_minute
                if a.time_slot.day == b.time_slot.day and a_end == b_start:
                    i += 2  # valid block, skip pair
                else:
                    # Not consecutive — heavy penalty
                    penalty += 500
                    i += 1
            # Odd leftover lab hour (not paired) — moderate penalty
            if len(sorted_labs) % 2 == 1:
                penalty += 250

        # ── 7. Morning/afternoon balance per faculty ────────────
        # Prefer each faculty gets a mix of morning/afternoon slots
        faculty_morning: Dict[str, int] = {}
        faculty_total: Dict[str, int] = {}
        for assign in solution.assignments:
            fid = assign.faculty_id
            faculty_total[fid] = faculty_total.get(fid, 0) + 1
            if assign.time_slot.start_hour < 12:
                faculty_morning[fid] = faculty_morning.get(fid, 0) + 1

        morning_pcts = []
        for fid, total in faculty_total.items():
            if total > 0:
                morning_pcts.append(faculty_morning.get(fid, 0) / total)
        if len(morning_pcts) > 1:
            pct_cv = float(np.std(morning_pcts) / max(np.mean(morning_pcts), 0.01))
            penalty += pct_cv * 20  # penalise uneven morning distribution

        # ── 8. Department load balance ──────────────────────────
        dept_loads: Dict[str, list] = {}
        for fac in self.context.faculty:
            if fac.department not in dept_loads:
                dept_loads[fac.department] = []
            dept_loads[fac.department].append(faculty_loads.get(fac.id, 0))

        if len(dept_loads) > 1:
            dept_means = [np.mean(v) for v in dept_loads.values() if len(v) > 0]
            if len(dept_means) > 1:
                dept_cv = float(np.std(dept_means) / max(np.mean(dept_means), 0.01))
                penalty += dept_cv * 30  # penalise uneven cross-department load

        if debug:
            import logging
            _log = logging.getLogger(__name__)
            _log.info(f"[PENALTY DEBUG] total={penalty:.1f} | assignments={len(solution.assignments)}")
            _log.info(f"  Faculty loads: {dict(sorted(faculty_loads.items(), key=lambda x: x[1], reverse=True))}")
            n_labs = sum(1 for a in solution.assignments if a.is_lab_session)
            _log.info(f"  Lab assignments: {n_labs} | Missing hours: {total_missing}")
            _log.info(f"  Idle needed faculty: {idle_count}/{len(needed_faculty_ids)} | Fair share: {fair_share:.1f}")

        return penalty
    
    def _group_by_batch(self, solution: Solution) -> Dict[str, List[Assignment]]:
        """Group assignments by batch."""
        groups = {}
        for assignment in solution.assignments:
            if assignment.batch_id not in groups:
                groups[assignment.batch_id] = []
            groups[assignment.batch_id].append(assignment)
        return groups
    
    def _get_qualified_faculty(self, subject_id: str) -> List[Faculty]:
        """Get faculty qualified to teach subject using Faculty.can_teach()."""
        subject = self.context.subject_map.get(subject_id)
        if not subject:
            return list(self.context.faculty)

        # Primary: use the model's own qualification check
        qualified = [f for f in self.context.faculty if f.can_teach(subject)]
        if qualified:
            return qualified

        # Secondary: match faculty department to batches that take this subject
        batch_depts = {
            b.department for b in self.context.batches if subject_id in b.subjects
        }
        dept_match = [f for f in self.context.faculty if f.department in batch_depts]
        if dept_match:
            return dept_match

        # Last resort: all faculty
        return list(self.context.faculty)
    
    def _get_suitable_rooms(self, subject_id: str, batch_id: str) -> List[Room]:
        """Get rooms suitable for subject and batch."""
        suitable = []
        subject = self.context.subject_map.get(subject_id)
        batch = self.context.batch_map.get(batch_id)
        
        if not subject or not batch:
            return list(self.context.rooms)
        
        for room in self.context.rooms:
            # Check capacity
            if room.capacity >= batch.strength:
                # Check lab requirement
                if subject.is_lab and room.is_lab:
                    suitable.append(room)
                elif not subject.is_lab:
                    suitable.append(room)
        
        # If no suitable found, return all rooms (fallback)
        return suitable if suitable else list(self.context.rooms)

    # ──────────────────────────────────────────────────────────
    # Consecutive-slot helpers (for 2-hr lab blocks)
    # ──────────────────────────────────────────────────────────

    def _build_consecutive_pairs(self) -> List[Tuple[TimeSlot, TimeSlot]]:
        """Return pairs of (slot_a, slot_b) that are consecutive on the same day.

        Two slots are consecutive when they are on the same day and
        slot_b starts exactly when slot_a ends.
        """
        pairs = []
        slots_by_day: Dict[int, List[TimeSlot]] = {}
        for s in self.context.time_slots:
            slots_by_day.setdefault(s.day, []).append(s)

        for day_slots in slots_by_day.values():
            # Sort by start time
            sorted_slots = sorted(day_slots, key=lambda s: s.start_hour * 60 + s.start_minute)
            for i in range(len(sorted_slots) - 1):
                a = sorted_slots[i]
                b = sorted_slots[i + 1]
                a_end = a.start_hour * 60 + a.start_minute + a.duration_minutes
                b_start = b.start_hour * 60 + b.start_minute
                if a_end == b_start:
                    pairs.append((a, b))
        return pairs

    def _find_consecutive_partner(self, slot: TimeSlot) -> Optional[TimeSlot]:
        """Find the slot immediately following *slot* on the same day."""
        target_start = slot.start_hour * 60 + slot.start_minute + slot.duration_minutes
        for s in self.context.time_slots:
            if (s.day == slot.day
                and s.start_hour * 60 + s.start_minute == target_start):
                return s
        return None
