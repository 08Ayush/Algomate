"""Validation utilities for data integrity."""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import logging

from core.models import (
    TimeSlot,
    Room,
    Faculty,
    Batch,
    Subject,
    Assignment,
    Solution,
)


class ValidationError(Exception):
    """Custom validation error."""
    pass


class Validator:
    """Validates scheduling data and constraints."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def reset(self):
        """Reset errors and warnings."""
        self.errors.clear()
        self.warnings.clear()
    
    def add_error(self, message: str):
        """Add validation error."""
        self.errors.append(message)
        self.logger.error(f"Validation error: {message}")
    
    def add_warning(self, message: str):
        """Add validation warning."""
        self.warnings.append(message)
        self.logger.warning(f"Validation warning: {message}")
    
    def validate_time_slot(self, slot: TimeSlot) -> bool:
        """Validate time slot."""
        valid = True
        
        if slot.day < 0 or slot.day > 6:
            self.add_error(f"Invalid day {slot.day} for slot {slot.id}")
            valid = False
        
        if slot.start_hour < 0 or slot.start_hour > 23:
            self.add_error(f"Invalid start_hour {slot.start_hour} for slot {slot.id}")
            valid = False
        
        if slot.start_minute < 0 or slot.start_minute > 59:
            self.add_error(f"Invalid start_minute {slot.start_minute} for slot {slot.id}")
            valid = False
        
        if slot.duration_minutes <= 0:
            self.add_error(f"Invalid duration {slot.duration_minutes} for slot {slot.id}")
            valid = False
        
        if slot.duration_minutes > 240:
            self.add_warning(f"Unusually long duration {slot.duration_minutes}min for slot {slot.id}")
        
        return valid
    
    def validate_room(self, room: Room) -> bool:
        """Validate room."""
        valid = True
        
        if room.capacity <= 0:
            self.add_error(f"Invalid capacity {room.capacity} for room {room.id}")
            valid = False
        
        if room.capacity > 500:
            self.add_warning(f"Very large capacity {room.capacity} for room {room.id}")
        
        if room.room_type not in ["classroom", "lab", "seminar_hall", "auditorium"]:
            self.add_warning(f"Unknown room_type '{room.room_type}' for room {room.id}")
        
        return valid
    
    def validate_faculty(self, faculty: Faculty) -> bool:
        """Validate faculty member."""
        valid = True
        
        if faculty.max_hours_per_week <= 0:
            self.add_error(f"Invalid max_hours {faculty.max_hours_per_week} for faculty {faculty.id}")
            valid = False
        
        if faculty.min_hours_per_week < 0:
            self.add_error(f"Invalid min_hours {faculty.min_hours_per_week} for faculty {faculty.id}")
            valid = False
        
        if faculty.min_hours_per_week > faculty.max_hours_per_week:
            self.add_error(
                f"min_hours ({faculty.min_hours_per_week}) > max_hours ({faculty.max_hours_per_week}) "
                f"for faculty {faculty.id}"
            )
            valid = False
        
        if faculty.max_hours_per_week > 30:
            self.add_warning(f"High max_hours {faculty.max_hours_per_week} for faculty {faculty.id}")
        
        if not faculty.qualifications:
            self.add_warning(f"No qualifications specified for faculty {faculty.id}")
        
        return valid
    
    def validate_batch(self, batch: Batch) -> bool:
        """Validate student batch."""
        valid = True
        
        if batch.strength <= 0:
            self.add_error(f"Invalid strength {batch.strength} for batch {batch.id}")
            valid = False
        
        if batch.strength > 200:
            self.add_warning(f"Very large batch {batch.strength} students in {batch.id}")
        
        if batch.semester < 1 or batch.semester > 8:
            self.add_error(f"Invalid semester {batch.semester} for batch {batch.id}")
            valid = False
        
        if not batch.subjects:
            self.add_warning(f"No subjects assigned to batch {batch.id}")
        
        return valid
    
    def validate_subject(self, subject: Subject) -> bool:
        """Validate subject."""
        valid = True
        
        if subject.credits <= 0:
            self.add_error(f"Invalid credits {subject.credits} for subject {subject.id}")
            valid = False
        
        if subject.hours_per_week <= 0:
            self.add_error(f"Invalid hours_per_week {subject.hours_per_week} for subject {subject.id}")
            valid = False
        
        if subject.hours_per_week > 10:
            self.add_warning(f"High hours_per_week {subject.hours_per_week} for subject {subject.id}")
        
        if subject.is_lab and subject.hours_per_week < 2:
            self.add_warning(f"Lab subject {subject.id} has only {subject.hours_per_week} hours")
        
        return valid
    
    def validate_assignment(self, assignment: Assignment) -> bool:
        """Validate assignment."""
        valid = True
        
        if not assignment.batch_id:
            self.add_error(f"Missing batch_id in assignment {assignment.id}")
            valid = False
        
        if not assignment.subject_id:
            self.add_error(f"Missing subject_id in assignment {assignment.id}")
            valid = False
        
        if not assignment.faculty_id:
            self.add_error(f"Missing faculty_id in assignment {assignment.id}")
            valid = False
        
        if not assignment.room_id:
            self.add_error(f"Missing room_id in assignment {assignment.id}")
            valid = False
        
        if not assignment.time_slot:
            self.add_error(f"Missing time_slot in assignment {assignment.id}")
            valid = False
        
        return valid
    
    def validate_solution(self, solution: Solution) -> Tuple[bool, Dict[str, Any]]:
        """Validate complete solution.
        
        Returns:
            Tuple of (is_valid, validation_report)
        """
        self.reset()
        
        if not solution.assignments:
            self.add_error("Solution has no assignments")
            return False, self._create_report()
        
        # Check for duplicates
        assignment_keys = set()
        for assignment in solution.assignments:
            key = (assignment.batch_id, assignment.time_slot.id)
            if key in assignment_keys:
                self.add_error(
                    f"Duplicate assignment: batch {assignment.batch_id} "
                    f"at time {assignment.time_slot.id}"
                )
            assignment_keys.add(key)
        
        # Validate each assignment
        for assignment in solution.assignments:
            self.validate_assignment(assignment)
        
        # Check hard constraint violations
        hard_violations = [
            v for v in solution.constraint_violations
            if v.constraint_type.name in [
                'NO_OVERLAP', 'ROOM_CAPACITY',
                'FACULTY_AVAILABILITY', 'LAB_REQUIREMENTS'
            ]
        ]
        
        if hard_violations:
            self.add_error(f"Solution has {len(hard_violations)} hard constraint violations")
        
        is_valid = len(self.errors) == 0
        return is_valid, self._create_report()
    
    def _create_report(self) -> Dict[str, Any]:
        """Create validation report."""
        return {
            'valid': len(self.errors) == 0,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'errors': self.errors.copy(),
            'warnings': self.warnings.copy(),
            'timestamp': datetime.now().isoformat()
        }
    
    def validate_all(
        self,
        time_slots: List[TimeSlot],
        rooms: List[Room],
        faculty: List[Faculty],
        batches: List[Batch],
        subjects: List[Subject]
    ) -> Dict[str, Any]:
        """Validate all entities.
        
        Returns:
            Comprehensive validation report
        """
        self.reset()
        
        self.logger.info("Starting comprehensive validation...")
        
        # Validate time slots
        for slot in time_slots:
            self.validate_time_slot(slot)
        
        # Validate rooms
        for room in rooms:
            self.validate_room(room)
        
        # Validate faculty
        for fac in faculty:
            self.validate_faculty(fac)
        
        # Validate batches
        for batch in batches:
            self.validate_batch(batch)
        
        # Validate subjects
        for subject in subjects:
            self.validate_subject(subject)
        
        report = self._create_report()
        report.update({
            'entity_counts': {
                'time_slots': len(time_slots),
                'rooms': len(rooms),
                'faculty': len(faculty),
                'batches': len(batches),
                'subjects': len(subjects)
            }
        })
        
        if report['valid']:
            self.logger.info("✅ All validations passed")
        else:
            self.logger.warning(
                f"⚠️ Validation completed with {report['error_count']} errors, "
                f"{report['warning_count']} warnings"
            )
        
        return report
