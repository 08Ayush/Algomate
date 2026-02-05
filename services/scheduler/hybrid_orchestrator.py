"""
Hybrid Orchestrator

Coordinates the two-phase scheduling pipeline:
1. CP-SAT generates feasible seed solutions
2. Genetic Algorithm optimizes soft constraints
"""

import json
import uuid
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, asdict

from .nep_scheduler import NEPScheduler, solve_for_multiple_seeds
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
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'task_id': self.task_id,
            'batch_id': self.batch_id,
            'status': self.status,
            'best_fitness': self.best_fitness,
            'timetable_id': self.timetable_id,
            'num_assignments': self.num_assignments,
            'cpsat_solutions': self.cpsat_solutions,
            'ga_generations': self.ga_generations,
            'total_time_seconds': self.total_time_seconds,
            'error_message': self.error_message
        }


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
        self.logger = scheduler_logger
        
        # Supabase client (lazy initialization)
        self._supabase = None
        
        # CP-SAT scheduler (lazy initialization)
        self._cpsat = None
        
        # GA components initialized per-run (need batch-specific data)
        self.encoder: Optional[ChromosomeEncoder] = None
        self.fitness_calc: Optional[FitnessCalculator] = None
        self.ga: Optional[GeneticOptimizer] = None
    
    @property
    def supabase(self):
        """Lazy initialization of Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    @property
    def cpsat(self) -> NEPScheduler:
        """Lazy initialization of CP-SAT scheduler."""
        if self._cpsat is None:
            url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not url or not key:
                raise ValueError("Missing Supabase credentials")
            self._cpsat = NEPScheduler(url, key)
        return self._cpsat
    
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
            
            # Create fresh CP-SAT scheduler for seed generation
            url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            cpsat_scheduler = NEPScheduler(url, key)
            
            seeds = solve_for_multiple_seeds(
                cpsat_scheduler,
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
            seed_chromosomes = []
            for seed in seeds:
                chromosome = self.encoder.encode_from_cpsat(seed)
                if chromosome.genes:
                    seed_chromosomes.append(chromosome)
            
            if not seed_chromosomes:
                raise ValueError("Failed to encode any valid chromosomes from CP-SAT solutions")
            
            self.logger.info(f"Encoded {len(seed_chromosomes)} chromosomes")
            
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
        """Fetch domain data specific to this batch."""
        
        # Step 1: Get batch info with department
        batch_response = self.supabase.table("batches").select(
            "*, department_id"
        ).eq("id", batch_id).single().execute()
        batch = batch_response.data
        department_id = batch.get("department_id") if batch else None
        
        # Step 2: Get subjects assigned to this batch via batch_subjects
        batch_subjects_response = self.supabase.table("batch_subjects").select(
            "subject_id, assigned_faculty_id, required_hours_per_week, subjects(*)"
        ).eq("batch_id", batch_id).execute()
        
        # Extract subject records from the join
        batch_subjects_data = batch_subjects_response.data or []
        subjects = []
        subject_ids = []
        assigned_faculty_map = {}  # subject_id -> assigned_faculty_id
        
        for bs in batch_subjects_data:
            if bs.get("subjects"):
                subject = bs["subjects"]
                # Add required_hours from batch_subjects to subject data
                subject["required_hours_per_week"] = bs.get("required_hours_per_week", 3)
                subjects.append(subject)
                subject_ids.append(subject["id"])
                if bs.get("assigned_faculty_id"):
                    assigned_faculty_map[subject["id"]] = bs["assigned_faculty_id"]
        
        self.logger.info(f"Found {len(subjects)} subjects assigned to batch {batch_id}")
        
        # Step 3: Get faculty - prefer assigned, fallback to qualified
        faculty_dict = {}
        
        # First, get assigned faculty from batch_subjects
        if assigned_faculty_map:
            assigned_ids = list(set(assigned_faculty_map.values()))
            assigned_response = self.supabase.table("users").select("*").in_(
                "id", assigned_ids
            ).execute()
            for user in (assigned_response.data or []):
                faculty_dict[user["id"]] = user
        
        # Then, get qualified faculty for subjects without assignments
        if subject_ids:
            faculty_qualified_response = self.supabase.table("faculty_qualified_subjects").select(
                "faculty_id, subject_id, users!faculty_id(*)"
            ).in_("subject_id", subject_ids).execute()
            
            for fq in (faculty_qualified_response.data or []):
                if fq.get("users") and fq["users"]["id"] not in faculty_dict:
                    faculty_dict[fq["users"]["id"]] = fq["users"]
        
        faculty = list(faculty_dict.values())
        self.logger.info(f"Found {len(faculty)} faculty for these subjects")
        
        # Step 4: Get classrooms (optionally filter by department)
        classroom_query = self.supabase.table("classrooms").select("*").eq(
            "college_id", college_id
        ).eq("is_available", True)
        
        classrooms_response = classroom_query.execute()
        classrooms = classrooms_response.data or []
        
        # Step 5: Get time slots (all for the college)
        time_slots_response = self.supabase.table("time_slots").select("*").eq(
            "college_id", college_id
        ).eq("is_active", True).execute()
        time_slots = time_slots_response.data or []
        
        self.logger.info(
            f"Fetched domain data: {len(subjects)} subjects, "
            f"{len(faculty)} faculty, {len(classrooms)} rooms, "
            f"{len(time_slots)} slots"
        )
        
        return {
            "subjects": subjects,
            "faculty": faculty,
            "classrooms": classrooms,
            "time_slots": time_slots,
            "batches": [batch] if batch else [],
            "assigned_faculty_map": assigned_faculty_map
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
        
        self.logger.info("GA components initialized")
    
    def _create_task(
        self, 
        task_id: str, 
        batch_id: str, 
        college_id: str, 
        created_by: str
    ):
        """Create task record in database."""
        try:
            self.supabase.table("timetable_generation_tasks").insert({
                "id": task_id,
                "college_id": college_id,
                "batch_id": batch_id,
                "status": "pending",
                "created_by": created_by,
                "algorithm_config": {
                    "cpsat": {
                        "max_time_seconds": self.config.cpsat.max_time_seconds,
                        "num_solutions": self.config.cpsat.num_solutions
                    },
                    "ga": {
                        "population_size": self.config.ga.population_size,
                        "generations": self.config.ga.generations,
                        "mutation_rate": self.config.ga.mutation_rate,
                        "crossover_rate": self.config.ga.crossover_rate
                    }
                }
            }).execute()
            self.logger.info(f"Created task record: {task_id}")
        except Exception as e:
            self.logger.warning(f"Could not create task record: {e}")
    
    def _update_task_status(self, task_id: str, status: str, message: str):
        """Update task status in database."""
        try:
            self.supabase.table("timetable_generation_tasks").update({
                "status": status,
                "progress_message": message,
                "updated_at": datetime.now().isoformat()
            }).eq("id", task_id).execute()
        except Exception as e:
            self.logger.warning(f"Could not update task status: {e}")
    
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
        
        try:
            self.supabase.table("generated_timetables").insert({
                "id": timetable_id,
                "task_id": task_id,
                "batch_id": batch_id,
                "college_id": college_id,
                "fitness_score": chromosome.fitness,
                "is_published": False,
                "version": 1,
                "title": f"Hybrid Timetable - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            }).execute()
            
            self.logger.info(f"Created timetable record: {timetable_id}")
        except Exception as e:
            self.logger.warning(f"Could not create timetable record: {e}")
        
        # Save scheduled_classes
        records = self.encoder.decode_to_db(chromosome, timetable_id)
        
        # Batch insert
        if records:
            try:
                # Insert in batches of 50 to avoid payload limits
                batch_size = 50
                for i in range(0, len(records), batch_size):
                    batch = records[i:i + batch_size]
                    self.supabase.table("scheduled_classes").insert(batch).execute()
                
                self.logger.info(f"Saved {len(records)} scheduled classes")
            except Exception as e:
                self.logger.warning(f"Could not save scheduled classes: {e}")
        
        # Save algorithm metrics
        try:
            self.supabase.table("algorithm_execution_metrics").insert({
                "task_id": task_id,
                "timetable_id": timetable_id,
                "algorithm_name": "hybrid_cpsat_ga",
                "execution_time_ms": int(ga_stats.generations_run * 100),
                "iterations": ga_stats.generations_run,
                "final_score": chromosome.fitness,
                "metrics_json": {
                    "best_fitness": ga_stats.best_fitness,
                    "avg_fitness": ga_stats.avg_fitness,
                    "convergence_gen": ga_stats.convergence_generation,
                    "total_evaluations": ga_stats.total_evaluations,
                    "fitness_history": ga_stats.fitness_history[-10:]
                }
            }).execute()
        except Exception as e:
            self.logger.warning(f"Could not save algorithm metrics: {e}")
        
        return timetable_id


def main():
    """Command-line entry point for the scheduler."""
    import argparse
    from dotenv import load_dotenv
    
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="Run hybrid timetable scheduler")
    parser.add_argument("--batch-id", required=True, help="Batch UUID to schedule")
    parser.add_argument("--college-id", required=True, help="College UUID")
    parser.add_argument("--user-id", required=True, help="User UUID initiating task")
    parser.add_argument("--output", help="Output file for results JSON")
    parser.add_argument("--cpsat-time", type=int, default=300, help="CP-SAT time limit (seconds)")
    parser.add_argument("--ga-generations", type=int, default=200, help="GA generations")
    parser.add_argument("--population", type=int, default=100, help="GA population size")
    
    args = parser.parse_args()
    
    # Create custom config if specified
    config = HybridConfig()
    config.cpsat.max_time_seconds = args.cpsat_time
    config.ga.generations = args.ga_generations
    config.ga.population_size = args.population
    
    orchestrator = HybridOrchestrator(config=config)
    
    def progress_callback(stage: str, progress: float):
        print(f"[{progress*100:.1f}%] Stage: {stage}")
    
    result = orchestrator.run(
        batch_id=args.batch_id,
        college_id=args.college_id,
        created_by=args.user_id,
        progress_callback=progress_callback
    )
    
    # Output result
    result_dict = result.to_dict()
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result_dict, f, indent=2, default=str)
        print(f"\n💾 Results saved to: {args.output}")
    
    print("\n" + "="*60)
    print("📊 Pipeline Results")
    print("="*60)
    print(json.dumps(result_dict, indent=2, default=str))
    
    return 0 if result.status == "success" else 1


if __name__ == "__main__":
    exit(main())
