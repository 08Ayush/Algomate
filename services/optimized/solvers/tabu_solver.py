"""Tabu Search solver implementation."""

import random
import copy
from typing import List, Set, Tuple
from collections import deque

from solvers.base_solver import BaseSolver, SolverResult
from core.models import Solution, Assignment
from core.context import SchedulingContext
from core.config import SolverConfig


class TabuSearchSolver(BaseSolver):
    """Tabu Search solver with memory-based local search."""
    
    def __init__(self, context: SchedulingContext, config: SolverConfig):
        super().__init__(context, config)
        self.tabu_tenure = config.parameters.get('tabu_tenure', 10)
        self.max_iterations = config.parameters.get('max_iterations', 1000)
        self.aspiration_threshold = config.parameters.get('aspiration_threshold', 0.95)
        
        self.tabu_list: deque = deque(maxlen=self.tabu_tenure)
        self.best_solution: Solution = None
        self.current_solution: Solution = None
    
    def solve(self) -> SolverResult:
        """Solve using Tabu Search."""
        start_time = self._start_timing()
        
        try:
            if not self._validate_context():
                return SolverResult(
                    solution=None,
                    success=False,
                    execution_time=self._end_timing(start_time),
                    error_message="Context validation failed"
                )
            
            self.logger.info(f"Starting Tabu Search (iterations={self.max_iterations})...")
            
            # Generate initial solution
            self.current_solution = self._generate_initial_solution()
            self.best_solution = copy.deepcopy(self.current_solution)
            
            self.logger.info(f"Initial solution quality: {self.current_solution.quality_score:.2f}")
            
            iterations_without_improvement = 0
            
            for iteration in range(self.max_iterations):
                # Generate neighborhood
                neighbors = self._generate_neighbors(self.current_solution)
                
                # Select best non-tabu neighbor
                best_neighbor = None
                best_quality = float('-inf')
                
                for neighbor in neighbors:
                    neighbor_hash = self._hash_solution(neighbor)
                    
                    # Check if move is tabu
                    is_tabu = neighbor_hash in self.tabu_list
                    
                    # Aspiration criterion: accept if significantly better than best
                    aspiration = neighbor.quality_score > self.best_solution.quality_score * self.aspiration_threshold
                    
                    if (not is_tabu or aspiration) and neighbor.quality_score > best_quality:
                        best_neighbor = neighbor
                        best_quality = neighbor.quality_score
                
                if best_neighbor is None:
                    self.logger.warning(f"No valid neighbor found at iteration {iteration}")
                    break
                
                # Move to best neighbor
                self.current_solution = best_neighbor
                self.tabu_list.append(self._hash_solution(best_neighbor))
                
                # Update best solution
                if self.current_solution.quality_score > self.best_solution.quality_score:
                    self.best_solution = copy.deepcopy(self.current_solution)
                    iterations_without_improvement = 0
                    self.logger.debug(f"Iteration {iteration}: New best = {self.best_solution.quality_score:.2f}")
                else:
                    iterations_without_improvement += 1
                
                # Early stopping
                if iterations_without_improvement > 100:
                    self.logger.info(f"Early stopping at iteration {iteration} (no improvement)")
                    break
            
            execution_time = self._end_timing(start_time)
            self.best_solution.execution_time = execution_time
            self.best_solution.solver_name = self.name
            
            result = SolverResult(
                solution=self.best_solution,
                success=True,
                execution_time=execution_time,
                iterations=iteration + 1,
            )
            
            self._log_result(result)
            return result
        
        except Exception as e:
            self.logger.exception(f"Tabu Search failed: {e}")
            return SolverResult(
                solution=None,
                success=False,
                execution_time=self._end_timing(start_time),
                error_message=str(e)
            )
    
    def _generate_initial_solution(self) -> Solution:
        """Generate initial random feasible solution."""
        assignments = []
        
        # Simple greedy construction
        for batch in self.context.batches:
            for subject_id in batch.subjects:
                subject = self.context.get_subject(subject_id)
                if not subject:
                    continue
                
                # Find qualified faculty
                qualified_faculty = [f for f in self.context.faculty if f.can_teach(subject)]
                if not qualified_faculty:
                    continue
                
                # Find suitable rooms
                suitable_rooms = [r for r in self.context.rooms if r.supports_subject(subject)]
                if not suitable_rooms:
                    continue
                
                # Assign hours
                for _ in range(subject.hours_per_week):
                    faculty = random.choice(qualified_faculty)
                    room = random.choice(suitable_rooms)
                    
                    # Find available slot
                    available_slots = [
                        slot for slot in self.context.time_slots
                        if self._is_slot_available(slot, batch.id, faculty.id, room.id, assignments)
                    ]
                    
                    if available_slots:
                        slot = random.choice(available_slots)
                        
                        assignment = Assignment(
                            id=f"{batch.id}_{subject.id}_{slot.id}",
                            batch_id=batch.id,
                            subject_id=subject.id,
                            faculty_id=faculty.id,
                            room_id=room.id,
                            time_slot=slot,
                            is_lab_session=subject.is_lab,
                        )
                        assignments.append(assignment)
        
        solution = Solution(assignments=assignments)
        solution.quality_score = self._evaluate_solution(solution)
        return solution
    
    def _is_slot_available(
        self,
        slot,
        batch_id: str,
        faculty_id: str,
        room_id: str,
        assignments: List[Assignment]
    ) -> bool:
        """Check if slot is available for given entities."""
        for assignment in assignments:
            if assignment.time_slot.id == slot.id:
                # Check for conflicts
                if (assignment.batch_id == batch_id or
                    assignment.faculty_id == faculty_id or
                    assignment.room_id == room_id):
                    return False
        return True
    
    def _generate_neighbors(self, solution: Solution) -> List[Solution]:
        """Generate neighbor solutions by swapping assignments."""
        neighbors = []
        
        # Try swapping time slots between assignments
        for i in range(min(len(solution.assignments), 10)):  # Limit neighborhood size
            for j in range(i + 1, min(len(solution.assignments), 20)):
                neighbor = copy.deepcopy(solution)
                
                # Swap time slots
                neighbor.assignments[i].time_slot, neighbor.assignments[j].time_slot = \
                    neighbor.assignments[j].time_slot, neighbor.assignments[i].time_slot
                
                # Evaluate neighbor
                if self._is_feasible(neighbor):
                    neighbor.quality_score = self._evaluate_solution(neighbor)
                    neighbors.append(neighbor)
        
        return neighbors
    
    def _is_feasible(self, solution: Solution) -> bool:
        """Check if solution is feasible (no hard constraint violations)."""
        # Quick feasibility check
        slot_usage = {}
        
        for assignment in solution.assignments:
            key = (assignment.batch_id, assignment.time_slot.id)
            if key in slot_usage:
                return False
            slot_usage[key] = True
            
            key = (assignment.faculty_id, assignment.time_slot.id)
            if key in slot_usage:
                return False
            slot_usage[key] = True
            
            key = (assignment.room_id, assignment.time_slot.id)
            if key in slot_usage:
                return False
            slot_usage[key] = True
        
        return True
    
    def _evaluate_solution(self, solution: Solution) -> float:
        """Evaluate solution quality."""
        score = 1000.0  # Base score
        
        # Penalize violations
        score -= len(solution.constraint_violations) * 10
        
        # Reward compactness (fewer gaps)
        # Reward faculty preference matches
        # Reward balanced loads
        
        return max(0.0, score)
    
    def _hash_solution(self, solution: Solution) -> int:
        """Create hash of solution for tabu list."""
        # Hash based on assignment slots
        assignment_keys = tuple(sorted([
            (a.batch_id, a.subject_id, a.time_slot.id)
            for a in solution.assignments
        ]))
        return hash(assignment_keys)
