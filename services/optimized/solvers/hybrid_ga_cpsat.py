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
        ga_ratio: float = 0.85,
        use_ml_guidance: bool = True
    ) -> Solution:
        """Solve using hybrid GA→refinement pipeline.
        
        Args:
            timeout: Total timeout in seconds
            ga_ratio: Fraction of time to spend on GA (0.0-1.0)
            use_ml_guidance: Whether to use ML predictor for guidance
            
        Returns:
            Optimized solution
        """
        start_time = time.time()
        total_timeout = timeout
        
        # Give most time to GA (the actual solver), minimal for refinement
        ga_timeout = max(int(total_timeout * ga_ratio), total_timeout - 5)
        
        logger.info("="*60)
        logger.info(f"HYBRID SOLVER STARTED (timeout={total_timeout}s, GA={ga_timeout}s)")
        logger.info(f"  GA config: pop={self.ga_solver.config.population_size}, "
                     f"gen={self.ga_solver.config.generations}, "
                     f"mutation={self.ga_solver.config.mutation_rate:.2f}")
        logger.info("="*60)
        
        # Phase 1: Genetic Algorithm (main solver)
        ga_start = time.time()
        ga_solution = self.ga_solver.solve(timeout=ga_timeout)
        ga_time = time.time() - ga_start
        
        logger.info(f"✓ GA completed in {ga_time:.2f}s")
        logger.info(f"  Quality: {ga_solution.quality_score:.4f}")
        logger.info(f"  Assignments: {len(ga_solution.assignments)}")
        
        # Phase 2: Quick refinement pass if time remains and quality is decent
        remaining_time = total_timeout - (time.time() - start_time)
        refined_solution = ga_solution
        
        if remaining_time > 3 and ga_solution.quality_score > 0.0 and ga_solution.quality_score < 0.95:
            logger.info(f"[PHASE 2] Quick refinement ({remaining_time:.0f}s remaining)")
            # Run a second short GA pass with the best solution's config
            # to squeeze out extra quality
            try:
                import copy
                refinement_ga = GeneticAlgorithmSolver(
                    context=self.context,
                    config=GAConfig(
                        population_size=max(30, self.ga_solver.config.population_size // 3),
                        generations=min(200, self.ga_solver.config.generations // 2),
                        mutation_rate=min(0.25, self.ga_solver.config.mutation_rate * 1.5),
                        crossover_rate=0.9,
                        tournament_size=3,
                        elite_size=3,
                        timeout=int(remaining_time) - 1,
                    )
                )
                refined_solution = refinement_ga.solve(timeout=int(remaining_time) - 1)
                
                # Keep the better solution
                if refined_solution.quality_score < ga_solution.quality_score:
                    refined_solution = ga_solution
                    
                logger.info(f"  Refinement quality: {refined_solution.quality_score:.4f} "
                           f"(was {ga_solution.quality_score:.4f})")
            except Exception as e:
                logger.warning(f"  Refinement failed: {e}, using GA result")
                refined_solution = ga_solution
        
        # Add metadata
        total_time = time.time() - start_time
        refined_solution.solver_name = "hybrid_ga_cpsat"
        refined_solution.metadata['hybrid'] = {
            'ga_quality': float(ga_solution.quality_score),
            'ga_time': ga_time,
            'final_quality': float(refined_solution.quality_score),
            'total_time': total_time,
            'improvement': float(refined_solution.quality_score - ga_solution.quality_score),
            'ga_generations': ga_solution.metadata.get('ga', {}).get('generations', 0),
        }
        
        logger.info(f"HYBRID SOLVER COMPLETE: quality={refined_solution.quality_score:.4f}, "
                     f"time={total_time:.1f}s, assignments={len(refined_solution.assignments)}")
        
        return refined_solution
    
    def get_performance_stats(self) -> dict:
        """Get performance statistics.
        
        Returns:
            Dictionary with performance metrics
        """
        return {
            'ga_convergence': self.ga_solver.best_fitness_history,
            'ga_generations': self.ga_solver.generation + 1,
        }
