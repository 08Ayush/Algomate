"""
Chromosome Encoder for Genetic Algorithm

Converts timetable solutions between:
- Database format (scheduled_classes records)
- Chromosome format (flat list for GA operations)
"""

from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
import numpy as np
from .utils.logger import ga_logger


@dataclass
class Gene:
    """
    Single gene representing one scheduled class.
    
    Attributes:
        subject_id: UUID of the subject
        faculty_id: UUID of the assigned faculty
        classroom_id: UUID of the assigned classroom
        time_slot_id: UUID of the time slot
        batch_id: UUID of the batch
        is_lab: Whether this is a lab session
    """
    subject_id: str
    faculty_id: str
    classroom_id: str
    time_slot_id: str
    batch_id: str
    is_lab: bool = False
    
    def __hash__(self):
        return hash((
            self.subject_id, 
            self.faculty_id, 
            self.classroom_id, 
            self.time_slot_id, 
            self.batch_id
        ))
    
    def __eq__(self, other):
        if not isinstance(other, Gene):
            return False
        return (
            self.subject_id == other.subject_id and
            self.faculty_id == other.faculty_id and
            self.classroom_id == other.classroom_id and
            self.time_slot_id == other.time_slot_id and
            self.batch_id == other.batch_id
        )


@dataclass
class Chromosome:
    """
    Complete timetable representation as a chromosome.
    
    A chromosome is a collection of genes where each gene
    represents a single scheduled class assignment.
    """
    genes: List[Gene]
    fitness: float = 0.0
    generation: int = 0
    
    def __len__(self) -> int:
        return len(self.genes)
    
    def __getitem__(self, index: int) -> Gene:
        return self.genes[index]
    
    def __setitem__(self, index: int, gene: Gene):
        self.genes[index] = gene
    
    def __iter__(self):
        return iter(self.genes)
    
    def copy(self) -> "Chromosome":
        """Create a deep copy of this chromosome."""
        return Chromosome(
            genes=[Gene(
                subject_id=g.subject_id,
                faculty_id=g.faculty_id,
                classroom_id=g.classroom_id,
                time_slot_id=g.time_slot_id,
                batch_id=g.batch_id,
                is_lab=g.is_lab
            ) for g in self.genes],
            fitness=self.fitness,
            generation=self.generation
        )


class ChromosomeEncoder:
    """
    Encodes and decodes timetable solutions for GA operations.
    
    Provides:
    - Conversion from database records to chromosomes
    - Conversion from chromosomes to database records
    - Gene indexing for efficient operations
    """
    
    def __init__(
        self,
        subjects: List[Dict],
        faculty: List[Dict],
        classrooms: List[Dict],
        time_slots: List[Dict],
        batches: List[Dict]
    ):
        """
        Initialize encoder with domain data.
        
        Args:
            subjects: List of subject records
            faculty: List of faculty records
            classrooms: List of classroom records
            time_slots: List of time slot records
            batches: List of batch records
        """
        self.subjects = {s["id"]: s for s in subjects}
        self.faculty = {f["id"]: f for f in faculty}
        self.classrooms = {c["id"]: c for c in classrooms}
        self.time_slots = {t["id"]: t for t in time_slots}
        self.batches = {b["id"]: b for b in batches}
        
        # Create index mappings for efficient lookup
        self._subject_idx = {s["id"]: i for i, s in enumerate(subjects)}
        self._faculty_idx = {f["id"]: i for i, f in enumerate(faculty)}
        self._classroom_idx = {c["id"]: i for i, c in enumerate(classrooms)}
        self._time_slot_idx = {t["id"]: i for i, t in enumerate(time_slots)}
        self._batch_idx = {b["id"]: i for i, b in enumerate(batches)}
        
        # Reverse mappings
        self._idx_subject = {i: s["id"] for i, s in enumerate(subjects)}
        self._idx_faculty = {i: f["id"] for i, f in enumerate(faculty)}
        self._idx_classroom = {i: c["id"] for i, c in enumerate(classrooms)}
        self._idx_time_slot = {i: t["id"] for i, t in enumerate(time_slots)}
        self._idx_batch = {i: b["id"] for i, b in enumerate(batches)}
        
        # Store lists for domain operations
        self._subjects_list = subjects
        self._faculty_list = faculty
        self._classrooms_list = classrooms
        self._time_slots_list = time_slots
        self._batches_list = batches
        
        ga_logger.info(
            f"Encoder initialized: {len(subjects)} subjects, "
            f"{len(faculty)} faculty, {len(classrooms)} rooms, "
            f"{len(time_slots)} slots, {len(batches)} batches"
        )
    
    def encode_from_cpsat(self, cpsat_solution: Dict) -> Chromosome:
        """
        Convert CP-SAT solution to chromosome.
        
        Args:
            cpsat_solution: Solution from NEPScheduler.solve_for_batch()
            
        Returns:
            Chromosome representation
        """
        genes = []
        
        for assignment in cpsat_solution.get("assignments", []):
            gene = Gene(
                subject_id=assignment["subject_id"],
                faculty_id=assignment["faculty_id"],
                classroom_id=assignment["classroom_id"],
                time_slot_id=assignment["time_slot_id"],
                batch_id=assignment["batch_id"],
                is_lab=assignment.get("is_lab", False)
            )
            genes.append(gene)
        
        chromosome = Chromosome(genes=genes)
        ga_logger.debug(f"Encoded chromosome with {len(genes)} genes")
        
        return chromosome
    
    def encode_from_db(self, scheduled_classes: List[Dict]) -> Chromosome:
        """
        Convert database records to chromosome.
        
        Args:
            scheduled_classes: List of scheduled_classes records
            
        Returns:
            Chromosome representation
        """
        genes = []
        
        for record in scheduled_classes:
            # Handle class_type ENUM from database (THEORY, LAB, PRACTICAL, TUTORIAL)
            class_type = record.get("class_type", "THEORY")
            is_lab = class_type in ["LAB", "PRACTICAL"]
            
            gene = Gene(
                subject_id=record["subject_id"],
                faculty_id=record["faculty_id"],
                classroom_id=record["classroom_id"],
                time_slot_id=record["time_slot_id"],
                batch_id=record["batch_id"],
                is_lab=is_lab
            )
            genes.append(gene)
        
        return Chromosome(genes=genes)
    
    def decode_to_db(self, chromosome: Chromosome, timetable_id: str) -> List[Dict]:
        """
        Convert chromosome to database records.
        
        Args:
            chromosome: Chromosome to decode
            timetable_id: ID of the generated_timetables record
            
        Returns:
            List of scheduled_classes records ready for insertion
        """
        records = []
        
        for i, gene in enumerate(chromosome.genes):
            # Map is_lab to class_type enum value
            class_type = "LAB" if gene.is_lab else "THEORY"
            
            record = {
                "timetable_id": timetable_id,
                "subject_id": gene.subject_id,
                "faculty_id": gene.faculty_id,
                "classroom_id": gene.classroom_id,
                "time_slot_id": gene.time_slot_id,
                "batch_id": gene.batch_id,
                "class_type": class_type,
                "credit_hour_number": i + 1,  # Required field
            }
            records.append(record)
        
        return records
    
    def get_gene_domain(self, gene: Gene) -> Dict:
        """
        Get the domain (valid values) for modifying a gene.
        
        Args:
            gene: Gene to get domain for
            
        Returns:
            Dictionary of valid assignments
        """
        subject = self.subjects.get(gene.subject_id, {})
        
        # Get qualified faculty for this subject
        subject_dept = subject.get("department_id")
        valid_faculty = [
            f_id for f_id, f in self.faculty.items()
            if f.get("department_id") == subject_dept or not subject_dept
        ]
        
        # If no faculty found by department, use all faculty
        if not valid_faculty:
            valid_faculty = list(self.faculty.keys())
        
        # Get appropriate classrooms
        if gene.is_lab:
            valid_rooms = [
                c_id for c_id, c in self.classrooms.items()
                if c.get("room_type") == "lab"
            ]
        else:
            valid_rooms = [
                c_id for c_id, c in self.classrooms.items()
                if c.get("room_type") in ("classroom", "lecture_hall", None)
            ]
        
        # If no rooms found by type, use all rooms
        if not valid_rooms:
            valid_rooms = list(self.classrooms.keys())
        
        # All time slots are potentially valid (GA will optimize)
        valid_slots = list(self.time_slots.keys())
        
        return {
            "faculty": valid_faculty,
            "classrooms": valid_rooms,
            "time_slots": valid_slots
        }
    
    def to_numpy(self, chromosome: Chromosome) -> np.ndarray:
        """
        Convert chromosome to numpy array for vectorized operations.
        
        Each gene is encoded as [subject_idx, faculty_idx, room_idx, slot_idx, batch_idx]
        
        Returns:
            2D numpy array of shape (num_genes, 5)
        """
        data = []
        for gene in chromosome.genes:
            row = [
                self._subject_idx.get(gene.subject_id, -1),
                self._faculty_idx.get(gene.faculty_id, -1),
                self._classroom_idx.get(gene.classroom_id, -1),
                self._time_slot_idx.get(gene.time_slot_id, -1),
                self._batch_idx.get(gene.batch_id, -1),
            ]
            data.append(row)
        
        return np.array(data, dtype=np.int32)
    
    def from_numpy(self, array: np.ndarray, reference: Chromosome) -> Chromosome:
        """
        Convert numpy array back to chromosome.
        
        Args:
            array: Numpy array from to_numpy()
            reference: Reference chromosome for metadata
            
        Returns:
            Reconstructed chromosome
        """
        genes = []
        for i, row in enumerate(array):
            gene = Gene(
                subject_id=self._idx_subject.get(row[0], ""),
                faculty_id=self._idx_faculty.get(row[1], ""),
                classroom_id=self._idx_classroom.get(row[2], ""),
                time_slot_id=self._idx_time_slot.get(row[3], ""),
                batch_id=self._idx_batch.get(row[4], ""),
                is_lab=reference.genes[i].is_lab if i < len(reference.genes) else False
            )
            genes.append(gene)
        
        return Chromosome(genes=genes)
    
    def get_random_time_slot(self) -> str:
        """Get a random time slot ID."""
        import random
        return random.choice(list(self.time_slots.keys()))
    
    def get_random_classroom(self, is_lab: bool = False) -> str:
        """Get a random classroom ID appropriate for the session type."""
        import random
        if is_lab:
            labs = [c_id for c_id, c in self.classrooms.items() 
                    if c.get("room_type") == "lab"]
            if labs:
                return random.choice(labs)
        rooms = [c_id for c_id, c in self.classrooms.items() 
                 if c.get("room_type") != "lab"]
        if rooms:
            return random.choice(rooms)
        return random.choice(list(self.classrooms.keys()))
