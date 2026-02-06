"""
Ensemble Scheduler - Advanced Timetable Optimization System

A production-ready ensemble scheduler that combines multiple optimization algorithms
with machine learning for intelligent, adaptive timetable generation.

Features:
- Hybrid GA+CPSAT solver for optimal results
- Machine learning for quality prediction
- Pattern mining and adaptive learning
- NEP 2020 compliant
- FastAPI REST API
- Comprehensive logging and monitoring

Usage:
    # As a library
    from optimized import HybridGACPSATSolver, SchedulingContext, EnsembleConfig
    
    solver = HybridGACPSATSolver(context, config)
    solution = solver.solve()
    
    # As an API server
    python -m uvicorn api.routes:app --reload

Author: Academic Compass Development Team
Version: 2.0.0 (Hybrid GA+CPSAT)
"""

from core import (
    TimeSlot,
    Room,
    Faculty,
    Batch,
    Subject,
    Assignment,
    Solution,
    SchedulingContext,
    InstitutionConfig,
    EnsembleConfig,
    get_config,
)

from solvers import (
    BaseSolver,
    EnhancedCPSATSolver,
    GeneticAlgorithmSolver,
    GAConfig,
    HybridGACPSATSolver,
)

from ensemble import (
    EnsembleCoordinator,
    WeightedVoting,
)

from storage import DatabaseClient
from utils import setup_logger, get_logger

__version__ = "2.0.0"
__author__ = "Academic Compass Team"

__all__ = [
    # Core models
    "TimeSlot",
    "Room",
    "Faculty",
    "Batch",
    "Subject",
    "Assignment",
    "Solution",
    "SchedulingContext",
    "InstitutionConfig",
    # Configuration
    "EnsembleConfig",
    "get_config",
    # Solvers
    "BaseSolver",
    "EnhancedCPSATSolver",
    "GeneticAlgorithmSolver",
    "GAConfig",
    "HybridGACPSATSolver",
    # Ensemble
    "EnsembleCoordinator",
    "WeightedVoting",
    # Storage
    "DatabaseClient",
    # Utils
    "setup_logger",
    "get_logger",
]
