"""Base solver interface for ensemble scheduling."""

from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass
import time
import logging

from core.models import Solution
from core.context import SchedulingContext
from core.config import SolverConfig


@dataclass
class SolverResult:
    """Result from a solver execution."""
    solution: Optional[Solution]
    success: bool
    execution_time: float
    error_message: Optional[str] = None
    iterations: int = 0
    metadata: dict = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class BaseSolver(ABC):
    """Abstract base class for all solvers."""
    
    def __init__(self, context: SchedulingContext, config: SolverConfig):
        """Initialize solver.
        
        Args:
            context: Scheduling context with all problem data
            config: Solver-specific configuration
        """
        self.context = context
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{config.name}")
        self.logger.info(f"Initialized {config.name} solver")
    
    @abstractmethod
    def solve(self) -> SolverResult:
        """Solve the scheduling problem.
        
        Returns:
            SolverResult containing solution or error
        """
        pass
    
    def _start_timing(self) -> float:
        """Start timing solver execution."""
        return time.time()
    
    def _end_timing(self, start_time: float) -> float:
        """End timing and return duration."""
        return time.time() - start_time
    
    def _log_result(self, result: SolverResult):
        """Log solver result."""
        if result.success:
            self.logger.info(
                f"Solver completed successfully in {result.execution_time:.2f}s - "
                f"Quality: {result.solution.quality_score:.2f}, "
                f"Valid: {result.solution.is_valid}, "
                f"Assignments: {len(result.solution.assignments)}"
            )
        else:
            self.logger.error(
                f"Solver failed after {result.execution_time:.2f}s - "
                f"Error: {result.error_message}"
            )
    
    def _create_empty_solution(self) -> Solution:
        """Create an empty solution."""
        return Solution(
            assignments=[],
            quality_score=0.0,
            solver_name=self.config.name,
        )
    
    def _validate_context(self) -> bool:
        """Validate scheduling context."""
        errors = self.context.validate()
        if errors:
            self.logger.error(f"Context validation failed: {errors}")
            return False
        return True
    
    @property
    def name(self) -> str:
        """Get solver name."""
        return self.config.name
    
    @property
    def timeout(self) -> int:
        """Get solver timeout in seconds."""
        return self.config.timeout_seconds
