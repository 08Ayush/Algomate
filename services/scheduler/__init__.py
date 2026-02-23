"""
Academic Compass - Hybrid Scheduling Algorithm Package

This package provides:
- CP-SAT constraint solver for hard constraints
- Genetic Algorithm optimizer for soft constraints
- Hybrid orchestrator combining both approaches
"""

from .nep_scheduler import NEPScheduler, solve_for_multiple_seeds
from .genetic_optimizer import GeneticOptimizer, EvolutionStats
from .hybrid_orchestrator import HybridOrchestrator, PipelineResult
from .chromosome_encoder import ChromosomeEncoder, Chromosome, Gene
from .fitness_calculator import FitnessCalculator, FitnessBreakdown
from .config import (
    HybridConfig,
    CPSATConfig,
    GAConfig,
    ConstraintWeights,
    DEFAULT_CONFIG,
    DEFAULT_WEIGHTS
)

__version__ = "1.0.0"
__all__ = [
    # Main classes
    "NEPScheduler",
    "GeneticOptimizer",
    "HybridOrchestrator",
    # Data classes
    "ChromosomeEncoder",
    "Chromosome",
    "Gene",
    "FitnessCalculator",
    "FitnessBreakdown",
    # Result classes
    "PipelineResult",
    "EvolutionStats",
    # Configuration
    "HybridConfig",
    "CPSATConfig",
    "GAConfig",
    "ConstraintWeights",
    "DEFAULT_CONFIG",
    "DEFAULT_WEIGHTS",
    # Functions
    "solve_for_multiple_seeds",
]
