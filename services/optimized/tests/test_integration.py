"""Integration tests for the ensemble scheduler."""

import pytest
from unittest.mock import Mock, AsyncMock, patch

from core.config import EnsembleConfig, SolverConfig
from core.context import SchedulingContext
from ensemble.coordinator import EnsembleCoordinator
from solvers.base_solver import BaseSolver, SolverResult
from core.models import Solution


class SimpleMockSolver(BaseSolver):
    """Simple mock solver for integration testing."""
    
    def __init__(self, context, config, quality=0.8):
        super().__init__(context, config)
        self.quality = quality
    
    def solve(self):
        """Create a simple solution."""
        solution = Solution(
            solver_name=self.name,
            quality_score=self.quality,
            assignments=[],
        )
        return SolverResult(solution, True, 0.1)


class TestIntegration:
    """Integration tests."""
    
    def test_end_to_end_scheduling(self, scheduling_context):
        """Test complete scheduling workflow."""
        # Create configuration with all solvers disabled
        config = EnsembleConfig(
            parallel_execution=False,
            max_workers=1,
            voting_strategy="best",
        )
        config.cpsat.enabled = False
        config.tabu.enabled = False
        config.vns.enabled = False
        
        # Create coordinator
        coordinator = EnsembleCoordinator(scheduling_context, config)
        
        # Add mock solvers
        cpsat_config = SolverConfig(
            name="cpsat",
            enabled=True,
            weight=0.7,
            timeout_seconds=10,
        )
        coordinator.solvers.append(SimpleMockSolver(scheduling_context, cpsat_config, quality=0.85))
        
        tabu_config = SolverConfig(
            name="tabu",
            enabled=True,
            weight=0.2,
            timeout_seconds=10,
        )
        coordinator.solvers.append(SimpleMockSolver(scheduling_context, tabu_config, quality=0.80))
        
        vns_config = SolverConfig(
            name="vns",
            enabled=True,
            weight=0.1,
            timeout_seconds=10,
        )
        coordinator.solvers.append(SimpleMockSolver(scheduling_context, vns_config, quality=0.75))
        
        # Solve
        solution = coordinator.solve()
        
        # Verify
        assert solution is not None
        assert isinstance(solution, Solution)
        assert solution.quality_score > 0
        assert solution.solver_name in ["cpsat", "tabu", "vns"]
    
    def test_configuration_profiles(self, scheduling_context):
        """Test different configuration profiles."""
        from core.profiles import ConfigurationProfiles
        
        # Test development profile
        dev_config = ConfigurationProfiles.development()
        assert not dev_config.parallel_execution
        assert dev_config.cpsat.enabled
        
        # Test production profile
        prod_config = ConfigurationProfiles.production()
        assert prod_config.parallel_execution
        assert prod_config.cpsat.enabled
        assert prod_config.tabu.enabled
        assert prod_config.vns.enabled
    
    def test_voting_strategies(self, scheduling_context):
        """Test different voting strategies."""
        strategies = ["weighted", "majority", "best"]
        
        for strategy_name in strategies:
            config = EnsembleConfig(
                parallel_execution=False,
                voting_strategy=strategy_name,
            )
            config.cpsat.enabled = False
            config.tabu.enabled = False
            config.vns.enabled = False
            
            coordinator = EnsembleCoordinator(scheduling_context, config)
            
            # Add solvers
            for i in range(3):
                solver_config = SolverConfig(
                    name=f"solver_{i}",
                    enabled=True,
                    weight=1.0/3,
                    timeout_seconds=10,
                )
                coordinator.solvers.append(
                    SimpleMockSolver(scheduling_context, solver_config, quality=0.7 + i*0.1)
                )
            
            solution = coordinator.solve()
            
            assert solution is not None
            assert solution.quality_score >= 0.7
    
    def test_solver_failure_resilience(self, scheduling_context):
        """Test system handles solver failures gracefully."""
        config = EnsembleConfig(
            parallel_execution=False,
            voting_strategy="best",
        )
        config.cpsat.enabled = False
        config.tabu.enabled = False
        config.vns.enabled = False
        
        coordinator = EnsembleCoordinator(scheduling_context, config)
        
        # Add working solver
        working_config = SolverConfig(
            name="working",
            enabled=True,
            weight=0.5,
            timeout_seconds=10,
        )
        coordinator.solvers.append(SimpleMockSolver(scheduling_context, working_config, quality=0.8))
        
        # Add failing solver
        class FailingSolver(BaseSolver):
            def solve(self):
                return SolverResult(None, False, 0.1, "Intentional failure")
        
        failing_config = SolverConfig(
            name="failing",
            enabled=True,
            weight=0.5,
            timeout_seconds=10,
        )
        coordinator.solvers.append(FailingSolver(scheduling_context, failing_config))
        
        # Should still get solution from working solver
        solution = coordinator.solve()
        
        assert solution is not None
        assert solution.solver_name == "working"
    
    def test_empty_context_handling(self):
        """Test handling of empty scheduling context."""
        from core.models import TimeSlot, Room, Faculty, Batch, Subject
        from core.context import InstitutionConfig
        
        # Create minimal context
        empty_context = SchedulingContext(
            institution=InstitutionConfig(
                id="test_inst",
                name="Test Institution",
            ),
            time_slots=[TimeSlot("slot1", 0, 9, 0, 60)],
            rooms=[],
            faculty=[],
            batches=[],
            subjects=[],
        )
        
        config = EnsembleConfig(
            parallel_execution=False,
            voting_strategy="best",
        )
        config.cpsat.enabled = False
        config.tabu.enabled = False
        config.vns.enabled = False
        
        coordinator = EnsembleCoordinator(empty_context, config)
        
        solver_config = SolverConfig(
            name="test",
            enabled=True,
            weight=1.0,
            timeout_seconds=10,
        )
        coordinator.solvers.append(SimpleMockSolver(empty_context, solver_config))
        
        # Should handle gracefully (return empty solution)
        solution = coordinator.solve()
        
        assert solution is not None
