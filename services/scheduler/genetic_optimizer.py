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
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "generations_run": self.generations_run,
            "best_fitness": self.best_fitness,
            "avg_fitness": self.avg_fitness,
            "fitness_history": self.fitness_history[-20:],  # Last 20 only
            "convergence_generation": self.convergence_generation,
            "total_evaluations": self.total_evaluations,
        }


# Create DEAP types at module level (only once)
if not hasattr(creator, "FitnessMax"):
    creator.create("FitnessMax", base.Fitness, weights=(1.0,))

if not hasattr(creator, "Individual"):
    creator.create("Individual", list, fitness=creator.FitnessMax)


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
        """Configure DEAP toolbox with operators."""
        self.toolbox = base.Toolbox()
        
        # Register genetic operators
        self.toolbox.register(
            "select", 
            tools.selTournament, 
            tournsize=self.config.tournament_size
        )
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
        if not seed_chromosomes:
            raise ValueError("At least one seed chromosome is required")
        
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
        stats.register("std", np.std)
        
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
        gen = 0
        for gen in range(self.config.generations):
            # Select next generation
            offspring = self.toolbox.select(
                population, 
                len(population) - self.config.elite_size
            )
            offspring = list(map(self.toolbox.clone, offspring))
            
            # Apply crossover
            for i in range(0, len(offspring) - 1, 2):
                if random.random() < self.config.crossover_rate:
                    child1, child2 = offspring[i], offspring[i + 1]
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
                    f"avg={record['avg']:.2f}, std={record['std']:.2f}, "
                    f"stag={stagnation_counter}"
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
            avg_fitness=float(np.mean([ind.fitness.values[0] for ind in population])),
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
            individual = creator.Individual([gene for gene in seed.genes])
            population.append(individual)
        
        # Generate additional individuals through mutation if needed
        while len(population) < self.config.population_size:
            # Clone a random seed and mutate
            base_seed = random.choice(seeds)
            individual = creator.Individual([
                Gene(
                    subject_id=g.subject_id,
                    faculty_id=g.faculty_id,
                    classroom_id=g.classroom_id,
                    time_slot_id=g.time_slot_id,
                    batch_id=g.batch_id,
                    is_lab=g.is_lab
                ) for g in base_seed.genes
            ])
            
            # Apply multiple mutations to create diversity
            num_mutations = random.randint(3, 10)
            for _ in range(num_mutations):
                self._mutate(individual)
            
            population.append(individual)
        
        ga_logger.info(f"Created population of {len(population)} individuals")
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
        
        # Create copies of segments to swap
        seg1 = [Gene(
            subject_id=g.subject_id,
            faculty_id=g.faculty_id,
            classroom_id=g.classroom_id,
            time_slot_id=g.time_slot_id,
            batch_id=g.batch_id,
            is_lab=g.is_lab
        ) for g in ind1[pt1:pt2]]
        
        seg2 = [Gene(
            subject_id=g.subject_id,
            faculty_id=g.faculty_id,
            classroom_id=g.classroom_id,
            time_slot_id=g.time_slot_id,
            batch_id=g.batch_id,
            is_lab=g.is_lab
        ) for g in ind2[pt1:pt2]]
        
        # Swap segments
        ind1[pt1:pt2] = seg2
        ind2[pt1:pt2] = seg1
        
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
        
        # Choose mutation type (prefer time_slot mutations)
        mutation_type = random.choices(
            ["time_slot", "classroom", "faculty"],
            weights=[0.5, 0.3, 0.2]
        )[0]
        
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
        
        elif mutation_type == "faculty" and domain["faculty"]:
            new_faculty = random.choice(domain["faculty"])
            individual[idx] = Gene(
                subject_id=gene.subject_id,
                faculty_id=new_faculty,
                classroom_id=gene.classroom_id,
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
        - Duplicate time slot assignments for same faculty
        - Duplicate time slot assignments for same room
        """
        # Track used slots
        batch_slots = {}
        faculty_slots = {}
        room_slots = {}
        
        for i, gene in enumerate(individual):
            conflicts = []
            
            # Check batch conflict
            batch_key = (gene.batch_id, gene.time_slot_id)
            if batch_key in batch_slots:
                conflicts.append("batch")
            
            # Check faculty conflict
            faculty_key = (gene.faculty_id, gene.time_slot_id)
            if faculty_key in faculty_slots:
                conflicts.append("faculty")
            
            # Check room conflict
            room_key = (gene.classroom_id, gene.time_slot_id)
            if room_key in room_slots:
                conflicts.append("room")
            
            # If any conflict, try to reassign time slot
            if conflicts:
                domain = self.encoder.get_gene_domain(gene)
                available_slots = []
                
                for slot in domain["time_slots"]:
                    new_batch_key = (gene.batch_id, slot)
                    new_faculty_key = (gene.faculty_id, slot)
                    new_room_key = (gene.classroom_id, slot)
                    
                    if (new_batch_key not in batch_slots and
                        new_faculty_key not in faculty_slots and
                        new_room_key not in room_slots):
                        available_slots.append(slot)
                
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
                    gene = individual[i]
            
            # Register the slot usage
            batch_slots[(gene.batch_id, gene.time_slot_id)] = i
            faculty_slots[(gene.faculty_id, gene.time_slot_id)] = i
            room_slots[(gene.classroom_id, gene.time_slot_id)] = i
    
    def _individual_to_chromosome(self, individual: List) -> Chromosome:
        """Convert DEAP individual back to Chromosome."""
        return Chromosome(genes=[
            Gene(
                subject_id=g.subject_id,
                faculty_id=g.faculty_id,
                classroom_id=g.classroom_id,
                time_slot_id=g.time_slot_id,
                batch_id=g.batch_id,
                is_lab=g.is_lab
            ) for g in individual
        ])
