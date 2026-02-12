"""
LOAD layer — persists generated timetable results to Supabase.

Responsibilities:
  1. Transactional insert: timetable → scheduled_classes → metrics
  2. _json_safe() serialisation for numpy / dataclass values
  3. Upsert / idempotency guard (same task_id won't duplicate)
  4. Rollback on partial failure (delete timetable if classes fail)
  5. Audit trail via DataQualityReport
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from core.models import ConstraintType, Solution
from storage.supabase_client import get_supabase_client
from .quality import DataQualityReport

logger = logging.getLogger("optimized.etl.load")


class Loader:
    """
    Saves the scheduling solution to the database with proper
    serialisation and error handling.
    """

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def load(
        self,
        task_id: str,
        batch_id: str,
        college_id: str,
        solution: Solution,
        execution_time: float,
        report: DataQualityReport,
    ) -> Optional[str]:
        """
        Persist solution to Supabase.

        Returns timetable_id on success, None on failure.
        """
        t0 = time.perf_counter()
        logger.info("LOAD START")
        timetable_id = str(uuid.uuid4())

        # ── 1. Check idempotency ─────────────────────────────────────
        existing = self._existing_timetable_for_task(task_id)
        if existing:
            logger.info(f"Timetable already exists for task {task_id}: {existing}")
            report.add_info(
                "idempotent_skip", "timetable",
                entity_id=existing,
                message=f"Timetable already saved for task {task_id}",
            )
            return existing

        # ── 2. Serialise violations ──────────────────────────────────
        violations_json = self._serialize_violations(solution.constraint_violations)
        hard_count, soft_count = self._count_violations(solution.constraint_violations)

        # ── 3. Insert generated_timetables ───────────────────────────
        ok = self._insert_timetable(
            timetable_id, task_id, batch_id, college_id,
            solution, violations_json, hard_count, report,
        )
        if not ok:
            return None

        # ── 4. Insert scheduled_classes ──────────────────────────────
        ok = self._insert_scheduled_classes(
            timetable_id, solution, report,
        )
        if not ok:
            self._rollback_timetable(timetable_id)
            return None

        # ── 5. Insert algorithm_execution_metrics ────────────────────
        self._insert_metrics(
            task_id, solution, execution_time,
            hard_count, soft_count, report,
        )

        elapsed = time.perf_counter() - t0
        logger.info(f"LOAD DONE in {elapsed:.2f}s | timetable_id={timetable_id}")
        return timetable_id

    # ------------------------------------------------------------------
    # Inserts
    # ------------------------------------------------------------------

    def _insert_timetable(
        self,
        timetable_id: str,
        task_id: str,
        batch_id: str,
        college_id: str,
        solution: Solution,
        violations_json: list,
        hard_count: int,
        report: DataQualityReport,
    ) -> bool:
        meta = solution.metadata or {}
        try:
            self.client.table("generated_timetables").insert({
                "id": timetable_id,
                "generation_task_id": task_id,
                "batch_id": batch_id,
                "college_id": college_id,
                "title": f"Optimized Timetable - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "academic_year": str(meta.get("academic_year", "2025-26")),
                "semester": int(meta.get("semester", 1)),
                "fitness_score": float(solution.quality_score),
                "hard_constraint_violations": hard_count,
                "constraint_violations": _json_safe(violations_json),
                "optimization_metrics": _json_safe(meta),
                "generation_method": "HYBRID",
                "algorithm_source": "optimized_ensemble",
                "status": "draft",
                "created_by": str(meta.get("user_id", college_id)),
                "is_active": False,
                "is_published": False,
                "version": 1,
            }).execute()
            logger.info(f"Inserted generated_timetables: {timetable_id}")
            return True
        except Exception as exc:
            logger.error(f"FAILED inserting timetable: {exc}")
            report.add_error("insert_failed", "timetable", timetable_id, str(exc))
            return False

    def _insert_scheduled_classes(
        self,
        timetable_id: str,
        solution: Solution,
        report: DataQualityReport,
    ) -> bool:
        records = []
        for asgn in solution.assignments:
            records.append({
                "id": str(uuid.uuid4()),
                "timetable_id": timetable_id,
                "batch_id": asgn.batch_id,
                "subject_id": asgn.subject_id,
                "faculty_id": asgn.faculty_id,
                "classroom_id": asgn.room_id,
                "time_slot_id": asgn.time_slot.id,
                "credit_hour_number": 1,
                "class_type": "LAB" if asgn.is_lab_session else "THEORY",
            })
        if not records:
            report.add_warning("empty_result", "scheduled_classes", message="No assignments to save")
            return True  # not a fatal error

        try:
            batch_size = 50
            for i in range(0, len(records), batch_size):
                chunk = records[i: i + batch_size]
                self.client.table("scheduled_classes").insert(chunk).execute()
            logger.info(f"Inserted {len(records)} scheduled_classes")
            return True
        except Exception as exc:
            logger.error(f"FAILED inserting scheduled_classes: {exc}")
            report.add_error("insert_failed", "scheduled_classes", timetable_id, str(exc))
            return False

    def _insert_metrics(
        self,
        task_id: str,
        solution: Solution,
        execution_time: float,
        hard_count: int,
        soft_count: int,
        report: DataQualityReport,
    ):
        try:
            self.client.table("algorithm_execution_metrics").insert({
                "generation_task_id": task_id,
                "total_execution_time_ms": int(execution_time * 1000),
                "final_score": float(solution.quality_score),
                "solutions_found": 1,
                "hard_constraint_violations": hard_count,
                "soft_constraint_violations": soft_count,
                "metrics_json": _json_safe({
                    "solver_name": solution.solver_name,
                    "is_valid": solution.is_valid,
                    "hard_constraint_score": solution.hard_constraint_score,
                    "soft_constraint_score": solution.soft_constraint_score,
                    "num_assignments": len(solution.assignments),
                    "violations": len(solution.constraint_violations),
                    "iterations": (solution.metadata or {}).get("iterations", 0),
                }),
            }).execute()
            logger.info("Inserted algorithm_execution_metrics")
        except Exception as exc:
            logger.error(f"FAILED inserting metrics (non-fatal): {exc}")
            report.add_warning("insert_failed", "metrics", task_id, str(exc))

    # ------------------------------------------------------------------
    # Rollback & idempotency
    # ------------------------------------------------------------------

    def _rollback_timetable(self, timetable_id: str):
        """Delete partially created timetable on failure."""
        try:
            self.client.table("generated_timetables").delete().eq("id", timetable_id).execute()
            logger.warning(f"Rolled back timetable {timetable_id}")
        except Exception as exc:
            logger.error(f"Rollback failed for {timetable_id}: {exc}")

    def _existing_timetable_for_task(self, task_id: str) -> Optional[str]:
        """Return timetable ID if one already exists for this task."""
        try:
            result = (
                self.client.table("generated_timetables")
                .select("id")
                .eq("generation_task_id", task_id)
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]["id"]
        except Exception:
            pass
        return None

    # ------------------------------------------------------------------
    # Violation helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _serialize_violations(violations) -> list:
        result = []
        for v in (violations or []):
            if hasattr(v, "constraint_type"):
                result.append({
                    "type": (
                        v.constraint_type.value
                        if hasattr(v.constraint_type, "value")
                        else str(v.constraint_type)
                    ),
                    "severity": v.severity,
                    "description": v.description,
                })
            elif isinstance(v, dict):
                result.append(v)
        return result

    @staticmethod
    def _count_violations(violations) -> tuple:
        hard = sum(
            1 for v in (violations or [])
            if hasattr(v, "constraint_type") and v.constraint_type in (
                ConstraintType.NO_OVERLAP, ConstraintType.ROOM_CAPACITY,
                ConstraintType.FACULTY_AVAILABILITY, ConstraintType.LAB_REQUIREMENTS,
            )
        )
        soft = len(violations or []) - hard
        return hard, soft


# =====================================================================
# JSON-safe converter (module-level, shared with supabase_client)
# =====================================================================

def _json_safe(obj):
    """Recursively convert any object to JSON-safe native Python types."""
    if obj is None:
        return None
    if isinstance(obj, bool):
        return bool(obj)
    if isinstance(obj, int):
        return int(obj)
    if isinstance(obj, float):
        return float(obj)
    if isinstance(obj, str):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_json_safe(v) for v in obj]
    # numpy scalars, Decimal, datetime, etc.
    try:
        return float(obj)
    except (TypeError, ValueError):
        return str(obj)
