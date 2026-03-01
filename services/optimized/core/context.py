"""Scheduling context that holds all problem data."""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from .models import (
    TimeSlot,
    Room,
    Faculty,
    Batch,
    Subject,
    Constraint,
    ConstraintType,
    ConstraintRule,
)


@dataclass
class InstitutionConfig:
    """Institution-specific configuration."""
    id: str
    name: str
    working_days: int = 6  # Monday to Saturday
    slots_per_day: int = 8
    slot_duration: int = 60  # minutes
    lunch_break_start: int = 13  # 1 PM
    lunch_break_duration: int = 60  # minutes
    min_gap_between_classes: int = 0  # minutes
    max_consecutive_hours: int = 4
    
    # NEP 2020 specific
    enable_choice_based_credit: bool = True
    enable_continuous_evaluation: bool = True
    flexibility_percentage: float = 0.30  # 30% flexibility


@dataclass
class SchedulingContext:
    """Complete context for scheduling problem."""
    
    # Institution info
    institution: InstitutionConfig
    
    # Core entities
    time_slots: List[TimeSlot] = field(default_factory=list)
    rooms: List[Room] = field(default_factory=list)
    faculty: List[Faculty] = field(default_factory=list)
    batches: List[Batch] = field(default_factory=list)
    subjects: List[Subject] = field(default_factory=list)
    constraints: List[Constraint] = field(default_factory=list)
    constraint_rules: List[ConstraintRule] = field(default_factory=list)
    
    # Lookup dictionaries for fast access
    _time_slot_map: Dict[str, TimeSlot] = field(default_factory=dict, init=False, repr=False)
    _room_map: Dict[str, Room] = field(default_factory=dict, init=False, repr=False)
    _faculty_map: Dict[str, Faculty] = field(default_factory=dict, init=False, repr=False)
    _batch_map: Dict[str, Batch] = field(default_factory=dict, init=False, repr=False)
    _subject_map: Dict[str, Subject] = field(default_factory=dict, init=False, repr=False)
    
    def __post_init__(self):
        """Build lookup maps after initialization."""
        self._build_lookup_maps()
    
    def _build_lookup_maps(self):
        """Build lookup dictionaries for fast entity access."""
        self._time_slot_map = {slot.id: slot for slot in self.time_slots}
        self._room_map = {room.id: room for room in self.rooms}
        self._faculty_map = {fac.id: fac for fac in self.faculty}
        self._batch_map = {batch.id: batch for batch in self.batches}
        self._subject_map = {subj.id: subj for subj in self.subjects}
    
    def get_time_slot(self, slot_id: str) -> Optional[TimeSlot]:
        """Get time slot by ID."""
        return self._time_slot_map.get(slot_id)
    
    def get_room(self, room_id: str) -> Optional[Room]:
        """Get room by ID."""
        return self._room_map.get(room_id)
    
    def get_faculty(self, faculty_id: str) -> Optional[Faculty]:
        """Get faculty by ID."""
        return self._faculty_map.get(faculty_id)
    
    def get_batch(self, batch_id: str) -> Optional[Batch]:
        """Get batch by ID."""
        return self._batch_map.get(batch_id)
    
    def get_subject(self, subject_id: str) -> Optional[Subject]:
        """Get subject by ID."""
        return self._subject_map.get(subject_id)
    
    @property
    def batch_map(self) -> Dict[str, Batch]:
        """Get batch ID to batch mapping."""
        return self._batch_map
    
    @property
    def subject_map(self) -> Dict[str, Subject]:
        """Get subject ID to subject mapping."""
        return self._subject_map
    
    @property
    def faculty_map(self) -> Dict[str, Faculty]:
        """Get faculty ID to faculty mapping."""
        return self._faculty_map
    
    def get_constraint_weight(self, constraint_type: ConstraintType) -> float:
        """Get weight for a constraint type."""
        for constraint in self.constraints:
            if constraint.constraint_type == constraint_type:
                return constraint.weight
        return 1.0  # Default weight
    
    def get_labs(self) -> List[Room]:
        """Get all lab rooms."""
        return [room for room in self.rooms if room.room_type == "lab"]
    
    def get_lab_subjects(self) -> List[Subject]:
        """Get all lab subjects."""
        return [subject for subject in self.subjects if subject.is_lab]
    
    def get_faculty_by_department(self, department: str) -> List[Faculty]:
        """Get faculty from a specific department."""
        return [fac for fac in self.faculty if fac.department == department]
    
    def get_batches_by_semester(self, semester: int) -> List[Batch]:
        """Get batches in a specific semester."""
        return [batch for batch in self.batches if batch.semester == semester]
    
    @property
    def total_teaching_hours(self) -> int:
        """Calculate total teaching hours required."""
        return sum(subject.hours_per_week for subject in self.subjects)
    
    @property
    def available_slots_count(self) -> int:
        """Count total available time slots."""
        return len(self.time_slots)
    
    @property
    def capacity_utilization_target(self) -> float:
        """Target capacity utilization (80%)."""
        return 0.80
    
    def validate(self) -> List[str]:
        """Validate context for completeness and consistency."""
        errors = []
        
        if not self.time_slots:
            errors.append("No time slots defined")
        
        if not self.rooms:
            errors.append("No rooms available")
        
        if not self.faculty:
            errors.append("No faculty available")
        
        if not self.batches:
            errors.append("No batches defined")
        
        if not self.subjects:
            errors.append("No subjects defined")
        
        # Check if total hours can fit in available slots
        total_hours = self.total_teaching_hours
        available_capacity = len(self.rooms) * len(self.time_slots)
        
        if total_hours > available_capacity * self.capacity_utilization_target:
            errors.append(
                f"Insufficient capacity: need {total_hours} hours, "
                f"have {int(available_capacity * self.capacity_utilization_target)} slots"
            )
        
        # Check faculty qualification coverage
        for subject in self.subjects:
            qualified_faculty = [
                f for f in self.faculty
                if f.can_teach(subject)
            ]
            if not qualified_faculty:
                errors.append(f"No qualified faculty for subject: {subject.name}")
        
        return errors
