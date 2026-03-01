"""Tests for ML feature extraction."""

import pytest
import numpy as np

from ml.features import FeatureExtractor, FeatureVector
from core.models import Solution, Assignment, TimeSlot, ConstraintViolation, ConstraintType


class TestFeatureExtractor:
    """Test feature extraction."""
    
    def test_initialization(self, scheduling_context):
        """Test extractor initialization."""
        extractor = FeatureExtractor(scheduling_context)
        
        assert extractor.context == scheduling_context
        assert len(extractor.feature_names) == 89
        assert 'total_assignments' in extractor.feature_names
        assert 'quality_score' in extractor.feature_names
    
    def test_extract_basic_features(self, scheduling_context, sample_solution):
        """Test basic feature extraction."""
        extractor = FeatureExtractor(scheduling_context)
        features = extractor.extract(sample_solution)
        
        assert isinstance(features, FeatureVector)
        assert len(features.features) == 89
        assert features.feature_names == extractor.feature_names
        assert features.metadata['solution_id'] == sample_solution.id
        assert features.metadata['solver_name'] == sample_solution.solver_name
    
    def test_extract_from_empty_solution(self, scheduling_context):
        """Test extraction from empty solution."""
        empty_solution = Solution(
            id="empty",
            assignments=[],
            quality_score=0.0,
            constraint_violations=[],
            solver_name="test",
        )
        
        extractor = FeatureExtractor(scheduling_context)
        features = extractor.extract(empty_solution)
        
        assert len(features.features) == 89
        assert features.features[0] == 0  # total_assignments
    
    def test_feature_vector_to_dict(self, scheduling_context, sample_solution):
        """Test feature vector conversion to dict."""
        extractor = FeatureExtractor(scheduling_context)
        features = extractor.extract(sample_solution)
        
        feature_dict = features.to_dict()
        
        assert isinstance(feature_dict, dict)
        assert len(feature_dict) == 89
        assert 'total_assignments' in feature_dict
        assert 'quality_score' in feature_dict
        assert feature_dict['quality_score'] == sample_solution.quality_score
    
    def test_constraint_features(self, scheduling_context):
        """Test constraint violation features."""
        solution = Solution(
            id="test",
            assignments=[],
            quality_score=0.5,
            constraint_violations=[
                ConstraintViolation(
                    constraint_type=ConstraintType.NO_OVERLAP,
                    description="Overlap",
                    severity=0.9,
                    affected_assignments=[]
                ),
                ConstraintViolation(
                    constraint_type=ConstraintType.ROOM_CAPACITY,
                    description="Capacity",
                    severity=0.6,
                    affected_assignments=[]
                ),
                ConstraintViolation(
                    constraint_type=ConstraintType.NO_OVERLAP,
                    description="Another overlap",
                    severity=0.5,
                    affected_assignments=[]
                ),
            ],
            solver_name="test",
        )
        
        extractor = FeatureExtractor(scheduling_context)
        features = extractor.extract(solution)
        feature_dict = features.to_dict()
        
        # Check violation counts
        assert feature_dict['no_overlap_violations'] == 2
        assert feature_dict['room_capacity_violations'] == 1
        assert feature_dict['critical_violations'] == 1  # severity > 0.8
        assert feature_dict['major_violations'] == 1  # 0.5 < severity <= 0.8
        assert feature_dict['minor_violations'] == 1  # severity <= 0.5
    
    def test_temporal_features(self, scheduling_context, sample_batches, sample_faculty, sample_subjects, sample_rooms):
        """Test temporal distribution features."""
        # Create solution with varied temporal distribution
        assignments = []
        for day in range(5):
            for hour in [9, 10, 14, 15]:
                assignment = Assignment(
                    id=f"assignment_{day}_{hour}",
                    batch_id=sample_batches[0].id,
                    subject_id=sample_subjects[0].id,
                    faculty_id=sample_faculty[0].id,
                    room_id=sample_rooms[0].id,
                    time_slot=TimeSlot(id=f"ts_{day}_{hour}", day=day, start_hour=hour, start_minute=0, duration_minutes=60),
                    is_lab_session=False,
                )
                assignments.append(assignment)
        
        solution = Solution(
            id="temporal_test",
            assignments=assignments,
            quality_score=0.8,
            constraint_violations=[],
            solver_name="test",
        )
        
        extractor = FeatureExtractor(scheduling_context)
        features = extractor.extract(solution)
        feature_dict = features.to_dict()
        
        # Check temporal features
        assert feature_dict['days_used'] == 5
        assert feature_dict['morning_slots'] > 0
        assert feature_dict['afternoon_slots'] > 0
    
    def test_faculty_features(self, scheduling_context, sample_batches, sample_faculty, sample_subjects, sample_rooms):
        """Test faculty load features."""
        # Create unbalanced faculty load
        assignments = []
        
        # Faculty 1: high load (10 assignments)
        for i in range(10):
            assignment = Assignment(
                id=f"faculty_assign_{i}",
                batch_id=sample_batches[0].id,
                subject_id=sample_subjects[0].id,
                faculty_id=sample_faculty[0].id,
                room_id=sample_rooms[0].id,
                time_slot=TimeSlot(id=f"ts_fac_{i}", day=i % 5, start_hour=9, start_minute=i*10, duration_minutes=60),
                is_lab_session=False,
            )
            assignments.append(assignment)
        
        # Faculty 2: low load (2 assignments)
        for i in range(2):
            assignment = Assignment(
                id=f"faculty2_assign_{i}",
                batch_id=sample_batches[0].id,
                subject_id=sample_subjects[1].id,
                faculty_id=sample_faculty[1].id,
                room_id=sample_rooms[0].id,
                time_slot=TimeSlot(id=f"ts_fac2_{i}", day=i, start_hour=11, start_minute=i*10, duration_minutes=60),
                is_lab_session=False,
            )
            assignments.append(assignment)
        
        solution = Solution(
            id="faculty_test",
            assignments=assignments,
            quality_score=0.7,
            constraint_violations=[],
            solver_name="test",
        )
        
        extractor = FeatureExtractor(scheduling_context)
        features = extractor.extract(solution)
        feature_dict = features.to_dict()
        
        # Check faculty features
        assert feature_dict['faculty_used'] == 2
        assert feature_dict['max_faculty_load'] == 10
        assert feature_dict['min_faculty_load'] == 2
        assert feature_dict['std_faculty_load'] > 0


class TestFeatureVector:
    """Test FeatureVector class."""
    
    def test_creation(self):
        """Test feature vector creation."""
        features = np.array([1.0, 2.0, 3.0])
        names = ['feat1', 'feat2', 'feat3']
        metadata = {'test': 'value'}
        
        vec = FeatureVector(features=features, feature_names=names, metadata=metadata)
        
        assert len(vec.features) == 3
        assert vec.feature_names == names
        assert vec.metadata['test'] == 'value'
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        features = np.array([1.0, 2.0, 3.0])
        names = ['feat1', 'feat2', 'feat3']
        
        vec = FeatureVector(features=features, feature_names=names, metadata={})
        result = vec.to_dict()
        
        assert result == {'feat1': 1.0, 'feat2': 2.0, 'feat3': 3.0}
