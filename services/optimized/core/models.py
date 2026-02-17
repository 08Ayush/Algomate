"""Core data models for timetable scheduling."""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime, time
from enum import Enum
import uuid


class ConstraintType(Enum):
    """Types of scheduling constraints."""
    # Hard constraints (must be satisfied)
    NO_OVERLAP = "no_overlap"
    ROOM_CAPACITY = "room_capacity"
    FACULTY_AVAILABILITY = "faculty_availability"
    LAB_REQUIREMENTS = "lab_requirements"
    
    # Soft constraints (preferences)
    FACULTY_PREFERENCE = "faculty_preference"
    STUDENT_GAP_MINIMIZATION = "student_gap_minimization"
    FACULTY_LOAD_BALANCE = "faculty_load_balance"
    ROOM_UTILIZATION = "room_utilization"
    TIME_DISTRIBUTION = "time_distribution"
    CONSECUTIVE_HOURS = "consecutive_hours"
    ROOM_SUITABILITY = "room_suitability"


@dataclass
class TimeSlot:
    """Represents a time slot in the timetable."""
    id: str
    day: int  # 0=Monday, 1=Tuesday, ..., 5=Saturday
    start_hour: int  # 24-hour format
    start_minute: int
    duration_minutes: int
    is_lab_slot: bool = False
    
    @property
    def end_hour(self) -> int:
        """Calculate end hour."""
        total_minutes = self.start_hour * 60 + self.start_minute + self.duration_minutes
        return total_minutes // 60
    
    @property
    def end_minute(self) -> int:
        """Calculate end minute."""
        total_minutes = self.start_hour * 60 + self.start_minute + self.duration_minutes
        return total_minutes % 60
    
    def overlaps_with(self, other: 'TimeSlot') -> bool:
        """Check if this slot overlaps with another."""
        if self.day != other.day:
            return False
        
        self_start = self.start_hour * 60 + self.start_minute
        self_end = self_start + self.duration_minutes
        other_start = other.start_hour * 60 + other.start_minute
        other_end = other_start + other.duration_minutes
        
        return not (self_end <= other_start or other_end <= self_start)


@dataclass
class Room:
    """Represents a classroom or lab."""
    id: str
    name: str
    capacity: int
    room_type: str  # "classroom", "lab", "seminar_hall"
    building: str
    floor: int
    facilities: List[str] = field(default_factory=list)
    is_available: bool = True
    
    @property
    def is_lab(self) -> bool:
        """Check if room is a lab."""
        return self.room_type == "lab"
    
    def supports_subject(self, subject: 'Subject') -> bool:
        """Check if room supports the subject requirements."""
        if subject.is_lab and self.room_type != "lab":
            return False
        return all(req in self.facilities for req in subject.room_requirements)


@dataclass
class Faculty:
    """Represents a faculty member."""
    id: str
    name: str
    department: str
    designation: str
    max_hours_per_week: int = 20
    min_hours_per_week: int = 12
    preferred_time_slots: List[str] = field(default_factory=list)
    unavailable_slots: List[str] = field(default_factory=list)
    qualifications: List[str] = field(default_factory=list)
    rank_weight: float = 1.0  # For preference weighting
    
    def can_teach(self, subject: 'Subject') -> bool:
        """Check if faculty is qualified to teach the subject.

        Matching rules (in priority order):
        1. Faculty qualifications ∩ subject.required_qualifications is non-empty.
        2. subject.id is in faculty's qualifications list (assigned-faculty
           or faculty_qualified_subjects in DB).
        3. subject.code is in faculty's qualifications list.
        """
        if subject.required_qualifications:
            if any(q in subject.required_qualifications for q in self.qualifications):
                return True
        # Fallback: subject id or code directly in qualifications
        if subject.id in self.qualifications:
            return True
        if subject.code and subject.code in self.qualifications:
            return True
        return False


@dataclass
class Batch:
    """Represents a student batch/section."""
    id: str
    name: str
    program: str
    semester: int
    year: int
    strength: int
    department: str
    subjects: List[str] = field(default_factory=list)  # Subject IDs
    academic_year: str = "2025-26"


@dataclass
class Subject:
    """Represents a subject/course."""
    id: str
    name: str
    code: str
    credits: int
    hours_per_week: int
    is_lab: bool = False
    is_elective: bool = False
    max_students: Optional[int] = None
    room_requirements: List[str] = field(default_factory=list)
    required_qualifications: List[str] = field(default_factory=list)
    prerequisites: List[str] = field(default_factory=list)


@dataclass
class Assignment:
    """Represents a single timetable assignment."""
    id: str
    batch_id: str
    subject_id: str
    faculty_id: str
    room_id: str
    time_slot: TimeSlot
    is_lab_session: bool = False
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ConstraintViolation:
    """Represents a constraint violation."""
    constraint_type: ConstraintType
    severity: float  # 0.0 to 1.0
    description: str
    affected_assignments: List[str] = field(default_factory=list)
    suggested_fix: Optional[str] = None


@dataclass
class Solution:
    """Represents a complete timetable solution."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    assignments: List[Assignment] = field(default_factory=list)
    quality_score: float = 0.0
    constraint_violations: List[ConstraintViolation] = field(default_factory=list)
    execution_time: float = 0.0
    solver_name: str = ""
    metadata: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    
    # ML predictions (added by predictor)
    predicted_quality: Optional[float] = None
    quality_confidence: Optional[float] = None
    
    @property
    def is_valid(self) -> bool:
        """Check if solution satisfies all hard constraints."""
        hard_violations = [
            v for v in self.constraint_violations
            if v.constraint_type in [
                ConstraintType.NO_OVERLAP,
                ConstraintType.ROOM_CAPACITY,
                ConstraintType.FACULTY_AVAILABILITY,
                ConstraintType.LAB_REQUIREMENTS,
            ]
        ]
        return len(hard_violations) == 0
    
    @property
    def hard_constraint_score(self) -> float:
        """Calculate hard constraint satisfaction score."""
        hard_violations = [
            v for v in self.constraint_violations
            if v.constraint_type in [
                ConstraintType.NO_OVERLAP,
                ConstraintType.ROOM_CAPACITY,
                ConstraintType.FACULTY_AVAILABILITY,
                ConstraintType.LAB_REQUIREMENTS,
            ]
        ]
        if not hard_violations:
            return 1.0
        
        total_severity = sum(v.severity for v in hard_violations)
        max_severity = len(hard_violations)
        return 1.0 - (total_severity / max_severity) if max_severity > 0 else 1.0
    
    @property
    def soft_constraint_score(self) -> float:
        """Calculate soft constraint satisfaction score."""
        soft_violations = [
            v for v in self.constraint_violations
            if v.constraint_type not in [
                ConstraintType.NO_OVERLAP,
                ConstraintType.ROOM_CAPACITY,
                ConstraintType.FACULTY_AVAILABILITY,
                ConstraintType.LAB_REQUIREMENTS,
            ]
        ]
        if not soft_violations:
            return 1.0
        
        total_severity = sum(v.severity for v in soft_violations)
        max_severity = len(soft_violations)
        return 1.0 - (total_severity / max_severity) if max_severity > 0 else 1.0
    
    @property
    def preference_score(self) -> float:
        """Calculate preference satisfaction score."""
        # Default implementation based on faculty preferences
        return self.quality_score * 0.8  # Simplified
    
    @property
    def balance_score(self) -> float:
        """Calculate load balance score."""
        # Default implementation based on distribution
        return self.quality_score * 0.9  # Simplified


@dataclass
class Constraint:
    """Represents a scheduling constraint."""
    id: str
    constraint_type: ConstraintType
    weight: float  # Importance weight
    is_hard: bool
    description: str
    parameters: Dict = field(default_factory=dict)
