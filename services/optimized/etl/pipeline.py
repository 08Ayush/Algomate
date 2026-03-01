"""
ETL Pipeline orchestrator — ties Extract → Transform → Load into a
single composable pipeline with quality gating.

Usage::

    from etl.pipeline import ETLPipeline

    etl = ETLPipeline()

    # ── Extract + Transform (before solver) ──────────────────
    domain_data, report = etl.extract_and_transform(batch_id, college_id)

    if not report.is_viable:
        raise RuntimeError("Data quality too low to schedule")

    # ── …run solver… ─────────────────────────────────────────
    solution = solver.solve(context)

    # ── Load (after solver) ──────────────────────────────────
    timetable_id = etl.load(task_id, batch_id, college_id,
                            solution, execution_time, report)
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional, Tuple

from core.models import Solution
from .extractor import Extractor
from .transformer import Transformer
from .loader import Loader
from .quality import DataQualityReport

logger = logging.getLogger("optimized.etl.pipeline")


class ETLPipeline:
    """
    Coordinates the three ETL stages for timetable scheduling data.

    Designed to be called in two phases:
        1. **Pre-solver**: extract + transform  →  domain objects + quality report
        2. **Post-solver**: load  →  persist solution to DB

    The quality report accumulates issues across all three stages and
    can be used for observability, logging, or abort decisions.
    """

    def __init__(self, supabase_client=None):
        self.extractor = Extractor(client=supabase_client)
        self.transformer = Transformer()
        self.loader = Loader(client=supabase_client)

    # ------------------------------------------------------------------
    # Phase 1: Extract + Transform
    # ------------------------------------------------------------------

    def extract_and_transform(
        self,
        batch_id: str,
        college_id: str,
        *,
        quality_threshold: float = 0.25,
    ) -> Tuple[Dict[str, Any], DataQualityReport]:
        """
        Pull raw data from Supabase, clean and validate it, and return
        domain model objects ready for the solver.

        Parameters
        ----------
        batch_id : str
            Target batch UUID.
        college_id : str
            College / institution UUID.
        quality_threshold : float
            Minimum quality score to consider data viable (0 – 1).
            Default 0.25 (very lenient).

        Returns
        -------
        (domain_data, report)
            domain_data: dict with keys batch, subjects, faculty, classrooms, time_slots
            report: DataQualityReport with all issues found so far

        Raises
        ------
        ValueError
            If batch not found in database.
        """
        report = DataQualityReport(batch_id=batch_id, college_id=college_id)
        t0 = time.perf_counter()

        # ── Extract ──────────────────────────────────────────────────
        logger.info("ETL Phase 1: EXTRACT")
        raw_data = self.extractor.extract(batch_id, college_id, report)

        # ── Transform ────────────────────────────────────────────────
        logger.info("ETL Phase 1: TRANSFORM")
        domain_data = self.transformer.transform(raw_data, report)

        elapsed = time.perf_counter() - t0
        logger.info(
            f"ETL extract+transform completed in {elapsed:.2f}s | "
            f"quality_score={report.quality_score:.2f}, "
            f"viable={report.is_viable}"
        )
        report.log_summary(logger)

        return domain_data, report

    # ------------------------------------------------------------------
    # Phase 2: Load
    # ------------------------------------------------------------------

    def load(
        self,
        task_id: str,
        batch_id: str,
        college_id: str,
        solution: Solution,
        execution_time: float,
        report: Optional[DataQualityReport] = None,
    ) -> Optional[str]:
        """
        Persist the solver's solution to database.

        Parameters
        ----------
        task_id : str
            Generation task UUID.
        batch_id, college_id : str
            Context identifiers.
        solution : Solution
            Solver output.
        execution_time : float
            Wall-clock time of solver in seconds.
        report : DataQualityReport, optional
            If provided, load-phase issues are appended to it.

        Returns
        -------
        timetable_id or None on failure.
        """
        if report is None:
            report = DataQualityReport()

        logger.info("ETL Phase 2: LOAD")
        timetable_id = self.loader.load(
            task_id, batch_id, college_id,
            solution, execution_time, report,
        )

        if timetable_id:
            logger.info(f"ETL LOAD complete → timetable_id={timetable_id}")
        else:
            logger.error("ETL LOAD failed — timetable not persisted")

        return timetable_id

    # ------------------------------------------------------------------
    # Full pipeline (convenience)
    # ------------------------------------------------------------------

    def run_full(
        self,
        batch_id: str,
        college_id: str,
        task_id: str,
        solver_fn,
        *,
        quality_threshold: float = 0.25,
    ) -> Tuple[Optional[str], DataQualityReport]:
        """
        Run the complete ETL + solver pipeline.

        Parameters
        ----------
        solver_fn : callable(domain_data) -> (Solution, float)
            A function that takes the domain_data dict and returns
            (solution, execution_time_seconds).

        Returns
        -------
        (timetable_id, report)
        """
        # E + T
        domain_data, report = self.extract_and_transform(
            batch_id, college_id, quality_threshold=quality_threshold,
        )

        if not report.is_viable:
            logger.error(
                f"Data not viable (score={report.quality_score:.2f}). "
                "Aborting solver."
            )
            return None, report

        # Solve
        logger.info("ETL: running solver")
        solution, exec_time = solver_fn(domain_data)

        # L
        timetable_id = self.load(
            task_id, batch_id, college_id,
            solution, exec_time, report,
        )

        return timetable_id, report
