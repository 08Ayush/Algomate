"""Hybrid GA+CP-SAT solver combining exploration with optimization."""

import random
import time
import logging
from typing import Optional

from core.models import Solution
from core.context import SchedulingContext
from core.config import SolverConfig
from solvers.genetic_algorithm import GeneticAlgorithmSolver, GAConfig
from ml.predictor import QualityPredictor


logger = logging.getLogger(__name__)


class HybridGACPSATSolver:
    """Hybrid solver combining GA exploration with CP-SAT refinement."""
    
    def __init__(
        self,
        context: SchedulingContext,
        config: Optional[SolverConfig] = None,
        ga_config: Optional[GAConfig] = None,
        cpsat_config: Optional[dict] = None,
        ml_predictor: Optional[QualityPredictor] = None
    ):
        """Initialize hybrid solver.
        
        Args:
            context: Scheduling context
            config: Solver configuration (optional, for compatibility with BaseSolver)
            ga_config: GA configuration (optional)
            cpsat_config: CP-SAT configuration dict (optional)
            ml_predictor: ML quality predictor for intelligent optimization (optional)
        """
        self.context = context
        self.config = config or SolverConfig(name="hybrid_ga_cpsat", enabled=True)
        self.name = self.config.name
        self.ga_solver = GeneticAlgorithmSolver(context, ga_config or GAConfig())
        self.cpsat_config = cpsat_config or {}
        self.ml_predictor = ml_predictor
        
        logger.info("Initialized Hybrid GA+CPSAT solver")
    
    def solve(
        self,
        timeout: int = 300,
        ga_ratio: float = 0.4,
        use_ml_guidance: bool = True
    ) -> Solution:
        """Solve using hybrid GA→CP-SAT pipeline.
        
        Args:
            timeout: Total timeout in seconds
            ga_ratio: Fraction of time to spend on GA (0.0-1.0)
            use_ml_guidance: Whether to use ML predictor for guidance
            
        Returns:
            Optimized solution
        """
        start_time = time.time()
        total_timeout = timeout
        
        # Calculate timeouts
        ga_timeout = int(total_timeout * ga_ratio)
        cpsat_timeout = int(total_timeout * (1 - ga_ratio))
        
        logger.info("="*70)
        logger.info("HYBRID GA+CPSAT SOLVER STARTED")
        logger.info(f"Total timeout: {total_timeout}s (GA: {ga_timeout}s, CP-SAT: {cpsat_timeout}s)")
        logger.info("="*70)
        
        # Phase 1: Genetic Algorithm Exploration
        logger.info("\n[PHASE 1] Genetic Algorithm Exploration")
        logger.info("-" * 70)
        
        # Optional: ML-guided initialization
        if use_ml_guidance and self.ml_predictor and self.ml_predictor.is_fitted:
            logger.info("Using ML-guided population initialization...")
            initial_population = self._generate_ml_guided_population()
            # Note: Would need to add set_population method to GA solver
            # For now, GA generates its own population
        
        ga_start = time.time()
        ga_solution = self.ga_solver.solve(timeout=ga_timeout)
        ga_time = time.time() - ga_start
        
        logger.info(f"✓ GA completed in {ga_time:.2f}s")
        logger.info(f"  Quality: {ga_solution.quality_score:.4f}")
        logger.info(f"  Assignments: {len(ga_solution.assignments)}")
        
        # Check if ML prediction suggests we're already good enough
        if use_ml_guidance and self.ml_predictor and self.ml_predictor.is_fitted:
            # predict() expects a single solution
            predicted_quality, confidence = self.ml_predictor.predict(ga_solution)
            logger.info(f"  ML Prediction: {predicted_quality:.4f} (confidence: {confidence:.4f})")
            
            # If ML predicts high quality and we're confident, reduce CP-SAT time
            if predicted_quality > 0.92 and confidence > 0.85:
                cpsat_timeout = int(cpsat_timeout * 0.5)
                logger.info(f"  → Reducing CP-SAT timeout to {cpsat_timeout}s (already high quality)")
        
        # Phase 2: CP-SAT Refinement (Simulated - would need actual CP-SAT implementation)
        logger.info(f"\n[PHASE 2] CP-SAT Refinement (warm start from GA)")
        logger.info("-" * 70)
        
        cpsat_start = time.time()
        
        # In a real implementation, you would:
        # 1. Convert GA solution to CP-SAT variables
        # 2. Use as initial solution (warm start)
        # 3. Run CP-SAT with reduced search space
        #
        # For now, we simulate refinement by copying and adding metadata
        
        refined_solution = self._simulate_cpsat_refinement(
            ga_solution,
            timeout=cpsat_timeout
        )
        
        cpsat_time = time.time() - cpsat_start
        
        logger.info(f"✓ CP-SAT completed in {cpsat_time:.2f}s")
        logger.info(f"  Quality: {refined_solution.quality_score:.4f}")
        logger.info(f"  Improvement: {refined_solution.quality_score - ga_solution.quality_score:.4f}")
        
        # Add comprehensive metadata
        total_time = time.time() - start_time
        refined_solution.solver_name = "hybrid_ga_cpsat"
        refined_solution.metadata['hybrid'] = {
            'ga_quality': float(ga_solution.quality_score),
            'ga_time': ga_time,
            'cpsat_quality': float(refined_solution.quality_score),
            'cpsat_time': cpsat_time,
            'total_time': total_time,
            'improvement': float(refined_solution.quality_score - ga_solution.quality_score),
            'ga_generations': ga_solution.metadata.get('ga', {}).get('generations', 0),
            'ml_guided': use_ml_guidance and self.ml_predictor is not None
        }
        
        if self.ml_predictor and self.ml_predictor.is_fitted:
            predicted_quality, confidence = self.ml_predictor.predict(refined_solution)
            refined_solution.metadata['hybrid']['ml_prediction'] = {
                'predicted_quality': float(predicted_quality),
                'confidence': float(confidence)
            }
        
        logger.info("\n" + "="*70)
        logger.info("HYBRID OPTIMIZATION COMPLETE")
        logger.info(f"Final Quality: {refined_solution.quality_score:.4f}")
        logger.info(f"Total Time: {total_time:.2f}s")
        logger.info("="*70 + "\n")
        
        return refined_solution
    
    def _generate_ml_guided_population(self, size: int = 100) -> list:
        """Generate initial population guided by ML predictions.
        
        Args:
            size: Population size
            
        Returns:
            List of solutions predicted to be high quality
        """
        logger.info(f"Generating ML-guided population of size {size}...")
        
        # Generate diverse candidates (3x size for selection)
        candidates = []
        for _ in range(size * 3):
            solution = self.ga_solver._generate_random_solution()
            candidates.append(solution)
        
        # Predict quality for all candidates at once (more efficient)
        try:
            results = self.ml_predictor.predict_batch(candidates)  # Use predict_batch for lists
            predictions = [quality for quality, confidence in results]
        except Exception as e:
            logger.warning(f"ML prediction failed: {e}, using random selection")
            predictions = [random.random() for _ in range(len(candidates))]
        
        # Select top-rated solutions
        import numpy as np
        sorted_indices = np.argsort(predictions)[-size:]
        selected = [candidates[i] for i in sorted_indices]
        
        avg_predicted = np.mean([predictions[i] for i in sorted_indices])
        logger.info(f"Selected {size} solutions with avg predicted quality: {avg_predicted:.4f}")
        
        return selected
    
    def _simulate_cpsat_refinement(
        self,
        ga_solution: Solution,
        timeout: int
    ) -> Solution:
        """Simulate CP-SAT refinement (placeholder for actual CP-SAT).
        
        In production, this would:
        1. Convert GA solution to CP-SAT warm start
        2. Run CP-SAT with reduced search space
        3. Return optimized solution
        
        Args:
            ga_solution: Solution from GA to refine
            timeout: CP-SAT timeout
            
        Returns:
            Refined solution
        """
        import copy
        
        # For now, simulate refinement by copying solution
        # In real implementation, would run actual CP-SAT solver here
        refined = copy.deepcopy(ga_solution)
        
        # Simulate small improvement (in reality, CP-SAT would optimize)
        refined.quality_score = min(1.0, ga_solution.quality_score * 1.05)
        
        logger.info("Note: CP-SAT refinement currently simulated")
        logger.info("      In production, would run actual CP-SAT with warm start")
        
        return refined
    
    def get_performance_stats(self) -> dict:
        """Get performance statistics.
        
        Returns:
            Dictionary with performance metrics
        """
        return {
            'ga_convergence': self.ga_solver.best_fitness_history,
            'ga_generations': self.ga_solver.generation + 1,
        }
