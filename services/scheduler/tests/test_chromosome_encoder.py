"""
Unit tests for chromosome encoder module.

Tests the Gene, Chromosome, and ChromosomeEncoder classes that handle
conversion between database records and genetic algorithm representation.
"""

import pytest
from typing import Dict, List, Any

# Import module under test
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from services.scheduler.chromosome_encoder import (
    Gene,
    Chromosome,
    ChromosomeEncoder,
)


class TestGene:
    """Tests for the Gene dataclass."""
    
    def test_gene_creation(self):
        """Test creating a Gene with all fields."""
        gene = Gene(
            subject_id="subj-001",
            faculty_id="tchr-001",
            classroom_id="room-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
            is_lab=False,
        )
        
        assert gene.subject_id == "subj-001"
        assert gene.faculty_id == "tchr-001"
        assert gene.classroom_id == "room-001"
        assert gene.time_slot_id == "slot-001"
        assert gene.batch_id == "batch-001"
        assert gene.is_lab == False
    
    def test_gene_default_is_lab(self):
        """Test Gene with default is_lab (False)."""
        gene = Gene(
            subject_id="subj-001",
            faculty_id="tchr-001",
            classroom_id="room-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
        )
        
        assert gene.is_lab == False
    
    def test_gene_with_lab(self):
        """Test Gene with is_lab = True."""
        gene = Gene(
            subject_id="subj-001",
            faculty_id="tchr-001",
            classroom_id="lab-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
            is_lab=True,
        )
        
        assert gene.is_lab == True
    
    def test_gene_hash_and_equality(self):
        """Test Gene hashing and equality."""
        gene1 = Gene(
            subject_id="subj-001",
            faculty_id="tchr-001",
            classroom_id="room-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
        )
        
        gene2 = Gene(
            subject_id="subj-001",
            faculty_id="tchr-001",
            classroom_id="room-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
        )
        
        assert gene1 == gene2
        assert hash(gene1) == hash(gene2)
    
    def test_gene_inequality(self):
        """Test Gene inequality when fields differ."""
        gene1 = Gene(
            subject_id="subj-001",
            faculty_id="tchr-001",
            classroom_id="room-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
        )
        
        gene2 = Gene(
            subject_id="subj-002",  # Different subject
            faculty_id="tchr-001",
            classroom_id="room-001",
            time_slot_id="slot-001",
            batch_id="batch-001",
        )
        
        assert gene1 != gene2


class TestChromosome:
    """Tests for the Chromosome dataclass."""
    
    def test_chromosome_creation(self):
        """Test creating a Chromosome with genes."""
        genes = [
            Gene(
                subject_id=f"subj-{i:03d}",
                faculty_id=f"tchr-{i:03d}",
                classroom_id=f"room-{i:03d}",
                time_slot_id=f"slot-{i:03d}",
                batch_id="batch-001",
            )
            for i in range(5)
        ]
        
        chromosome = Chromosome(genes=genes, fitness=0.85, generation=5)
        
        assert len(chromosome.genes) == 5
        assert chromosome.fitness == 0.85
        assert chromosome.generation == 5
    
    def test_chromosome_default_fitness(self):
        """Test Chromosome with default fitness and generation."""
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
        
        assert chromosome.fitness == 0.0
        assert chromosome.generation == 0
    
    def test_chromosome_len(self):
        """Test Chromosome __len__ method."""
        genes = [
            Gene(
                subject_id=f"subj-{i:03d}",
                faculty_id=f"tchr-{i:03d}",
                classroom_id=f"room-{i:03d}",
                time_slot_id=f"slot-{i:03d}",
                batch_id="batch-001",
            )
            for i in range(10)
        ]
        
        chromosome = Chromosome(genes=genes)
        
        assert len(chromosome) == 10
    
    def test_chromosome_iter(self):
        """Test Chromosome iteration."""
        genes = [
            Gene(
                subject_id=f"subj-{i:03d}",
                faculty_id=f"tchr-{i:03d}",
                classroom_id=f"room-{i:03d}",
                time_slot_id=f"slot-{i:03d}",
                batch_id="batch-001",
            )
            for i in range(3)
        ]
        
        chromosome = Chromosome(genes=genes)
        
        iterated_genes = list(chromosome)
        assert len(iterated_genes) == 3
        assert iterated_genes[0].subject_id == "subj-000"
    
    def test_chromosome_getitem(self):
        """Test Chromosome indexing."""
        genes = [
            Gene(
                subject_id=f"subj-{i:03d}",
                faculty_id=f"tchr-{i:03d}",
                classroom_id=f"room-{i:03d}",
                time_slot_id=f"slot-{i:03d}",
                batch_id="batch-001",
            )
            for i in range(5)
        ]
        
        chromosome = Chromosome(genes=genes)
        
        assert chromosome[0].subject_id == "subj-000"
        assert chromosome[2].subject_id == "subj-002"
        assert chromosome[-1].subject_id == "subj-004"
    
    def test_chromosome_setitem(self):
        """Test Chromosome index assignment."""
        genes = [
            Gene(
                subject_id=f"subj-{i:03d}",
                faculty_id=f"tchr-{i:03d}",
                classroom_id=f"room-{i:03d}",
                time_slot_id=f"slot-{i:03d}",
                batch_id="batch-001",
            )
            for i in range(3)
        ]
        
        chromosome = Chromosome(genes=genes)
        
        new_gene = Gene(
            subject_id="subj-new",
            faculty_id="tchr-new",
            classroom_id="room-new",
            time_slot_id="slot-new",
            batch_id="batch-001",
        )
        
        chromosome[1] = new_gene
        
        assert chromosome[1].subject_id == "subj-new"
    
    def test_chromosome_copy(self):
        """Test Chromosome deep copy."""
        genes = [
            Gene(
                subject_id="subj-001",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-001",
                batch_id="batch-001",
            )
        ]
        
        original = Chromosome(genes=genes, fitness=0.9, generation=10)
        copy = original.copy()
        
        # Should be equal but not the same object
        assert len(copy) == len(original)
        assert copy.fitness == original.fitness
        assert copy.generation == original.generation
        assert copy is not original
        assert copy.genes is not original.genes
    
    def test_chromosome_copy_mutation_independence(self):
        """Test that modifying copy doesn't affect original."""
        genes = [
            Gene(
                subject_id="subj-001",
                faculty_id="tchr-001",
                classroom_id="room-001",
                time_slot_id="slot-001",
                batch_id="batch-001",
            )
        ]
        
        original = Chromosome(genes=genes)
        copy = original.copy()
        
        # Modify the copy
        copy.genes[0] = Gene(
            subject_id="subj-new",
            faculty_id="tchr-new",
            classroom_id="room-new",
            time_slot_id="slot-new",
            batch_id="batch-new",
        )
        copy.fitness = 1.0
        
        # Original should be unchanged
        assert original.genes[0].subject_id == "subj-001"
        assert original.fitness == 0.0


class TestChromosomeEncoder:
    """Tests for the ChromosomeEncoder class."""
    
    @pytest.fixture
    def sample_data(self) -> Dict[str, List[Dict]]:
        """Create sample domain data for encoder."""
        return {
            "subjects": [
                {"id": "subj-001", "name": "Mathematics", "credits": 3},
                {"id": "subj-002", "name": "Physics", "credits": 4},
                {"id": "subj-003", "name": "Chemistry", "credits": 3},
            ],
            "faculty": [
                {"id": "tchr-001", "name": "Dr. Smith", "department_id": "dept-001"},
                {"id": "tchr-002", "name": "Dr. Jones", "department_id": "dept-001"},
            ],
            "classrooms": [
                {"id": "room-001", "name": "Room 101", "capacity": 60, "is_lab": False},
                {"id": "room-002", "name": "Lab 1", "capacity": 30, "is_lab": True},
            ],
            "time_slots": [
                {"id": "slot-001", "day_of_week": "monday", "start_time": "09:00", "end_time": "10:00"},
                {"id": "slot-002", "day_of_week": "monday", "start_time": "10:00", "end_time": "11:00"},
                {"id": "slot-003", "day_of_week": "tuesday", "start_time": "09:00", "end_time": "10:00"},
            ],
            "batches": [
                {"id": "batch-001", "name": "CS-2024", "strength": 50},
                {"id": "batch-002", "name": "EE-2024", "strength": 45},
            ],
        }
    
    @pytest.fixture
    def encoder(self, sample_data) -> ChromosomeEncoder:
        """Create a ChromosomeEncoder instance with sample data."""
        return ChromosomeEncoder(
            subjects=sample_data["subjects"],
            faculty=sample_data["faculty"],
            classrooms=sample_data["classrooms"],
            time_slots=sample_data["time_slots"],
            batches=sample_data["batches"],
        )
    
    def test_encoder_initialization(self, encoder):
        """Test encoder initializes correctly."""
        assert encoder is not None
        assert len(encoder.subjects) == 3
        assert len(encoder.faculty) == 2
        assert len(encoder.classrooms) == 2
        assert len(encoder.time_slots) == 3
        assert len(encoder.batches) == 2
    
    def test_encoder_subject_lookup(self, encoder):
        """Test subject lookup by ID."""
        subject = encoder.subjects.get("subj-001")
        assert subject is not None
        assert subject["name"] == "Mathematics"
    
    def test_encoder_faculty_lookup(self, encoder):
        """Test faculty lookup by ID."""
        faculty = encoder.faculty.get("tchr-001")
        assert faculty is not None
        assert faculty["name"] == "Dr. Smith"
    
    def test_encoder_index_mappings(self, encoder):
        """Test index mappings are created correctly."""
        # Subject index
        assert encoder._subject_idx.get("subj-001") == 0
        assert encoder._subject_idx.get("subj-002") == 1
        
        # Reverse mapping
        assert encoder._idx_subject.get(0) == "subj-001"


class TestChromosomeEncoderEdgeCases:
    """Edge case tests for ChromosomeEncoder."""
    
    @pytest.fixture
    def minimal_data(self) -> Dict[str, List[Dict]]:
        """Create minimal domain data."""
        return {
            "subjects": [{"id": "subj-001", "name": "Math", "credits": 3}],
            "faculty": [{"id": "tchr-001", "name": "Teacher", "department_id": "dept-001"}],
            "classrooms": [{"id": "room-001", "name": "Room", "capacity": 30, "is_lab": False}],
            "time_slots": [{"id": "slot-001", "day_of_week": "monday", "start_time": "09:00", "end_time": "10:00"}],
            "batches": [{"id": "batch-001", "name": "Batch", "strength": 25}],
        }
    
    def test_encoder_with_minimal_data(self, minimal_data):
        """Test encoder with minimum valid data."""
        encoder = ChromosomeEncoder(
            subjects=minimal_data["subjects"],
            faculty=minimal_data["faculty"],
            classrooms=minimal_data["classrooms"],
            time_slots=minimal_data["time_slots"],
            batches=minimal_data["batches"],
        )
        
        assert len(encoder.subjects) == 1
        assert len(encoder.faculty) == 1
    
    def test_encoder_with_large_data(self):
        """Test encoder with larger datasets."""
        subjects = [{"id": f"subj-{i:03d}", "name": f"Subject {i}", "credits": 3} for i in range(50)]
        faculty = [{"id": f"tchr-{i:03d}", "name": f"Teacher {i}", "department_id": "dept-001"} for i in range(30)]
        classrooms = [{"id": f"room-{i:03d}", "name": f"Room {i}", "capacity": 40, "is_lab": i % 5 == 0} for i in range(20)]
        time_slots = [{"id": f"slot-{i:03d}", "day_of_week": "monday", "start_time": "09:00", "end_time": "10:00"} for i in range(40)]
        batches = [{"id": f"batch-{i:03d}", "name": f"Batch {i}", "strength": 45} for i in range(10)]
        
        encoder = ChromosomeEncoder(
            subjects=subjects,
            faculty=faculty,
            classrooms=classrooms,
            time_slots=time_slots,
            batches=batches,
        )
        
        assert len(encoder.subjects) == 50
        assert len(encoder.faculty) == 30
        assert len(encoder.classrooms) == 20
        assert len(encoder.time_slots) == 40
        assert len(encoder.batches) == 10


class TestGeneCreationVariations:
    """Test various Gene creation scenarios."""
    
    def test_create_theory_gene(self):
        """Test creating a gene for theory class."""
        gene = Gene(
            subject_id="math-101",
            faculty_id="prof-1",
            classroom_id="room-101",
            time_slot_id="mon-9",
            batch_id="cs-2024",
            is_lab=False,
        )
        
        assert gene.is_lab == False
        assert gene.subject_id == "math-101"
    
    def test_create_lab_gene(self):
        """Test creating a gene for lab class."""
        gene = Gene(
            subject_id="phy-lab-101",
            faculty_id="prof-2",
            classroom_id="lab-1",
            time_slot_id="tue-10",
            batch_id="cs-2024",
            is_lab=True,
        )
        
        assert gene.is_lab == True
        assert gene.classroom_id == "lab-1"
    
    def test_gene_with_uuid_ids(self):
        """Test Gene with UUID-style IDs."""
        gene = Gene(
            subject_id="550e8400-e29b-41d4-a716-446655440001",
            faculty_id="550e8400-e29b-41d4-a716-446655440002",
            classroom_id="550e8400-e29b-41d4-a716-446655440003",
            time_slot_id="550e8400-e29b-41d4-a716-446655440004",
            batch_id="550e8400-e29b-41d4-a716-446655440005",
        )
        
        assert "550e8400" in gene.subject_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
