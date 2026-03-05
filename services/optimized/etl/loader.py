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

import json as _json
from core.models import ConstraintType, Solution
from storage.supabase_client import _query as _db_query, _execute as _db_execute, _execute_many as _db_execute_many
from .quality import DataQualityReport
from utils.runtime_logger import get_runtime_logger

logger = logging.getLogger("optimized.etl.load")
runtime_logger = get_runtime_logger()

# Day integer to string mapping for database queries
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class Loader:
    """
    Saves the scheduling solution to the database with proper
    serialisation and error handling.
    """

    def __init__(self, client=None):
        # client param kept for API compatibility; ignored — psycopg2 is used directly
        self._client = client

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
            timetable_id, college_id, solution, report,
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
            _db_execute(
                """
                INSERT INTO generated_timetables (
                    id, generation_task_id, batch_id, college_id, title,
                    academic_year, semester, fitness_score,
                    hard_constraint_violations, constraint_violations,
                    optimization_metrics, generation_method, algorithm_source,
                    status, created_by, is_active, is_published, version
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s::jsonb,
                    %s::jsonb, %s, %s,
                    %s, %s, %s, %s, %s
                )
                """,
                (
                    timetable_id,
                    task_id,
                    batch_id,
                    college_id,
                    f"Optimized Timetable - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    str(meta.get("academic_year", "2025-26")),
                    int(meta.get("semester", 1)),
                    float(solution.quality_score),
                    hard_count,
                    _json.dumps(_json_safe(violations_json)),
                    _json.dumps(_json_safe(meta)),
                    "HYBRID",
                    "optimized_ensemble",
                    "draft",
                    str(meta.get("user_id", college_id)),
                    False,
                    False,
                    1,
                ),
            )
            logger.info(f"Inserted generated_timetables: {timetable_id}")
            return True
        except Exception as exc:
            logger.error(f"FAILED inserting timetable: {exc}", exc_info=True)
            print(f"\n❌ TIMETABLE INSERT ERROR: {exc}\n")  # Force to stdout
            report.add_error("insert_failed", "timetable", timetable_id, str(exc))
            return False

    def _insert_scheduled_classes(
        self,
        timetable_id: str,
        college_id: str,
        solution: Solution,
        report: DataQualityReport,
    ) -> bool:
        # Track how many times each subject has been scheduled for sequential credit_hour_number
        subject_hour_counters: Dict[str, int] = {}
        
        # Track consecutive lab sessions for proper continuation marking
        # Key: (batch_id, subject_id, faculty_id, room_id, day)
        # Value: list of (time_slot, assignment_index) tuples sorted by start time
        lab_groups: Dict[tuple, List[tuple]] = {}
        
        # First pass: group consecutive lab assignments
        for idx, asgn in enumerate(solution.assignments):
            if asgn.is_lab_session:
                key = (asgn.batch_id, asgn.subject_id, asgn.faculty_id, asgn.room_id, asgn.time_slot.day)
                if key not in lab_groups:
                    lab_groups[key] = []
                lab_groups[key].append((asgn.time_slot, idx))
        
        # Sort each group by start time to identify consecutive pairs
        for key in lab_groups:
            lab_groups[key].sort(key=lambda x: x[0].start_hour * 60 + x[0].start_minute)
        
        records = []
        for idx, asgn in enumerate(solution.assignments):
            # Map class_type: LAB/PRACTICAL for labs, THEORY otherwise
            if asgn.is_lab_session:
                class_type = "LAB"
            else:
                class_type = "THEORY"
            
            # Check if this is a multi-hour session (e.g., 2-hour lab)
            if asgn.time_slot.duration_minutes > 60:
                # Split into multiple 1-hour records for UI compatibility
                num_hours = asgn.time_slot.duration_minutes // 60
                # Convert integer day (0-6) to string name for database query
                day_name = DAY_NAMES[asgn.time_slot.day]
                runtime_logger.info(f"🔄 Splitting {num_hours}hr lab: {day_name} {asgn.time_slot.start_hour:02d}:{asgn.time_slot.start_minute:02d}")
                
                # Query database for individual 1-hour time slots
                try:
                    start_hour = asgn.time_slot.start_hour
                    start_minute = asgn.time_slot.start_minute
                    
                    for hour_offset in range(num_hours):
                        # Calculate this hour's time range
                        current_hour = start_hour + hour_offset
                        hour_start_time = f"{current_hour:02d}:{start_minute:02d}:00"
                        hour_end_time = f"{(current_hour + 1):02d}:{start_minute:02d}:00"
                        
                        # Find matching 1-hour time slot in database
                        ts_rows = _db_query(
                            "SELECT id FROM time_slots WHERE college_id=%s AND day=%s "
                            "AND start_time=%s AND end_time=%s LIMIT 1",
                            (college_id, day_name, hour_start_time, hour_end_time),
                        )
                        if not ts_rows:
                            logger.warning(f"No time slot found for {day_name} {hour_start_time}-{hour_end_time}")
                            hour_time_slot_id = asgn.time_slot.id
                        else:
                            hour_time_slot_id = ts_rows[0]["id"]
                        
                        # Increment counter for this specific hour
                        if asgn.subject_id not in subject_hour_counters:
                            subject_hour_counters[asgn.subject_id] = 0
                        subject_hour_counters[asgn.subject_id] += 1
                        
                        records.append({
                            "id": str(uuid.uuid4()),
                            "timetable_id": timetable_id,
                            "batch_id": asgn.batch_id,
                            "subject_id": asgn.subject_id,
                            "faculty_id": asgn.faculty_id,
                            "classroom_id": asgn.room_id,
                            "time_slot_id": hour_time_slot_id,
                            "is_lab": asgn.is_lab_session,
                            "is_continuation": hour_offset > 0,
                            "session_number": hour_offset + 1,
                            "credit_hour_number": subject_hour_counters[asgn.subject_id],
                            "class_type": class_type,
                        })
                    
                    runtime_logger.info(f"✅ Split complete: {num_hours} records created")
                    
                except Exception as e:
                    logger.error(f"Error splitting multi-hour session: {e}")
                    # Fallback: insert as single record
                    if asgn.subject_id not in subject_hour_counters:
                        subject_hour_counters[asgn.subject_id] = 0
                    subject_hour_counters[asgn.subject_id] += 1
                    
                    records.append({
                        "id": str(uuid.uuid4()),
                        "timetable_id": timetable_id,
                        "batch_id": asgn.batch_id,
                        "subject_id": asgn.subject_id,
                        "faculty_id": asgn.faculty_id,
                        "classroom_id": asgn.room_id,
                        "time_slot_id": asgn.time_slot.id,
                        "is_lab": asgn.is_lab_session,
                        "credit_hour_number": subject_hour_counters[asgn.subject_id],
                        "class_type": class_type,
                    })
            else:
                # Single-hour session - check if it's part of a consecutive lab block
                is_continuation = False
                session_number = 1
                
                if asgn.is_lab_session:
                    key = (asgn.batch_id, asgn.subject_id, asgn.faculty_id, asgn.room_id, asgn.time_slot.day)
                    if key in lab_groups:
                        group = lab_groups[key]
                        # Find this assignment's position in the group
                        for position, (slot, assign_idx) in enumerate(group):
                            if assign_idx == idx:
                                session_number = position + 1
                                # Check if previous slot is consecutive (1 hour before)
                                if position > 0:
                                    prev_slot = group[position - 1][0]
                                    prev_end = prev_slot.start_hour * 60 + prev_slot.start_minute + prev_slot.duration_minutes
                                    curr_start = asgn.time_slot.start_hour * 60 + asgn.time_slot.start_minute
                                    if prev_end == curr_start:
                                        is_continuation = True
                                        logger.info(f"✅ Marking continuation: {asgn.subject_id} slot {session_number}")
                                break
                
                # Increment counter
                if asgn.subject_id not in subject_hour_counters:
                    subject_hour_counters[asgn.subject_id] = 0
                subject_hour_counters[asgn.subject_id] += 1
                
                records.append({
                    "id": str(uuid.uuid4()),
                    "timetable_id": timetable_id,
                    "batch_id": asgn.batch_id,
                    "subject_id": asgn.subject_id,
                    "faculty_id": asgn.faculty_id,
                    "classroom_id": asgn.room_id,
                    "time_slot_id": asgn.time_slot.id,
                    "is_lab": asgn.is_lab_session,
                    "is_continuation": is_continuation,
                    "session_number": session_number,
                    "credit_hour_number": subject_hour_counters[asgn.subject_id],
                    "class_type": class_type,
                })
                
        if not records:
            report.add_warning("empty_result", "scheduled_classes", message="No assignments to save")
            return True  # not a fatal error

        try:
            _SC_SQL = (
                "INSERT INTO scheduled_classes "
                "(id, timetable_id, batch_id, subject_id, faculty_id, classroom_id, "
                "time_slot_id, is_lab, is_continuation, session_number, credit_hour_number, class_type) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
            )
            tuples = [
                (
                    r["id"], r["timetable_id"], r["batch_id"], r["subject_id"],
                    r["faculty_id"], r["classroom_id"], r["time_slot_id"],
                    r["is_lab"], r.get("is_continuation", False),
                    r.get("session_number", 1), r["credit_hour_number"], r["class_type"],
                )
                for r in records
            ]
            batch_size = 50
            total_inserted = 0
            for i in range(0, len(tuples), batch_size):
                _db_execute_many(_SC_SQL, tuples[i: i + batch_size])
                total_inserted += min(batch_size, len(tuples) - i)

            lab_count = sum(1 for r in records if r.get("is_lab"))
            continuation_count = sum(1 for r in records if r.get("is_continuation"))
            runtime_logger.info(f"📊 Inserted {total_inserted} scheduled_classes ({lab_count} labs, {continuation_count} continuations)")
            
            return True
        except Exception as exc:
            logger.error(f"FAILED inserting scheduled_classes: {exc}", exc_info=True)
            print(f"\n❌ DATABASE ERROR: {exc}\n")  # Force to stdout
            print(f"Sample record: {records[0] if records else 'no records'}")
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
            _db_execute(
                """
                INSERT INTO algorithm_execution_metrics (
                    generation_task_id, total_execution_time_ms, final_score,
                    solutions_found, hard_constraint_violations, soft_constraint_violations,
                    metrics_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    task_id,
                    int(execution_time * 1000),
                    float(solution.quality_score),
                    1,
                    hard_count,
                    soft_count,
                    _json.dumps(_json_safe({
                        "solver_name": solution.solver_name,
                        "is_valid": solution.is_valid,
                        "hard_constraint_score": solution.hard_constraint_score,
                        "soft_constraint_score": solution.soft_constraint_score,
                        "num_assignments": len(solution.assignments),
                        "violations": len(solution.constraint_violations),
                        "iterations": (solution.metadata or {}).get("iterations", 0),
                    })),
                ),
            )
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
            _db_execute("DELETE FROM generated_timetables WHERE id = %s", (timetable_id,))
            logger.warning(f"Rolled back timetable {timetable_id}")
        except Exception as exc:
            logger.error(f"Rollback failed for {timetable_id}: {exc}")

    def _existing_timetable_for_task(self, task_id: str) -> Optional[str]:
        """Return timetable ID if one already exists for this task."""
        try:
            rows = _db_query(
                "SELECT id FROM generated_timetables WHERE generation_task_id = %s LIMIT 1",
                (task_id,),
            )
            if rows:
                return rows[0]["id"]
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
