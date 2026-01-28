"""
Unit tests for fitness calculator module.

Tests the FitnessBreakdown and FitnessCalculator classes that evaluate
timetable quality based on soft constraints.
"""

import pytest
from typing import Dict, List, Any

# Import module under test
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from services.scheduler.chromosome_encoder import Gene, Chromosome
from services.scheduler.fitness_calculator import (
    FitnessBreakdown,
    FitnessCalculator,
)
from services.scheduler.config import ConstraintWeights, DEFAULT_WEIGHTS


class TestFitnessBreakdown:
    """Tests for the FitnessBreakdown dataclass."""
    
    def test_breakdown_creation(self):
        """Test creating a FitnessBreakdown with scores."""
        breakdown = FitnessBreakdown(
            total_fitness=0.85,
            gap_penalty=0.1,
            time_preference_score=0.9,
            workload_balance_score=0.88,
            room_stability_score=0.75,
            consecutive_penalty=0.05,
            clustering_score=0.92,
            elective_distribution_score=0.80,
            hard_constraint_violations=0,
        )
        
        assert breakdown.total_fitness == 0.85
        assert breakdown.gap_penalty == 0.1
        assert breakdown.time_preference_score == 0.9
        assert breakdown.workload_balance_score == 0.88
        assert breakdown.room_stability_score == 0.75
        assert breakdown.consecutive_penalty == 0.05
        assert breakdown.clustering_score == 0.92
        assert breakdown.elective_distribution_score == 0.80
        assert breakdown.hard_constraint_violations == 0
    
    def test_breakdown_to_dict(self):
        """Test serializing breakdown to dictionary."""
        breakdown = FitnessBreakdown(
            total_fitness=0.85,
            gap_penalty=0.1,
            time_preference_score=0.9,
            workload_balance_score=0.88,
            room_stability_score=0.75,
            consecutive_penalty=0.05,
            clustering_score=0.92,
            elective_distribution_score=0.80,
            hard_constraint_violations=0,
        )
        
        d = breakdown.to_dict()
        
        assert d["total_fitness"] == 0.85
        assert d["gap_penalty"] == 0.1
        assert d["time_preference_score"] == 0.9
        assert d["hard_constraint_violations"] == 0
    
    def test_breakdown_with_violations(self):
        """Test breakdown with hard constraint violations."""
        breakdown = FitnessBreakdown(
            total_fitness=0.0,
            gap_penalty=0.5,
            time_preference_score=0.5,
            workload_balance_score=0.5,
            room_stability_score=0.5,
            consecutive_penalty=0.5,
            clustering_score=0.5,
            elective_distribution_score=0.5,
            hard_constraint_violations=3,
        )
        
        assert breakdown.hard_constraint_violations == 3
        assert breakdown.total_fitness == 0.0  # Should be 0 when violations exist


class TestConstraintWeights:
    """Tests for the ConstraintWeights dataclass."""
    
    def test_default_weights(self):
        """Test default constraint weights."""
        weights = ConstraintWeights()
        
        assert weights.minimize_gaps == 50
        assert weights.preferred_time_slots == 30
        assert weights.workload_balance == 40
        assert weights.room_stability == 20
        assert weights.consecutive_lectures == 35
        assert weights.department_clustering == 25
        assert weights.elective_distribution == 30
    
    def test_custom_weights(self):
        """Test custom constraint weights."""
        weights = ConstraintWeights(
            minimize_gaps=100,
            preferred_time_slots=50,
            workload_balance=60,
        )
        
        assert weights.minimize_gaps == 100
        assert weights.preferred_time_slots == 50
        assert weights.workload_balance == 60
    
    def test_weights_to_dict(self):
        """Test converting weights to dictionary."""
        weights = ConstraintWeights()
        d = weights.to_dict()
        
        assert "minimize_gaps" in d
        assert "preferred_time_slots" in d
        assert d["minimize_gaps"] == 50


class TestFitnessCalculator:
    """Tests for the FitnessCalculator class."""
    
    @pytest.fixture
    def sample_time_slots(self) -> List[Dict[str, Any]]:
        """Create sample time slots."""
        return [
            {"id": "slot-001", "day_of_week": "monday", "start_time": "09:00", "end_time": "10:00"},
            {"id": "slot-002", "day_of_week": "monday", "start_time": "10:00", "end_time": "11:00"},
            {"id": "slot-003", "day_of_week": "monday", "start_time": "11:00", "end_time": "12:00"},
            {"id": "slot-004", "day_of_week": "monday", "start_time": "14:00", "end_time": "15:00"},
            {"id": "slot-005", "day_of_week": "tuesday", "start_time": "09:00", "end_time": "10:00"},
            {"id": "slot-006", "day_of_week": "tuesday", "start_time": "10:00", "end_time": "11:00"},
        ]
    
    @pytest.fixture
    def calculator(self, sample_time_slots) -> FitnessCalculator:
        """Create a FitnessCalculator instance."""
        return FitnessCalculator(time_slots=sample_time_slots)
    
    @pytest.fixture
    def sample_chromosome(self) -> Chromosome:
        """Create a sample chromosome for testing."""
        genes = [
            Gene(
                subject_id="subj-001",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-001",
                batch_id="batch-001",
            ),
            Gene(
                subject_id="subj-002",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-002",
                batch_id="batch-001",
            ),
            Gene(
                subject_id="subj-003",
                faculty_id="tchr-002",
                classroom_id="room-002",
                time_slot_id="slot-003",
                batch_id="batch-001",
            ),
            Gene(
                subject_id="subj-001",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-004",
                batch_id="batch-001",
            ),
            Gene(
                subject_id="subj-002",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-005",
                batch_id="batch-001",
            ),
        ]
        return Chromosome(genes=genes)
    
    def test_calculator_initialization(self, calculator):
        """Test calculator initializes correctly."""
        assert calculator is not None
        assert calculator.weights is not None
        assert len(calculator.time_slots) == 6
    
    def test_calculator_with_custom_weights(self, sample_time_slots):
        """Test calculator with custom weights."""
        custom_weights = ConstraintWeights(
            minimize_gaps=100,
            preferred_time_slots=80,
        )
        
        calculator = FitnessCalculator(
            time_slots=sample_time_slots,
            weights=custom_weights,
        )
        
        assert calculator.weights.minimize_gaps == 100
        assert calculator.weights.preferred_time_slots == 80
    
    def test_calculate_fitness(self, calculator, sample_chromosome):
        """Test calculating overall fitness."""
        fitness = calculator.calculate(sample_chromosome)
        
        assert isinstance(fitness, float)
        # Fitness should be set on the chromosome
        assert sample_chromosome.fitness == fitness
    
    def test_calculate_detailed(self, calculator, sample_chromosome):
        """Test calculating detailed fitness breakdown."""
        breakdown = calculator.calculate_detailed(sample_chromosome)
        
        assert isinstance(breakdown, FitnessBreakdown)
        assert hasattr(breakdown, 'total_fitness')
        assert hasattr(breakdown, 'gap_penalty')
        assert hasattr(breakdown, 'time_preference_score')
    
    def test_empty_chromosome_fitness(self, calculator):
        """Test fitness calculation for empty chromosome."""
        empty_chromosome = Chromosome(genes=[])
        
        breakdown = calculator.calculate_detailed(empty_chromosome)
        
        # Should handle gracefully
        assert isinstance(breakdown.total_fitness, float)
        assert breakdown.total_fitness == 0.0
    
    def test_single_gene_chromosome(self, calculator):
        """Test fitness for single-gene chromosome."""
        genes = [
            Gene(
                subject_id="subj-001",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-001",
                batch_id="batch-001",
            )
        ]
        chromosome = Chromosome(genes=genes)
        
        fitness = calculator.calculate(chromosome)
        
        assert isinstance(fitness, float)


class TestFitnessCalculatorSlotOrder:
    """Tests for time slot ordering in FitnessCalculator."""
    
    def test_slot_ordering_by_day(self):
        """Test that slots are ordered by day."""
        time_slots = [
            {"id": "slot-tue", "day_of_week": "tuesday", "start_time": "09:00", "end_time": "10:00"},
            {"id": "slot-mon", "day_of_week": "monday", "start_time": "09:00", "end_time": "10:00"},
            {"id": "slot-wed", "day_of_week": "wednesday", "start_time": "09:00", "end_time": "10:00"},
        ]
        
        calculator = FitnessCalculator(time_slots=time_slots)
        
        # Monday should come before Tuesday
        assert calculator._slot_order["slot-mon"] < calculator._slot_order["slot-tue"]
        assert calculator._slot_order["slot-tue"] < calculator._slot_order["slot-wed"]
    
    def test_slot_ordering_by_time(self):
        """Test that slots are ordered by time within same day."""
        time_slots = [
            {"id": "slot-11", "day_of_week": "monday", "start_time": "11:00", "end_time": "12:00"},
            {"id": "slot-09", "day_of_week": "monday", "start_time": "09:00", "end_time": "10:00"},
            {"id": "slot-10", "day_of_week": "monday", "start_time": "10:00", "end_time": "11:00"},
        ]
        
        calculator = FitnessCalculator(time_slots=time_slots)
        
        assert calculator._slot_order["slot-09"] < calculator._slot_order["slot-10"]
        assert calculator._slot_order["slot-10"] < calculator._slot_order["slot-11"]


class TestFitnessCalculatorPreferredSlots:
    """Tests for preferred time slot detection."""
    
    def test_morning_slots_detected(self):
        """Test that morning slots are detected correctly."""
        time_slots = [
            {"id": "slot-morning", "day_of_week": "monday", "start_time": "09:00", "end_time": "10:00"},
            {"id": "slot-noon", "day_of_week": "monday", "start_time": "12:00", "end_time": "13:00"},
            {"id": "slot-afternoon", "day_of_week": "monday", "start_time": "14:00", "end_time": "15:00"},
        ]
        
        calculator = FitnessCalculator(time_slots=time_slots)
        
        assert "slot-morning" in calculator._preferred_morning
        assert "slot-noon" not in calculator._preferred_morning
        assert "slot-afternoon" in calculator._preferred_afternoon


class TestFitnessCalculatorEdgeCases:
    """Edge case tests for FitnessCalculator."""
    
    def test_calculator_with_invalid_time_format(self):
        """Test calculator handles invalid time format gracefully."""
        time_slots = [
            {"id": "slot-001", "day_of_week": "monday", "start_time": "invalid", "end_time": "10:00"},
        ]
        
        # Should not raise an error
        calculator = FitnessCalculator(time_slots=time_slots)
        assert calculator is not None
    
    def test_calculator_with_missing_time(self):
        """Test calculator handles missing time gracefully."""
        time_slots = [
            {"id": "slot-001", "day_of_week": "monday"},  # Missing start_time
        ]
        
        # Should not raise an error, uses default
        calculator = FitnessCalculator(time_slots=time_slots)
        assert calculator is not None
    
    def test_large_chromosome_fitness(self):
        """Test fitness calculation for large chromosome."""
        time_slots = [
            {"id": f"slot-{i:03d}", "day_of_week": "monday", "start_time": f"{9 + (i % 8):02d}:00", "end_time": f"{10 + (i % 8):02d}:00"}
            for i in range(50)
        ]
        
        calculator = FitnessCalculator(time_slots=time_slots)
        
        genes = [
            Gene(
                subject_id=f"subj-{i % 10:03d}",
                faculty_id=f"tchr-{i % 5:03d}",
                classroom_id=f"room-{i % 8:03d}",
                time_slot_id=f"slot-{i:03d}",
                batch_id=f"batch-{i % 3:03d}",
            )
            for i in range(50)
        ]
        chromosome = Chromosome(genes=genes)
        
        fitness = calculator.calculate(chromosome)
        
        assert isinstance(fitness, float)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
