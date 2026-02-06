"""Unit tests for validation utilities."""

import pytest

from utils.validation import Validator, ValidationError
from core.models import TimeSlot, Room, Faculty, Batch, Subject


class TestValidator:
    """Tests for Validator class."""
    
    def test_validate_time_slot_valid(self):
        """Test valid time slot validation."""
        validator = Validator()
        
        slot = TimeSlot("slot_1", 0, 9, 0, 60, False)
        
        assert validator.validate_time_slot(slot)
        assert len(validator.errors) == 0
    
    def test_validate_time_slot_invalid_day(self):
        """Test invalid day in time slot."""
        validator = Validator()
        
        slot = TimeSlot("slot_1", 10, 9, 0, 60, False)
        
        assert not validator.validate_time_slot(slot)
        assert len(validator.errors) > 0
    
    def test_validate_room_valid(self):
        """Test valid room validation."""
        validator = Validator()
        
        room = Room("r1", "Room 1", 60, "classroom", "Main", 1, [])
        
        assert validator.validate_room(room)
        assert len(validator.errors) == 0
    
    def test_validate_room_invalid_capacity(self):
        """Test invalid capacity in room."""
        validator = Validator()
        
        room = Room("r1", "Room 1", -10, "classroom", "Main", 1, [])
        
        assert not validator.validate_room(room)
        assert len(validator.errors) > 0
    
    def test_validate_faculty_valid(self):
        """Test valid faculty validation."""
        validator = Validator()
        
        faculty = Faculty("f1", "Dr. Smith", "CS", "Professor", 20, 12, [], [], ["PhD"])
        
        assert validator.validate_faculty(faculty)
        assert len(validator.errors) == 0
    
    def test_validate_faculty_invalid_hours(self):
        """Test invalid hours in faculty."""
        validator = Validator()
        
        # min > max (max=10, min=20)
        faculty = Faculty("f1", "Dr. Smith", "CS", "Professor", 10, 20, [], [], ["PhD"])
        
        assert not validator.validate_faculty(faculty)
        assert len(validator.errors) > 0
    
    def test_validate_all(
        self,
        sample_time_slots,
        sample_rooms,
        sample_faculty,
        sample_batches,
        sample_subjects
    ):
        """Test comprehensive validation."""
        validator = Validator()
        
        report = validator.validate_all(
            sample_time_slots,
            sample_rooms,
            sample_faculty,
            sample_batches,
            sample_subjects
        )
        
        assert report['valid']
        assert report['error_count'] == 0
        assert 'entity_counts' in report
