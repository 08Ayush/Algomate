"""Ensemble coordinator that manages multiple solvers."""

import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional
import logging

from solvers.base_solver import BaseSolver, SolverResult
from solvers.cpsat_solver import EnhancedCPSATSolver
from solvers.hybrid_ga_cpsat import HybridGACPSATSolver
from ensemble.voting import VotingStrategy, WeightedVoting
from core.models import Solution
from core.context import SchedulingContext
from core.config import EnsembleConfig


class EnsembleCoordinator:
    """Coordinates multiple solvers and selects best solution."""
    
    def __init__(self, context: SchedulingContext, config: EnsembleConfig):
        """Initialize ensemble coordinator.
        
        Args:
            context: Scheduling context
            config: Ensemble configuration
        """
        self.context = context
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize solvers
        self.solvers: List[BaseSolver] = []
        
        # Primary solver: Hybrid GA+CPSAT (best for medium/large problems)
        if config.cpsat.enabled:
            self.solvers.append(HybridGACPSATSolver(context, config.cpsat))
        
        # Optional: Pure CP-SAT for comparison (good for small problems)
        if config.cpsat.enabled and hasattr(config, 'use_cpsat_fallback'):
            if config.use_cpsat_fallback:
                self.solvers.append(EnhancedCPSATSolver(context, config.cpsat))
        
        # Initialize voting strategy
        self.voting_strategy: VotingStrategy = WeightedVoting(config)
        
        self.logger.info(f"Ensemble initialized with {len(self.solvers)} solvers")
    
    def solve(self) -> Solution:
        """Solve scheduling problem using ensemble.
        
        Returns:
            Best solution from ensemble
        """
        self.logger.info("Starting ensemble scheduling...")
        
        # Run solvers
        if self.config.parallel_execution:
            solutions = self._run_parallel()
        else:
            solutions = self._run_sequential()
        
        # Filter out failed solutions
        valid_solutions = [s for s in solutions if s.success and s.solution]
        
        if not valid_solutions:
            self.logger.error("All solvers failed to produce solutions")
            return None
        
        self.logger.info(f"{len(valid_solutions)}/{len(self.solvers)} solvers succeeded")
        
        # Select best solution using voting
        best_solution = self.voting_strategy.select_best(
            [result.solution for result in valid_solutions]
        )
        
        self.logger.info(
            f"Best solution selected: {best_solution.solver_name}, "
            f"Quality: {best_solution.quality_score:.2f}, "
            f"Assignments: {len(best_solution.assignments)}"
        )
        
        return best_solution
    
    def _run_parallel(self) -> List[SolverResult]:
        """Run solvers in parallel using ThreadPoolExecutor."""
        self.logger.info(f"Running {len(self.solvers)} solvers in parallel...")
        
        results = []
        
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # Submit all solver tasks
            future_to_solver = {
                executor.submit(solver.solve): solver
                for solver in self.solvers
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_solver):
                solver = future_to_solver[future]
                try:
                    result = future.result()
                    # Handle both SolverResult and Solution returns
                    if isinstance(result, SolverResult):
                        results.append(result)
                    elif isinstance(result, Solution):
                        # Wrap Solution in SolverResult for compatibility
                        results.append(SolverResult(
                            solution=result,
                            success=True,
                            execution_time=result.metadata.get('execution_time_ms', 0) / 1000.0
                        ))
                    else:
                        results.append(SolverResult(
                            solution=None,
                            success=False,
                            execution_time=0.0,
                            error_message="Unknown result type"
                        ))
                    self.logger.info(
                        f"Solver {solver.name} completed: "
                        f"{'Success' if results[-1].success else 'Failed'} "
                        f"({results[-1].execution_time:.2f}s)"
                    )
                except Exception as e:
                    self.logger.error(f"Solver {solver.name} raised exception: {e}")
                    results.append(SolverResult(
                        solution=None,
                        success=False,
                        execution_time=0.0,
                        error_message=str(e)
                    ))
        
        return results
    
    def _run_sequential(self) -> List[SolverResult]:
        """Run solvers sequentially."""
        self.logger.info(f"Running {len(self.solvers)} solvers sequentially...")
        
        results = []
        
        for solver in self.solvers:
            self.logger.info(f"Starting solver: {solver.name}")
            try:
                result = solver.solve()
                # Handle both SolverResult and Solution returns
                if isinstance(result, SolverResult):
                    results.append(result)
                elif isinstance(result, Solution):
                    # Wrap Solution in SolverResult for compatibility
                    results.append(SolverResult(
                        solution=result,
                        success=True,
                        execution_time=result.metadata.get('execution_time_ms', 0) / 1000.0
                    ))
                else:
                    results.append(SolverResult(
                        solution=None,
                        success=False,
                        execution_time=0.0,
                        error_message="Unknown result type"
                    ))
            except Exception as e:
                self.logger.error(f"Solver {solver.name} raised exception: {e}")
                results.append(SolverResult(
                    solution=None,
                    success=False,
                    execution_time=0.0,
                    error_message=str(e)
                ))
        
        return results
    
    def get_solver_names(self) -> List[str]:
        """Get list of enabled solver names."""
        return [solver.name for solver in self.solvers]
