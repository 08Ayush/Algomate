# Hybrid CP-SAT + Genetic Algorithm Implementation Guide

> **Project:** Academic Compass - Intelligent Timetable Scheduling System  
> **Version:** 1.0.0  
> **Created:** January 24, 2026  
> **Estimated Timeline:** 10-11 Days

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Foundation Setup](#phase-1-foundation-setup-day-1-2)
4. [Phase 2: Package Structure](#phase-2-package-structure-day-2-3)
5. [Phase 3: Chromosome Encoder](#phase-3-chromosome-encoder-day-3-4)
6. [Phase 4: Fitness Calculator](#phase-4-fitness-calculator-day-4-5)
7. [Phase 5: Genetic Optimizer](#phase-5-genetic-optimizer-day-5-7)
8. [Phase 6: CP-SAT Multi-Solution](#phase-6-cp-sat-multi-solution-day-7-8)
9. [Phase 7: Hybrid Orchestrator](#phase-7-hybrid-orchestrator-day-8-9)
10. [Phase 8: API Integration](#phase-8-api-integration-day-9-10)
11. [Phase 9: Testing & Validation](#phase-9-testing--validation-day-10-11)
12. [Troubleshooting](#troubleshooting)
13. [Performance Tuning](#performance-tuning)

---

## Overview

This guide provides step-by-step instructions to implement a hybrid scheduling algorithm that combines:

- **CP-SAT Solver** (Google OR-Tools): Generates feasible solutions satisfying all hard constraints
- **Genetic Algorithm** (DEAP): Optimizes soft constraints through evolutionary operations

### Architecture Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js API   │────▶│  Python Process  │────▶│    Supabase     │
│   (TypeScript)  │◀────│  (subprocess)    │◀────│   (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            ┌───────────────┐    ┌────────────────┐
            │   CP-SAT      │    │   Genetic      │
            │   Solver      │───▶│   Optimizer    │
            │ (Hard Const.) │    │ (Soft Const.)  │
            └───────────────┘    └────────────────┘
```

---

## Prerequisites

### Required Software

- [x] Python 3.10+
- [x] Node.js 18+
- [x] PostgreSQL (via Supabase)
- [x] Virtual Environment activated

### Required Knowledge

- Understanding of constraint satisfaction problems
- Basic genetic algorithm concepts
- Familiarity with the existing `nep_scheduler.py`

---

## Phase 1: Foundation Setup (Day 1-2)

### Step 1: Add DEAP Dependency

**File:** `requirements.txt`

Add the following line to your requirements file:

```txt
deap>=1.4.0
```

**Install Command:**

```bash
pip install deap>=1.4.0
```

**Verification:**

```bash
python -c "import deap; print(deap.__version__)"
```

Expected output: `1.4.0` or higher

---

### Step 2: Insert Constraint Rules Seed Data

**Execute in Supabase SQL Editor:**

```sql
-- =====================================================
-- CONSTRAINT RULES SEED DATA
-- =====================================================

INSERT INTO constraint_rules (
    college_id, 
    rule_name, 
    rule_type, 
    parameters, 
    weight, 
    is_active
)
SELECT 
    c.id,
    rule.name,
    rule.type,
    rule.params::jsonb,
    rule.weight,
    true
FROM colleges c
CROSS JOIN (VALUES
    -- HARD CONSTRAINTS (weight = 1000, must be satisfied)
    ('no_teacher_overlap', 'hard', '{"scope": "faculty"}', 1000),
    ('no_room_overlap', 'hard', '{"scope": "classroom"}', 1000),
    ('no_student_overlap', 'hard', '{"scope": "batch"}', 1000),
    ('room_capacity', 'hard', '{"min_utilization": 0.5}', 1000),
    ('faculty_availability', 'hard', '{"respect_preferences": true}', 1000),
    ('lab_requires_lab_room', 'hard', '{"room_type": "lab"}', 1000),
    ('max_hours_per_day', 'hard', '{"faculty_max": 6, "student_max": 8}', 1000),
    ('lunch_break_required', 'hard', '{"start_slot": 5, "end_slot": 6}', 1000),
    
    -- SOFT CONSTRAINTS (variable weights, optimized by GA)
    ('minimize_gaps', 'soft', '{"max_gap_hours": 1}', 50),
    ('preferred_time_slots', 'soft', '{"morning_weight": 1.2}', 30),
    ('workload_balance', 'soft', '{"max_daily_variance": 2}', 40),
    ('room_stability', 'soft', '{"same_room_bonus": 10}', 20),
    ('consecutive_lectures', 'soft', '{"max_consecutive": 3}', 35),
    ('department_clustering', 'soft', '{"cluster_bonus": 15}', 25),
    ('elective_distribution', 'soft', '{"spread_days": true}', 30)
) AS rule(name, type, params, weight)
WHERE NOT EXISTS (
    SELECT 1 FROM constraint_rules cr 
    WHERE cr.college_id = c.id AND cr.rule_name = rule.name
);

-- Verify insertion
SELECT 
    c.name as college,
    cr.rule_name,
    cr.rule_type,
    cr.weight
FROM constraint_rules cr
JOIN colleges c ON c.id = cr.college_id
ORDER BY c.name, cr.rule_type DESC, cr.weight DESC;
```

---

## Phase 2: Package Structure (Day 2-3)

### Step 3: Create Package Init File

**File:** `services/scheduler/__init__.py`

```python
"""
Academic Compass - Hybrid Scheduling Algorithm Package

This package provides:
- CP-SAT constraint solver for hard constraints
- Genetic Algorithm optimizer for soft constraints
- Hybrid orchestrator combining both approaches
"""

from .nep_scheduler import NEPScheduler
from .genetic_optimizer import GeneticOptimizer
from .hybrid_orchestrator import HybridOrchestrator

__version__ = "1.0.0"
__all__ = ["NEPScheduler", "GeneticOptimizer", "HybridOrchestrator"]
```

---

### Step 4: Create Utility Modules

**File:** `services/scheduler/utils/__init__.py`

```python
"""Utility modules for the scheduler package."""

from .db_client import get_supabase_client
from .logger import setup_logger

__all__ = ["get_supabase_client", "setup_logger"]
```

---

**File:** `services/scheduler/utils/db_client.py`

```python
"""
Supabase Database Client

Provides a singleton connection to the Supabase database.
"""

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create a Supabase client instance.
    
    Returns:
        Client: Supabase client instance
        
    Raises:
        ValueError: If environment variables are not set
    """
    global _client
    
    if _client is None:
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            raise ValueError(
                "Missing Supabase credentials. "
                "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
            )
        
        _client = create_client(url, key)
    
    return _client


def execute_query(query: str, params: dict = None) -> list:
    """
    Execute a raw SQL query (for complex operations).
    
    Args:
        query: SQL query string
        params: Query parameters
        
    Returns:
        List of result rows
    """
    client = get_supabase_client()
    # Use RPC for raw queries if needed
    return client.rpc("execute_sql", {"query": query, "params": params}).execute()
```

---

**File:** `services/scheduler/utils/logger.py`

```python
"""
Logging Configuration

Provides structured logging for the scheduler package.
"""

import logging
import sys
from datetime import datetime
from pathlib import Path


def setup_logger(
    name: str = "scheduler",
    level: int = logging.INFO,
    log_to_file: bool = True
) -> logging.Logger:
    """
    Configure and return a logger instance.
    
    Args:
        name: Logger name
        level: Logging level
        log_to_file: Whether to also log to a file
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Console handler with colored output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S"
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # File handler (optional)
    if log_to_file:
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(
            log_dir / f"scheduler_{datetime.now():%Y%m%d}.log"
        )
        file_handler.setLevel(logging.DEBUG)
        file_format = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s"
        )
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    return logger


# Pre-configured loggers
scheduler_logger = setup_logger("scheduler")
cpsat_logger = setup_logger("scheduler.cpsat")
ga_logger = setup_logger("scheduler.ga")
```

---

### Step 5: Create Configuration Module

**File:** `services/scheduler/config.py`

```python
"""
Scheduler Configuration

Centralizes all algorithm parameters and constraints.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


class ConstraintType(Enum):
    """Types of scheduling constraints."""
    HARD = "hard"
    SOFT = "soft"


@dataclass
class CPSATConfig:
    """Configuration for the CP-SAT solver."""
    
    # Solver parameters
    max_time_seconds: int = 300
    num_workers: int = 8
    num_solutions: int = 10  # Generate multiple seeds for GA
    
    # Solution quality
    relative_gap_limit: float = 0.05
    absolute_gap_limit: float = 10.0
    
    # Logging
    log_search_progress: bool = True


@dataclass
class GAConfig:
    """Configuration for the Genetic Algorithm."""
    
    # Population parameters
    population_size: int = 100
    elite_size: int = 10
    
    # Evolution parameters
    generations: int = 200
    mutation_rate: float = 0.15
    crossover_rate: float = 0.8
    
    # Tournament selection
    tournament_size: int = 5
    
    # Convergence detection
    stagnation_limit: int = 30  # Stop if no improvement for N generations
    
    # Parallel processing
    use_multiprocessing: bool = True
    num_processes: int = 4


@dataclass
class HybridConfig:
    """Configuration for the hybrid orchestrator."""
    
    cpsat: CPSATConfig = field(default_factory=CPSATConfig)
    ga: GAConfig = field(default_factory=GAConfig)
    
    # Pipeline settings
    save_intermediate: bool = True
    output_dir: str = "scheduler_output"
    
    # Retry logic
    max_retries: int = 3
    retry_delay_seconds: int = 5


@dataclass
class ConstraintWeights:
    """Weights for soft constraints (used in fitness calculation)."""
    
    # Gap minimization
    minimize_gaps: int = 50
    
    # Time preferences
    preferred_time_slots: int = 30
    
    # Workload balance
    workload_balance: int = 40
    
    # Room stability (same room for same subject)
    room_stability: int = 20
    
    # Consecutive lecture limit
    consecutive_lectures: int = 35
    
    # Department clustering
    department_clustering: int = 25
    
    # Elective distribution
    elective_distribution: int = 30
    
    def to_dict(self) -> Dict[str, int]:
        """Convert weights to dictionary."""
        return {
            "minimize_gaps": self.minimize_gaps,
            "preferred_time_slots": self.preferred_time_slots,
            "workload_balance": self.workload_balance,
            "room_stability": self.room_stability,
            "consecutive_lectures": self.consecutive_lectures,
            "department_clustering": self.department_clustering,
            "elective_distribution": self.elective_distribution,
        }


# Default configuration instance
DEFAULT_CONFIG = HybridConfig()
DEFAULT_WEIGHTS = ConstraintWeights()
```

---

## Phase 3: Chromosome Encoder (Day 3-4)

### Step 6: Create Chromosome Encoder

**File:** `services/scheduler/chromosome_encoder.py`

```python
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
    
    def copy(self) -> "Chromosome":
        """Create a deep copy of this chromosome."""
        return Chromosome(
            genes=[Gene(**g.__dict__) for g in self.genes],
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
            gene = Gene(
                subject_id=record["subject_id"],
                faculty_id=record["faculty_id"],
                classroom_id=record["classroom_id"],
                time_slot_id=record["time_slot_id"],
                batch_id=record["batch_id"],
                is_lab=record.get("is_lab_session", False)
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
        
        for gene in chromosome.genes:
            record = {
                "timetable_id": timetable_id,
                "subject_id": gene.subject_id,
                "faculty_id": gene.faculty_id,
                "classroom_id": gene.classroom_id,
                "time_slot_id": gene.time_slot_id,
                "batch_id": gene.batch_id,
                "is_lab_session": gene.is_lab,
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
        subject = self.subjects[gene.subject_id]
        
        # Get qualified faculty for this subject
        valid_faculty = [
            f_id for f_id, f in self.faculty.items()
            if subject["department_id"] == f.get("department_id")
        ]
        
        # Get appropriate classrooms
        if gene.is_lab:
            valid_rooms = [
                c_id for c_id, c in self.classrooms.items()
                if c.get("room_type") == "lab"
            ]
        else:
            valid_rooms = [
                c_id for c_id, c in self.classrooms.items()
                if c.get("room_type") in ("classroom", "lecture_hall")
            ]
        
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
                subject_id=self._idx_subject[row[0]],
                faculty_id=self._idx_faculty[row[1]],
                classroom_id=self._idx_classroom[row[2]],
                time_slot_id=self._idx_time_slot[row[3]],
                batch_id=self._idx_batch[row[4]],
                is_lab=reference.genes[i].is_lab if i < len(reference.genes) else False
            )
            genes.append(gene)
        
        return Chromosome(genes=genes)
```

---

## Phase 4: Fitness Calculator (Day 4-5)

### Step 7: Create Fitness Calculator

**File:** `services/scheduler/fitness_calculator.py`

```python
"""
Fitness Calculator for Genetic Algorithm

Evaluates timetable quality based on soft constraints.
Higher fitness = better timetable.
"""

from typing import Dict, List, Tuple, Set
from collections import defaultdict
from dataclasses import dataclass
from .chromosome_encoder import Chromosome, Gene
from .config import ConstraintWeights, DEFAULT_WEIGHTS
from .utils.logger import ga_logger


@dataclass
class FitnessBreakdown:
    """Detailed breakdown of fitness score components."""
    total_fitness: float
    gap_penalty: float
    time_preference_score: float
    workload_balance_score: float
    room_stability_score: float
    consecutive_penalty: float
    clustering_score: float
    elective_distribution_score: float
    hard_constraint_violations: int


class FitnessCalculator:
    """
    Calculates fitness scores for timetable chromosomes.
    
    Evaluates soft constraints and returns a fitness score
    where higher values indicate better timetables.
    """
    
    def __init__(
        self,
        time_slots: List[Dict],
        weights: ConstraintWeights = DEFAULT_WEIGHTS
    ):
        """
        Initialize calculator with time slot data and weights.
        
        Args:
            time_slots: List of time slot records with day_of_week, start_time
            weights: Constraint weights configuration
        """
        self.time_slots = {t["id"]: t for t in time_slots}
        self.weights = weights
        
        # Pre-compute time slot ordering
        self._slot_order = self._compute_slot_order(time_slots)
        
        # Preferred time slots (morning: 9-12, afternoon: 2-4)
        self._preferred_morning = set()
        self._preferred_afternoon = set()
        for slot in time_slots:
            hour = int(slot.get("start_time", "09:00").split(":")[0])
            if 9 <= hour < 12:
                self._preferred_morning.add(slot["id"])
            elif 14 <= hour < 16:
                self._preferred_afternoon.add(slot["id"])
        
        ga_logger.info(f"FitnessCalculator initialized with {len(time_slots)} slots")
    
    def _compute_slot_order(self, time_slots: List[Dict]) -> Dict[str, int]:
        """Compute global ordering of time slots."""
        day_order = {
            "monday": 0, "tuesday": 1, "wednesday": 2,
            "thursday": 3, "friday": 4, "saturday": 5
        }
        
        def slot_key(slot):
            day = slot.get("day_of_week", "monday").lower()
            time = slot.get("start_time", "09:00")
            return (day_order.get(day, 0), time)
        
        sorted_slots = sorted(time_slots, key=slot_key)
        return {s["id"]: i for i, s in enumerate(sorted_slots)}
    
    def calculate(self, chromosome: Chromosome) -> float:
        """
        Calculate total fitness score.
        
        Args:
            chromosome: Timetable chromosome to evaluate
            
        Returns:
            Fitness score (higher is better)
        """
        breakdown = self.calculate_detailed(chromosome)
        chromosome.fitness = breakdown.total_fitness
        return breakdown.total_fitness
    
    def calculate_detailed(self, chromosome: Chromosome) -> FitnessBreakdown:
        """
        Calculate fitness with detailed breakdown.
        
        Args:
            chromosome: Timetable chromosome to evaluate
            
        Returns:
            FitnessBreakdown with all component scores
        """
        # Group genes by various dimensions
        by_faculty_day = defaultdict(list)
        by_batch_day = defaultdict(list)
        by_room = defaultdict(list)
        by_subject = defaultdict(list)
        
        for gene in chromosome.genes:
            slot = self.time_slots.get(gene.time_slot_id, {})
            day = slot.get("day_of_week", "unknown")
            
            by_faculty_day[(gene.faculty_id, day)].append(gene)
            by_batch_day[(gene.batch_id, day)].append(gene)
            by_room[gene.classroom_id].append(gene)
            by_subject[gene.subject_id].append(gene)
        
        # Calculate individual components
        gap_penalty = self._calculate_gap_penalty(by_batch_day)
        time_pref = self._calculate_time_preference(chromosome)
        workload = self._calculate_workload_balance(by_faculty_day)
        room_stab = self._calculate_room_stability(by_subject)
        consecutive = self._calculate_consecutive_penalty(by_batch_day)
        clustering = self._calculate_clustering_score(chromosome)
        elective = self._calculate_elective_distribution(chromosome)
        
        # Check hard constraint violations (should be 0 from CP-SAT)
        violations = self._check_hard_violations(chromosome)
        
        # Combine scores (penalties are negative)
        total = (
            - gap_penalty * self.weights.minimize_gaps
            + time_pref * self.weights.preferred_time_slots
            + workload * self.weights.workload_balance
            + room_stab * self.weights.room_stability
            - consecutive * self.weights.consecutive_lectures
            + clustering * self.weights.department_clustering
            + elective * self.weights.elective_distribution
            - violations * 10000  # Heavy penalty for violations
        )
        
        return FitnessBreakdown(
            total_fitness=total,
            gap_penalty=gap_penalty,
            time_preference_score=time_pref,
            workload_balance_score=workload,
            room_stability_score=room_stab,
            consecutive_penalty=consecutive,
            clustering_score=clustering,
            elective_distribution_score=elective,
            hard_constraint_violations=violations
        )
    
    def _calculate_gap_penalty(
        self, 
        by_batch_day: Dict[Tuple[str, str], List[Gene]]
    ) -> float:
        """Calculate penalty for gaps in student schedules."""
        total_gaps = 0
        
        for (batch_id, day), genes in by_batch_day.items():
            if len(genes) < 2:
                continue
            
            # Sort by time slot order
            sorted_genes = sorted(
                genes, 
                key=lambda g: self._slot_order.get(g.time_slot_id, 0)
            )
            
            # Count gaps (non-consecutive slots)
            for i in range(len(sorted_genes) - 1):
                order1 = self._slot_order.get(sorted_genes[i].time_slot_id, 0)
                order2 = self._slot_order.get(sorted_genes[i+1].time_slot_id, 0)
                gap = order2 - order1 - 1
                if gap > 0:
                    total_gaps += gap
        
        return total_gaps
    
    def _calculate_time_preference(self, chromosome: Chromosome) -> float:
        """Calculate score for preferred time slot usage."""
        preferred_count = 0
        
        for gene in chromosome.genes:
            if gene.time_slot_id in self._preferred_morning:
                preferred_count += 1.0
            elif gene.time_slot_id in self._preferred_afternoon:
                preferred_count += 0.7
        
        return preferred_count / max(len(chromosome), 1)
    
    def _calculate_workload_balance(
        self, 
        by_faculty_day: Dict[Tuple[str, str], List[Gene]]
    ) -> float:
        """Calculate workload balance across faculty days."""
        faculty_daily_loads = defaultdict(list)
        
        for (faculty_id, day), genes in by_faculty_day.items():
            faculty_daily_loads[faculty_id].append(len(genes))
        
        # Calculate variance for each faculty
        total_balance = 0
        for faculty_id, daily_loads in faculty_daily_loads.items():
            if len(daily_loads) > 1:
                mean_load = sum(daily_loads) / len(daily_loads)
                variance = sum((x - mean_load) ** 2 for x in daily_loads) / len(daily_loads)
                # Lower variance = better balance = higher score
                total_balance += 1 / (1 + variance)
        
        return total_balance / max(len(faculty_daily_loads), 1)
    
    def _calculate_room_stability(
        self, 
        by_subject: Dict[str, List[Gene]]
    ) -> float:
        """Calculate score for same-room assignments per subject."""
        stability_score = 0
        
        for subject_id, genes in by_subject.items():
            if len(genes) < 2:
                continue
            
            # Count most common room
            room_counts = defaultdict(int)
            for gene in genes:
                room_counts[gene.classroom_id] += 1
            
            max_count = max(room_counts.values())
            # Score based on consistency
            stability_score += max_count / len(genes)
        
        return stability_score / max(len(by_subject), 1)
    
    def _calculate_consecutive_penalty(
        self, 
        by_batch_day: Dict[Tuple[str, str], List[Gene]]
    ) -> float:
        """Calculate penalty for too many consecutive lectures."""
        penalty = 0
        max_consecutive = 3
        
        for (batch_id, day), genes in by_batch_day.items():
            if len(genes) <= max_consecutive:
                continue
            
            # Sort by slot order
            sorted_genes = sorted(
                genes, 
                key=lambda g: self._slot_order.get(g.time_slot_id, 0)
            )
            
            # Find consecutive sequences
            consecutive = 1
            for i in range(len(sorted_genes) - 1):
                order1 = self._slot_order.get(sorted_genes[i].time_slot_id, 0)
                order2 = self._slot_order.get(sorted_genes[i+1].time_slot_id, 0)
                
                if order2 - order1 == 1:
                    consecutive += 1
                    if consecutive > max_consecutive:
                        penalty += 1
                else:
                    consecutive = 1
        
        return penalty
    
    def _calculate_clustering_score(self, chromosome: Chromosome) -> float:
        """
        Calculate department clustering score.
        
        Rewards scheduling same-department classes in adjacent rooms/times.
        """
        # This would require department info - simplified version
        return 0.5  # Placeholder - implement with department data
    
    def _calculate_elective_distribution(self, chromosome: Chromosome) -> float:
        """
        Calculate elective distribution score.
        
        Rewards spreading electives across different days.
        """
        elective_days = defaultdict(set)
        
        for gene in chromosome.genes:
            # Assume lab subjects are often electives (simplification)
            if gene.is_lab:
                slot = self.time_slots.get(gene.time_slot_id, {})
                day = slot.get("day_of_week", "unknown")
                elective_days[gene.subject_id].add(day)
        
        if not elective_days:
            return 0.5
        
        # Score based on day variety
        avg_days = sum(len(days) for days in elective_days.values()) / len(elective_days)
        return min(avg_days / 3, 1.0)  # Normalize to [0, 1]
    
    def _check_hard_violations(self, chromosome: Chromosome) -> int:
        """
        Check for hard constraint violations.
        
        Should be 0 if chromosome came from CP-SAT.
        """
        violations = 0
        
        # Check teacher overlap (same faculty, same time slot)
        faculty_slots = set()
        for gene in chromosome.genes:
            key = (gene.faculty_id, gene.time_slot_id)
            if key in faculty_slots:
                violations += 1
            faculty_slots.add(key)
        
        # Check room overlap (same room, same time slot)
        room_slots = set()
        for gene in chromosome.genes:
            key = (gene.classroom_id, gene.time_slot_id)
            if key in room_slots:
                violations += 1
            room_slots.add(key)
        
        # Check batch overlap (same batch, same time slot)
        batch_slots = set()
        for gene in chromosome.genes:
            key = (gene.batch_id, gene.time_slot_id)
            if key in batch_slots:
                violations += 1
            batch_slots.add(key)
        
        return violations
```

---

## Phase 5: Genetic Optimizer (Day 5-7)

### Step 8: Create Genetic Optimizer with DEAP

**File:** `services/scheduler/genetic_optimizer.py`

```python
"""
Genetic Algorithm Optimizer using DEAP

Optimizes timetable soft constraints through evolutionary operations:
- Selection: Tournament selection
- Crossover: Two-point crossover preserving feasibility
- Mutation: Smart mutation within valid domains
"""

import random
from typing import List, Tuple, Callable, Optional
from dataclasses import dataclass
from deap import base, creator, tools, algorithms
import numpy as np

from .chromosome_encoder import Chromosome, ChromosomeEncoder, Gene
from .fitness_calculator import FitnessCalculator, FitnessBreakdown
from .config import GAConfig, DEFAULT_CONFIG
from .utils.logger import ga_logger


@dataclass
class EvolutionStats:
    """Statistics from the evolution process."""
    generations_run: int
    best_fitness: float
    avg_fitness: float
    fitness_history: List[float]
    convergence_generation: int
    total_evaluations: int


class GeneticOptimizer:
    """
    Genetic Algorithm optimizer for timetable soft constraints.
    
    Uses DEAP library for evolutionary operations with custom
    operators designed for timetable scheduling.
    """
    
    def __init__(
        self,
        encoder: ChromosomeEncoder,
        fitness_calculator: FitnessCalculator,
        config: GAConfig = None
    ):
        """
        Initialize the genetic optimizer.
        
        Args:
            encoder: Chromosome encoder for domain operations
            fitness_calculator: Fitness function calculator
            config: GA configuration parameters
        """
        self.encoder = encoder
        self.fitness_calc = fitness_calculator
        self.config = config or DEFAULT_CONFIG.ga
        
        # Initialize DEAP framework
        self._setup_deap()
        
        ga_logger.info(
            f"GeneticOptimizer initialized: "
            f"pop={self.config.population_size}, "
            f"gens={self.config.generations}, "
            f"mut={self.config.mutation_rate}, "
            f"cx={self.config.crossover_rate}"
        )
    
    def _setup_deap(self):
        """Configure DEAP types and operators."""
        # Create fitness class (maximizing)
        if not hasattr(creator, "FitnessMax"):
            creator.create("FitnessMax", base.Fitness, weights=(1.0,))
        
        # Create individual class
        if not hasattr(creator, "Individual"):
            creator.create("Individual", list, fitness=creator.FitnessMax)
        
        # Setup toolbox
        self.toolbox = base.Toolbox()
        
        # Register genetic operators
        self.toolbox.register("select", tools.selTournament, 
                             tournsize=self.config.tournament_size)
        self.toolbox.register("mate", self._crossover)
        self.toolbox.register("mutate", self._mutate)
        self.toolbox.register("evaluate", self._evaluate)
    
    def optimize(
        self, 
        seed_chromosomes: List[Chromosome],
        callback: Optional[Callable[[int, float], None]] = None
    ) -> Tuple[Chromosome, EvolutionStats]:
        """
        Run genetic algorithm optimization.
        
        Args:
            seed_chromosomes: Initial population from CP-SAT
            callback: Optional progress callback(generation, best_fitness)
            
        Returns:
            Tuple of (best_chromosome, evolution_statistics)
        """
        ga_logger.info(f"Starting optimization with {len(seed_chromosomes)} seeds")
        
        # Create initial population
        population = self._create_population(seed_chromosomes)
        
        # Evaluate initial population
        self._evaluate_population(population)
        
        # Track statistics
        stats = tools.Statistics(lambda ind: ind.fitness.values[0])
        stats.register("avg", np.mean)
        stats.register("max", np.max)
        stats.register("min", np.min)
        
        # Evolution tracking
        fitness_history = []
        best_fitness = float('-inf')
        stagnation_counter = 0
        convergence_gen = 0
        total_evals = len(population)
        
        # Hall of fame for elitism
        hof = tools.HallOfFame(self.config.elite_size)
        hof.update(population)
        
        # Main evolution loop
        for gen in range(self.config.generations):
            # Select next generation
            offspring = self.toolbox.select(population, len(population) - self.config.elite_size)
            offspring = list(map(self.toolbox.clone, offspring))
            
            # Apply crossover
            for child1, child2 in zip(offspring[::2], offspring[1::2]):
                if random.random() < self.config.crossover_rate:
                    self.toolbox.mate(child1, child2)
                    del child1.fitness.values
                    del child2.fitness.values
            
            # Apply mutation
            for mutant in offspring:
                if random.random() < self.config.mutation_rate:
                    self.toolbox.mutate(mutant)
                    del mutant.fitness.values
            
            # Evaluate individuals with invalid fitness
            invalid_ind = [ind for ind in offspring if not ind.fitness.valid]
            for ind in invalid_ind:
                ind.fitness.values = self.toolbox.evaluate(ind)
            total_evals += len(invalid_ind)
            
            # Elitism: add best from hall of fame
            population[:] = offspring + list(hof)
            hof.update(population)
            
            # Record statistics
            record = stats.compile(population)
            current_best = record["max"]
            fitness_history.append(current_best)
            
            # Check for improvement
            if current_best > best_fitness:
                best_fitness = current_best
                stagnation_counter = 0
                convergence_gen = gen
            else:
                stagnation_counter += 1
            
            # Progress callback
            if callback:
                callback(gen, current_best)
            
            # Log progress
            if gen % 10 == 0 or gen == self.config.generations - 1:
                ga_logger.info(
                    f"Gen {gen:3d}: best={current_best:.2f}, "
                    f"avg={record['avg']:.2f}, stag={stagnation_counter}"
                )
            
            # Early stopping on stagnation
            if stagnation_counter >= self.config.stagnation_limit:
                ga_logger.info(f"Converged at generation {gen} (stagnation limit)")
                break
        
        # Get best individual
        best_individual = hof[0]
        best_chromosome = self._individual_to_chromosome(best_individual)
        best_chromosome.fitness = best_individual.fitness.values[0]
        best_chromosome.generation = convergence_gen
        
        # Compile statistics
        evolution_stats = EvolutionStats(
            generations_run=gen + 1,
            best_fitness=best_fitness,
            avg_fitness=np.mean([ind.fitness.values[0] for ind in population]),
            fitness_history=fitness_history,
            convergence_generation=convergence_gen,
            total_evaluations=total_evals
        )
        
        ga_logger.info(
            f"Optimization complete: best_fitness={best_fitness:.2f}, "
            f"generations={gen+1}, evaluations={total_evals}"
        )
        
        return best_chromosome, evolution_stats
    
    def _create_population(self, seeds: List[Chromosome]) -> List:
        """Create initial population from seed chromosomes."""
        population = []
        
        # Convert seeds to DEAP individuals
        for seed in seeds:
            individual = creator.Individual(seed.genes)
            population.append(individual)
        
        # Generate additional individuals through mutation if needed
        while len(population) < self.config.population_size:
            # Clone a random seed and mutate
            base = random.choice(seeds)
            individual = creator.Individual([g for g in base.genes])
            
            # Apply multiple mutations to create diversity
            for _ in range(random.randint(3, 10)):
                self._mutate(individual)
            
            population.append(individual)
        
        return population[:self.config.population_size]
    
    def _evaluate_population(self, population: List):
        """Evaluate fitness of all individuals."""
        for individual in population:
            if not individual.fitness.valid:
                individual.fitness.values = self._evaluate(individual)
    
    def _evaluate(self, individual: List[Gene]) -> Tuple[float]:
        """
        Evaluate fitness of an individual.
        
        Args:
            individual: List of genes representing a timetable
            
        Returns:
            Tuple containing fitness score
        """
        chromosome = Chromosome(genes=list(individual))
        fitness = self.fitness_calc.calculate(chromosome)
        return (fitness,)
    
    def _crossover(self, ind1: List, ind2: List) -> Tuple[List, List]:
        """
        Two-point crossover that preserves feasibility.
        
        Swaps genes between two parents while trying to
        maintain hard constraint satisfaction.
        """
        if len(ind1) < 4 or len(ind2) < 4:
            return ind1, ind2
        
        # Select two crossover points
        size = min(len(ind1), len(ind2))
        pt1 = random.randint(1, size // 2)
        pt2 = random.randint(size // 2 + 1, size - 1)
        
        # Swap segments
        ind1[pt1:pt2], ind2[pt1:pt2] = ind2[pt1:pt2].copy(), ind1[pt1:pt2].copy()
        
        # Repair any obvious conflicts
        self._repair_individual(ind1)
        self._repair_individual(ind2)
        
        return ind1, ind2
    
    def _mutate(self, individual: List) -> Tuple[List]:
        """
        Smart mutation that modifies genes within valid domains.
        
        Mutation types:
        1. Time slot change
        2. Room change (within valid types)
        3. Faculty swap (qualified only)
        """
        if not individual:
            return (individual,)
        
        # Select random gene to mutate
        idx = random.randint(0, len(individual) - 1)
        gene = individual[idx]
        
        # Get valid domain for this gene
        domain = self.encoder.get_gene_domain(gene)
        
        # Choose mutation type
        mutation_type = random.choice(["time_slot", "classroom", "time_slot"])
        
        if mutation_type == "time_slot" and domain["time_slots"]:
            new_slot = random.choice(domain["time_slots"])
            individual[idx] = Gene(
                subject_id=gene.subject_id,
                faculty_id=gene.faculty_id,
                classroom_id=gene.classroom_id,
                time_slot_id=new_slot,
                batch_id=gene.batch_id,
                is_lab=gene.is_lab
            )
        
        elif mutation_type == "classroom" and domain["classrooms"]:
            new_room = random.choice(domain["classrooms"])
            individual[idx] = Gene(
                subject_id=gene.subject_id,
                faculty_id=gene.faculty_id,
                classroom_id=new_room,
                time_slot_id=gene.time_slot_id,
                batch_id=gene.batch_id,
                is_lab=gene.is_lab
            )
        
        return (individual,)
    
    def _repair_individual(self, individual: List):
        """
        Repair an individual to fix obvious constraint violations.
        
        Currently handles:
        - Duplicate time slot assignments for same batch
        """
        batch_slots = {}
        
        for i, gene in enumerate(individual):
            key = (gene.batch_id, gene.time_slot_id)
            if key in batch_slots:
                # Conflict detected - change time slot
                domain = self.encoder.get_gene_domain(gene)
                available_slots = [
                    s for s in domain["time_slots"]
                    if (gene.batch_id, s) not in batch_slots
                ]
                if available_slots:
                    new_slot = random.choice(available_slots)
                    individual[i] = Gene(
                        subject_id=gene.subject_id,
                        faculty_id=gene.faculty_id,
                        classroom_id=gene.classroom_id,
                        time_slot_id=new_slot,
                        batch_id=gene.batch_id,
                        is_lab=gene.is_lab
                    )
                    batch_slots[(gene.batch_id, new_slot)] = i
            else:
                batch_slots[key] = i
    
    def _individual_to_chromosome(self, individual: List) -> Chromosome:
        """Convert DEAP individual back to Chromosome."""
        return Chromosome(genes=list(individual))
```

---

## Phase 6: CP-SAT Multi-Solution (Day 7-8)

### Step 9: Modify NEP Scheduler for Multiple Solutions

Add the following method to `services/scheduler/nep_scheduler.py`:

**Location:** After the existing `solve_for_batch()` method

```python
# Add this import at the top of the file
from ortools.sat.python import cp_model

# Add this class before the solve_for_batch method
class SolutionCollector(cp_model.CpSolverSolutionCallback):
    """Callback to collect multiple solutions from CP-SAT."""
    
    def __init__(self, variables, limit):
        cp_model.CpSolverSolutionCallback.__init__(self)
        self._variables = variables
        self._solution_limit = limit
        self._solutions = []
    
    def on_solution_callback(self):
        """Called when a solution is found."""
        if len(self._solutions) < self._solution_limit:
            solution = {}
            for name, var in self._variables.items():
                solution[name] = self.Value(var)
            self._solutions.append(solution)
    
    def solution_count(self):
        return len(self._solutions)
    
    def get_solutions(self):
        return self._solutions


# Add this method to the NEPScheduler class
def solve_for_multiple_seeds(
    self,
    batch_id: str,
    num_solutions: int = 10,
    time_limit_seconds: int = 300
) -> List[Dict]:
    """
    Generate multiple feasible solutions to seed the genetic algorithm.
    
    Args:
        batch_id: UUID of the batch to schedule
        num_solutions: Number of seed solutions to generate
        time_limit_seconds: Maximum solving time
        
    Returns:
        List of solution dictionaries, each containing assignments
    """
    self.logger.info(f"Generating {num_solutions} seed solutions for batch {batch_id}")
    
    # Fetch data and create model (reuse existing methods)
    batch_data = self.fetch_batch_data(batch_id)
    if not batch_data:
        return []
    
    # Create a fresh model
    model = cp_model.CpModel()
    variables = self.create_variables(model, batch_data)
    
    # Add all constraints
    self.add_teacher_constraints(model, variables, batch_data)
    self.add_room_constraints(model, variables, batch_data)
    self.add_batch_constraints(model, variables, batch_data)
    self.add_availability_constraints(model, variables, batch_data)
    
    # Create solver with solution callback
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 8
    solver.parameters.enumerate_all_solutions = True
    
    # Collect solutions
    collector = SolutionCollector(variables, num_solutions)
    status = solver.Solve(model, collector)
    
    self.logger.info(f"Found {collector.solution_count()} solutions")
    
    # Convert solutions to assignment format
    solutions = []
    for raw_solution in collector.get_solutions():
        assignments = self._extract_assignments(raw_solution, variables, batch_data)
        solutions.append({
            "batch_id": batch_id,
            "assignments": assignments,
            "status": "feasible"
        })
    
    return solutions


def _extract_assignments(
    self, 
    raw_solution: Dict, 
    variables: Dict, 
    batch_data: Dict
) -> List[Dict]:
    """Extract assignment records from raw CP-SAT solution."""
    assignments = []
    
    for key, value in raw_solution.items():
        if value == 1 and key.startswith("assign_"):
            parts = key.split("_")
            # Parse: assign_{subject}_{faculty}_{room}_{slot}
            if len(parts) >= 5:
                assignments.append({
                    "subject_id": parts[1],
                    "faculty_id": parts[2],
                    "classroom_id": parts[3],
                    "time_slot_id": parts[4],
                    "batch_id": batch_data["batch"]["id"],
                    "is_lab": False  # Determine from subject data
                })
    
    return assignments
```

---

## Phase 7: Hybrid Orchestrator (Day 8-9)

### Step 10: Create Hybrid Orchestrator

**File:** `services/scheduler/hybrid_orchestrator.py`

```python
"""
Hybrid Orchestrator

Coordinates the two-phase scheduling pipeline:
1. CP-SAT generates feasible seed solutions
2. Genetic Algorithm optimizes soft constraints
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, asdict

from .nep_scheduler import NEPScheduler
from .genetic_optimizer import GeneticOptimizer, EvolutionStats
from .chromosome_encoder import ChromosomeEncoder, Chromosome
from .fitness_calculator import FitnessCalculator
from .config import HybridConfig, DEFAULT_CONFIG
from .utils.db_client import get_supabase_client
from .utils.logger import scheduler_logger


@dataclass
class PipelineResult:
    """Result from the hybrid scheduling pipeline."""
    task_id: str
    batch_id: str
    status: str  # "success", "failed", "partial"
    best_fitness: float
    timetable_id: Optional[str]
    num_assignments: int
    cpsat_solutions: int
    ga_generations: int
    total_time_seconds: float
    error_message: Optional[str] = None


class HybridOrchestrator:
    """
    Orchestrates the hybrid CP-SAT + GA scheduling pipeline.
    
    Workflow:
    1. Create task record in database
    2. Run CP-SAT to generate seed solutions
    3. Encode solutions as chromosomes
    4. Run GA optimization
    5. Decode best solution and save to database
    6. Update task status
    """
    
    def __init__(self, config: HybridConfig = None):
        """
        Initialize the orchestrator.
        
        Args:
            config: Pipeline configuration
        """
        self.config = config or DEFAULT_CONFIG
        self.supabase = get_supabase_client()
        self.logger = scheduler_logger
        
        # Initialize CP-SAT scheduler
        self.cpsat = NEPScheduler()
        
        # GA components initialized per-run (need batch-specific data)
        self.encoder: Optional[ChromosomeEncoder] = None
        self.fitness_calc: Optional[FitnessCalculator] = None
        self.ga: Optional[GeneticOptimizer] = None
    
    def run(
        self,
        batch_id: str,
        college_id: str,
        created_by: str,
        progress_callback: Optional[Callable[[str, float], None]] = None
    ) -> PipelineResult:
        """
        Execute the full hybrid scheduling pipeline.
        
        Args:
            batch_id: UUID of the batch to schedule
            college_id: UUID of the college
            created_by: UUID of the user initiating the task
            progress_callback: Optional callback(stage, progress)
            
        Returns:
            PipelineResult with status and metrics
        """
        start_time = datetime.now()
        task_id = str(uuid.uuid4())
        
        self.logger.info(f"Starting pipeline for batch {batch_id}, task {task_id}")
        
        try:
            # Step 1: Create task record
            self._create_task(task_id, batch_id, college_id, created_by)
            self._update_task_status(task_id, "running", "Initializing pipeline")
            
            if progress_callback:
                progress_callback("init", 0.05)
            
            # Step 2: Fetch domain data for encoder
            self._update_task_status(task_id, "running", "Fetching domain data")
            domain_data = self._fetch_domain_data(batch_id, college_id)
            
            if progress_callback:
                progress_callback("fetch", 0.10)
            
            # Step 3: Initialize GA components
            self._initialize_ga_components(domain_data)
            
            # Step 4: Run CP-SAT for seed solutions
            self._update_task_status(task_id, "running", "Running CP-SAT solver")
            
            if progress_callback:
                progress_callback("cpsat", 0.15)
            
            seeds = self.cpsat.solve_for_multiple_seeds(
                batch_id,
                num_solutions=self.config.cpsat.num_solutions,
                time_limit_seconds=self.config.cpsat.max_time_seconds
            )
            
            if not seeds:
                raise ValueError("CP-SAT failed to find any feasible solutions")
            
            self.logger.info(f"CP-SAT generated {len(seeds)} seed solutions")
            
            if progress_callback:
                progress_callback("cpsat_done", 0.30)
            
            # Step 5: Encode seeds as chromosomes
            seed_chromosomes = [
                self.encoder.encode_from_cpsat(seed) 
                for seed in seeds
            ]
            
            # Step 6: Run GA optimization
            self._update_task_status(task_id, "running", "Running genetic optimization")
            
            def ga_progress(gen, fitness):
                if progress_callback:
                    progress = 0.30 + (gen / self.config.ga.generations) * 0.50
                    progress_callback("ga", min(progress, 0.80))
            
            best_chromosome, ga_stats = self.ga.optimize(
                seed_chromosomes,
                callback=ga_progress
            )
            
            self.logger.info(f"GA complete: fitness={best_chromosome.fitness:.2f}")
            
            if progress_callback:
                progress_callback("ga_done", 0.85)
            
            # Step 7: Save best solution to database
            self._update_task_status(task_id, "running", "Saving results")
            
            timetable_id = self._save_solution(
                task_id, batch_id, college_id, best_chromosome, ga_stats
            )
            
            # Step 8: Update task to completed
            elapsed = (datetime.now() - start_time).total_seconds()
            self._update_task_status(task_id, "completed", "Pipeline completed successfully")
            
            if progress_callback:
                progress_callback("done", 1.0)
            
            return PipelineResult(
                task_id=task_id,
                batch_id=batch_id,
                status="success",
                best_fitness=best_chromosome.fitness,
                timetable_id=timetable_id,
                num_assignments=len(best_chromosome.genes),
                cpsat_solutions=len(seeds),
                ga_generations=ga_stats.generations_run,
                total_time_seconds=elapsed
            )
            
        except Exception as e:
            self.logger.error(f"Pipeline failed: {str(e)}", exc_info=True)
            elapsed = (datetime.now() - start_time).total_seconds()
            
            self._update_task_status(task_id, "failed", str(e))
            
            return PipelineResult(
                task_id=task_id,
                batch_id=batch_id,
                status="failed",
                best_fitness=0.0,
                timetable_id=None,
                num_assignments=0,
                cpsat_solutions=0,
                ga_generations=0,
                total_time_seconds=elapsed,
                error_message=str(e)
            )
    
    def _fetch_domain_data(self, batch_id: str, college_id: str) -> Dict:
        """Fetch all domain data needed for encoding."""
        
        # Fetch subjects for this batch
        subjects = self.supabase.table("subjects").select("*").eq(
            "college_id", college_id
        ).execute().data
        
        # Fetch faculty
        faculty = self.supabase.table("faculty").select("*").eq(
            "college_id", college_id
        ).execute().data
        
        # Fetch classrooms
        classrooms = self.supabase.table("classrooms").select("*").eq(
            "college_id", college_id
        ).execute().data
        
        # Fetch time slots
        time_slots = self.supabase.table("time_slots").select("*").eq(
            "college_id", college_id
        ).execute().data
        
        # Fetch batch info
        batch = self.supabase.table("batches").select("*").eq(
            "id", batch_id
        ).single().execute().data
        
        return {
            "subjects": subjects,
            "faculty": faculty,
            "classrooms": classrooms,
            "time_slots": time_slots,
            "batches": [batch]
        }
    
    def _initialize_ga_components(self, domain_data: Dict):
        """Initialize GA components with domain data."""
        
        self.encoder = ChromosomeEncoder(
            subjects=domain_data["subjects"],
            faculty=domain_data["faculty"],
            classrooms=domain_data["classrooms"],
            time_slots=domain_data["time_slots"],
            batches=domain_data["batches"]
        )
        
        self.fitness_calc = FitnessCalculator(
            time_slots=domain_data["time_slots"]
        )
        
        self.ga = GeneticOptimizer(
            encoder=self.encoder,
            fitness_calculator=self.fitness_calc,
            config=self.config.ga
        )
    
    def _create_task(
        self, 
        task_id: str, 
        batch_id: str, 
        college_id: str, 
        created_by: str
    ):
        """Create task record in database."""
        self.supabase.table("timetable_generation_tasks").insert({
            "id": task_id,
            "college_id": college_id,
            "batch_id": batch_id,
            "status": "pending",
            "created_by": created_by,
            "algorithm_config": asdict(self.config)
        }).execute()
    
    def _update_task_status(self, task_id: str, status: str, message: str):
        """Update task status in database."""
        self.supabase.table("timetable_generation_tasks").update({
            "status": status,
            "progress_message": message,
            "updated_at": datetime.now().isoformat()
        }).eq("id", task_id).execute()
    
    def _save_solution(
        self,
        task_id: str,
        batch_id: str,
        college_id: str,
        chromosome: Chromosome,
        ga_stats: EvolutionStats
    ) -> str:
        """Save the best solution to database."""
        
        # Create generated_timetables record
        timetable_id = str(uuid.uuid4())
        
        self.supabase.table("generated_timetables").insert({
            "id": timetable_id,
            "task_id": task_id,
            "batch_id": batch_id,
            "college_id": college_id,
            "fitness_score": chromosome.fitness,
            "is_published": False,
            "version": 1
        }).execute()
        
        # Save scheduled_classes
        records = self.encoder.decode_to_db(chromosome, timetable_id)
        
        # Batch insert
        if records:
            self.supabase.table("scheduled_classes").insert(records).execute()
        
        # Save algorithm metrics
        self.supabase.table("algorithm_execution_metrics").insert({
            "task_id": task_id,
            "timetable_id": timetable_id,
            "algorithm_name": "hybrid_cpsat_ga",
            "execution_time_ms": ga_stats.generations_run * 100,  # Approximate
            "iterations": ga_stats.generations_run,
            "final_score": chromosome.fitness,
            "metrics_json": {
                "best_fitness": ga_stats.best_fitness,
                "avg_fitness": ga_stats.avg_fitness,
                "convergence_gen": ga_stats.convergence_generation,
                "total_evaluations": ga_stats.total_evaluations,
                "fitness_history": ga_stats.fitness_history[-10:]  # Last 10 only
            }
        }).execute()
        
        self.logger.info(f"Saved timetable {timetable_id} with {len(records)} classes")
        
        return timetable_id


# CLI entry point
def main():
    """Command-line entry point for the scheduler."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run hybrid timetable scheduler")
    parser.add_argument("--batch-id", required=True, help="Batch UUID to schedule")
    parser.add_argument("--college-id", required=True, help="College UUID")
    parser.add_argument("--user-id", required=True, help="User UUID initiating task")
    parser.add_argument("--output", help="Output file for results JSON")
    
    args = parser.parse_args()
    
    orchestrator = HybridOrchestrator()
    
    result = orchestrator.run(
        batch_id=args.batch_id,
        college_id=args.college_id,
        created_by=args.user_id
    )
    
    # Output result
    result_dict = asdict(result)
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result_dict, f, indent=2, default=str)
    
    print(json.dumps(result_dict, indent=2, default=str))
    
    return 0 if result.status == "success" else 1


if __name__ == "__main__":
    exit(main())
```

---

## Phase 8: API Integration (Day 9-10)

### Step 11: Create Scheduler Generate API

**File:** `src/app/api/scheduler/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { spawn } from "child_process";
import path from "path";

interface GenerateRequest {
  batchId: string;
  collegeId: string;
}

interface TaskResponse {
  taskId: string;
  status: string;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body: GenerateRequest = await request.json();
    const { batchId, collegeId } = body;

    if (!batchId || !collegeId) {
      return NextResponse.json(
        { error: "Missing required fields: batchId, collegeId" },
        { status: 400 }
      );
    }

    // Verify user has permission for this college
    const { data: profile } = await supabase
      .from("profiles")
      .select("college_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.college_id !== collegeId) {
      return NextResponse.json(
        { error: "Access denied to this college" },
        { status: 403 }
      );
    }

    // Spawn Python process
    const pythonScript = path.join(
      process.cwd(),
      "services",
      "scheduler",
      "hybrid_orchestrator.py"
    );

    const taskId = await runSchedulerAsync(
      pythonScript,
      batchId,
      collegeId,
      user.id
    );

    const response: TaskResponse = {
      taskId,
      status: "started",
      message: "Timetable generation started. Poll status endpoint for updates.",
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    console.error("Scheduler API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function runSchedulerAsync(
  scriptPath: string,
  batchId: string,
  collegeId: string,
  userId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use the virtual environment Python
    const pythonPath = path.join(process.cwd(), ".venv", "Scripts", "python.exe");

    const process = spawn(pythonPath, [
      scriptPath,
      "--batch-id",
      batchId,
      "--college-id",
      collegeId,
      "--user-id",
      userId,
    ]);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
      console.error("Scheduler stderr:", data.toString());
    });

    process.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result.task_id);
        } catch {
          reject(new Error("Failed to parse scheduler output"));
        }
      } else {
        reject(new Error(`Scheduler exited with code ${code}: ${stderr}`));
      }
    });

    // Return task ID immediately (from first output line)
    // The process continues running in background
    setTimeout(() => {
      const lines = stdout.split("\n");
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.task_id) {
            resolve(data.task_id);
            return;
          }
        } catch {
          continue;
        }
      }
    }, 1000);
  });
}
```

---

### Step 12: Create Scheduler Status API

**File:** `src/app/api/scheduler/status/[taskId]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface TaskStatus {
  taskId: string;
  status: string;
  progressMessage: string;
  timetableId: string | null;
  fitnessScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse> {
  try {
    const { taskId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch task status
    const { data: task, error: taskError } = await supabase
      .from("timetable_generation_tasks")
      .select(
        `
        id,
        status,
        progress_message,
        created_at,
        updated_at,
        generated_timetables (
          id,
          fitness_score
        )
      `
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check user has access (same college)
    const { data: profile } = await supabase
      .from("profiles")
      .select("college_id")
      .eq("id", user.id)
      .single();

    const response: TaskStatus = {
      taskId: task.id,
      status: task.status,
      progressMessage: task.progress_message || "",
      timetableId: task.generated_timetables?.[0]?.id || null,
      fitnessScore: task.generated_timetables?.[0]?.fitness_score || null,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## Phase 9: Testing & Validation (Day 10-11)

### Step 13: Create Unit Tests

**File:** `services/scheduler/tests/test_chromosome_encoder.py`

```python
"""Unit tests for ChromosomeEncoder."""

import pytest
from services.scheduler.chromosome_encoder import (
    ChromosomeEncoder, Chromosome, Gene
)


@pytest.fixture
def sample_data():
    """Create sample domain data for testing."""
    return {
        "subjects": [
            {"id": "sub1", "name": "Math", "department_id": "dept1"},
            {"id": "sub2", "name": "Physics", "department_id": "dept1"},
        ],
        "faculty": [
            {"id": "fac1", "name": "Dr. Smith", "department_id": "dept1"},
            {"id": "fac2", "name": "Dr. Jones", "department_id": "dept1"},
        ],
        "classrooms": [
            {"id": "room1", "name": "A101", "room_type": "classroom"},
            {"id": "room2", "name": "Lab1", "room_type": "lab"},
        ],
        "time_slots": [
            {"id": "slot1", "day_of_week": "monday", "start_time": "09:00"},
            {"id": "slot2", "day_of_week": "monday", "start_time": "10:00"},
        ],
        "batches": [
            {"id": "batch1", "name": "CS-2024"},
        ],
    }


@pytest.fixture
def encoder(sample_data):
    """Create encoder instance."""
    return ChromosomeEncoder(
        subjects=sample_data["subjects"],
        faculty=sample_data["faculty"],
        classrooms=sample_data["classrooms"],
        time_slots=sample_data["time_slots"],
        batches=sample_data["batches"],
    )


def test_encoder_initialization(encoder, sample_data):
    """Test encoder initializes correctly."""
    assert len(encoder.subjects) == 2
    assert len(encoder.faculty) == 2
    assert len(encoder.classrooms) == 2
    assert len(encoder.time_slots) == 2


def test_encode_from_cpsat(encoder):
    """Test encoding CP-SAT solution to chromosome."""
    cpsat_solution = {
        "assignments": [
            {
                "subject_id": "sub1",
                "faculty_id": "fac1",
                "classroom_id": "room1",
                "time_slot_id": "slot1",
                "batch_id": "batch1",
                "is_lab": False,
            }
        ]
    }
    
    chromosome = encoder.encode_from_cpsat(cpsat_solution)
    
    assert len(chromosome) == 1
    assert chromosome[0].subject_id == "sub1"
    assert chromosome[0].faculty_id == "fac1"


def test_decode_to_db(encoder):
    """Test decoding chromosome to database records."""
    chromosome = Chromosome(genes=[
        Gene(
            subject_id="sub1",
            faculty_id="fac1",
            classroom_id="room1",
            time_slot_id="slot1",
            batch_id="batch1",
            is_lab=False,
        )
    ])
    
    records = encoder.decode_to_db(chromosome, "timetable123")
    
    assert len(records) == 1
    assert records[0]["timetable_id"] == "timetable123"
    assert records[0]["subject_id"] == "sub1"


def test_get_gene_domain(encoder):
    """Test getting valid domain for a gene."""
    gene = Gene(
        subject_id="sub1",
        faculty_id="fac1",
        classroom_id="room1",
        time_slot_id="slot1",
        batch_id="batch1",
        is_lab=False,
    )
    
    domain = encoder.get_gene_domain(gene)
    
    assert "faculty" in domain
    assert "classrooms" in domain
    assert "time_slots" in domain
    assert len(domain["time_slots"]) == 2
```

---

### Step 14: Create Integration Test

**File:** `services/scheduler/tests/test_integration.py`

```python
"""Integration tests for the hybrid scheduler pipeline."""

import pytest
from unittest.mock import Mock, patch
from services.scheduler.hybrid_orchestrator import HybridOrchestrator, PipelineResult
from services.scheduler.config import HybridConfig, CPSATConfig, GAConfig


@pytest.fixture
def mock_supabase():
    """Create mock Supabase client."""
    mock = Mock()
    
    # Mock table queries
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock.table.return_value.insert.return_value.execute.return_value = Mock()
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value = Mock()
    
    return mock


@pytest.fixture
def test_config():
    """Create test configuration with reduced parameters."""
    return HybridConfig(
        cpsat=CPSATConfig(
            max_time_seconds=30,
            num_solutions=3,
        ),
        ga=GAConfig(
            population_size=20,
            generations=10,
            stagnation_limit=5,
        ),
    )


@patch("services.scheduler.hybrid_orchestrator.get_supabase_client")
def test_pipeline_initialization(mock_get_client, mock_supabase, test_config):
    """Test orchestrator initializes correctly."""
    mock_get_client.return_value = mock_supabase
    
    orchestrator = HybridOrchestrator(config=test_config)
    
    assert orchestrator.config.cpsat.max_time_seconds == 30
    assert orchestrator.config.ga.population_size == 20


@patch("services.scheduler.hybrid_orchestrator.get_supabase_client")
def test_pipeline_handles_no_solutions(mock_get_client, mock_supabase, test_config):
    """Test pipeline handles case when CP-SAT finds no solutions."""
    mock_get_client.return_value = mock_supabase
    
    orchestrator = HybridOrchestrator(config=test_config)
    
    # Mock CP-SAT returning no solutions
    with patch.object(orchestrator.cpsat, "solve_for_multiple_seeds", return_value=[]):
        result = orchestrator.run(
            batch_id="test-batch",
            college_id="test-college",
            created_by="test-user",
        )
    
    assert result.status == "failed"
    assert "no feasible solutions" in result.error_message.lower()
```

---

### Step 15: Run Tests

**Command to run all tests:**

```bash
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run tests with pytest
pytest services/scheduler/tests/ -v --tb=short

# Run with coverage
pytest services/scheduler/tests/ -v --cov=services/scheduler --cov-report=html
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. DEAP Import Error

```
ModuleNotFoundError: No module named 'deap'
```

**Solution:**
```bash
pip install deap>=1.4.0
```

#### 2. CP-SAT Timeout

```
CP-SAT solver timeout - no solutions found
```

**Solution:**
- Increase `max_time_seconds` in `CPSATConfig`
- Reduce problem size (fewer subjects/slots)
- Check for over-constrained problems

#### 3. GA Stagnation

```
Early convergence detected at generation 5
```

**Solution:**
- Increase `mutation_rate` to 0.2-0.3
- Reduce `tournament_size` for less selection pressure
- Increase `population_size`

#### 4. Database Connection Error

```
ValueError: Missing Supabase credentials
```

**Solution:**
- Verify `.env` file exists with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url
  SUPABASE_SERVICE_ROLE_KEY=your_key
  ```
- Ensure `.env` is loaded (check dotenv import)

#### 5. API Subprocess Error

```
Error: Scheduler exited with code 1
```

**Solution:**
- Check Python path in API route
- Verify virtual environment activation
- Check Python script permissions
- Review stderr output for details

---

## Performance Tuning

### CP-SAT Parameters

| Parameter | Default | High Performance | Memory Constrained |
|-----------|---------|------------------|-------------------|
| `max_time_seconds` | 300 | 600 | 120 |
| `num_workers` | 8 | 16 | 4 |
| `num_solutions` | 10 | 20 | 5 |

### GA Parameters

| Parameter | Default | Fast Convergence | High Quality |
|-----------|---------|------------------|--------------|
| `population_size` | 100 | 50 | 200 |
| `generations` | 200 | 100 | 500 |
| `mutation_rate` | 0.15 | 0.25 | 0.10 |
| `crossover_rate` | 0.8 | 0.7 | 0.85 |
| `elite_size` | 10 | 5 | 20 |

### Memory Optimization

1. **Batch Processing:** Process large problems in chunks
2. **Numpy Arrays:** Use `to_numpy()` for vectorized fitness calculation
3. **Solution Caching:** Cache fitness values to avoid re-computation

---

## Appendix: File Structure Summary

```
services/scheduler/
├── __init__.py                 # Package exports
├── config.py                   # Configuration dataclasses
├── nep_scheduler.py            # CP-SAT solver (existing + modifications)
├── chromosome_encoder.py       # Gene/Chromosome encoding
├── fitness_calculator.py       # Soft constraint evaluation
├── genetic_optimizer.py        # DEAP-based GA
├── hybrid_orchestrator.py      # Main pipeline coordinator
├── utils/
│   ├── __init__.py
│   ├── db_client.py           # Supabase client
│   └── logger.py              # Logging configuration
└── tests/
    ├── __init__.py
    ├── test_chromosome_encoder.py
    ├── test_fitness_calculator.py
    ├── test_genetic_optimizer.py
    └── test_integration.py

src/app/api/scheduler/
├── generate/
│   └── route.ts               # POST /api/scheduler/generate
└── status/
    └── [taskId]/
        └── route.ts           # GET /api/scheduler/status/:taskId
```

---

## Next Steps After Implementation

1. **Monitoring Dashboard:** Build UI to visualize GA convergence
2. **Parameter Tuning UI:** Allow admins to adjust weights
3. **Batch Scheduling:** Queue multiple batches
4. **Result Comparison:** Compare multiple timetable versions
5. **Manual Override:** Allow manual adjustments post-generation
6. **Export Features:** PDF/Excel export of timetables

---

*Document Version: 1.0.0*  
*Last Updated: January 24, 2026*  
*Author: GitHub Copilot*
