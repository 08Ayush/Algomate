"""Unit tests for core models."""

import pytest
from datetime import time

from core.models import (
    TimeSlot,
    Room,
    Faculty,
    Batch,
    Subject,
    Assignment,
    ConstraintType,
)


class TestTimeSlot:
    """Tests for TimeSlot model."""
    
    def test_creation(self):
        """Test time slot creation."""
        slot = TimeSlot(
            id="slot_1",
            day=0,
            start_hour=9,
            start_minute=0,
            duration_minutes=60,
        )
        
        assert slot.id == "slot_1"
        assert slot.day == 0
        assert slot.start_hour == 9
    
    def test_overlaps_with(self):
        """Test overlap detection."""
        slot1 = TimeSlot("slot_1", 0, 9, 0, 60)
        slot2 = TimeSlot("slot_2", 0, 9, 30, 60)
        slot3 = TimeSlot("slot_3", 0, 10, 0, 60)
        slot4 = TimeSlot("slot_4", 1, 9, 0, 60)
        
        assert slot1.overlaps_with(slot2)
        assert not slot1.overlaps_with(slot3)
        assert not slot1.overlaps_with(slot4)


class TestRoom:
    """Tests for Room model."""
    
    def test_creation(self):
        """Test room creation."""
        room = Room(
            id="room_1",
            name="Room 101",
            capacity=60,
            room_type="classroom",
            building="Main",
            floor=1,
        )
        
        assert room.id == "room_1"
        assert room.capacity == 60
        assert room.room_type == "classroom"
    
    def test_capacity(self):
        """Test capacity."""
        room = Room("r1", "Room 1", 50, "classroom", "Main", 1)
        
        assert room.capacity == 50


class TestFaculty:
    """Tests for Faculty model."""
    
    def test_creation(self):
        """Test faculty creation."""
        faculty = Faculty(
            id="fac_1",
            name="Dr. Smith",
            department="CS",
            designation="Professor",
            max_hours_per_week=20,
            min_hours_per_week=12,
            qualifications=["PhD"],
        )
        
        assert faculty.id == "fac_1"
        assert faculty.max_hours_per_week == 20


class TestSubject:
    """Tests for Subject model."""
    
    def test_creation(self):
        """Test subject creation."""
        subject = Subject(
            id="sub_1",
            name="Data Structures",
            code="CS201",
            credits=4,
            hours_per_week=4,
            is_lab=False,
        )
        
        assert subject.id == "sub_1"
        assert subject.credits == 4
        assert not subject.is_lab


class TestBatch:
    """Tests for Batch model."""
    
    def test_creation(self):
        """Test batch creation."""
        batch = Batch(
            id="batch_1",
            name="CSE 3A",
            program="B.Tech",
            semester=3,
            year=2,
            strength=60,
            department="CS",
            subjects=["sub_1", "sub_2"],
        )
        
        assert batch.id == "batch_1"
        assert batch.strength == 60
        assert len(batch.subjects) == 2


class TestAssignment:
    """Tests for Assignment model."""
    
    def test_creation(self, sample_time_slots):
        """Test assignment creation."""
        slot = sample_time_slots[0]
        
        assignment = Assignment(
            id="asn_1",
            batch_id="batch_1",
            subject_id="sub_1",
            faculty_id="fac_1",
            room_id="room_1",
            time_slot=slot,
        )
        
        assert assignment.id == "asn_1"
        assert assignment.batch_id == "batch_1"
        assert assignment.time_slot == slot
