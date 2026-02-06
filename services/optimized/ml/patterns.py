"""Pattern mining for learning from successful solutions."""

import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from collections import Counter, defaultdict
from dataclasses import dataclass, field
import logging

from core.models import Solution, Assignment, TimeSlot
from core.context import SchedulingContext


@dataclass
class Pattern:
    """Represents a recurring pattern in solutions."""
    pattern_type: str
    description: str
    frequency: int
    quality_impact: float
    examples: List[str] = field(default_factory=list)
    
    def __hash__(self):
        return hash((self.pattern_type, self.description))


class PatternMiner:
    """Mines patterns from historical scheduling solutions."""
    
    def __init__(self, context: SchedulingContext):
        """Initialize pattern miner.
        
        Args:
            context: Scheduling context
        """
        self.context = context
        self.patterns: List[Pattern] = []
        self.logger = logging.getLogger(__name__)
        
        # Pattern caches
        self._faculty_patterns: Dict[str, int] = {}
        self._temporal_patterns: Dict[str, int] = {}
        self._room_patterns: Dict[str, int] = {}
        self._batch_patterns: Dict[str, int] = {}
    
    def mine(self, solutions: List[Solution], min_frequency: int = 2):
        """Mine patterns from solutions.
        
        Args:
            solutions: List of solutions to mine
            min_frequency: Minimum frequency for pattern to be significant
        """
        if not solutions:
            return
        
        self.logger.info(f"Mining patterns from {len(solutions)} solutions...")
        
        # Sort by quality
        sorted_solutions = sorted(solutions, key=lambda s: s.quality_score, reverse=True)
        
        # Mine different pattern types
        self._mine_faculty_patterns(sorted_solutions, min_frequency)
        self._mine_temporal_patterns(sorted_solutions, min_frequency)
        self._mine_room_patterns(sorted_solutions, min_frequency)
        self._mine_batch_patterns(sorted_solutions, min_frequency)
        self._mine_sequential_patterns(sorted_solutions, min_frequency)
        
        self.logger.info(f"Found {len(self.patterns)} patterns")
    
    def _mine_faculty_patterns(self, solutions: List[Solution], min_frequency: int):
        """Mine faculty assignment patterns."""
        # Track faculty-subject pairs
        faculty_subject_pairs = defaultdict(list)
        
        for solution in solutions:
            for assignment in solution.assignments:
                key = (assignment.faculty_id, assignment.subject_id)
                faculty_subject_pairs[key].append(solution.quality_score)
        
        # Find frequent high-quality pairs
        for (faculty_id, subject_id), scores in faculty_subject_pairs.items():
            if len(scores) >= min_frequency:
                avg_quality = np.mean(scores)
                
                # Only keep high-quality patterns
                if avg_quality > 0.7:
                    faculty = next((f for f in self.context.faculty if f.id == faculty_id), None)
                    subject = next((s for s in self.context.subjects if s.id == subject_id), None)
                    
                    if faculty and subject:
                        pattern = Pattern(
                            pattern_type='faculty_subject',
                            description=f"Faculty {faculty.name} teaches {subject.name}",
                            frequency=len(scores),
                            quality_impact=avg_quality,
                            examples=[f"{faculty_id}-{subject_id}"]
                        )
                        self.patterns.append(pattern)
    
    def _mine_temporal_patterns(self, solutions: List[Solution], min_frequency: int):
        """Mine temporal scheduling patterns."""
        # Track subject-time preferences
        subject_time_patterns = defaultdict(list)
        
        for solution in solutions:
            for assignment in solution.assignments:
                # Morning (0-12) vs afternoon (12-24)
                time_category = 'morning' if assignment.time_slot.start_hour < 12 else 'afternoon'
                key = (assignment.subject_id, time_category)
                subject_time_patterns[key].append(solution.quality_score)
        
        # Find patterns
        for (subject_id, time_category), scores in subject_time_patterns.items():
            if len(scores) >= min_frequency:
                avg_quality = np.mean(scores)
                
                if avg_quality > 0.7:
                    subject = next((s for s in self.context.subjects if s.id == subject_id), None)
                    if subject:
                        pattern = Pattern(
                            pattern_type='temporal',
                            description=f"{subject.name} scheduled in {time_category}",
                            frequency=len(scores),
                            quality_impact=avg_quality,
                            examples=[f"{subject_id}-{time_category}"]
                        )
                        self.patterns.append(pattern)
        
        # Day-of-week patterns
        day_patterns = defaultdict(list)
        for solution in solutions:
            day_distribution = Counter(a.time_slot.day for a in solution.assignments)
            for day, count in day_distribution.items():
                day_patterns[day].append((count, solution.quality_score))
        
        # Find optimal distribution per day
        for day, data in day_patterns.items():
            if len(data) >= min_frequency:
                # Correlate count with quality
                counts, qualities = zip(*data)
                optimal_count = int(np.mean([c for c, q in data if q > 0.7]))
                
                if optimal_count > 0:
                    pattern = Pattern(
                        pattern_type='daily_load',
                        description=f"Day {day} optimal load: ~{optimal_count} classes",
                        frequency=len(data),
                        quality_impact=np.mean([q for c, q in data if abs(c - optimal_count) <= 2]),
                        examples=[f"day-{day}-{optimal_count}"]
                    )
                    self.patterns.append(pattern)
    
    def _mine_room_patterns(self, solutions: List[Solution], min_frequency: int):
        """Mine room assignment patterns."""
        # Subject-room type patterns
        subject_room_patterns = defaultdict(list)
        
        for solution in solutions:
            for assignment in solution.assignments:
                room = next((r for r in self.context.rooms if r.id == assignment.room_id), None)
                if room:
                    room_type = 'lab' if room.is_lab else 'theory'
                    key = (assignment.subject_id, room_type)
                    subject_room_patterns[key].append(solution.quality_score)
        
        # Find patterns
        for (subject_id, room_type), scores in subject_room_patterns.items():
            if len(scores) >= min_frequency:
                avg_quality = np.mean(scores)
                
                if avg_quality > 0.7:
                    subject = next((s for s in self.context.subjects if s.id == subject_id), None)
                    if subject:
                        pattern = Pattern(
                            pattern_type='room_type',
                            description=f"{subject.name} in {room_type} rooms",
                            frequency=len(scores),
                            quality_impact=avg_quality,
                            examples=[f"{subject_id}-{room_type}"]
                        )
                        self.patterns.append(pattern)
    
    def _mine_batch_patterns(self, solutions: List[Solution], min_frequency: int):
        """Mine batch scheduling patterns."""
        # Track batch-day patterns
        batch_day_patterns = defaultdict(lambda: defaultdict(list))
        
        for solution in solutions:
            batch_days = defaultdict(set)
            for assignment in solution.assignments:
                batch_days[assignment.batch_id].add(assignment.time_slot.day)
            
            for batch_id, days in batch_days.items():
                batch_day_patterns[batch_id][len(days)].append(solution.quality_score)
        
        # Find optimal days spread
        for batch_id, day_counts in batch_day_patterns.items():
            for n_days, scores in day_counts.items():
                if len(scores) >= min_frequency:
                    avg_quality = np.mean(scores)
                    
                    if avg_quality > 0.7:
                        batch = next((b for b in self.context.batches if b.id == batch_id), None)
                        if batch:
                            pattern = Pattern(
                                pattern_type='batch_spread',
                                description=f"{batch.name} spread across {n_days} days",
                                frequency=len(scores),
                                quality_impact=avg_quality,
                                examples=[f"{batch_id}-{n_days}days"]
                            )
                            self.patterns.append(pattern)
    
    def _mine_sequential_patterns(self, solutions: List[Solution], min_frequency: int):
        """Mine sequential class patterns."""
        # Track consecutive class sequences
        consecutive_patterns = defaultdict(list)
        
        for solution in solutions:
            # Group by batch and day
            batch_day_assignments = defaultdict(lambda: defaultdict(list))
            for assignment in solution.assignments:
                key = (assignment.batch_id, assignment.time_slot.day)
                batch_day_assignments[key][assignment.time_slot.start_hour].append(assignment)
            
            # Find consecutive patterns
            for (batch_id, day), hour_assignments in batch_day_assignments.items():
                sorted_hours = sorted(hour_assignments.keys())
                
                # Find consecutive sequences
                for i in range(len(sorted_hours) - 1):
                    if sorted_hours[i+1] - sorted_hours[i] == 1:  # Consecutive hours
                        assignments_1 = hour_assignments[sorted_hours[i]]
                        assignments_2 = hour_assignments[sorted_hours[i+1]]
                        
                        for a1 in assignments_1:
                            for a2 in assignments_2:
                                if a1.subject_id != a2.subject_id:  # Different subjects
                                    key = (a1.subject_id, a2.subject_id)
                                    consecutive_patterns[key].append(solution.quality_score)
        
        # Find high-quality consecutive patterns
        for (subject1_id, subject2_id), scores in consecutive_patterns.items():
            if len(scores) >= min_frequency:
                avg_quality = np.mean(scores)
                
                if avg_quality > 0.7:
                    subject1 = next((s for s in self.context.subjects if s.id == subject1_id), None)
                    subject2 = next((s for s in self.context.subjects if s.id == subject2_id), None)
                    
                    if subject1 and subject2:
                        pattern = Pattern(
                            pattern_type='consecutive',
                            description=f"{subject1.name} followed by {subject2.name}",
                            frequency=len(scores),
                            quality_impact=avg_quality,
                            examples=[f"{subject1_id}->{subject2_id}"]
                        )
                        self.patterns.append(pattern)
    
    def get_patterns(self, pattern_type: Optional[str] = None, min_quality_impact: float = 0.0) -> List[Pattern]:
        """Get mined patterns.
        
        Args:
            pattern_type: Filter by pattern type (optional)
            min_quality_impact: Minimum quality impact threshold
            
        Returns:
            List of patterns matching criteria
        """
        patterns = self.patterns
        
        if pattern_type:
            patterns = [p for p in patterns if p.pattern_type == pattern_type]
        
        if min_quality_impact > 0:
            patterns = [p for p in patterns if p.quality_impact >= min_quality_impact]
        
        return sorted(patterns, key=lambda p: p.quality_impact, reverse=True)
    
    def apply_patterns(self, solution: Solution) -> float:
        """Calculate how well a solution matches learned patterns.
        
        Args:
            solution: Solution to evaluate
            
        Returns:
            Pattern match score (0-1)
        """
        if not self.patterns:
            return 0.5  # Neutral score
        
        matches = 0
        total_weight = 0
        
        for pattern in self.patterns:
            weight = pattern.frequency * pattern.quality_impact
            total_weight += weight
            
            if self._pattern_matches(solution, pattern):
                matches += weight
        
        return matches / total_weight if total_weight > 0 else 0.5
    
    def _pattern_matches(self, solution: Solution, pattern: Pattern) -> bool:
        """Check if solution matches a pattern."""
        if pattern.pattern_type == 'faculty_subject':
            # Check if faculty-subject pair exists
            for example in pattern.examples:
                faculty_id, subject_id = example.split('-')
                for assignment in solution.assignments:
                    if (assignment.faculty_id == faculty_id and 
                        assignment.subject_id == subject_id):
                        return True
        
        elif pattern.pattern_type == 'temporal':
            # Check time category matches
            for example in pattern.examples:
                parts = example.split('-')
                if len(parts) >= 2:
                    subject_id, time_category = parts[0], parts[1]
                    for assignment in solution.assignments:
                        if assignment.subject_id == subject_id:
                            is_morning = assignment.time_slot.start_hour < 12
                            matches_category = (
                                (time_category == 'morning' and is_morning) or
                                (time_category == 'afternoon' and not is_morning)
                            )
                            if matches_category:
                                return True
        
        elif pattern.pattern_type == 'room_type':
            # Check room type matches
            for example in pattern.examples:
                subject_id, room_type = example.split('-')
                for assignment in solution.assignments:
                    if assignment.subject_id == subject_id:
                        room = next((r for r in self.context.rooms if r.id == assignment.room_id), None)
                        if room:
                            matches_type = (
                                (room_type == 'lab' and room.is_lab) or
                                (room_type == 'theory' and not room.is_lab)
                            )
                            if matches_type:
                                return True
        
        return False
    
    def get_recommendations(self, solution: Solution) -> List[str]:
        """Get recommendations based on patterns.
        
        Args:
            solution: Solution to analyze
            
        Returns:
            List of recommendation strings
        """
        recommendations = []
        
        # Check against high-impact patterns
        high_impact_patterns = [p for p in self.patterns if p.quality_impact > 0.8]
        
        for pattern in high_impact_patterns:
            if not self._pattern_matches(solution, pattern):
                recommendations.append(
                    f"Consider: {pattern.description} "
                    f"(observed in {pattern.frequency} high-quality solutions)"
                )
        
        return recommendations[:10]  # Top 10 recommendations
