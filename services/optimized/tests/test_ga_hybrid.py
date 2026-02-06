"""Tests for Genetic Algorithm and Hybrid GA+CPSAT solvers."""

import pytest
from solvers.genetic_algorithm import GeneticAlgorithmSolver, GAConfig
from solvers.hybrid_ga_cpsat import HybridGACPSATSolver
from ml.predictor import QualityPredictor


class TestGeneticAlgorithm:
    """Test GA solver."""
    
    def test_initialization(self, scheduling_context):
        """Test GA initialization."""
        config = GAConfig(population_size=50, generations=100)
        ga = GeneticAlgorithmSolver(scheduling_context, config)
        
        assert ga.context == scheduling_context
        assert ga.config.population_size == 50
        assert ga.config.generations == 100
    
    def test_solve_basic(self, scheduling_context):
        """Test basic solve."""
        config = GAConfig(population_size=20, generations=10, timeout=5)
        ga = GeneticAlgorithmSolver(scheduling_context, config)
        
        solution = ga.solve(timeout=5)
        
        assert solution is not None
        assert solution.solver_name == "genetic_algorithm"
        assert len(solution.assignments) > 0
        assert 'ga' in solution.metadata
    
    def test_generate_random_solution(self, scheduling_context):
        """Test random solution generation."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        solution = ga._generate_random_solution()
        
        assert solution is not None
        assert len(solution.assignments) > 0
        assert solution.solver_name == "genetic_algorithm"
    
    def test_crossover(self, scheduling_context, sample_solution):
        """Test crossover operation."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        parent1 = sample_solution
        parent2 = ga._generate_random_solution()
        
        child1, child2 = ga._crossover(parent1, parent2)
        
        assert child1 is not None
        assert child2 is not None
        assert len(child1.assignments) > 0
        assert len(child2.assignments) > 0
    
    def test_mutation(self, scheduling_context, sample_solution):
        """Test mutation operations."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        original_count = len(sample_solution.assignments)
        mutated = ga._mutate(sample_solution)
        
        assert mutated is not None
        assert len(mutated.assignments) > 0
        # Structure should be similar
        assert abs(len(mutated.assignments) - original_count) < 5
    
    def test_fitness_evaluation(self, scheduling_context, sample_solution):
        """Test fitness evaluation."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        fitness = ga._evaluate_fitness(sample_solution)
        
        assert isinstance(fitness, float)
        assert fitness >= 0.0
    
    def test_hard_violations_count(self, scheduling_context, sample_solution):
        """Test hard constraint violation counting."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        violations = ga._count_hard_violations(sample_solution)
        
        assert isinstance(violations, int)
        assert violations >= 0
    
    def test_repair_conflicts(self, scheduling_context, sample_solution):
        """Test conflict repair."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        # Add duplicate assignment (conflict)
        if sample_solution.assignments:
            import copy
            duplicate = copy.deepcopy(sample_solution.assignments[0])
            sample_solution.assignments.append(duplicate)
        
        original_count = len(sample_solution.assignments)
        repaired = ga._repair_conflicts(sample_solution)
        
        assert repaired is not None
        # Should have removed conflicts
        assert len(repaired.assignments) <= original_count
    
    def test_qualified_faculty(self, scheduling_context, sample_subjects):
        """Test qualified faculty selection."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        if sample_subjects:
            faculty = ga._get_qualified_faculty(sample_subjects[0].id)
            assert isinstance(faculty, list)
            assert len(faculty) > 0
    
    def test_suitable_rooms(self, scheduling_context, sample_subjects, sample_batches):
        """Test suitable room selection."""
        ga = GeneticAlgorithmSolver(scheduling_context)
        
        if sample_subjects and sample_batches:
            rooms = ga._get_suitable_rooms(sample_subjects[0].id, sample_batches[0].id)
            assert isinstance(rooms, list)
            assert len(rooms) > 0
    
    def test_convergence(self, scheduling_context):
        """Test that GA converges over generations."""
        config = GAConfig(population_size=30, generations=20, timeout=10)
        ga = GeneticAlgorithmSolver(scheduling_context, config)
        
        solution = ga.solve(timeout=10)
        
        # Check convergence history
        history = ga.best_fitness_history
        assert len(history) > 1
        # Fitness should generally improve (decrease)
        assert history[-1] <= history[0] or history[-1] < history[0] * 1.1


class TestHybridGACPSAT:
    """Test Hybrid GA+CPSAT solver."""
    
    def test_initialization(self, scheduling_context):
        """Test hybrid solver initialization."""
        hybrid = HybridGACPSATSolver(scheduling_context)
        
        assert hybrid.context == scheduling_context
        assert hybrid.ga_solver is not None
        assert hybrid.cpsat_config is not None
    
    def test_initialization_with_configs(self, scheduling_context):
        """Test initialization with custom configs."""
        ga_config = GAConfig(population_size=50, generations=100)
        cpsat_config = {'timeout': 120}
        
        hybrid = HybridGACPSATSolver(
            scheduling_context,
            ga_config=ga_config,
            cpsat_config=cpsat_config
        )
        
        assert hybrid.ga_solver.config.population_size == 50
        assert hybrid.cpsat_config['timeout'] == 120
    
    def test_initialization_with_ml(self, scheduling_context, sample_solutions):
        """Test initialization with ML predictor."""
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions)
        
        hybrid = HybridGACPSATSolver(
            scheduling_context,
            ml_predictor=predictor
        )
        
        assert hybrid.ml_predictor is not None
        assert hybrid.ml_predictor.is_fitted
    
    def test_solve_basic(self, scheduling_context):
        """Test basic hybrid solve."""
        ga_config = GAConfig(population_size=20, generations=10, timeout=5)
        hybrid = HybridGACPSATSolver(scheduling_context, ga_config=ga_config)
        
        solution = hybrid.solve(timeout=15, ga_ratio=0.5)
        
        assert solution is not None
        assert solution.solver_name == "hybrid_ga_cpsat"
        assert len(solution.assignments) > 0
        assert 'hybrid' in solution.metadata
    
    def test_solve_with_ml_guidance(self, scheduling_context, sample_solutions):
        """Test hybrid solve with ML guidance."""
        # Train ML predictor
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions)
        
        # Create hybrid with ML
        ga_config = GAConfig(population_size=20, generations=10, timeout=5)
        hybrid = HybridGACPSATSolver(
            scheduling_context,
            ga_config=ga_config,
            ml_predictor=predictor
        )
        
        solution = hybrid.solve(timeout=15, ga_ratio=0.5, use_ml_guidance=True)
        
        assert solution is not None
        assert 'hybrid' in solution.metadata
        assert solution.metadata['hybrid']['ml_guided'] is True
    
    def test_metadata_completeness(self, scheduling_context):
        """Test that hybrid solution has complete metadata."""
        ga_config = GAConfig(population_size=20, generations=10, timeout=5)
        hybrid = HybridGACPSATSolver(scheduling_context, ga_config=ga_config)
        
        solution = hybrid.solve(timeout=15)
        
        assert 'hybrid' in solution.metadata
        metadata = solution.metadata['hybrid']
        
        assert 'ga_quality' in metadata
        assert 'ga_time' in metadata
        assert 'cpsat_quality' in metadata
        assert 'cpsat_time' in metadata
        assert 'total_time' in metadata
        assert 'improvement' in metadata
        assert 'ga_generations' in metadata
    
    def test_ga_ratio_affects_timing(self, scheduling_context):
        """Test that GA ratio affects time allocation."""
        ga_config = GAConfig(population_size=20, generations=10)
        hybrid = HybridGACPSATSolver(scheduling_context, ga_config=ga_config)
        
        # Test with high GA ratio
        solution = hybrid.solve(timeout=20, ga_ratio=0.7)
        
        metadata = solution.metadata['hybrid']
        ga_time = metadata['ga_time']
        cpsat_time = metadata['cpsat_time']
        
        # GA should have taken more time
        assert ga_time > cpsat_time or abs(ga_time - cpsat_time) < 2
    
    def test_improvement_tracking(self, scheduling_context):
        """Test that improvement is tracked."""
        ga_config = GAConfig(population_size=20, generations=10, timeout=5)
        hybrid = HybridGACPSATSolver(scheduling_context, ga_config=ga_config)
        
        solution = hybrid.solve(timeout=15)
        
        metadata = solution.metadata['hybrid']
        ga_quality = metadata['ga_quality']
        cpsat_quality = metadata['cpsat_quality']
        improvement = metadata['improvement']
        
        assert improvement == cpsat_quality - ga_quality
        assert cpsat_quality >= ga_quality or abs(cpsat_quality - ga_quality) < 0.01
    
    def test_performance_stats(self, scheduling_context):
        """Test performance statistics."""
        ga_config = GAConfig(population_size=20, generations=10, timeout=5)
        hybrid = HybridGACPSATSolver(scheduling_context, ga_config=ga_config)
        
        solution = hybrid.solve(timeout=15)
        stats = hybrid.get_performance_stats()
        
        assert 'ga_convergence' in stats
        assert 'ga_generations' in stats
        assert len(stats['ga_convergence']) > 0
    
    def test_ml_guided_population(self, scheduling_context, sample_solutions):
        """Test ML-guided population generation."""
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions)
        
        hybrid = HybridGACPSATSolver(
            scheduling_context,
            ml_predictor=predictor
        )
        
        population = hybrid._generate_ml_guided_population(size=30)
        
        assert len(population) == 30
        assert all(hasattr(sol, 'assignments') for sol in population)
    
    def test_without_ml_predictor(self, scheduling_context):
        """Test hybrid works without ML predictor."""
        ga_config = GAConfig(population_size=20, generations=10, timeout=5)
        hybrid = HybridGACPSATSolver(scheduling_context, ga_config=ga_config)
        
        # Should work fine without ML
        solution = hybrid.solve(timeout=15, use_ml_guidance=True)
        
        assert solution is not None
        assert solution.metadata['hybrid']['ml_guided'] is False
