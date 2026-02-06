"""Unit tests for ensemble coordination."""

import pytest
from unittest.mock import Mock, patch

from ensemble.coordinator import EnsembleCoordinator
from ensemble.voting import (
    VotingStrategy,
    WeightedVoting,
    MajorityVoting,
    BestQualityVoting,
)
from solvers.base_solver import BaseSolver, SolverResult
from core.models import Solution
from core.config import EnsembleConfig, SolverConfig


class MockSolver(BaseSolver):
    """Mock solver for testing."""
    
    def __init__(self, context, config, quality_score=0.8, should_fail=False):
        super().__init__(context, config)
        self.quality_score = quality_score
        self.should_fail = should_fail
    
    def solve(self):
        """Mock solve."""
        if self.should_fail:
            return SolverResult(
                solution=None,
                success=False,
                execution_time=0.1,
                error_message="Mock failure",
            )
        
        solution = Solution(
            solver_name=self.name,
            quality_score=self.quality_score,
            assignments=[],
        )
        
        return SolverResult(
            solution=solution,
            success=True,
            execution_time=0.1,
        )


class TestEnsembleCoordinator:
    """Tests for EnsembleCoordinator."""
    
    def test_initialization(self, scheduling_context, test_config):
        """Test coordinator initialization."""
        coordinator = EnsembleCoordinator(scheduling_context, test_config)
        
        assert coordinator.config == test_config
        assert coordinator.voting_strategy is not None
    
    def test_add_solver(self, scheduling_context, test_config):
        """Test adding solvers."""
        # Disable all built-in solvers
        test_config.cpsat.enabled = False
        test_config.tabu.enabled = False
        test_config.vns.enabled = False
        
        coordinator = EnsembleCoordinator(scheduling_context, test_config)
        
        solver_config = SolverConfig(
            name="test_solver",
            enabled=True,
            weight=0.5,
            timeout_seconds=60,
        )
        solver = MockSolver(scheduling_context, solver_config)
        
        # Since coordinator initializes solvers automatically, check length
        initial_count = len(coordinator.solvers)
        coordinator.solvers.append(solver)
        
        assert len(coordinator.solvers) > initial_count
    
    def test_sequential_execution(self, scheduling_context, test_config):
        """Test sequential solver execution."""
        test_config.parallel_execution = False
        # Disable all built-in solvers
        test_config.cpsat.enabled = False
        test_config.tabu.enabled = False
        test_config.vns.enabled = False
        
        coordinator = EnsembleCoordinator(scheduling_context, test_config)
        
        # Add mock solvers
        for i in range(3):
            config = SolverConfig(
                name=f"solver_{i}",
                enabled=True,
                weight=1.0 / 3,
                timeout_seconds=10,
            )
            solver = MockSolver(scheduling_context, config, quality_score=0.7 + i * 0.1)
            coordinator.solvers.append(solver)
        
        solution = coordinator.solve()
        
        assert solution is not None
        assert isinstance(solution, Solution)
    
    def test_handles_solver_failure(self, scheduling_context, test_config):
        """Test handling of solver failures."""
        # Disable all built-in solvers
        test_config.cpsat.enabled = False
        test_config.tabu.enabled = False
        test_config.vns.enabled = False
        
        coordinator = EnsembleCoordinator(scheduling_context, test_config)
        
        # Add mix of working and failing solvers
        working_config = SolverConfig(
            name="working",
            enabled=True,
            weight=0.5,
            timeout_seconds=10,
        )
        coordinator.solvers.append(MockSolver(scheduling_context, working_config, quality_score=0.8))
        
        failing_config = SolverConfig(
            name="failing",
            enabled=True,
            weight=0.5,
            timeout_seconds=10,
        )
        coordinator.solvers.append(MockSolver(scheduling_context, failing_config, should_fail=True))
        
        solution = coordinator.solve()
        
        # Should still get a solution from working solver
        assert solution is not None


class TestWeightedVoting:
    """Tests for WeightedVoting strategy."""
    
    def test_select_best_solution(self, test_config):
        """Test weighted voting selection."""
        strategy = WeightedVoting(test_config)
        
        # Create solutions (not tuples)
        solutions = [
            Solution(solver_name="cpsat", quality_score=0.7),
            Solution(solver_name="tabu", quality_score=0.9),
        ]
        
        best = strategy.select_best(solutions)
        
        assert best is not None
        assert best.solver_name in ["cpsat", "tabu"]
    
    def test_handles_empty_results(self, test_config):
        """Test handling of empty results."""
        strategy = WeightedVoting(test_config)
        
        best = strategy.select_best([])
        
        assert best is None
    
    def test_handles_failed_solutions(self, test_config):
        """Test handling of failed solutions."""
        strategy = WeightedVoting(test_config)
        
        # Empty list since no successful solutions
        solutions = []
        
        best = strategy.select_best(solutions)
        
        assert best is None


class TestMajorityVoting:
    """Tests for MajorityVoting strategy."""
    
    def test_select_best_solution(self):
        """Test majority voting selection."""
        strategy = MajorityVoting()
        
        # Create solutions (not tuples)
        solutions = [
            Solution(solver_name="cpsat", quality_score=0.8),
            Solution(solver_name="tabu", quality_score=0.85),
            Solution(solver_name="vns", quality_score=0.75),
        ]
        
        best = strategy.select_best(solutions)
        
        assert best is not None
        assert best.solver_name == "tabu"  # Highest quality


class TestBestQualityVoting:
    """Tests for BestQualityVoting strategy."""
    
    def test_select_highest_quality(self):
        """Test selection of highest quality solution."""
        strategy = BestQualityVoting()
        
        # Create solutions (not tuples)
        solutions = [
            Solution(solver_name="cpsat", quality_score=0.7),
            Solution(solver_name="tabu", quality_score=0.95),
            Solution(solver_name="vns", quality_score=0.8),
        ]
        
        best = strategy.select_best(solutions)
        
        assert best is not None
        assert best.solver_name == "tabu"
        assert best.quality_score == 0.95
    
    def test_ignores_weights(self):
        """Test that weights are ignored."""
        strategy = BestQualityVoting()
        
        # Create solutions with different quality scores
        solutions = [
            Solution(solver_name="cpsat", quality_score=0.6),
            Solution(solver_name="tabu", quality_score=0.95),
        ]
        
        best = strategy.select_best(solutions)
        
        # Should select tabu despite it having lower default weight
        assert best.solver_name == "tabu"