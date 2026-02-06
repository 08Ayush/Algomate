"""Feature extraction for ML-based quality prediction."""

import numpy as np
from typing import List, Dict, Any
from dataclasses import dataclass
from collections import Counter

from core.models import Solution, Assignment, TimeSlot, ConstraintType
from core.context import SchedulingContext


@dataclass
class FeatureVector:
    """Feature vector for a solution."""
    features: np.ndarray
    feature_names: List[str]
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary."""
        return dict(zip(self.feature_names, self.features))


class FeatureExtractor:
    """Extracts features from scheduling solutions."""
    
    def __init__(self, context: SchedulingContext):
        """Initialize feature extractor.
        
        Args:
            context: Scheduling context with problem data
        """
        self.context = context
        self.feature_names = self._get_feature_names()
    
    def extract(self, solution: Solution) -> FeatureVector:
        """Extract features from a solution.
        
        Args:
            solution: Solution to extract features from
            
        Returns:
            FeatureVector with 89 features
        """
        features = []
        
        # Basic metrics (10 features)
        features.extend(self._extract_basic_features(solution))
        
        # Constraint satisfaction (15 features)
        features.extend(self._extract_constraint_features(solution))
        
        # Temporal distribution (12 features)
        features.extend(self._extract_temporal_features(solution))
        
        # Spatial distribution (10 features)
        features.extend(self._extract_spatial_features(solution))
        
        # Faculty load (12 features)
        features.extend(self._extract_faculty_features(solution))
        
        # Batch distribution (10 features)
        features.extend(self._extract_batch_features(solution))
        
        # Room utilization (10 features)
        features.extend(self._extract_room_features(solution))
        
        # Subject distribution (10 features)
        features.extend(self._extract_subject_features(solution))
        
        return FeatureVector(
            features=np.array(features, dtype=np.float32),
            feature_names=self.feature_names,
            metadata={
                'solution_id': solution.id,
                'solver_name': solution.solver_name,
                'quality_score': solution.quality_score,
            }
        )
    
    def _extract_basic_features(self, solution: Solution) -> List[float]:
        """Extract basic solution metrics (10 features)."""
        assignments = solution.assignments
        n_assignments = len(assignments)
        
        # Calculate expected assignments
        expected = sum(
            subject.hours_per_week for subject in self.context.subjects
        )
        
        return [
            n_assignments,  # 1. Total assignments
            expected,  # 2. Expected assignments
            n_assignments / max(expected, 1),  # 3. Assignment ratio
            solution.quality_score,  # 4. Raw quality score
            len(solution.constraint_violations),  # 5. Total violations
            solution.is_valid,  # 6. Is valid (0/1)
            solution.hard_constraint_score,  # 7. Hard constraint score
            solution.soft_constraint_score,  # 8. Soft constraint score
            solution.preference_score,  # 9. Preference score
            solution.balance_score,  # 10. Balance score
        ]
    
    def _extract_constraint_features(self, solution: Solution) -> List[float]:
        """Extract constraint-related features (15 features)."""
        violations = solution.constraint_violations
        
        # Count violations by type
        violation_counts = Counter(v.constraint_type for v in violations)
        
        # Count by severity
        critical = sum(1 for v in violations if v.severity > 0.8)
        major = sum(1 for v in violations if 0.5 < v.severity <= 0.8)
        minor = sum(1 for v in violations if v.severity <= 0.5)
        
        return [
            violation_counts.get(ConstraintType.NO_OVERLAP, 0),  # 1
            violation_counts.get(ConstraintType.ROOM_CAPACITY, 0),  # 2
            violation_counts.get(ConstraintType.FACULTY_AVAILABILITY, 0),  # 3
            violation_counts.get(ConstraintType.LAB_REQUIREMENTS, 0),  # 4
            violation_counts.get(ConstraintType.ROOM_SUITABILITY, 0),  # 5
            violation_counts.get(ConstraintType.CONSECUTIVE_HOURS, 0),  # 6
            violation_counts.get(ConstraintType.FACULTY_LOAD_BALANCE, 0),  # 7
            violation_counts.get(ConstraintType.TIME_DISTRIBUTION, 0),  # 8
            violation_counts.get(ConstraintType.FACULTY_PREFERENCE, 0),  # 9
            violation_counts.get(ConstraintType.STUDENT_GAP_MINIMIZATION, 0),  # 10
            violation_counts.get(ConstraintType.ROOM_UTILIZATION, 0),  # 11
            critical,  # 12. Critical violations
            major,  # 13. Major violations
            minor,  # 14. Minor violations
            sum(v.severity for v in violations),  # 15. Total severity
        ]
    
    def _extract_temporal_features(self, solution: Solution) -> List[float]:
        """Extract temporal distribution features (12 features)."""
        assignments = solution.assignments
        
        if not assignments:
            return [0.0] * 12
        
        # Group by day
        day_counts = Counter(a.time_slot.day for a in assignments)
        
        # Group by hour
        hour_counts = Counter(a.time_slot.start_hour for a in assignments)
        
        # Calculate statistics
        day_values = list(day_counts.values())
        hour_values = list(hour_counts.values())
        
        return [
            np.mean(day_values) if day_values else 0,  # 1. Mean per day
            np.std(day_values) if day_values else 0,  # 2. Std per day
            np.max(day_values) if day_values else 0,  # 3. Max per day
            np.min(day_values) if day_values else 0,  # 4. Min per day
            len(day_counts),  # 5. Days used
            np.mean(hour_values) if hour_values else 0,  # 6. Mean per hour
            np.std(hour_values) if hour_values else 0,  # 7. Std per hour
            len(hour_counts),  # 8. Hours used
            sum(1 for a in assignments if a.time_slot.start_hour < 12),  # 9. Morning slots
            sum(1 for a in assignments if a.time_slot.start_hour >= 12),  # 10. Afternoon slots
            sum(1 for a in assignments if a.is_lab_session),  # 11. Lab sessions
            len(assignments) - sum(1 for a in assignments if a.is_lab_session),  # 12. Theory sessions
        ]
    
    def _extract_spatial_features(self, solution: Solution) -> List[float]:
        """Extract spatial distribution features (10 features)."""
        assignments = solution.assignments
        
        if not assignments:
            return [0.0] * 10
        
        # Room usage
        room_counts = Counter(a.room_id for a in assignments)
        room_values = list(room_counts.values())
        
        # Get room capacities
        room_map = {r.id: r for r in self.context.rooms}
        
        # Calculate utilization
        total_capacity = sum(room_map[r].capacity for r in room_counts.keys() if r in room_map)
        total_students = sum(
            self.context.batch_map[a.batch_id].strength 
            for a in assignments 
            if a.batch_id in self.context.batch_map
        )
        
        return [
            len(room_counts),  # 1. Rooms used
            np.mean(room_values) if room_values else 0,  # 2. Mean per room
            np.std(room_values) if room_values else 0,  # 3. Std per room
            np.max(room_values) if room_values else 0,  # 4. Max per room
            np.min(room_values) if room_values else 0,  # 5. Min per room
            total_capacity / max(len(room_counts), 1),  # 6. Avg capacity
            total_students / max(len(assignments), 1),  # 7. Avg batch size
            total_students / max(total_capacity, 1) if total_capacity > 0 else 0,  # 8. Utilization
            len([r for r in self.context.rooms if r.is_lab]),  # 9. Lab rooms available
            sum(1 for a in assignments if a.room_id in room_map and room_map[a.room_id].is_lab),  # 10. Lab room usage
        ]
    
    def _extract_faculty_features(self, solution: Solution) -> List[float]:
        """Extract faculty load features (12 features)."""
        assignments = solution.assignments
        
        if not assignments:
            return [0.0] * 12
        
        # Faculty load
        faculty_counts = Counter(a.faculty_id for a in assignments)
        faculty_values = list(faculty_counts.values())
        
        # Calculate workload statistics
        total_faculty = len(self.context.faculty)
        active_faculty = len(faculty_counts)
        
        return [
            active_faculty,  # 1. Faculty used
            total_faculty - active_faculty,  # 2. Idle faculty
            active_faculty / max(total_faculty, 1),  # 3. Utilization ratio
            np.mean(faculty_values) if faculty_values else 0,  # 4. Mean load
            np.std(faculty_values) if faculty_values else 0,  # 5. Std load
            np.max(faculty_values) if faculty_values else 0,  # 6. Max load
            np.min(faculty_values) if faculty_values else 0,  # 7. Min load
            sum(faculty_values),  # 8. Total hours
            sum(faculty_values) / max(active_faculty, 1),  # 9. Avg hours
            len([v for v in faculty_values if v > 20]),  # 10. Overloaded count
            len([v for v in faculty_values if v < 10]),  # 11. Underloaded count
            np.std(faculty_values) / max(np.mean(faculty_values), 1) if faculty_values else 0,  # 12. CV
        ]
    
    def _extract_batch_features(self, solution: Solution) -> List[float]:
        """Extract batch distribution features (10 features)."""
        assignments = solution.assignments
        
        if not assignments:
            return [0.0] * 10
        
        # Batch assignments
        batch_counts = Counter(a.batch_id for a in assignments)
        batch_values = list(batch_counts.values())
        
        return [
            len(batch_counts),  # 1. Batches scheduled
            len(self.context.batches) - len(batch_counts),  # 2. Unscheduled batches
            np.mean(batch_values) if batch_values else 0,  # 3. Mean per batch
            np.std(batch_values) if batch_values else 0,  # 4. Std per batch
            np.max(batch_values) if batch_values else 0,  # 5. Max per batch
            np.min(batch_values) if batch_values else 0,  # 6. Min per batch
            sum(batch_values),  # 7. Total batch hours
            sum(batch_values) / max(len(batch_counts), 1),  # 8. Avg per batch
            len([v for v in batch_values if v > 30]),  # 9. Heavy load batches
            len([v for v in batch_values if v < 20]),  # 10. Light load batches
        ]
    
    def _extract_room_features(self, solution: Solution) -> List[float]:
        """Extract room utilization features (10 features)."""
        assignments = solution.assignments
        
        if not assignments or not self.context.rooms:
            return [0.0] * 10
        
        # Room statistics
        total_rooms = len(self.context.rooms)
        lab_rooms = len([r for r in self.context.rooms if r.is_lab])
        theory_rooms = total_rooms - lab_rooms
        
        # Usage by type
        used_rooms = set(a.room_id for a in assignments)
        room_map = {r.id: r for r in self.context.rooms}
        
        used_lab = len([r for r in used_rooms if r in room_map and room_map[r].is_lab])
        used_theory = len(used_rooms) - used_lab
        
        return [
            total_rooms,  # 1. Total rooms
            lab_rooms,  # 2. Lab rooms
            theory_rooms,  # 3. Theory rooms
            len(used_rooms),  # 4. Rooms used
            used_lab,  # 5. Lab rooms used
            used_theory,  # 6. Theory rooms used
            len(used_rooms) / max(total_rooms, 1),  # 7. Overall utilization
            used_lab / max(lab_rooms, 1) if lab_rooms > 0 else 0,  # 8. Lab utilization
            used_theory / max(theory_rooms, 1) if theory_rooms > 0 else 0,  # 9. Theory utilization
            (total_rooms - len(used_rooms)),  # 10. Idle rooms
        ]
    
    def _extract_subject_features(self, solution: Solution) -> List[float]:
        """Extract subject distribution features (10 features)."""
        assignments = solution.assignments
        
        if not assignments:
            return [0.0] * 10
        
        # Subject coverage
        subject_counts = Counter(a.subject_id for a in assignments)
        subject_values = list(subject_counts.values())
        
        # Lab vs theory
        subject_map = {s.id: s for s in self.context.subjects}
        lab_subjects = sum(1 for sid in subject_counts.keys() if sid in subject_map and subject_map[sid].is_lab)
        theory_subjects = len(subject_counts) - lab_subjects
        
        return [
            len(subject_counts),  # 1. Subjects covered
            len(self.context.subjects) - len(subject_counts),  # 2. Uncovered subjects
            lab_subjects,  # 3. Lab subjects scheduled
            theory_subjects,  # 4. Theory subjects scheduled
            np.mean(subject_values) if subject_values else 0,  # 5. Mean hours per subject
            np.std(subject_values) if subject_values else 0,  # 6. Std hours per subject
            np.max(subject_values) if subject_values else 0,  # 7. Max hours per subject
            np.min(subject_values) if subject_values else 0,  # 8. Min hours per subject
            len([v for v in subject_values if v >= 4]),  # 9. Full subjects (4+ hours)
            len([v for v in subject_values if v < 4]),  # 10. Partial subjects
        ]
    
    def _get_feature_names(self) -> List[str]:
        """Get names of all features."""
        names = []
        
        # Basic (10)
        names.extend([
            'total_assignments', 'expected_assignments', 'assignment_ratio',
            'quality_score', 'total_violations', 'is_valid',
            'hard_constraint_score', 'soft_constraint_score',
            'preference_score', 'balance_score'
        ])
        
        # Constraints (15)
        names.extend([
            'no_overlap_violations', 'room_capacity_violations',
            'faculty_avail_violations', 'lab_requirements_violations',
            'room_suitability_violations', 'consecutive_violations',
            'faculty_load_violations', 'time_distribution_violations',
            'preference_violations', 'gap_violations',
            'room_util_violations', 'critical_violations',
            'major_violations', 'minor_violations', 'total_severity'
        ])
        
        # Temporal (12)
        names.extend([
            'mean_per_day', 'std_per_day', 'max_per_day', 'min_per_day',
            'days_used', 'mean_per_hour', 'std_per_hour', 'hours_used',
            'morning_slots', 'afternoon_slots', 'lab_sessions', 'theory_sessions'
        ])
        
        # Spatial (10)
        names.extend([
            'rooms_used', 'mean_per_room', 'std_per_room',
            'max_per_room', 'min_per_room', 'avg_capacity',
            'avg_batch_size', 'utilization', 'lab_rooms_available',
            'lab_room_usage'
        ])
        
        # Faculty (12)
        names.extend([
            'faculty_used', 'idle_faculty', 'faculty_utilization',
            'mean_faculty_load', 'std_faculty_load', 'max_faculty_load',
            'min_faculty_load', 'total_faculty_hours', 'avg_faculty_hours',
            'overloaded_faculty', 'underloaded_faculty', 'faculty_cv'
        ])
        
        # Batch (10)
        names.extend([
            'batches_scheduled', 'unscheduled_batches',
            'mean_per_batch', 'std_per_batch', 'max_per_batch',
            'min_per_batch', 'total_batch_hours', 'avg_per_batch',
            'heavy_load_batches', 'light_load_batches'
        ])
        
        # Room (10)
        names.extend([
            'total_rooms', 'lab_rooms', 'theory_rooms',
            'rooms_used_count', 'lab_rooms_used', 'theory_rooms_used',
            'overall_room_utilization', 'lab_utilization',
            'theory_utilization', 'idle_rooms'
        ])
        
        # Subject (10)
        names.extend([
            'subjects_covered', 'uncovered_subjects',
            'lab_subjects_scheduled', 'theory_subjects_scheduled',
            'mean_hours_per_subject', 'std_hours_per_subject',
            'max_hours_per_subject', 'min_hours_per_subject',
            'full_subjects', 'partial_subjects'
        ])
        
        return names
