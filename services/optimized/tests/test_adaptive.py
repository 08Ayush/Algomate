"""Tests for adaptive weight adjustment."""

import pytest
import numpy as np

from ml.adaptive import AdaptiveWeightAdjuster
from core.config import EnsembleConfig
from core.models import Solution


class TestAdaptiveWeightAdjuster:
    """Test adaptive weight adjuster."""
    
    def test_initialization(self, test_config):
        """Test adjuster initialization."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        assert adjuster.config == test_config
        assert adjuster.learning_rate == 0.1
        assert adjuster.window_size == 10
        assert len(adjuster.current_weights) > 0
    
    def test_initialization_with_params(self, test_config):
        """Test initialization with custom parameters."""
        adjuster = AdaptiveWeightAdjuster(
            test_config,
            learning_rate=0.2,
            window_size=5,
            min_weight=0.1,
            max_weight=0.8
        )
        
        assert adjuster.learning_rate == 0.2
        assert adjuster.window_size == 5
        assert adjuster.min_weight == 0.1
        assert adjuster.max_weight == 0.8
    
    def test_update_weights(self, test_config):
        """Test weight update."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        initial_weights = adjuster.get_weights().copy()
        
        # Create solutions from different solvers
        solutions = [
            Solution(
                id="s1",
                assignments=[],
                quality_score=0.9,
                constraint_violations=[],
                solver_name="cpsat",

            ),
            Solution(
                id="s2",
                assignments=[],
                quality_score=0.5,
                constraint_violations=[],
                solver_name="tabu",

            ),
        ]
        
        # Update multiple times
        for _ in range(5):
            adjuster.update(solutions)
        
        updated_weights = adjuster.get_weights()
        
        # Weights should have changed
        assert updated_weights != initial_weights
        
        # Better performing solver should have higher weight
        assert updated_weights.get('cpsat', 0) > updated_weights.get('tabu', 0)
    
    def test_get_best_solver(self, test_config):
        """Test getting best solver."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        # Initially should return a solver
        best = adjuster.get_best_solver()
        assert best in ['cpsat', 'tabu', 'vns']
        
        # After updates, should reflect performance
        solutions = [
            Solution(
                id=f"s{i}",
                assignments=[],
                quality_score=0.9 if i % 2 == 0 else 0.5,
                constraint_violations=[],
                solver_name="cpsat" if i % 2 == 0 else "tabu",

            )
            for i in range(10)
        ]
        
        for i in range(0, len(solutions), 2):
            adjuster.update(solutions[i:i+2])
        
        best = adjuster.get_best_solver()
        assert best == "cpsat"  # Higher performing
    
    def test_get_performance_metrics(self, test_config):
        """Test getting performance metrics."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        # Update with solutions one at a time to avoid duplicate IDs
        for i in range(5):
            solutions = [
                Solution(
                    id=f"s{i}",
                    assignments=[],
                    quality_score=0.7 + i * 0.05,
                    constraint_violations=[],
                    solver_name="cpsat",
                )
            ]
            adjuster.update(solutions)
        
        metrics = adjuster.get_performance_metrics()
        
        assert 'cpsat' in metrics
        assert 'mean' in metrics['cpsat']
        assert 'std' in metrics['cpsat']
        assert 'weight' in metrics['cpsat']
        assert metrics['cpsat']['n_samples'] == 5
    
    def test_reset(self, test_config):
        """Test resetting weights."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        initial_weights = adjuster.get_weights().copy()
        
        # Update weights
        solutions = [
            Solution(
                id="s1",
                assignments=[],
                quality_score=0.9,
                constraint_violations=[],
                solver_name="cpsat",

            )
        ]
        
        for _ in range(5):
            adjuster.update(solutions)
        
        # Weights should change
        assert adjuster.get_weights() != initial_weights
        
        # Reset
        adjuster.reset()
        
        # Should be back to initial
        assert adjuster.get_weights() == initial_weights
    
    def test_apply_to_config(self, test_config):
        """Test creating config with current weights."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        # Update weights
        solutions = [
            Solution(
                id="s1",
                assignments=[],
                quality_score=0.8,
                constraint_violations=[],
                solver_name="cpsat",

            )
        ]
        adjuster.update(solutions)
        
        new_config = adjuster.apply_to_config()
        
        assert isinstance(new_config, EnsembleConfig)
        # Check that weights were applied to solver configs
        weights = adjuster.get_weights()
        assert abs(new_config.cpsat.weight - weights['cpsat']) < 0.01
        assert abs(new_config.tabu.weight - weights['tabu']) < 0.01
        assert abs(new_config.vns.weight - weights['vns']) < 0.01
        assert new_config.voting_strategy == test_config.voting_strategy
    
    def test_should_exclude_solver(self, test_config):
        """Test solver exclusion logic."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        # Add performance data
        good_solutions = [
            Solution(
                id=f"good_{i}",
                assignments=[],
                quality_score=0.9,
                constraint_violations=[],
                solver_name="cpsat",

            )
            for i in range(5)
        ]
        
        poor_solutions = [
            Solution(
                id=f"poor_{i}",
                assignments=[],
                quality_score=0.2,
                constraint_violations=[],
                solver_name="tabu",

            )
            for i in range(5)
        ]
        
        adjuster.update(good_solutions)
        adjuster.update(poor_solutions)
        
        # Poor performer should be excluded
        assert bool(adjuster.should_exclude_solver("tabu", threshold=0.3)) is True
        assert bool(adjuster.should_exclude_solver("cpsat", threshold=0.3)) is False
    
    def test_get_adaptive_config(self, test_config):
        """Test getting adaptive config."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        # Add varied performance
        for i in range(3):
            solutions = [
                Solution(
                    id=f"s_{i}_cpsat",
                    assignments=[],
                    quality_score=0.9,
                    constraint_violations=[],
                    solver_name="cpsat",

                ),
                Solution(
                    id=f"s_{i}_tabu",
                    assignments=[],
                    quality_score=0.5,
                    constraint_violations=[],
                    solver_name="tabu",

                ),
            ]
            adjuster.update(solutions)
        
        # Get adaptive config without exclusion
        config1 = adjuster.get_adaptive_config(exclude_poor=False)
        # Check that tabu solver is present with non-zero weight
        assert config1.tabu.weight > 0
        
        # Get adaptive config with exclusion
        config2 = adjuster.get_adaptive_config(exclude_poor=True)
        # May or may not exclude based on threshold
        assert isinstance(config2, EnsembleConfig)
    
    def test_get_recommendation(self, test_config):
        """Test getting recommendations."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        # Initially
        rec = adjuster.get_recommendation()
        assert isinstance(rec, str)
        
        # After updates
        solutions = [
            Solution(
                id=f"s{i}",
                assignments=[],
                quality_score=0.8,
                constraint_violations=[],
                solver_name="cpsat",

            )
            for i in range(5)
        ]
        adjuster.update(solutions)
        
        rec = adjuster.get_recommendation()
        assert isinstance(rec, str)
        assert len(rec) > 0
    
    def test_weight_normalization(self, test_config):
        """Test that weights are normalized."""
        adjuster = AdaptiveWeightAdjuster(test_config)
        
        solutions = [
            Solution(
                id=f"s{i}",
                assignments=[],
                quality_score=0.7,
                constraint_violations=[],
                solver_name="cpsat",

            )
            for i in range(5)
        ]
        
        adjuster.update(solutions)
        weights = adjuster.get_weights()
        
        # Weights should sum to approximately 1
        assert abs(sum(weights.values()) - 1.0) < 1e-6
    
    def test_weight_bounds(self, test_config):
        """Test that weights respect min/max bounds."""
        adjuster = AdaptiveWeightAdjuster(
            test_config,
            min_weight=0.1,
            max_weight=0.8
        )
        
        # Extreme updates
        for _ in range(20):
            solutions = [
                Solution(
                    id=f"s",
                    assignments=[],
                    quality_score=1.0,
                    constraint_violations=[],
                    solver_name="cpsat",

                )
            ]
            adjuster.update(solutions)
        
        weights = adjuster.get_weights()
        
        # All weights should be within bounds
        for weight in weights.values():
            assert weight >= 0.1
            assert weight <= 0.8


@pytest.fixture
def test_config():
    """Create test ensemble config."""
    from core.config import SolverConfig
    
    config = EnsembleConfig(
        voting_strategy='weighted',
        parallel_execution=False,
    )
    
    # Set solver configs with weights
    config.cpsat = SolverConfig(name='cpsat', enabled=True, weight=0.4, timeout_seconds=30)
    config.tabu = SolverConfig(name='tabu', enabled=True, weight=0.3, timeout_seconds=30)
    config.vns = SolverConfig(name='vns', enabled=True, weight=0.3, timeout_seconds=30)
    
    return config
