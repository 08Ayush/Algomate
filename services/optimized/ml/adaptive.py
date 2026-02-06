"""Adaptive weight adjustment for ensemble solver coordination."""

import numpy as np
from typing import List, Dict, Optional
from collections import deque
import logging

from core.models import Solution
from core.config import EnsembleConfig


class AdaptiveWeightAdjuster:
    """Dynamically adjusts solver weights based on performance."""
    
    def __init__(
        self,
        config: EnsembleConfig,
        learning_rate: float = 0.1,
        window_size: int = 10,
        min_weight: float = 0.05,
        max_weight: float = 0.95
    ):
        """Initialize adaptive weight adjuster.
        
        Args:
            config: Ensemble configuration
            learning_rate: How quickly to adjust weights (0-1)
            window_size: Number of recent solutions to consider
            min_weight: Minimum weight for any solver
            max_weight: Maximum weight for any solver
        """
        self.config = config
        self.learning_rate = learning_rate
        self.window_size = window_size
        self.min_weight = min_weight
        self.max_weight = max_weight
        self.logger = logging.getLogger(__name__)
        
        # Performance tracking
        self.performance_history: Dict[str, deque] = {}
        self.current_weights: Dict[str, float] = {}
        
        # Initialize with config weights - extract from solver configs
        solver_configs = [config.cpsat, config.tabu, config.vns]
        for solver_config in solver_configs:
            if solver_config.enabled:
                self.current_weights[solver_config.name] = solver_config.weight
                self.performance_history[solver_config.name] = deque(maxlen=window_size)
    
    def update(self, solutions: List[Solution]):
        """Update weights based on solution performance.
        
        Args:
            solutions: List of solutions from different solvers
        """
        if not solutions:
            return
        
        # Group by solver
        solver_solutions: Dict[str, List[Solution]] = {}
        for solution in solutions:
            solver_name = solution.solver_name
            if solver_name not in solver_solutions:
                solver_solutions[solver_name] = []
            solver_solutions[solver_name].append(solution)
        
        # Update performance history
        for solver_name, solver_sols in solver_solutions.items():
            if solver_sols:
                # Use best solution from this solver
                best = max(solver_sols, key=lambda s: s.quality_score)
                
                if solver_name not in self.performance_history:
                    self.performance_history[solver_name] = deque(maxlen=self.window_size)
                    self.current_weights[solver_name] = 1.0 / len(solver_solutions)
                
                self.performance_history[solver_name].append(best.quality_score)
        
        # Adjust weights
        self._adjust_weights()
    
    def _adjust_weights(self):
        """Adjust weights based on recent performance."""
        if not self.performance_history:
            return
        
        # Calculate average performance for each solver
        avg_performance: Dict[str, float] = {}
        for solver_name, scores in self.performance_history.items():
            if scores:
                avg_performance[solver_name] = np.mean(list(scores))
            else:
                avg_performance[solver_name] = 0.0
        
        if not avg_performance:
            return
        
        # Normalize to get relative performance
        total_performance = sum(avg_performance.values())
        if total_performance == 0:
            return
        
        # Calculate target weights based on performance
        target_weights: Dict[str, float] = {}
        for solver_name, perf in avg_performance.items():
            target_weights[solver_name] = perf / total_performance
        
        # Gradually adjust current weights toward target
        for solver_name in self.current_weights.keys():
            if solver_name in target_weights:
                current = self.current_weights[solver_name]
                target = target_weights[solver_name]
                
                # Apply learning rate
                new_weight = current + self.learning_rate * (target - current)
                
                # Clamp to min/max
                new_weight = max(self.min_weight, min(self.max_weight, new_weight))
                
                self.current_weights[solver_name] = new_weight
        
        # Normalize weights to sum to 1
        self._normalize_weights()
        
        # Log weight changes
        self.logger.debug(f"Updated weights: {self.current_weights}")
    
    def _normalize_weights(self):
        """Normalize weights to sum to 1."""
        total = sum(self.current_weights.values())
        if total > 0:
            for solver_name in self.current_weights.keys():
                self.current_weights[solver_name] /= total
    
    def get_weights(self) -> Dict[str, float]:
        """Get current solver weights.
        
        Returns:
            Dictionary of solver names to weights
        """
        return self.current_weights.copy()
    
    def get_best_solver(self) -> Optional[str]:
        """Get name of best performing solver.
        
        Returns:
            Name of solver with highest weight
        """
        if not self.current_weights:
            return None
        
        return max(self.current_weights.items(), key=lambda x: x[1])[0]
    
    def get_performance_metrics(self) -> Dict[str, Dict[str, float]]:
        """Get performance metrics for all solvers.
        
        Returns:
            Dictionary mapping solver names to metrics
        """
        metrics = {}
        
        for solver_name, scores in self.performance_history.items():
            if scores:
                scores_list = list(scores)
                metrics[solver_name] = {
                    'mean': float(np.mean(scores_list)),
                    'std': float(np.std(scores_list)),
                    'min': float(np.min(scores_list)),
                    'max': float(np.max(scores_list)),
                    'recent': float(scores_list[-1]),
                    'weight': self.current_weights.get(solver_name, 0.0),
                    'n_samples': len(scores_list),
                }
            else:
                metrics[solver_name] = {
                    'mean': 0.0,
                    'std': 0.0,
                    'min': 0.0,
                    'max': 0.0,
                    'recent': 0.0,
                    'weight': self.current_weights.get(solver_name, 0.0),
                    'n_samples': 0,
                }
        
        return metrics
    
    def reset(self):
        """Reset weights to initial configuration."""
        self.current_weights.clear()
        self.performance_history.clear()
        
        # Re-initialize from config
        solver_configs = [self.config.cpsat, self.config.tabu, self.config.vns]
        for solver_config in solver_configs:
            if solver_config.enabled:
                self.current_weights[solver_config.name] = solver_config.weight
                self.performance_history[solver_config.name] = deque(maxlen=self.window_size)
        
        self.logger.info("Weights reset to initial configuration")
    
    def apply_to_config(self) -> EnsembleConfig:
        # Create new config based on current one
        new_config = EnsembleConfig(
            parallel_execution=self.config.parallel_execution,
            max_workers=self.config.max_workers,
            voting_strategy=self.config.voting_strategy,
        )
        
        # Update solver weights
        if 'cpsat' in self.current_weights:
            new_config.cpsat.weight = self.current_weights['cpsat']
        if 'tabu' in self.current_weights:
            new_config.tabu.weight = self.current_weights['tabu']
        if 'vns' in self.current_weights:
            new_config.vns.weight = self.current_weights['vns']
        
        return new_config
    
    def should_exclude_solver(self, solver_name: str, threshold: float = 0.3) -> bool:
        """Check if a solver should be excluded due to poor performance.
        
        Args:
            solver_name: Name of solver to check
            threshold: Performance threshold (relative to best)
            
        Returns:
            True if solver should be excluded
        """
        if solver_name not in self.performance_history:
            return False
        
        scores = list(self.performance_history[solver_name])
        if not scores:
            return False
        
        # Get best solver's performance
        all_scores = []
        for s_scores in self.performance_history.values():
            all_scores.extend(list(s_scores))
        
        if not all_scores:
            return False
        
        best_performance = max(np.mean(list(s_scores)) for s_scores in self.performance_history.values() if s_scores)
        solver_performance = np.mean(scores)
        
        # Exclude if significantly worse than best
        return solver_performance < threshold * best_performance
    
    def get_adaptive_config(self, exclude_poor: bool = True) -> EnsembleConfig:
        """Get adaptive configuration with optional poor solver exclusion.
        
        Args:
            exclude_poor: Whether to exclude poorly performing solvers
            
        Returns:
            Adaptive EnsembleConfig
        """
        weights = self.current_weights.copy()
        
        if exclude_poor:
            # Remove solvers below threshold
            solvers_to_remove = [
                name for name in weights.keys()
                if self.should_exclude_solver(name)
            ]
        # Create new config
        new_config = EnsembleConfig(
            parallel_execution=self.config.parallel_execution,
            max_workers=self.config.max_workers,
            voting_strategy=self.config.voting_strategy,
        )
        
        # Update enabled solvers and weights
        if 'cpsat' in weights:
            new_config.cpsat.weight = weights['cpsat']
        else:
            new_config.cpsat.enabled = False
            
        if 'tabu' in weights:
            new_config.tabu.weight = weights['tabu']
        else:
            new_config.tabu.enabled = False
            
        if 'vns' in weights:
            new_config.vns.weight = weights['vns']
        else:
            new_config.vns.enabled = False
        
        return new_config
    
    def get_recommendation(self) -> str:
        """Get recommendation on solver configuration.
        
        Returns:
            Human-readable recommendation
        """
        if not self.performance_history:
            return "No performance data available yet"
        
        metrics = self.get_performance_metrics()
        best_solver = self.get_best_solver()
        
        # Find solvers to exclude
        poor_solvers = [
            name for name in self.current_weights.keys()
            if self.should_exclude_solver(name)
        ]
        
        recommendation = []
        
        if best_solver:
            best_metrics = metrics.get(best_solver, {})
            recommendation.append(
                f"Best performing solver: {best_solver} "
                f"(avg quality: {best_metrics.get('mean', 0):.3f})"
            )
        
        if poor_solvers:
            recommendation.append(
                f"Consider excluding: {', '.join(poor_solvers)} "
                f"(poor performance)"
            )
        
        # Check for stagnation
        for solver_name, solver_metrics in metrics.items():
            if solver_metrics['n_samples'] >= self.window_size:
                std = solver_metrics['std']
                if std < 0.01:  # Very low variance
                    recommendation.append(
                        f"{solver_name} shows stagnation (std: {std:.4f})"
                    )
        
        return "\n".join(recommendation) if recommendation else "All solvers performing adequately"
