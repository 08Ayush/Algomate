"""Test configuration and fixtures."""

import pytest
from datetime import datetime, time
from typing import List

from core.models import TimeSlot, Room, Faculty, Batch, Subject, Solution, Assignment, ConstraintViolation, ConstraintType
from core.context import SchedulingContext, InstitutionConfig
from core.config import EnsembleConfig
from core.profiles import ConfigurationProfiles


@pytest.fixture
def test_config() -> EnsembleConfig:
    """Provide test configuration."""
    return ConfigurationProfiles.testing()


@pytest.fixture
def sample_time_slots() -> List[TimeSlot]:
    """Provide sample time slots."""
    slots = []
    
    # Monday to Friday, 9 AM to 5 PM
    for day in range(5):
        for hour in [9, 10, 11, 14, 15, 16]:
            slots.append(TimeSlot(
                id=f"slot_{day}_{hour}",
                day=day,
                start_hour=hour,
                start_minute=0,
                duration_minutes=60,
                is_lab_slot=False,
            ))
    
    return slots


@pytest.fixture
def sample_rooms() -> List[Room]:
    """Provide sample rooms."""
    return [
        Room(
            id="room_101",
            name="Room 101",
            capacity=60,
            room_type="classroom",
            building="Main Building",
            floor=1,
            facilities=["projector", "whiteboard"],
        ),
        Room(
            id="lab_201",
            name="Lab 201",
            capacity=30,
            room_type="lab",
            building="Tech Building",
            floor=2,
            facilities=["computers", "projector"],
        ),
        Room(
            id="room_301",
            name="Room 301",
            capacity=100,
            room_type="seminar_hall",
            building="Main Building",
            floor=3,
            facilities=["projector", "audio_system"],
        ),
    ]


@pytest.fixture
def sample_faculty() -> List[Faculty]:
    """Provide sample faculty members."""
    return [
        Faculty(
            id="fac_001",
            name="Dr. Smith",
            department="Computer Science",
            designation="Professor",
            max_hours_per_week=18,
            min_hours_per_week=12,
            qualifications=["PhD", "Data Structures", "Algorithms"],
        ),
        Faculty(
            id="fac_002",
            name="Prof. Johnson",
            department="Computer Science",
            designation="Associate Professor",
            max_hours_per_week=20,
            min_hours_per_week=15,
            qualifications=["MSc", "Database Systems", "Web Development"],
        ),
    ]


@pytest.fixture
def sample_subjects() -> List[Subject]:
    """Provide sample subjects."""
    return [
        Subject(
            id="sub_ds",
            name="Data Structures",
            code="CS201",
            credits=4,
            hours_per_week=4,
            is_lab=False,
            required_qualifications=["Data Structures"],
        ),
        Subject(
            id="sub_ds_lab",
            name="Data Structures Lab",
            code="CS201L",
            credits=2,
            hours_per_week=2,
            is_lab=True,
            required_qualifications=["Data Structures"],
        ),
        Subject(
            id="sub_web",
            name="Web Development",
            code="CS301",
            credits=3,
            hours_per_week=3,
            is_lab=False,
            required_qualifications=["Web Development"],
        ),
    ]


@pytest.fixture
def sample_batches(sample_subjects: List[Subject]) -> List[Batch]:
    """Provide sample student batches."""
    return [
        Batch(
            id="batch_cse_3a",
            name="CSE 3A",
            department="Computer Science",
            semester=3,
            strength=60,
            program="B.Tech",
            year=2,
            subjects=[s.id for s in sample_subjects],
        ),
        Batch(
            id="batch_cse_3b",
            name="CSE 3B",
            department="Computer Science",
            semester=3,
            strength=55,
            program="B.Tech",
            year=2,
            subjects=[s.id for s in sample_subjects[:2]],
        ),
    ]


@pytest.fixture
def institution_config() -> InstitutionConfig:
    """Provide institution configuration."""
    return InstitutionConfig(
        id="test_inst_001",
        name="Test Institution",
        working_days=6,
        slots_per_day=8,
        slot_duration=60,
        lunch_break_start=13,
        lunch_break_duration=60,
    )


@pytest.fixture
def scheduling_context(
    sample_time_slots: List[TimeSlot],
    sample_rooms: List[Room],
    sample_faculty: List[Faculty],
    sample_batches: List[Batch],
    sample_subjects: List[Subject],
    institution_config: InstitutionConfig,
) -> SchedulingContext:
    """Provide complete scheduling context."""
    return SchedulingContext(
        institution=institution_config,
        time_slots=sample_time_slots,
        rooms=sample_rooms,
        faculty=sample_faculty,
        batches=sample_batches,
        subjects=sample_subjects,
    )


@pytest.fixture
def sample_solution(sample_batches, sample_subjects, sample_faculty, sample_rooms, sample_time_slots):
    """Provide sample solution with assignments."""
    from core.models import Solution, Assignment, ConstraintViolation, ConstraintType
    
    assignments = []
    for i in range(5):
        assignment = Assignment(
            id=f"assignment_{i}",
            batch_id=sample_batches[0].id,
            subject_id=sample_subjects[i % len(sample_subjects)].id,
            faculty_id=sample_faculty[i % len(sample_faculty)].id,
            room_id=sample_rooms[i % len(sample_rooms)].id,
            time_slot=sample_time_slots[i],
            is_lab_session=False,
        )
        assignments.append(assignment)
    
    violations = [
        ConstraintViolation(
            constraint_type=ConstraintType.NO_OVERLAP,
            severity=0.5,
            description="Test violation",
            affected_assignments=["assignment_0", "assignment_1"],
        )
    ]
    
    return Solution(
        id="test_solution",
        assignments=assignments,
        quality_score=0.75,
        constraint_violations=violations,
        solver_name="test_solver",
    )


@pytest.fixture
def sample_solutions(sample_solution, scheduling_context):
    """Create multiple solutions with varying quality and diverse assignments."""
    import random
    solutions = []
    
    # Create 10 solutions with different quality scores and varied assignments
    for i in range(10):
        # Copy and slightly modify assignments for diversity
        assignments = []
        for j, assignment in enumerate(sample_solution.assignments[:min(len(sample_solution.assignments), 8)]):
            # Vary room and time slot for diversity
            rooms = list(scheduling_context.rooms)
            slots = list(scheduling_context.time_slots)
            
            modified_assignment = Assignment(
                id=f"a_{i}_{j}",
                batch_id=assignment.batch_id,
                subject_id=assignment.subject_id,
                faculty_id=assignment.faculty_id,
                room_id=rooms[j % len(rooms)].id if rooms else assignment.room_id,
                time_slot=slots[j % len(slots)] if slots else assignment.time_slot,
                is_lab_session=assignment.is_lab_session
            )
            assignments.append(modified_assignment)
        
        solution = Solution(
            id=f"solution_{i}",
            assignments=assignments,
            quality_score=0.5 + i * 0.05,  # 0.5 to 0.95
            constraint_violations=sample_solution.constraint_violations.copy() if i % 2 == 0 else [],
            solver_name=f"solver_{i % 3}",
        )
        solutions.append(solution)
    
    return solutions
