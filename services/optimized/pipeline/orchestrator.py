"""
Optimized Pipeline Orchestrator

Coordinates batch-wise timetable generation using the optimized
ensemble algorithm (Hybrid GA + CP-SAT with ML guidance).

Pipeline:
  1. Create task record in Supabase
  2. Fetch domain data for the batch
  3. Build SchedulingContext from domain data
  4. Run EnsembleCoordinator or HybridGACPSATSolver
  5. Save solution to Supabase
  6. Update task status

Reference: services/scheduler/hybrid_orchestrator.py (read-only)
"""

import uuid
import time
import logging
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, Callable, Dict, Any, List

from core.models import Solution, Assignment
from core.context import SchedulingContext, InstitutionConfig
from core.config import EnsembleConfig, SolverConfig, get_config
from ensemble.coordinator import EnsembleCoordinator
from solvers.hybrid_ga_cpsat import HybridGACPSATSolver
from storage.supabase_client import SupabaseSchedulerClient
from utils.runtime_logger import (
    get_runtime_logger,
    PipelineStepTracker,
    timed,
)
from etl import ETLPipeline, DataQualityReport


@dataclass
class PipelineResult:
    """Result from the optimized scheduling pipeline."""
    task_id: str
    batch_id: str
    status: str  # "success", "failed", "partial"
    best_score: float
    timetable_id: Optional[str]
    num_assignments: int
    solver_name: str
    total_time_seconds: float
    is_valid: bool = True
    error_message: Optional[str] = None
    step_log: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "batch_id": self.batch_id,
            "status": self.status,
            "best_score": self.best_score,
            "timetable_id": self.timetable_id,
            "num_assignments": self.num_assignments,
            "solver_name": self.solver_name,
            "total_time_seconds": self.total_time_seconds,
            "is_valid": self.is_valid,
            "error_message": self.error_message,
            "step_log": self.step_log,
        }


class OptimizedOrchestrator:
    """
    Orchestrates the optimized scheduling pipeline for a single batch.

    Workflow mirrors scheduler/hybrid_orchestrator.py but uses the
    Ensemble / HybridGACPSATSolver from the optimized module.
    """

    def __init__(
        self,
        config: Optional[EnsembleConfig] = None,
        db_client: Optional[SupabaseSchedulerClient] = None,
    ):
        self.config = config or get_config()
        self.db = db_client or SupabaseSchedulerClient()
        self.logger = get_runtime_logger()

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    def run(
        self,
        batch_id: str,
        college_id: str,
        user_id: str,
        solver_timeout: int = 300,
        progress_callback: Optional[Callable[[str, float], None]] = None,
    ) -> PipelineResult:
        """
        Execute the full pipeline for one batch.

        Args:
            batch_id: UUID of the batch to schedule
            college_id: UUID of the college
            user_id: UUID of the requesting user
            solver_timeout: Max solver time in seconds
            progress_callback: Optional callback(phase, progress_0_to_1)

        Returns:
            PipelineResult
        """
        task_id = str(uuid.uuid4())
        tracker = PipelineStepTracker(task_id, self.logger)
        start_time = time.perf_counter()

        self.logger.info(
            f"{'='*60}\n"
            f"  OPTIMIZED PIPELINE START\n"
            f"  task_id   : {task_id}\n"
            f"  batch_id  : {batch_id}\n"
            f"  college_id: {college_id}\n"
            f"  user_id   : {user_id}\n"
            f"{'='*60}"
        )

        try:
            # ── Step 1: Create task record ────────────────────────
            with tracker.step("CREATE_TASK", "Creating task record in Supabase"):
                algo_config = {
                    "solver": "optimized_ensemble",
                    "cpsat_timeout": solver_timeout,
                    "voting_strategy": self.config.voting_strategy,
                    "parallel": self.config.parallel_execution,
                }
                self.db.create_task(task_id, batch_id, college_id, user_id, algo_config)
                self.db.update_task_status(task_id, "running", "Initializing pipeline")

            if progress_callback:
                progress_callback("init", 0.05)

            # ── Step 2: Fetch domain data ─────────────────────────
            with tracker.step("FETCH_DATA", "Fetching batch domain data from Supabase"):
                domain_data = self.db.fetch_batch_data(batch_id, college_id)

            if progress_callback:
                progress_callback("fetch", 0.15)

            # ── Step 3: Build SchedulingContext ───────────────────
            with tracker.step("BUILD_CONTEXT", "Building SchedulingContext from domain data"):
                context = self._build_context(domain_data, college_id)
                errors = context.validate()
                if errors:
                    self.logger.warning(f"Context validation warnings: {errors}")

            self.db.update_task_status(task_id, "running", "Context built, starting solver")

            if progress_callback:
                progress_callback("context", 0.20)

            # ── Step 4: Run solver ────────────────────────────────
            with tracker.step("RUN_SOLVER", "Running optimized ensemble solver") as step_info:
                self.db.update_task_status(task_id, "running", "Running solver")
                solution = self._run_solver(context, solver_timeout)
                step_info["solver_name"] = solution.solver_name
                step_info["quality_score"] = solution.quality_score
                step_info["is_valid"] = solution.is_valid
                step_info["assignments"] = len(solution.assignments)

            if progress_callback:
                progress_callback("solver_done", 0.80)

            # Enrich solution metadata with context needed for DB save
            if not hasattr(solution, "metadata") or solution.metadata is None:
                solution.metadata = {}
            solution.metadata["user_id"] = user_id
            solution.metadata["academic_year"] = domain_data.get("academic_year", "2025-26")
            solution.metadata["semester"] = domain_data.get("semester", 1)

            # ── Step 5: Save results ──────────────────────────────
            timetable_id = None
            with tracker.step("SAVE_RESULTS", "Saving timetable to Supabase"):
                elapsed = time.perf_counter() - start_time
                timetable_id = self.db.save_timetable(
                    task_id, batch_id, college_id, solution, elapsed,
                )

            # ── Step 6: Finalise ──────────────────────────────────
            with tracker.step("FINALISE", "Updating task status to completed"):
                self.db.update_task_status(task_id, "completed", "Pipeline completed successfully")

            if progress_callback:
                progress_callback("done", 1.0)

            total = time.perf_counter() - start_time
            self.logger.info(
                f"Pipeline COMPLETED in {total:.2f}s | "
                f"score={solution.quality_score:.3f} | "
                f"assignments={len(solution.assignments)} | "
                f"valid={solution.is_valid}"
            )

            return PipelineResult(
                task_id=task_id,
                batch_id=batch_id,
                status="success",
                best_score=solution.quality_score,
                timetable_id=timetable_id,
                num_assignments=len(solution.assignments),
                solver_name=solution.solver_name,
                total_time_seconds=round(total, 3),
                is_valid=solution.is_valid,
                step_log=tracker.steps,
            )

        except Exception as exc:
            total = time.perf_counter() - start_time
            self.logger.error(f"Pipeline FAILED after {total:.2f}s: {exc}", exc_info=True)
            self.db.update_task_status(task_id, "failed", str(exc))

            return PipelineResult(
                task_id=task_id,
                batch_id=batch_id,
                status="failed",
                best_score=0.0,
                timetable_id=None,
                num_assignments=0,
                solver_name="",
                total_time_seconds=round(total, 3),
                is_valid=False,
                error_message=str(exc),
                step_log=tracker.steps,
            )

    # ------------------------------------------------------------------
    # Context builder
    # ------------------------------------------------------------------

    def _build_context(self, domain_data: Dict[str, Any], college_id: str) -> SchedulingContext:
        """Convert fetched domain data dict into a SchedulingContext."""
        batch = domain_data["batch"]

        institution = InstitutionConfig(
            id=college_id,
            name=f"College_{college_id[:8]}",
        )

        context = SchedulingContext(
            institution=institution,
            time_slots=domain_data["time_slots"],
            rooms=domain_data["classrooms"],
            faculty=domain_data["faculty"],
            batches=[batch],
            subjects=domain_data["subjects"],
        )

        self.logger.info(
            f"Context built: {len(context.time_slots)} slots, "
            f"{len(context.rooms)} rooms, {len(context.faculty)} faculty, "
            f"{len(context.subjects)} subjects"
        )
        return context

    # ------------------------------------------------------------------
    # Solver runner
    # ------------------------------------------------------------------

    def _run_solver(self, context: SchedulingContext, timeout: int) -> Solution:
        """
        Run the ensemble solver or fall back to HybridGACPSATSolver.

        The EnsembleCoordinator orchestrates multiple solvers and picks
        the best solution via weighted voting.
        """
        self.logger.info("Initializing solver...")

        try:
            coordinator = EnsembleCoordinator(context, self.config)
            self.logger.info(
                f"Running EnsembleCoordinator (voting={self.config.voting_strategy})"
            )
            solution = coordinator.solve()

            if solution is None:
                raise RuntimeError("EnsembleCoordinator returned None")

            # Normalise to Solution if SolverResult was returned
            if not isinstance(solution, Solution):
                solution = Solution(
                    assignments=getattr(solution, "assignments", []),
                    quality_score=getattr(solution, "quality_score", 0.0),
                    solver_name=getattr(solution, "solver_name", "ensemble"),
                    execution_time=getattr(solution, "execution_time", 0.0),
                )

            self.logger.info(
                f"Solver finished: solver={solution.solver_name}, "
                f"score={solution.quality_score:.3f}, "
                f"assignments={len(solution.assignments)}"
            )
            return solution

        except Exception as exc:
            self.logger.warning(f"Ensemble failed ({exc}), falling back to HybridGACPSAT")
            solver = HybridGACPSATSolver(
                context=context,
                config=SolverConfig(
                    name="hybrid_ga_cpsat",
                    enabled=True,
                    timeout_seconds=timeout,
                ),
            )
            return solver.solve(timeout=timeout)

    # ------------------------------------------------------------------
    # ETL-powered pipeline
    # ------------------------------------------------------------------

    def run_with_etl(
        self,
        batch_id: str,
        college_id: str,
        user_id: str,
        solver_timeout: int = 300,
        progress_callback: Optional[Callable[[str, float], None]] = None,
    ) -> PipelineResult:
        """
        Execute the pipeline using the full ETL layer.

        Same interface as run() but uses ETLPipeline for:
          - Parallel data extraction with validation
          - Data cleaning / Unicode fixes / quality scoring
          - Transactional load with rollback on failure
          - Faculty-coverage analysis before solving

        The DataQualityReport is attached to the result's step_log.
        """
        task_id = str(uuid.uuid4())
        tracker = PipelineStepTracker(task_id, self.logger)
        start_time = time.perf_counter()
        etl = ETLPipeline(supabase_client=self.db.client)

        self.logger.info(
            f"{'='*60}\n"
            f"  OPTIMIZED ETL PIPELINE START\n"
            f"  task_id   : {task_id}\n"
            f"  batch_id  : {batch_id}\n"
            f"  college_id: {college_id}\n"
            f"  user_id   : {user_id}\n"
            f"{'='*60}"
        )

        try:
            # ── Step 1: Create task record ────────────────────────
            with tracker.step("CREATE_TASK", "Creating task record"):
                algo_config = {
                    "solver": "optimized_ensemble",
                    "cpsat_timeout": solver_timeout,
                    "voting_strategy": self.config.voting_strategy,
                    "parallel": self.config.parallel_execution,
                    "etl_enabled": True,
                }
                self.db.create_task(task_id, batch_id, college_id, user_id, algo_config)
                self.db.update_task_status(task_id, "running", "Initializing ETL pipeline")

            if progress_callback:
                progress_callback("init", 0.05)

            # ── Step 2: ETL Extract + Transform ──────────────────
            with tracker.step("ETL_EXTRACT_TRANSFORM", "Extract & transform data via ETL") as info:
                domain_data, quality_report = etl.extract_and_transform(batch_id, college_id)
                info["quality_score"] = quality_report.quality_score
                info["viable"] = quality_report.is_viable
                info["summary"] = quality_report.summary_dict()

            if not quality_report.is_viable:
                self.db.update_task_status(
                    task_id, "failed",
                    f"Data quality too low: {quality_report.quality_score:.2f}",
                )
                total = time.perf_counter() - start_time
                return PipelineResult(
                    task_id=task_id, batch_id=batch_id,
                    status="failed", best_score=0.0, timetable_id=None,
                    num_assignments=0, solver_name="",
                    total_time_seconds=round(total, 3), is_valid=False,
                    error_message=f"Data quality score {quality_report.quality_score:.2f} below threshold",
                    step_log=tracker.steps,
                )

            if progress_callback:
                progress_callback("etl_done", 0.25)

            # ── Step 3: Build SchedulingContext ──────────────────
            with tracker.step("BUILD_CONTEXT", "Building SchedulingContext"):
                context = self._build_context(domain_data, college_id)
                errors = context.validate()
                if errors:
                    self.logger.warning(f"Context validation warnings: {errors}")

            self.db.update_task_status(task_id, "running", "Context built, starting solver")

            if progress_callback:
                progress_callback("context", 0.30)

            # ── Step 4: Run solver ────────────────────────────────
            with tracker.step("RUN_SOLVER", "Running optimized ensemble solver") as step_info:
                self.db.update_task_status(task_id, "running", "Running solver")
                solution = self._run_solver(context, solver_timeout)
                step_info["solver_name"] = solution.solver_name
                step_info["quality_score"] = solution.quality_score
                step_info["is_valid"] = solution.is_valid
                step_info["assignments"] = len(solution.assignments)

            if progress_callback:
                progress_callback("solver_done", 0.80)

            # Enrich metadata
            if not hasattr(solution, "metadata") or solution.metadata is None:
                solution.metadata = {}
            solution.metadata["user_id"] = user_id
            solution.metadata["academic_year"] = domain_data.get("academic_year", "2025-26")
            solution.metadata["semester"] = domain_data.get("semester", 1)

            # ── Step 5: ETL Load ──────────────────────────────────
            timetable_id = None
            with tracker.step("ETL_LOAD", "Saving via ETL loader"):
                elapsed = time.perf_counter() - start_time
                timetable_id = etl.load(
                    task_id, batch_id, college_id,
                    solution, elapsed, quality_report,
                )

            # ── Step 6: Finalise ──────────────────────────────────
            with tracker.step("FINALISE", "Updating task status to completed"):
                self.db.update_task_status(task_id, "completed", "ETL pipeline completed")

            if progress_callback:
                progress_callback("done", 1.0)

            total = time.perf_counter() - start_time
            self.logger.info(
                f"ETL Pipeline COMPLETED in {total:.2f}s | "
                f"score={solution.quality_score:.3f} | "
                f"quality_data={quality_report.quality_score:.2f} | "
                f"assignments={len(solution.assignments)}"
            )

            return PipelineResult(
                task_id=task_id, batch_id=batch_id,
                status="success", best_score=solution.quality_score,
                timetable_id=timetable_id,
                num_assignments=len(solution.assignments),
                solver_name=solution.solver_name,
                total_time_seconds=round(total, 3),
                is_valid=solution.is_valid,
                step_log=tracker.steps,
            )

        except Exception as exc:
            total = time.perf_counter() - start_time
            self.logger.error(f"ETL Pipeline FAILED after {total:.2f}s: {exc}", exc_info=True)
            self.db.update_task_status(task_id, "failed", str(exc))
            return PipelineResult(
                task_id=task_id, batch_id=batch_id,
                status="failed", best_score=0.0, timetable_id=None,
                num_assignments=0, solver_name="",
                total_time_seconds=round(total, 3), is_valid=False,
                error_message=str(exc), step_log=tracker.steps,
            )

    # ------------------------------------------------------------------
    # Multi-batch convenience
    # ------------------------------------------------------------------

    def run_multiple_batches(
        self,
        batch_ids: List[str],
        college_id: str,
        user_id: str,
        solver_timeout: int = 300,
        progress_callback: Optional[Callable[[str, str, float], None]] = None,
    ) -> List[PipelineResult]:
        """
        Generate timetables for multiple batches sequentially.

        Args:
            batch_ids: List of batch UUIDs
            college_id: College UUID
            user_id: User UUID
            solver_timeout: Per-batch solver timeout
            progress_callback: callback(batch_id, phase, progress)

        Returns:
            List of PipelineResult (one per batch)
        """
        results: List[PipelineResult] = []
        total = len(batch_ids)

        self.logger.info(f"Starting multi-batch generation for {total} batches")

        for idx, bid in enumerate(batch_ids, 1):
            self.logger.info(f"--- Batch {idx}/{total}: {bid} ---")

            def _cb(phase: str, progress: float):
                if progress_callback:
                    progress_callback(bid, phase, progress)

            result = self.run(
                batch_id=bid,
                college_id=college_id,
                user_id=user_id,
                solver_timeout=solver_timeout,
                progress_callback=_cb,
            )
            results.append(result)

            self.logger.info(
                f"Batch {idx}/{total} done: {result.status} "
                f"(score={result.best_score:.3f})"
            )

        success_count = sum(1 for r in results if r.status == "success")
        self.logger.info(
            f"Multi-batch complete: {success_count}/{total} succeeded"
        )
        return results
