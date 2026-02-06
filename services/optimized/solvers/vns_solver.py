"""Variable Neighborhood Search (VNS) solver."""

import random
import copy
from typing import List

from solvers.base_solver import BaseSolver, SolverResult
from core.models import Solution
from core.context import SchedulingContext
from core.config import SolverConfig


class VNSSolver(BaseSolver):
    """Variable Neighborhood Search solver with multi-scale exploration."""
    
    def __init__(self, context: SchedulingContext, config: SolverConfig):
        super().__init__(context, config)
        self.neighborhood_sizes = config.parameters.get('neighborhood_sizes', [1, 2, 3, 5])
        self.max_iterations = config.parameters.get('max_iterations', 500)
        self.shake_intensity = config.parameters.get('shake_intensity', 0.3)
    
    def solve(self) -> SolverResult:
        """Solve using Variable Neighborhood Search."""
        start_time = self._start_timing()
        
        try:
            if not self._validate_context():
                return SolverResult(
                    solution=None,
                    success=False,
                    execution_time=self._end_timing(start_time),
                    error_message="Context validation failed"
                )
            
            self.logger.info(f"Starting VNS (iterations={self.max_iterations})...")
            
            # Generate initial solution
            current_solution = self._generate_initial_solution()
            best_solution = copy.deepcopy(current_solution)
            
            self.logger.info(f"Initial solution quality: {current_solution.quality_score:.2f}")
            
            for iteration in range(self.max_iterations):
                # Try different neighborhood structures
                for k, neighborhood_size in enumerate(self.neighborhood_sizes):
                    # Shake: random perturbation
                    candidate = self._shake(current_solution, neighborhood_size)
                    
                    # Local search
                    local_optimum = self._local_search(candidate)
                    
                    # Move or not
                    if local_optimum.quality_score > current_solution.quality_score:
                        current_solution = local_optimum
                        
                        # Update best
                        if current_solution.quality_score > best_solution.quality_score:
                            best_solution = copy.deepcopy(current_solution)
                            self.logger.debug(
                                f"Iteration {iteration}, k={k}: "
                                f"New best = {best_solution.quality_score:.2f}"
                            )
                        break  # Move to next iteration with k=0
            
            execution_time = self._end_timing(start_time)
            best_solution.execution_time = execution_time
            best_solution.solver_name = self.name
            
            result = SolverResult(
                solution=best_solution,
                success=True,
                execution_time=execution_time,
                iterations=iteration + 1,
            )
            
            self._log_result(result)
            return result
        
        except Exception as e:
            self.logger.exception(f"VNS failed: {e}")
            return SolverResult(
                solution=None,
                success=False,
                execution_time=self._end_timing(start_time),
                error_message=str(e)
            )
    
    def _generate_initial_solution(self) -> Solution:
        """Generate initial solution (simplified)."""
        # Placeholder: would use greedy construction
        return self._create_empty_solution()
    
    def _shake(self, solution: Solution, k: int) -> Solution:
        """Shake solution by making k random changes."""
        shaken = copy.deepcopy(solution)
        
        # Make k random swaps
        for _ in range(k):
            if len(shaken.assignments) >= 2:
                i, j = random.sample(range(len(shaken.assignments)), 2)
                shaken.assignments[i].time_slot, shaken.assignments[j].time_slot = \
                    shaken.assignments[j].time_slot, shaken.assignments[i].time_slot
        
        return shaken
    
    def _local_search(self, solution: Solution) -> Solution:
        """Perform local search from solution."""
        current = solution
        improved = True
        
        while improved:
            improved = False
            neighbors = self._get_neighbors(current)
            
            for neighbor in neighbors:
                if neighbor.quality_score > current.quality_score:
                    current = neighbor
                    improved = True
                    break
        
        return current
    
    def _get_neighbors(self, solution: Solution) -> List[Solution]:
        """Get neighbors by single swaps."""
        neighbors = []
        
        for i in range(min(len(solution.assignments), 5)):
            for j in range(i + 1, min(len(solution.assignments), 10)):
                neighbor = copy.deepcopy(solution)
                neighbor.assignments[i].time_slot, neighbor.assignments[j].time_slot = \
                    neighbor.assignments[j].time_slot, neighbor.assignments[i].time_slot
                neighbors.append(neighbor)
        
        return neighbors
