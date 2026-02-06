"""Example demonstrating the complete pipeline with Hybrid GA+CPSAT solver."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from core.models import (
    TimeSlot, Room, Faculty, Batch, Subject, 
    BatchSubjectRequirement, SchedulingContext
)
from core.config import SolverConfig
from solvers.genetic_algorithm import GAConfig
from solvers.hybrid_ga_cpsat import HybridGACPSATSolver
from ml.predictor import QualityPredictor
from ml.features import FeatureExtractor
from ml.patterns import PatternMiner
from ml.adaptive import AdaptiveWeightAdjuster


def create_sample_context() -> SchedulingContext:
    """Create a sample scheduling context for demonstration."""
    
    # Time slots (Monday-Friday, 9AM-5PM)
    time_slots = []
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    times = [
        (540, 600, 'slot_9am'),    # 9-10 AM
        (600, 660, 'slot_10am'),   # 10-11 AM
        (660, 720, 'slot_11am'),   # 11-12 PM
        (780, 840, 'slot_2pm'),    # 2-3 PM
        (840, 900, 'slot_3pm'),    # 3-4 PM
        (900, 960, 'slot_4pm'),    # 4-5 PM
    ]
    
    for day_idx, day in enumerate(days):
        for start, end, slot_id in times:
            slot = TimeSlot(
                id=f"{slot_id}_{day.lower()}",
                day=day_idx,
                start_minute=start,
                duration_minutes=end - start
            )
            time_slots.append(slot)
    
    # Rooms
    rooms = [
        Room(id="R101", name="Room 101", capacity=60, building="Main", is_lab=False),
        Room(id="R102", name="Room 102", capacity=60, building="Main", is_lab=False),
        Room(id="R103", name="Room 103", capacity=60, building="Main", is_lab=False),
        Room(id="L201", name="Lab 201", capacity=30, building="Lab Block", is_lab=True),
        Room(id="L202", name="Lab 202", capacity=30, building="Lab Block", is_lab=True),
    ]
    
    # Subjects
    subjects = [
        Subject(id="DS", name="Data Structures", credits=4, is_lab=False, department_id="CSE"),
        Subject(id="OS", name="Operating Systems", credits=4, is_lab=False, department_id="CSE"),
        Subject(id="DBMS", name="Database Management", credits=3, is_lab=False, department_id="CSE"),
        Subject(id="DS_LAB", name="DS Lab", credits=2, is_lab=True, department_id="CSE"),
        Subject(id="OS_LAB", name="OS Lab", credits=2, is_lab=True, department_id="CSE"),
    ]
    
    # Faculty
    faculty = [
        Faculty(id="F1", name="Dr. Smith", department_id="CSE", 
                qualified_subjects=["DS", "DS_LAB"]),
        Faculty(id="F2", name="Dr. Johnson", department_id="CSE",
                qualified_subjects=["OS", "OS_LAB"]),
        Faculty(id="F3", name="Dr. Williams", department_id="CSE",
                qualified_subjects=["DBMS", "DS"]),
    ]
    
    # Batches
    batches = [
        Batch(id="CSE_A", name="CSE Section A", strength=50, semester=3, 
              department_id="CSE", program="B.Tech"),
        Batch(id="CSE_B", name="CSE Section B", strength=50, semester=3,
              department_id="CSE", program="B.Tech"),
    ]
    
    # Requirements
    requirements = [
        BatchSubjectRequirement(batch_id="CSE_A", subject_id="DS", hours_per_week=4),
        BatchSubjectRequirement(batch_id="CSE_A", subject_id="OS", hours_per_week=4),
        BatchSubjectRequirement(batch_id="CSE_A", subject_id="DBMS", hours_per_week=3),
        BatchSubjectRequirement(batch_id="CSE_A", subject_id="DS_LAB", hours_per_week=2),
        
        BatchSubjectRequirement(batch_id="CSE_B", subject_id="DS", hours_per_week=4),
        BatchSubjectRequirement(batch_id="CSE_B", subject_id="OS", hours_per_week=4),
        BatchSubjectRequirement(batch_id="CSE_B", subject_id="DBMS", hours_per_week=3),
        BatchSubjectRequirement(batch_id="CSE_B", subject_id="OS_LAB", hours_per_week=2),
    ]
    
    return SchedulingContext(
        institution_id="demo_college",
        semester=3,
        academic_year="2025-26",
        time_slots=time_slots,
        rooms=rooms,
        subjects=subjects,
        faculty=faculty,
        batches=batches,
        requirements=requirements
    )


def main():
    """Demonstrate the complete Hybrid GA+CPSAT pipeline."""
    
    print("="*80)
    print("HYBRID GA+CPSAT SOLVER DEMONSTRATION")
    print("="*80)
    print()
    
    # Step 1: Create scheduling context
    print("[STEP 1] Creating scheduling context...")
    context = create_sample_context()
    print(f"  ✓ {len(context.time_slots)} time slots")
    print(f"  ✓ {len(context.rooms)} rooms")
    print(f"  ✓ {len(context.subjects)} subjects")
    print(f"  ✓ {len(context.faculty)} faculty")
    print(f"  ✓ {len(context.batches)} batches")
    print(f"  ✓ {len(context.requirements)} requirements")
    print()
    
    # Step 2: Configure and run Hybrid solver
    print("[STEP 2] Configuring Hybrid GA+CPSAT solver...")
    ga_config = GAConfig(
        population_size=50,
        generations=100,
        mutation_rate=0.15,
        crossover_rate=0.8,
        timeout=30
    )
    
    hybrid_solver = HybridGACPSATSolver(
        context=context,
        ga_config=ga_config
    )
    print("  ✓ Solver configured")
    print(f"    - Population: {ga_config.population_size}")
    print(f"    - Generations: {ga_config.generations}")
    print(f"    - Mutation rate: {ga_config.mutation_rate}")
    print()
    
    # Step 3: Solve
    print("[STEP 3] Running optimization (60 seconds)...")
    print()
    
    solution = hybrid_solver.solve(
        timeout=60,
        ga_ratio=0.4,  # 40% GA, 60% CPSAT
        use_ml_guidance=False  # No ML for first run
    )
    
    print()
    print("[STEP 4] Solution Analysis...")
    print(f"  ✓ Quality Score: {solution.quality_score:.4f}")
    print(f"  ✓ Assignments: {len(solution.assignments)}")
    print(f"  ✓ Solver: {solution.solver_name}")
    print()
    
    # Step 5: Extract features
    print("[STEP 5] Extracting ML features...")
    feature_extractor = FeatureExtractor(context)
    features = feature_extractor.extract(solution)
    print(f"  ✓ Extracted {len(features.features)} features")
    print()
    
    # Step 6: Show hybrid metadata
    print("[STEP 6] Hybrid Solver Statistics...")
    if 'hybrid' in solution.metadata:
        hybrid_data = solution.metadata['hybrid']
        print(f"  GA Phase:")
        print(f"    - Quality: {hybrid_data['ga_quality']:.4f}")
        print(f"    - Time: {hybrid_data['ga_time']:.2f}s")
        print(f"    - Generations: {hybrid_data['ga_generations']}")
        print(f"  CP-SAT Phase:")
        print(f"    - Quality: {hybrid_data['cpsat_quality']:.4f}")
        print(f"    - Time: {hybrid_data['cpsat_time']:.2f}s")
        print(f"  Overall:")
        print(f"    - Improvement: {hybrid_data['improvement']:.4f}")
        print(f"    - Total Time: {hybrid_data['total_time']:.2f}s")
    print()
    
    # Step 7: Train ML predictor for future runs
    print("[STEP 7] Training ML predictor for next iteration...")
    predictor = QualityPredictor(context)
    
    # Generate a few more solutions for training
    solutions_for_training = [solution]
    for i in range(4):
        print(f"  Generating solution {i+2}/5...")
        ga_config_quick = GAConfig(population_size=30, generations=20, timeout=10)
        quick_solver = HybridGACPSATSolver(context, ga_config=ga_config_quick)
        quick_solution = quick_solver.solve(timeout=15, ga_ratio=0.5)
        solutions_for_training.append(quick_solution)
    
    predictor.fit(solutions_for_training)
    print(f"  ✓ Predictor trained on {len(solutions_for_training)} solutions")
    print()
    
    # Step 8: Run again with ML guidance
    print("[STEP 8] Running optimization WITH ML guidance...")
    print()
    
    hybrid_solver_ml = HybridGACPSATSolver(
        context=context,
        ga_config=ga_config,
        ml_predictor=predictor
    )
    
    solution_ml = hybrid_solver_ml.solve(
        timeout=60,
        ga_ratio=0.4,
        use_ml_guidance=True  # Now with ML!
    )
    
    print()
    print("[STEP 9] ML-Enhanced Solution Analysis...")
    print(f"  ✓ Quality Score: {solution_ml.quality_score:.4f}")
    print(f"  ✓ Improvement over baseline: {solution_ml.quality_score - solution.quality_score:.4f}")
    
    if 'ml_prediction' in solution_ml.metadata.get('hybrid', {}):
        ml_pred = solution_ml.metadata['hybrid']['ml_prediction']
        print(f"  ✓ ML Predicted Quality: {ml_pred['predicted_quality']:.4f}")
        print(f"  ✓ Prediction Confidence: {ml_pred['confidence']:.4f}")
    print()
    
    # Step 10: Mine patterns
    print("[STEP 10] Mining patterns from solutions...")
    pattern_miner = PatternMiner(min_support=0.3)
    patterns = pattern_miner.mine_patterns(solutions_for_training, context)
    
    for pattern_type, pattern_list in patterns.items():
        if pattern_list:
            print(f"  ✓ {pattern_type}: {len(pattern_list)} patterns found")
    print()
    
    print("="*80)
    print("DEMONSTRATION COMPLETE!")
    print("="*80)
    print()
    print("Summary:")
    print(f"  - Hybrid GA+CPSAT solver: WORKING ✓")
    print(f"  - ML-guided optimization: WORKING ✓")
    print(f"  - Feature extraction: WORKING ✓")
    print(f"  - Pattern mining: WORKING ✓")
    print(f"  - Quality improvement: {solution_ml.quality_score:.4f}")
    print()


if __name__ == "__main__":
    main()
