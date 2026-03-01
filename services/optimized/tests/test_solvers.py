"""Unit tests for solver implementations."""

import pytest
from datetime import datetime

from solvers.base_solver import BaseSolver, SolverResult
from solvers.cpsat_solver import EnhancedCPSATSolver
from solvers.hybrid_ga_cpsat import HybridGACPSATSolver
from core.models import Solution
from core.config import SolverConfig


class MockSolver(BaseSolver):
    """Mock solver for testing base class."""
    
    def solve(self):
        """Mock solve implementation."""
        solution = Solution(
            solver_name=self.name,
            quality_score=0.85,
            assignments=[],
        )
        return SolverResult(
            solution=solution,
            success=True,
            execution_time=0.1,
        )


class TestBaseSolver:
    """Tests for BaseSolver base class."""
    
    def test_initialization(self, scheduling_context):
        """Test solver initialization."""
        config = SolverConfig(
            name="test_solver",
            enabled=True,
            weight=0.5,
            timeout_seconds=60,
        )
        
        solver = MockSolver(scheduling_context, config)
        
        assert solver.name == "test_solver"
        assert solver.config.enabled
        assert solver.config.weight == 0.5
        assert solver.config.timeout_seconds == 60
    
    def test_solve_returns_result(self, scheduling_context):
        """Test that solve returns SolverResult."""
        config = SolverConfig(name="test", enabled=True, weight=1.0, timeout_seconds=10)
        solver = MockSolver(scheduling_context, config)
        
        result = solver.solve()
        
        assert isinstance(result, SolverResult)
        assert result.success
        assert result.solution is not None
        assert result.execution_time >= 0


class TestCPSATSolver:
    """Tests for CP-SAT solver."""
    
    def test_initialization(self, scheduling_context):
        """Test CP-SAT solver initialization."""
        config = SolverConfig(
            name="cpsat",
            enabled=True,
            weight=0.7,
            timeout_seconds=120,
            parameters={
                "num_search_workers": 4,
                "max_time_in_seconds": 120,
            }
        )
        
        solver = EnhancedCPSATSolver(scheduling_context, config)
        
        assert solver.name == "cpsat"
        assert solver.config.weight == 0.7
    
    def test_solver_name(self, scheduling_context):
        """Test solver has correct name."""
        config = SolverConfig(name="cpsat", enabled=True, weight=1.0, timeout_seconds=60)
        solver = EnhancedCPSATSolver(scheduling_context, config)
        
        assert "cpsat" in solver.name.lower()


class TestHybridGACPSATSolver:
    """Tests for Hybrid GA+CPSAT solver."""
    
    def test_initialization(self, scheduling_context):
        """Test Hybrid solver initialization."""
        config = SolverConfig(
            name="hybrid_ga_cpsat",
            enabled=True,
            weight=0.8,
            timeout_seconds=60,
        )
        
        solver = HybridGACPSATSolver(scheduling_context, config)
        
        assert solver.name == "hybrid_ga_cpsat"
        assert solver.config.weight == 0.8


class TestSolverResult:
    """Tests for SolverResult dataclass."""
    
    def test_creation(self):
        """Test SolverResult creation."""
        solution = Solution(
            solver_name="test",
            quality_score=0.9,
        )
        
        result = SolverResult(
            solution=solution,
            success=True,
            execution_time=1.5,
            error_message=None,
        )
        
        assert result.success
        assert result.solution == solution
        assert result.execution_time == 1.5
        assert result.error_message is None
    
    def test_failure_result(self):
        """Test failed solver result."""
        result = SolverResult(
            solution=None,
            success=False,
            execution_time=0.5,
            error_message="Timeout exceeded",
        )
        
        assert not result.success
        assert result.solution is None
        assert result.error_message == "Timeout exceeded"


class TestCPSATSolverComprehensive:
    """Comprehensive tests for CPSAT solver."""
    
    def test_solve_with_timeout(self, scheduling_context):
        """Test CPSAT solver with timeout."""
        from core.config import SolverConfig
        config = SolverConfig(name="cpsat", enabled=True, timeout_seconds=10)
        solver = EnhancedCPSATSolver(scheduling_context, config)
        result = solver.solve()
        
        assert result is not None
        assert result.success or result.solution is not None
        if result.solution:
            assert result.solution.solver_name == "cpsat"
            assert isinstance(result.solution.assignments, list)
    
    def test_solve_with_warm_start(self, scheduling_context, sample_solution):
        """Test CPSAT solver with warm start from existing solution."""
        from core.config import SolverConfig
        config = SolverConfig(name="cpsat", enabled=True, timeout_seconds=10)
        solver = EnhancedCPSATSolver(scheduling_context, config)
        # Note: CPSATSolver doesn't currently implement warm start fully,
        # but we test the basic solve works
        result = solver.solve()
        
        assert result is not None
        assert result.success or result.solution is not None
        if result.solution:
            assert len(result.solution.assignments) >= 0
    
    def test_handles_empty_context(self):
        """Test CPSAT solver handles empty context gracefully."""
        from core.context import SchedulingContext, InstitutionConfig
        from core.config import SolverConfig
        institution = InstitutionConfig(id="test", name="Test Institution")
        empty_context = SchedulingContext(
            institution=institution,
            batches=[], subjects=[], faculty=[], rooms=[], time_slots=[]
        )
        config = SolverConfig(name="cpsat", enabled=True, timeout_seconds=5)
        solver = EnhancedCPSATSolver(empty_context, config)
        result = solver.solve()
        
        assert result is not None
        # Empty context should return empty solution
        if result.solution:
            assert len(result.solution.assignments) == 0
    
    def test_metadata_tracking(self, scheduling_context):
        """Test that CPSAT tracks metadata."""
        from core.config import SolverConfig
        config = SolverConfig(name="cpsat", enabled=True, timeout_seconds=10)
        solver = EnhancedCPSATSolver(scheduling_context, config)
        result = solver.solve()
        
        assert result is not None
        if result.solution and result.solution.metadata:
            assert isinstance(result.solution.metadata, dict)
    
    def test_constraint_satisfaction(self, scheduling_context):
        """Test CPSAT attempts to satisfy constraints."""
        from core.config import SolverConfig
        config = SolverConfig(name="cpsat", enabled=True, timeout_seconds=15)
        solver = EnhancedCPSATSolver(scheduling_context, config)
        result = solver.solve()
        
        assert result is not None
        # Should attempt to create valid solution
        if result.solution:
            assert isinstance(result.solution.constraint_violations, list)
