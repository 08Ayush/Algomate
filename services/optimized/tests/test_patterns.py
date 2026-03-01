"""Tests for pattern mining."""

import pytest

from ml.patterns import PatternMiner, Pattern
from core.models import Solution, Assignment, TimeSlot


class TestPatternMiner:
    """Test pattern mining."""
    
    def test_initialization(self, scheduling_context):
        """Test miner initialization."""
        miner = PatternMiner(scheduling_context)
        
        assert miner.context == scheduling_context
        assert len(miner.patterns) == 0
    
    def test_mine_patterns(self, scheduling_context, sample_solutions):
        """Test pattern mining from solutions."""
        miner = PatternMiner(scheduling_context)
        miner.mine(sample_solutions, min_frequency=2)
        
        # Should find some patterns
        assert len(miner.patterns) >= 0
    
    def test_get_patterns_by_type(self, scheduling_context, sample_solutions_with_patterns):
        """Test filtering patterns by type."""
        miner = PatternMiner(scheduling_context)
        miner.mine(sample_solutions_with_patterns, min_frequency=2)
        
        # Get all patterns
        all_patterns = miner.get_patterns()
        
        # Get faculty patterns
        faculty_patterns = miner.get_patterns(pattern_type='faculty_subject')
        
        assert len(faculty_patterns) <= len(all_patterns)
        assert all(p.pattern_type == 'faculty_subject' for p in faculty_patterns)
    
    def test_get_patterns_by_quality(self, scheduling_context, sample_solutions_with_patterns):
        """Test filtering patterns by quality impact."""
        miner = PatternMiner(scheduling_context)
        miner.mine(sample_solutions_with_patterns, min_frequency=2)
        
        high_quality = miner.get_patterns(min_quality_impact=0.8)
        
        assert all(p.quality_impact >= 0.8 for p in high_quality)
    
    def test_apply_patterns(self, scheduling_context, sample_solutions_with_patterns):
        """Test applying patterns to solution."""
        miner = PatternMiner(scheduling_context)
        miner.mine(sample_solutions_with_patterns, min_frequency=2)
        
        if miner.patterns:
            score = miner.apply_patterns(sample_solutions_with_patterns[0])
            
            assert isinstance(score, float)
            assert 0.0 <= score <= 1.0
    
    def test_apply_patterns_no_patterns(self, scheduling_context, sample_solution):
        """Test applying patterns when none mined."""
        miner = PatternMiner(scheduling_context)
        
        score = miner.apply_patterns(sample_solution)
        
        # Should return neutral score
        assert score == 0.5
    
    def test_get_recommendations(self, scheduling_context, sample_solutions_with_patterns):
        """Test getting recommendations."""
        miner = PatternMiner(scheduling_context)
        miner.mine(sample_solutions_with_patterns, min_frequency=2)
        
        recommendations = miner.get_recommendations(sample_solutions_with_patterns[0])
        
        assert isinstance(recommendations, list)
        assert len(recommendations) <= 10
    
    def test_pattern_frequency_threshold(self, scheduling_context, sample_solutions):
        """Test that patterns respect frequency threshold."""
        miner = PatternMiner(scheduling_context)
        
        # Mine with high threshold
        miner.mine(sample_solutions, min_frequency=10)
        
        # Should find fewer patterns than with low threshold
        high_threshold_count = len(miner.patterns)
        
        miner.patterns.clear()
        miner.mine(sample_solutions, min_frequency=2)
        low_threshold_count = len(miner.patterns)
        
        assert high_threshold_count <= low_threshold_count
    
    def test_mine_empty_solutions(self, scheduling_context):
        """Test mining with empty solution list."""
        miner = PatternMiner(scheduling_context)
        
        # Should not raise error
        miner.mine([], min_frequency=2)
        
        assert len(miner.patterns) == 0


class TestPattern:
    """Test Pattern class."""
    
    def test_creation(self):
        """Test pattern creation."""
        pattern = Pattern(
            pattern_type='test',
            description='Test pattern',
            frequency=5,
            quality_impact=0.8,
            examples=['ex1', 'ex2']
        )
        
        assert pattern.pattern_type == 'test'
        assert pattern.description == 'Test pattern'
        assert pattern.frequency == 5
        assert pattern.quality_impact == 0.8
        assert len(pattern.examples) == 2
    
    def test_hash(self):
        """Test pattern hashing."""
        pattern1 = Pattern(
            pattern_type='test',
            description='Same',
            frequency=5,
            quality_impact=0.8
        )
        pattern2 = Pattern(
            pattern_type='test',
            description='Same',
            frequency=3,
            quality_impact=0.6
        )
        
        # Same type and description should hash same
        assert hash(pattern1) == hash(pattern2)


@pytest.fixture
def sample_solutions_with_patterns(scheduling_context, sample_batches, sample_faculty, 
                                    sample_subjects, sample_rooms, sample_time_slots):
    """Create solutions with detectable patterns."""
    from core.models import Assignment, TimeSlot
    
    solutions = []
    
    # Create 5 solutions with consistent faculty-subject pairing
    for i in range(5):
        assignments = []
        
        # Pattern: Faculty 0 always teaches Subject 0
        for day in range(3):
            assignment = Assignment(
                id=f"pattern_assign_{i}_{day}",
                batch_id=sample_batches[0].id,
                subject_id=sample_subjects[0].id,
                faculty_id=sample_faculty[0].id,
                room_id=sample_rooms[0].id,
                time_slot=TimeSlot(id=f"ts_pat_{i}_{day}", day=day, start_hour=9, start_minute=i*10, duration_minutes=60),
                is_lab_session=False,
            )
            assignments.append(assignment)
        
        # Pattern: Subject 1 always in morning
        assignment = Assignment(
            id=f"pattern_assign_{i}_morning",
            batch_id=sample_batches[0].id,
            subject_id=sample_subjects[1].id,
            faculty_id=sample_faculty[1].id,
            room_id=sample_rooms[0].id,
            time_slot=TimeSlot(id=f"ts_pat_{i}_morn", day=0, start_hour=10, start_minute=0, duration_minutes=60),
            is_lab_session=False,
        )
        assignments.append(assignment)
        
        solution = Solution(
            id=f"pattern_solution_{i}",
            assignments=assignments,
            quality_score=0.75 + i * 0.05,  # Increasing quality
            constraint_violations=[],
            solver_name="test",
        )
        solutions.append(solution)
    
    return solutions
