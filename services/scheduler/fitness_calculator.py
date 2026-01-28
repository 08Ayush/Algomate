"""
Fitness Calculator for Genetic Algorithm

Evaluates timetable quality based on soft constraints.
Higher fitness = better timetable.
"""

from typing import Dict, List, Tuple, Set
from collections import defaultdict
from dataclasses import dataclass
from .chromosome_encoder import Chromosome, Gene
from .config import ConstraintWeights, DEFAULT_WEIGHTS
from .utils.logger import ga_logger


@dataclass
class FitnessBreakdown:
    """Detailed breakdown of fitness score components."""
    total_fitness: float
    gap_penalty: float
    time_preference_score: float
    workload_balance_score: float
    room_stability_score: float
    consecutive_penalty: float
    clustering_score: float
    elective_distribution_score: float
    hard_constraint_violations: int
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for logging/storage."""
        return {
            "total_fitness": self.total_fitness,
            "gap_penalty": self.gap_penalty,
            "time_preference_score": self.time_preference_score,
            "workload_balance_score": self.workload_balance_score,
            "room_stability_score": self.room_stability_score,
            "consecutive_penalty": self.consecutive_penalty,
            "clustering_score": self.clustering_score,
            "elective_distribution_score": self.elective_distribution_score,
            "hard_constraint_violations": self.hard_constraint_violations,
        }


class FitnessCalculator:
    """
    Calculates fitness scores for timetable chromosomes.
    
    Evaluates soft constraints and returns a fitness score
    where higher values indicate better timetables.
    """
    
    def __init__(
        self,
        time_slots: List[Dict],
        weights: ConstraintWeights = None
    ):
        """
        Initialize calculator with time slot data and weights.
        
        Args:
            time_slots: List of time slot records with day_of_week, start_time
            weights: Constraint weights configuration
        """
        self.time_slots = {t["id"]: t for t in time_slots}
        self.weights = weights or DEFAULT_WEIGHTS
        
        # Pre-compute time slot ordering
        self._slot_order = self._compute_slot_order(time_slots)
        
        # Preferred time slots (morning: 9-12, afternoon: 2-4)
        self._preferred_morning = set()
        self._preferred_afternoon = set()
        
        for slot in time_slots:
            start_time = slot.get("start_time", "09:00")
            if isinstance(start_time, str):
                try:
                    hour = int(start_time.split(":")[0])
                    if 9 <= hour < 12:
                        self._preferred_morning.add(slot["id"])
                    elif 14 <= hour < 16:
                        self._preferred_afternoon.add(slot["id"])
                except (ValueError, IndexError):
                    pass
        
        ga_logger.info(f"FitnessCalculator initialized with {len(time_slots)} slots")
    
    def _compute_slot_order(self, time_slots: List[Dict]) -> Dict[str, int]:
        """Compute global ordering of time slots."""
        day_order = {
            "monday": 0, "tuesday": 1, "wednesday": 2,
            "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
        }
        
        def slot_key(slot):
            day = slot.get("day_of_week", "monday")
            if isinstance(day, str):
                day = day.lower()
            else:
                day = "monday"
            time = slot.get("start_time", "09:00")
            return (day_order.get(day, 0), str(time))
        
        sorted_slots = sorted(time_slots, key=slot_key)
        return {s["id"]: i for i, s in enumerate(sorted_slots)}
    
    def calculate(self, chromosome: Chromosome) -> float:
        """
        Calculate total fitness score.
        
        Args:
            chromosome: Timetable chromosome to evaluate
            
        Returns:
            Fitness score (higher is better)
        """
        breakdown = self.calculate_detailed(chromosome)
        chromosome.fitness = breakdown.total_fitness
        return breakdown.total_fitness
    
    def calculate_detailed(self, chromosome: Chromosome) -> FitnessBreakdown:
        """
        Calculate fitness with detailed breakdown.
        
        Args:
            chromosome: Timetable chromosome to evaluate
            
        Returns:
            FitnessBreakdown with all component scores
        """
        if not chromosome.genes:
            return FitnessBreakdown(
                total_fitness=0.0,
                gap_penalty=0.0,
                time_preference_score=0.0,
                workload_balance_score=0.0,
                room_stability_score=0.0,
                consecutive_penalty=0.0,
                clustering_score=0.0,
                elective_distribution_score=0.0,
                hard_constraint_violations=0
            )
        
        # Group genes by various dimensions
        by_faculty_day = defaultdict(list)
        by_batch_day = defaultdict(list)
        by_room = defaultdict(list)
        by_subject = defaultdict(list)
        
        for gene in chromosome.genes:
            slot = self.time_slots.get(gene.time_slot_id, {})
            day = slot.get("day_of_week", "unknown")
            if isinstance(day, str):
                day = day.lower()
            
            by_faculty_day[(gene.faculty_id, day)].append(gene)
            by_batch_day[(gene.batch_id, day)].append(gene)
            by_room[gene.classroom_id].append(gene)
            by_subject[gene.subject_id].append(gene)
        
        # Calculate individual components
        gap_penalty = self._calculate_gap_penalty(by_batch_day)
        time_pref = self._calculate_time_preference(chromosome)
        workload = self._calculate_workload_balance(by_faculty_day)
        room_stab = self._calculate_room_stability(by_subject)
        consecutive = self._calculate_consecutive_penalty(by_batch_day)
        clustering = self._calculate_clustering_score(chromosome)
        elective = self._calculate_elective_distribution(chromosome)
        
        # Check hard constraint violations (should be 0 from CP-SAT)
        violations = self._check_hard_violations(chromosome)
        
        # Combine scores (penalties are negative)
        total = (
            - gap_penalty * self.weights.minimize_gaps
            + time_pref * self.weights.preferred_time_slots
            + workload * self.weights.workload_balance
            + room_stab * self.weights.room_stability
            - consecutive * self.weights.consecutive_lectures
            + clustering * self.weights.department_clustering
            + elective * self.weights.elective_distribution
            - violations * 10000  # Heavy penalty for violations
        )
        
        return FitnessBreakdown(
            total_fitness=total,
            gap_penalty=gap_penalty,
            time_preference_score=time_pref,
            workload_balance_score=workload,
            room_stability_score=room_stab,
            consecutive_penalty=consecutive,
            clustering_score=clustering,
            elective_distribution_score=elective,
            hard_constraint_violations=violations
        )
    
    def _calculate_gap_penalty(
        self, 
        by_batch_day: Dict[Tuple[str, str], List[Gene]]
    ) -> float:
        """Calculate penalty for gaps in student schedules."""
        total_gaps = 0
        
        for (batch_id, day), genes in by_batch_day.items():
            if len(genes) < 2:
                continue
            
            # Sort by time slot order
            sorted_genes = sorted(
                genes, 
                key=lambda g: self._slot_order.get(g.time_slot_id, 0)
            )
            
            # Count gaps (non-consecutive slots)
            for i in range(len(sorted_genes) - 1):
                order1 = self._slot_order.get(sorted_genes[i].time_slot_id, 0)
                order2 = self._slot_order.get(sorted_genes[i+1].time_slot_id, 0)
                gap = order2 - order1 - 1
                if gap > 0:
                    total_gaps += gap
        
        return total_gaps
    
    def _calculate_time_preference(self, chromosome: Chromosome) -> float:
        """Calculate score for preferred time slot usage."""
        if not chromosome.genes:
            return 0.0
            
        preferred_count = 0.0
        
        for gene in chromosome.genes:
            if gene.time_slot_id in self._preferred_morning:
                preferred_count += 1.0
            elif gene.time_slot_id in self._preferred_afternoon:
                preferred_count += 0.7
        
        return preferred_count / len(chromosome)
    
    def _calculate_workload_balance(
        self, 
        by_faculty_day: Dict[Tuple[str, str], List[Gene]]
    ) -> float:
        """Calculate workload balance across faculty days."""
        faculty_daily_loads = defaultdict(list)
        
        for (faculty_id, day), genes in by_faculty_day.items():
            faculty_daily_loads[faculty_id].append(len(genes))
        
        if not faculty_daily_loads:
            return 0.5
        
        # Calculate variance for each faculty
        total_balance = 0.0
        for faculty_id, daily_loads in faculty_daily_loads.items():
            if len(daily_loads) > 1:
                mean_load = sum(daily_loads) / len(daily_loads)
                variance = sum((x - mean_load) ** 2 for x in daily_loads) / len(daily_loads)
                # Lower variance = better balance = higher score
                total_balance += 1 / (1 + variance)
            else:
                total_balance += 1.0  # Single day = perfect balance
        
        return total_balance / len(faculty_daily_loads)
    
    def _calculate_room_stability(
        self, 
        by_subject: Dict[str, List[Gene]]
    ) -> float:
        """Calculate score for same-room assignments per subject."""
        if not by_subject:
            return 0.5
            
        stability_score = 0.0
        counted_subjects = 0
        
        for subject_id, genes in by_subject.items():
            if len(genes) < 2:
                continue
            
            counted_subjects += 1
            
            # Count most common room
            room_counts = defaultdict(int)
            for gene in genes:
                room_counts[gene.classroom_id] += 1
            
            max_count = max(room_counts.values())
            # Score based on consistency
            stability_score += max_count / len(genes)
        
        if counted_subjects == 0:
            return 0.5
            
        return stability_score / counted_subjects
    
    def _calculate_consecutive_penalty(
        self, 
        by_batch_day: Dict[Tuple[str, str], List[Gene]]
    ) -> float:
        """Calculate penalty for too many consecutive lectures."""
        penalty = 0
        max_consecutive = 3
        
        for (batch_id, day), genes in by_batch_day.items():
            if len(genes) <= max_consecutive:
                continue
            
            # Sort by slot order
            sorted_genes = sorted(
                genes, 
                key=lambda g: self._slot_order.get(g.time_slot_id, 0)
            )
            
            # Find consecutive sequences
            consecutive = 1
            for i in range(len(sorted_genes) - 1):
                order1 = self._slot_order.get(sorted_genes[i].time_slot_id, 0)
                order2 = self._slot_order.get(sorted_genes[i+1].time_slot_id, 0)
                
                if order2 - order1 == 1:
                    consecutive += 1
                    if consecutive > max_consecutive:
                        penalty += 1
                else:
                    consecutive = 1
        
        return penalty
    
    def _calculate_clustering_score(self, chromosome: Chromosome) -> float:
        """
        Calculate department clustering score.
        
        Rewards scheduling same-department classes in adjacent rooms/times.
        """
        # Simplified version - returns base score
        # Full implementation would require department info
        return 0.5
    
    def _calculate_elective_distribution(self, chromosome: Chromosome) -> float:
        """
        Calculate elective distribution score.
        
        Rewards spreading electives across different days.
        """
        if not chromosome.genes:
            return 0.5
            
        elective_days = defaultdict(set)
        
        for gene in chromosome.genes:
            # Assume lab subjects are often electives (simplification)
            if gene.is_lab:
                slot = self.time_slots.get(gene.time_slot_id, {})
                day = slot.get("day_of_week", "unknown")
                elective_days[gene.subject_id].add(day)
        
        if not elective_days:
            return 0.5
        
        # Score based on day variety
        avg_days = sum(len(days) for days in elective_days.values()) / len(elective_days)
        return min(avg_days / 3, 1.0)  # Normalize to [0, 1]
    
    def _check_hard_violations(self, chromosome: Chromosome) -> int:
        """
        Check for hard constraint violations.
        
        Should be 0 if chromosome came from CP-SAT.
        """
        violations = 0
        
        # Check teacher overlap (same faculty, same time slot)
        faculty_slots = set()
        for gene in chromosome.genes:
            key = (gene.faculty_id, gene.time_slot_id)
            if key in faculty_slots:
                violations += 1
            faculty_slots.add(key)
        
        # Check room overlap (same room, same time slot)
        room_slots = set()
        for gene in chromosome.genes:
            key = (gene.classroom_id, gene.time_slot_id)
            if key in room_slots:
                violations += 1
            room_slots.add(key)
        
        # Check batch overlap (same batch, same time slot)
        batch_slots = set()
        for gene in chromosome.genes:
            key = (gene.batch_id, gene.time_slot_id)
            if key in batch_slots:
                violations += 1
            batch_slots.add(key)
        
        return violations
