"""
Integration tests for the hybrid scheduler pipeline.

Tests the complete flow from CP-SAT solutions through GA optimization.
"""

import pytest
import sys
from pathlib import Path
from typing import List, Dict, Any
from unittest.mock import Mock, patch, MagicMock

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from services.scheduler.chromosome_encoder import Gene, Chromosome, ChromosomeEncoder
from services.scheduler.fitness_calculator import FitnessCalculator, FitnessBreakdown
from services.scheduler.genetic_optimizer import GeneticOptimizer, EvolutionStats
from services.scheduler.config import GAConfig, CPSATConfig, HybridConfig, ConstraintWeights


class TestConfigurationIntegration:
    """Tests for configuration classes integration."""
    
    def test_cpsat_config_defaults(self):
        """Test CP-SAT config has reasonable defaults."""
        config = CPSATConfig()
        
        assert config.max_time_seconds > 0
        assert config.num_workers > 0
        assert config.num_solutions > 0
    
    def test_ga_config_defaults(self):
        """Test GA config has reasonable defaults."""
        config = GAConfig()
        
        assert config.population_size > 0
        assert config.generations > 0
        assert 0.0 < config.mutation_rate < 1.0
        assert 0.0 < config.crossover_rate <= 1.0
        assert config.elite_size >= 0
    
    def test_hybrid_config_combines_both(self):
        """Test hybrid config contains both CP-SAT and GA settings."""
        config = HybridConfig()
        
        assert config.cpsat is not None
        assert config.ga is not None
        assert isinstance(config.cpsat, CPSATConfig)
        assert isinstance(config.ga, GAConfig)
    
    def test_config_customization(self):
        """Test configs can be customized."""
        cpsat = CPSATConfig(max_time_seconds=600)
        ga = GAConfig(generations=500)
        
        hybrid = HybridConfig(cpsat=cpsat, ga=ga)
        
        assert hybrid.cpsat.max_time_seconds == 600
        assert hybrid.ga.generations == 500
    
    def test_constraint_weights_defaults(self):
        """Test constraint weights have defaults."""
        weights = ConstraintWeights()
        
        assert weights.minimize_gaps > 0
        assert weights.preferred_time_slots > 0
        assert weights.workload_balance > 0


class TestEncoderFitnessIntegration:
    """Tests for encoder and fitness calculator working together."""
    
    @pytest.fixture
    def sample_domain_data(self) -> Dict[str, List[Dict]]:
        """Create sample domain data."""
        return {
            "subjects": [
                {"id": f"subj-{i:03d}", "name": f"Subject {i}", "credits": 3}
                for i in range(5)
            ],
            "faculty": [
                {"id": f"tchr-{i:03d}", "name": f"Teacher {i}", "department_id": "dept-001"}
                for i in range(3)
            ],
            "classrooms": [
                {"id": f"room-{i:03d}", "name": f"Room {i}", "capacity": 40, "is_lab": False}
                for i in range(4)
            ],
            "time_slots": [
                {"id": f"slot-{i:03d}", "day_of_week": ["monday", "tuesday", "wednesday"][i % 3], 
                 "start_time": f"{9 + (i % 6):02d}:00", "end_time": f"{10 + (i % 6):02d}:00"}
                for i in range(10)
            ],
            "batches": [
                {"id": f"batch-{i:03d}", "name": f"Batch {i}", "strength": 45}
                for i in range(2)
            ],
        }
    
    @pytest.fixture
    def encoder(self, sample_domain_data) -> ChromosomeEncoder:
        return ChromosomeEncoder(
            subjects=sample_domain_data["subjects"],
            faculty=sample_domain_data["faculty"],
            classrooms=sample_domain_data["classrooms"],
            time_slots=sample_domain_data["time_slots"],
            batches=sample_domain_data["batches"],
        )
    
    @pytest.fixture
    def calculator(self, sample_domain_data) -> FitnessCalculator:
        return FitnessCalculator(time_slots=sample_domain_data["time_slots"])
    
    def test_create_chromosome_and_evaluate(self, encoder, calculator):
        """Test creating a chromosome and evaluating its fitness."""
        genes = [
            Gene(
                subject_id=f"subj-{i % 5:03d}",
                faculty_id=f"tchr-{i % 3:03d}",
                classroom_id=f"room-{i % 4:03d}",
                time_slot_id=f"slot-{i:03d}",
                batch_id=f"batch-{i % 2:03d}",
            )
            for i in range(10)
        ]
        
        chromosome = Chromosome(genes=genes)
        
        # Calculate fitness
        fitness = calculator.calculate(chromosome)
        
        assert isinstance(fitness, float)
        assert chromosome.fitness == fitness


class TestGeneticOptimizerIntegration:
    """Integration tests for GeneticOptimizer."""
    
    @pytest.fixture
    def sample_domain_data(self) -> Dict[str, List[Dict]]:
        """Create sample domain data."""
        return {
            "subjects": [
                {"id": f"subj-{i:03d}", "name": f"Subject {i}", "credits": 3}
                for i in range(10)
            ],
            "faculty": [
                {"id": f"tchr-{i:03d}", "name": f"Teacher {i}", "department_id": "dept-001"}
                for i in range(5)
            ],
            "classrooms": [
                {"id": f"room-{i:03d}", "name": f"Room {i}", "capacity": 40, "is_lab": i % 3 == 0}
                for i in range(8)
            ],
            "time_slots": [
                {"id": f"slot-{i:03d}", "day_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"][i % 5], 
                 "start_time": f"{9 + (i % 6):02d}:00", "end_time": f"{10 + (i % 6):02d}:00"}
                for i in range(30)
            ],
            "batches": [
                {"id": f"batch-{i:03d}", "name": f"Batch {i}", "strength": 45}
                for i in range(3)
            ],
        }
    
    @pytest.fixture
    def encoder(self, sample_domain_data) -> ChromosomeEncoder:
        return ChromosomeEncoder(
            subjects=sample_domain_data["subjects"],
            faculty=sample_domain_data["faculty"],
            classrooms=sample_domain_data["classrooms"],
            time_slots=sample_domain_data["time_slots"],
            batches=sample_domain_data["batches"],
        )
    
    @pytest.fixture
    def fitness_calculator(self, sample_domain_data) -> FitnessCalculator:
        return FitnessCalculator(time_slots=sample_domain_data["time_slots"])
    
    @pytest.fixture
    def ga_config(self) -> GAConfig:
        """Create GA configuration for testing."""
        return GAConfig(
            population_size=10,
            generations=5,  # Few generations for testing
            mutation_rate=0.2,
            crossover_rate=0.8,
            tournament_size=3,
            elite_size=2,
        )
    
    def test_optimizer_initialization(self, encoder, fitness_calculator, ga_config):
        """Test GeneticOptimizer initialization."""
        optimizer = GeneticOptimizer(
            encoder=encoder,
            fitness_calculator=fitness_calculator,
            config=ga_config,
        )
        
        assert optimizer is not None
        assert optimizer.config.population_size == 10
        assert optimizer.config.generations == 5


class TestEvolutionStats:
    """Tests for EvolutionStats dataclass."""
    
    def test_evolution_stats_creation(self):
        """Test creating EvolutionStats."""
        stats = EvolutionStats(
            generations_run=50,
            best_fitness=0.95,
            avg_fitness=0.82,
            fitness_history=[0.7, 0.75, 0.8, 0.85, 0.9, 0.95],
            convergence_generation=45,
            total_evaluations=5000,
        )
        
        assert stats.generations_run == 50
        assert stats.best_fitness == 0.95
        assert stats.avg_fitness == 0.82
        assert len(stats.fitness_history) == 6
        assert stats.convergence_generation == 45
        assert stats.total_evaluations == 5000
    
    def test_evolution_stats_to_dict(self):
        """Test EvolutionStats serialization."""
        stats = EvolutionStats(
            generations_run=50,
            best_fitness=0.95,
            avg_fitness=0.82,
            fitness_history=[0.7 + i * 0.01 for i in range(30)],  # 30 entries
            convergence_generation=45,
            total_evaluations=5000,
        )
        
        d = stats.to_dict()
        
        assert d["generations_run"] == 50
        assert d["best_fitness"] == 0.95
        # fitness_history should be truncated to last 20
        assert len(d["fitness_history"]) == 20


class TestHybridPipelineComponents:
    """Tests for hybrid pipeline component interactions."""
    
    def test_chromosome_copy_preserves_fitness(self):
        """Test that copying chromosome preserves fitness."""
        genes = [
            Gene(
                subject_id="subj-001",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-001",
                batch_id="batch-001",
            )
        ]
        
        original = Chromosome(genes=genes, fitness=0.9, generation=5)
        copy = original.copy()
        
        assert copy.fitness == 0.9
        assert copy.generation == 5
    
    def test_multiple_chromosomes_independent(self):
        """Test that multiple chromosomes are independent."""
        genes1 = [
            Gene(
                subject_id="subj-001",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-001",
                batch_id="batch-001",
            )
        ]
        
        genes2 = [
            Gene(
                subject_id="subj-002",
                faculty_id="tchr-002",
                classroom_id="room-002",
                time_slot_id="slot-002",
                batch_id="batch-002",
            )
        ]
        
        chrom1 = Chromosome(genes=genes1, fitness=0.8)
        chrom2 = Chromosome(genes=genes2, fitness=0.9)
        
        # Modify chrom1
        chrom1.fitness = 0.5
        
        # chrom2 should be unchanged
        assert chrom2.fitness == 0.9


class TestEdgeCases:
    """Edge case tests for the integrated system."""
    
    def test_single_gene_chromosome(self):
        """Test chromosome with single gene."""
        gene = Gene(
            subject_id="subj-001",
            faculty_id="tchr-001",
            classroom_id="room-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
        )
        
        chromosome = Chromosome(genes=[gene])
        
        assert len(chromosome) == 1
        assert chromosome[0].subject_id == "subj-001"
    
    def test_empty_chromosome(self):
        """Test empty chromosome."""
        chromosome = Chromosome(genes=[])
        
        assert len(chromosome) == 0
    
    def test_large_chromosome(self):
        """Test chromosome with many genes."""
        genes = [
            Gene(
                subject_id=f"subj-{i % 20:03d}",
                faculty_id=f"tchr-{i % 10:03d}",
                classroom_id=f"room-{i % 15:03d}",
                time_slot_id=f"slot-{i:04d}",
                batch_id=f"batch-{i % 5:03d}",
            )
            for i in range(1000)
        ]
        
        chromosome = Chromosome(genes=genes)
        
        assert len(chromosome) == 1000


class TestDatabaseMocking:
    """Tests with mocked database interactions."""
    
    def test_encoder_with_db_format_uuids(self):
        """Test encoder handles UUID-style IDs from database."""
        subjects = [
            {"id": "550e8400-e29b-41d4-a716-446655440001", "name": "Math", "credits": 3}
        ]
        faculty = [
            {"id": "550e8400-e29b-41d4-a716-446655440002", "name": "Prof", "department_id": "dept"}
        ]
        classrooms = [
            {"id": "550e8400-e29b-41d4-a716-446655440003", "name": "Room", "capacity": 30, "is_lab": False}
        ]
        time_slots = [
            {"id": "550e8400-e29b-41d4-a716-446655440004", "day_of_week": "monday", 
             "start_time": "09:00:00+00", "end_time": "10:00:00+00"}
        ]
        batches = [
            {"id": "550e8400-e29b-41d4-a716-446655440005", "name": "Batch", "strength": 25}
        ]
        
        encoder = ChromosomeEncoder(
            subjects=subjects,
            faculty=faculty,
            classrooms=classrooms,
            time_slots=time_slots,
            batches=batches,
        )
        
        assert "550e8400-e29b-41d4-a716-446655440001" in encoder.subjects


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
