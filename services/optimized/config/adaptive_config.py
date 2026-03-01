"""
Adaptive Configuration System for Consistent 0.9+ Fitness Scores

This module automatically adjusts solver parameters based on batch complexity
to achieve high-quality timetables (0.9+ score) in minimal time.
"""

from dataclasses import dataclass, field
from typing import Dict, Any
import logging

logger = logging.getLogger("optimized.adaptive_config")


@dataclass
class BatchComplexity:
    """Metrics to assess batch scheduling difficulty."""
    subject_count: int
    assignment_count: int
    slot_count: int
    faculty_count: int
    room_count: int
    
    # Derived metrics
    slot_utilization: float = field(init=False)
    faculty_to_subject_ratio: float = field(init=False)
    room_to_subject_ratio: float = field(init=False)
    complexity_score: float = field(init=False)
    
    def __post_init__(self):
        """Calculate derived complexity metrics."""
        self.slot_utilization = self.assignment_count / max(self.slot_count, 1)
        self.faculty_to_subject_ratio = self.faculty_count / max(self.subject_count, 1)
        self.room_to_subject_ratio = self.room_count / max(self.subject_count, 1)
        
        # Complexity score: 0-100 (higher = harder to schedule)
        # Non-linear utilization penalty (primary factor, 0-80 points)
        if self.slot_utilization <= 0.60:
            utilization_penalty = self.slot_utilization * 20       # 0-12
        elif self.slot_utilization <= 0.80:
            utilization_penalty = 12 + (self.slot_utilization - 0.60) * 100  # 12-32
        elif self.slot_utilization <= 0.95:
            utilization_penalty = 32 + (self.slot_utilization - 0.80) * 200  # 32-62
        else:
            utilization_penalty = 62 + (self.slot_utilization - 0.95) * 400  # 62-82
        
        # Faculty shortage penalty (0-20 points, only when ratio < 1.0)
        if self.faculty_to_subject_ratio < 1.0:
            faculty_penalty = (1.0 - self.faculty_to_subject_ratio) * 20
        else:
            faculty_penalty = 0
        
        # Room shortage penalty (0-20 points, only when ratio < 0.8)
        if self.room_to_subject_ratio < 0.8:
            room_penalty = (0.8 - self.room_to_subject_ratio) * 25
        else:
            room_penalty = 0
        
        self.complexity_score = min(
            utilization_penalty + faculty_penalty + room_penalty,
            100
        )
    
    def get_difficulty(self) -> str:
        """Classify batch difficulty."""
        if self.complexity_score < 20:
            return "EASY"
        elif self.complexity_score < 40:
            return "MEDIUM"
        elif self.complexity_score < 65:
            return "HARD"
        else:
            return "VERY_HARD"


@dataclass
class AdaptiveGAConfig:
    """Genetic Algorithm configuration that adapts to batch complexity."""
    
    # Base parameters (for EASY batches)
    population_size: int = 100
    generations: int = 500
    mutation_rate: float = 0.15
    crossover_rate: float = 0.85
    elitism_count: int = 5
    tournament_size: int = 5
    timeout: int = 60
    
    # Quality target
    target_fitness: float = 0.90
    early_stop_threshold: float = 0.92  # Stop if we exceed target
    
    def adjust_for_complexity(self, complexity: BatchComplexity) -> 'AdaptiveGAConfig':
        """Adjust solver parameters based on batch complexity."""
        difficulty = complexity.get_difficulty()
        
        logger.info(
            f"Batch complexity: {complexity.complexity_score:.1f}/100 ({difficulty}), "
            f"utilization={complexity.slot_utilization:.1%}, "
            f"faculty_ratio={complexity.faculty_to_subject_ratio:.2f}"
        )
        
        if difficulty == "EASY":
            # Quick solve with smaller population
            self.population_size = 80
            self.generations = 300
            self.timeout = 30
            self.mutation_rate = 0.12
            logger.info("→ Using FAST config (target: 30s, score: 0.90+)")
            
        elif difficulty == "MEDIUM":
            # Balanced config
            self.population_size = 120
            self.generations = 500
            self.timeout = 45
            self.mutation_rate = 0.15
            logger.info("→ Using BALANCED config (target: 45s, score: 0.90+)")
            
        elif difficulty == "HARD":
            # Intensive search with larger population
            self.population_size = 180
            self.generations = 700
            self.timeout = 90
            self.mutation_rate = 0.18
            self.elitism_count = 8
            logger.info("→ Using INTENSIVE config (target: 90s, score: 0.85+)")
            
        else:  # VERY_HARD
            # Maximum effort - warn user
            self.population_size = 250
            self.generations = 1000
            self.timeout = 180
            self.mutation_rate = 0.20
            self.elitism_count = 12
            self.tournament_size = 7
            logger.warning(
                f"→ Using MAXIMUM config (target: 180s, score: 0.75+). "
                f"Slot utilization is {complexity.slot_utilization:.1%} - consider reducing subjects!"
            )
        
        return self


def calculate_batch_complexity(
    subjects: list,
    faculty: list,
    rooms: list,
    time_slots: list
) -> BatchComplexity:
    """Calculate complexity metrics from scheduling context."""
    
    # Count total assignments needed (credit-based: 1 credit = 1 class)
    total_assignments = 0
    for subject in subjects:
        hours = getattr(subject, 'hours_per_week', None)
        if hours is None:
            # Fallback: use credits (1 credit = 1 hour for ALL subjects)
            credits = getattr(subject, 'credits', 1)
            hours = credits
        total_assignments += hours
    
    return BatchComplexity(
        subject_count=len(subjects),
        assignment_count=total_assignments,
        slot_count=len(time_slots),
        faculty_count=len(faculty),
        room_count=len(rooms)
    )


def get_adaptive_solver_config(
    subjects: list,
    faculty: list,
    rooms: list,
    time_slots: list,
    base_config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Get optimal solver configuration for a specific batch.
    
    Returns config dict with tuned parameters for 0.9+ fitness score.
    """
    # Calculate batch complexity
    complexity = calculate_batch_complexity(subjects, faculty, rooms, time_slots)
    
    # Create adaptive GA config
    ga_config = AdaptiveGAConfig()
    ga_config.adjust_for_complexity(complexity)
    
    # Build complete solver configuration
    config = {
        "voting_strategy": "weighted",
        "quality_threshold": 0.90,
        "use_adaptive_config": True,
        
        # GA parameters (adaptive)
        "ga": {
            "population_size": ga_config.population_size,
            "generations": ga_config.generations,
            "mutation_rate": ga_config.mutation_rate,
            "crossover_rate": ga_config.crossover_rate,
            "elitism_count": ga_config.elitism_count,
            "tournament_size": ga_config.tournament_size,
            "timeout": ga_config.timeout,
            "target_fitness": ga_config.target_fitness,
            "early_stop_threshold": ga_config.early_stop_threshold,
            "repair_probability": 0.70,  # High repair rate for quality
        },
        
        # CP-SAT parameters (conservative)
        "cpsat": {
            "max_time_seconds": min(ga_config.timeout // 2, 30),
            "num_search_workers": 4,
            "search_branching": "AUTO",
        },
        
        # Ensemble voting weights
        "ensemble_weights": {
            "hybrid_ga_cpsat": 0.60,  # Prefer GA for quality
            "genetic_algorithm": 0.30,
            "cpsat": 0.10,
        },
        
        # Complexity metadata
        "batch_complexity": {
            "score": complexity.complexity_score,
            "difficulty": complexity.get_difficulty(),
            "slot_utilization": complexity.slot_utilization,
            "expected_time": ga_config.timeout,
            "expected_quality": ga_config.target_fitness,
        }
    }
    
    # Merge with base config if provided
    if base_config:
        config.update(base_config)
    
    return config


def validate_batch_schedulability(
    subjects: list,
    faculty: list,
    rooms: list,
    time_slots: list,
    min_quality_required: float = 0.90
) -> tuple[bool, str, float]:
    """
    Pre-validate if batch can achieve target quality score.
    
    Returns:
        (is_schedulable, reason, estimated_quality)
    """
    complexity = calculate_batch_complexity(subjects, faculty, rooms, time_slots)
    
    # Critical thresholds
    CRITICAL_UTILIZATION = 0.95  # > 95% is nearly impossible
    HIGH_UTILIZATION = 0.85      # > 85% is very difficult
    
    # Check 1: Mathematically impossible
    if complexity.slot_utilization > 1.0:
        return (
            False,
            f"Over-allocated: need {complexity.assignment_count} slots but only "
            f"{complexity.slot_count} available. Remove {complexity.assignment_count - complexity.slot_count} assignments.",
            0.0
        )
    
    # Check 2: Nearly impossible to achieve 0.9+
    if complexity.slot_utilization >= CRITICAL_UTILIZATION:
        estimated_quality = 0.50
        return (
            False,
            f"Slot utilization {complexity.slot_utilization:.1%} is too high. "
            f"Target is < 85% for quality 0.9+. Current: {complexity.assignment_count}/{complexity.slot_count} slots.",
            estimated_quality
        )
    
    # Check 3: Faculty shortage
    if complexity.faculty_count < complexity.subject_count * 0.7:
        estimated_quality = 0.60
        return (
            False,
            f"Insufficient faculty: {complexity.faculty_count} faculty for {complexity.subject_count} subjects. "
            f"Need at least {int(complexity.subject_count * 0.7)} faculty.",
            estimated_quality
        )
    
    # Check 4: Room shortage
    if complexity.room_count < complexity.subject_count * 0.5:
        estimated_quality = 0.70
        return (
            False,
            f"Insufficient rooms: {complexity.room_count} rooms for {complexity.subject_count} subjects. "
            f"Need at least {int(complexity.subject_count * 0.5)} rooms.",
            estimated_quality
        )
    
    # Estimate achievable quality based on complexity
    if complexity.slot_utilization < 0.60:
        estimated_quality = 0.95  # Excellent conditions
    elif complexity.slot_utilization < 0.75:
        estimated_quality = 0.92  # Good conditions
    elif complexity.slot_utilization < HIGH_UTILIZATION:
        estimated_quality = 0.88  # Acceptable conditions
    else:
        estimated_quality = 0.80  # Difficult conditions
    
    # Adjust for faculty/room ratios
    if complexity.faculty_to_subject_ratio < 1.2:
        estimated_quality -= 0.05
    if complexity.room_to_subject_ratio < 0.8:
        estimated_quality -= 0.05
    
    if estimated_quality >= min_quality_required:
        return (
            True,
            f"Batch is schedulable with estimated quality {estimated_quality:.2f} "
            f"(utilization={complexity.slot_utilization:.1%}, "
            f"faculty_ratio={complexity.faculty_to_subject_ratio:.2f}, "
            f"room_ratio={complexity.room_to_subject_ratio:.2f})",
            estimated_quality
        )
    else:
        # Build specific suggestions
        suggestions = []
        if complexity.slot_utilization > 0.75:
            suggestions.append(
                f"reduce slot utilization from {complexity.slot_utilization:.1%} to < 75%"
            )
        if complexity.faculty_to_subject_ratio < 1.2:
            suggestions.append(
                f"add faculty (ratio={complexity.faculty_to_subject_ratio:.2f}, need ≥1.2)"
            )
        if complexity.room_to_subject_ratio < 0.8:
            suggestions.append(
                f"add rooms (ratio={complexity.room_to_subject_ratio:.2f}, need ≥0.8)"
            )
        if not suggestions:
            suggestions.append("review constraint complexity")
        
        return (
            False,
            f"Batch may not achieve {min_quality_required:.2f} quality. "
            f"Estimated: {estimated_quality:.2f}. Consider: {'; '.join(suggestions)}.",
            estimated_quality
        )
