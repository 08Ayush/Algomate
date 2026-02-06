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
        
        return best_solution
    
    def _initialize_population(self) -> List[Solution]:
        """Create initial population of random solutions."""
        population = []
        
        for _ in range(self.config.population_size):
            solution = self._generate_random_solution()
            population.append(solution)
        
        return population
    
    def _generate_random_solution(self) -> Solution:
        """Generate a random feasible solution."""
        assignments = []
        
        # Track usage to avoid obvious conflicts
        faculty_slots = {}  # (faculty_id, slot_id) -> used
        room_slots = {}     # (room_id, slot_id) -> used
        batch_slots = {}    # (batch_id, slot_id) -> used
        
        # Generate requirements from batches and their subjects
        requirements = []
        for batch in self.context.batches:
            for subject_id in batch.subjects:
                subject = self.context.get_subject(subject_id)
                if subject:
                    # Create requirement for each hour needed per week
                    for _ in range(subject.hours_per_week):
                        requirements.append({
                            'batch_id': batch.id,
                            'subject_id': subject.id,
                            'is_lab': subject.is_lab,
                        })
        
        random.shuffle(requirements)
        
        for req in requirements:
            # Get valid options
            valid_faculty = self._get_qualified_faculty(req['subject_id'])
            valid_rooms = self._get_suitable_rooms(req['subject_id'], req['batch_id'])
            valid_slots = self.context.time_slots
            
            if not valid_faculty or not valid_rooms or not valid_slots:
                continue
            
            # Try to find non-conflicting assignment
            max_attempts = 50
            for _ in range(max_attempts):
                faculty = random.choice(valid_faculty)
                room = random.choice(valid_rooms)
                slot = random.choice(valid_slots)
                
                # Check conflicts
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
                        is_lab_session=req['is_lab']
                    )
                    
                    assignments.append(assignment)
                    faculty_slots[(faculty.id, slot.id)] = True
                    room_slots[(room.id, slot.id)] = True
                    batch_slots[(req['batch_id'], slot.id)] = True
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
        """Swap time slots of two random assignments (in-place)."""
        if len(solution.assignments) < 2:
            return
        
        idx1, idx2 = random.sample(range(len(solution.assignments)), 2)
        
        # Swap time slots (in-place mutation)
        solution.assignments[idx1].time_slot, solution.assignments[idx2].time_slot = \
            solution.assignments[idx2].time_slot, solution.assignments[idx1].time_slot
    
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
        """Change faculty of random assignment (in-place)."""
        if not solution.assignments:
            return
        
        idx = random.randint(0, len(solution.assignments) - 1)
        assignment = solution.assignments[idx]
        
        # Get valid faculty
        valid_faculty = self._get_qualified_faculty(assignment.subject_id)
        if valid_faculty:
            new_faculty = random.choice(valid_faculty)
            assignment.faculty_id = new_faculty.id
    
    def _repair_conflicts(self, solution: Solution) -> Solution:
        """Repair constraint violations."""
        # Simple repair: remove duplicate assignments for same resource+slot
        seen_faculty_slots = set()
        seen_room_slots = set()
        seen_batch_slots = set()
        
        valid_assignments = []
        
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
        
        solution.assignments = valid_assignments
        return solution
    
    def _evaluate_fitness(self, solution: Solution) -> float:
        """Evaluate fitness (lower is better)."""
        fitness = 0.0
        
        # Hard constraints (heavy penalty)
        hard_violations = self._count_hard_violations(solution)
        fitness += hard_violations * 10000
        
        # Soft constraints
        fitness += self._evaluate_soft_constraints(solution)
        
        # Update solution quality
        if hard_violations == 0:
            solution.quality_score = max(0.0, 1.0 - fitness / 10000.0)
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
    
    def _evaluate_soft_constraints(self, solution: Solution) -> float:
        """Evaluate soft constraints."""
        penalty = 0.0
        
        # Faculty workload imbalance
        faculty_loads = {}
        for assign in solution.assignments:
            faculty_loads[assign.faculty_id] = faculty_loads.get(assign.faculty_id, 0) + 1
        
        if faculty_loads:
            loads = list(faculty_loads.values())
            std_dev = np.std(loads) if len(loads) > 1 else 0
            penalty += std_dev * 10
        
        # Student gaps (consecutive assignments preferred)
        batch_schedules = {}
        for assign in solution.assignments:
            if assign.batch_id not in batch_schedules:
                batch_schedules[assign.batch_id] = []
            batch_schedules[assign.batch_id].append(assign.time_slot)
        
        for batch_id, slots in batch_schedules.items():
            # Count gaps
            slots_by_day = {}
            for slot in slots:
                if slot.day not in slots_by_day:
                    slots_by_day[slot.day] = []
                slots_by_day[slot.day].append(slot.start_minute)
            
            for day_slots in slots_by_day.values():
                sorted_slots = sorted(day_slots)
                for i in range(len(sorted_slots) - 1):
                    gap = sorted_slots[i + 1] - sorted_slots[i]
                    if gap > 60:  # More than 1 hour gap
                        penalty += (gap - 60) / 60  # Penalty per hour gap
        
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
        """Get faculty qualified to teach subject."""
        qualified = []
        subject = self.context.subject_map.get(subject_id)
        
        if not subject:
            return qualified
        
        for faculty in self.context.faculty:
            # Check qualifications
            if hasattr(faculty, 'qualified_subjects') and subject_id in faculty.qualified_subjects:
                qualified.append(faculty)
            elif hasattr(faculty, 'department_id') and hasattr(subject, 'department_id'):
                if faculty.department_id == subject.department_id:
                    qualified.append(faculty)
        
        # If no qualified found, return all faculty (fallback)
        return qualified if qualified else list(self.context.faculty)
    
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
