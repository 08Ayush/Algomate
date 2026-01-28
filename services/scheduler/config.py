"""
Scheduler Configuration

Centralizes all algorithm parameters and constraints.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class ConstraintType(Enum):
    """Types of scheduling constraints."""
    HARD = "hard"
    SOFT = "soft"


@dataclass
class CPSATConfig:
    """Configuration for the CP-SAT solver."""
    
    # Solver parameters
    max_time_seconds: int = 300
    num_workers: int = 8
    num_solutions: int = 10  # Generate multiple seeds for GA
    
    # Solution quality
    relative_gap_limit: float = 0.05
    absolute_gap_limit: float = 10.0
    
    # Logging
    log_search_progress: bool = True


@dataclass
class GAConfig:
    """Configuration for the Genetic Algorithm."""
    
    # Population parameters
    population_size: int = 100
    elite_size: int = 10
    
    # Evolution parameters
    generations: int = 200
    mutation_rate: float = 0.15
    crossover_rate: float = 0.8
    
    # Tournament selection
    tournament_size: int = 5
    
    # Convergence detection
    stagnation_limit: int = 30  # Stop if no improvement for N generations
    
    # Parallel processing
    use_multiprocessing: bool = True
    num_processes: int = 4


@dataclass
class HybridConfig:
    """Configuration for the hybrid orchestrator."""
    
    cpsat: CPSATConfig = field(default_factory=CPSATConfig)
    ga: GAConfig = field(default_factory=GAConfig)
    
    # Pipeline settings
    save_intermediate: bool = True
    output_dir: str = "scheduler_output"
    
    # Retry logic
    max_retries: int = 3
    retry_delay_seconds: int = 5


@dataclass
class ConstraintWeights:
    """Weights for soft constraints (used in fitness calculation)."""
    
    # Gap minimization
    minimize_gaps: int = 50
    
    # Time preferences
    preferred_time_slots: int = 30
    
    # Workload balance
    workload_balance: int = 40
    
    # Room stability (same room for same subject)
    room_stability: int = 20
    
    # Consecutive lecture limit
    consecutive_lectures: int = 35
    
    # Department clustering
    department_clustering: int = 25
    
    # Elective distribution
    elective_distribution: int = 30
    
    def to_dict(self) -> Dict[str, int]:
        """Convert weights to dictionary."""
        return {
            "minimize_gaps": self.minimize_gaps,
            "preferred_time_slots": self.preferred_time_slots,
            "workload_balance": self.workload_balance,
            "room_stability": self.room_stability,
            "consecutive_lectures": self.consecutive_lectures,
            "department_clustering": self.department_clustering,
            "elective_distribution": self.elective_distribution,
        }


# Default configuration instances
DEFAULT_CONFIG = HybridConfig()
DEFAULT_WEIGHTS = ConstraintWeights()


# Constraint definitions for reference
HARD_CONSTRAINTS = [
    "no_teacher_overlap",      # Faculty cannot teach two classes simultaneously
    "no_room_overlap",         # Room cannot host two classes simultaneously
    "no_student_overlap",      # Batch cannot attend two classes simultaneously
    "room_capacity",           # Room must fit all students
    "faculty_availability",    # Faculty must be available at scheduled time
    "lab_requires_lab_room",   # Lab sessions must be in lab rooms
    "max_hours_per_day",       # Maximum teaching hours per day
    "lunch_break_required",    # Mandatory lunch break slot
]

SOFT_CONSTRAINTS = [
    "minimize_gaps",           # Minimize gaps in student schedules
    "preferred_time_slots",    # Prefer morning slots for theory
    "workload_balance",        # Balance faculty workload across days
    "room_stability",          # Same room for same subject
    "consecutive_lectures",    # Limit consecutive lectures
    "department_clustering",   # Keep department classes nearby
    "elective_distribution",   # Spread electives across days
]
