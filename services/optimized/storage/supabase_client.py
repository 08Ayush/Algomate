"""
Neon PostgreSQL Database Client for Optimized Scheduler

Replaces the former Supabase client after the Supabase -> Neon migration.
Connects via psycopg2 using DATABASE_URL from .env, fetches domain data
(batches, subjects, faculty, classrooms, time_slots) and maps them to
optimized core models for batch-wise timetable generation.

Drop-in replacement for the original SupabaseSchedulerClient - same public API.
"""

import os
import uuid
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from core.models import (
    TimeSlot,
    Room,
    Faculty,
    Batch,
    Subject,
    Assignment,
    Solution,
    ConstraintType,
)

logger = logging.getLogger("optimized.supabase")


# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------

def _load_env():
    """Load .env for local development only.

    Walks up the directory tree from this file looking for a .env file.
    On Railway/production no .env exists so this is a no-op (Railway env
    vars are already in os.environ and are never overridden).
    """
    try:
        for parent in Path(__file__).resolve().parents:
            env_file = parent / ".env"
            if env_file.exists():
                # override=False: never clobber Railway/Vercel env vars
                load_dotenv(env_file, override=False)
                logger.debug(f"Loaded .env from {env_file}")
                return
    except Exception as exc:
        logger.debug(f"_load_env skipped: {exc}")
    logger.debug("No .env file found — relying on environment variables")


def get_connection() -> psycopg2.extensions.connection:
    """Open a new psycopg2 connection to Neon using DATABASE_URL."""
    _load_env()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError(
            "Missing DATABASE_URL. Set DATABASE_URL in .env pointing to your Neon database."
        )
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    return conn


def _query(sql: str, params=None) -> List[Dict[str, Any]]:
    """Execute a SELECT query and return list of dicts."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()


def _execute(sql: str, params=None):
    """Execute an INSERT / UPDATE statement."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _execute_many(sql: str, param_list: List):
    """Execute a batch INSERT for a list of rows."""
    if not param_list:
        return
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, param_list, page_size=50)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Kept for backward compatibility (used in orchestrator.py / routes.py)
# ---------------------------------------------------------------------------

def get_supabase_client():
    """Deprecated shim - SupabaseSchedulerClient now uses psycopg2 directly."""
    return None


def reset_client():
    pass


# ---------------------------------------------------------------------------
# SupabaseSchedulerClient - same public API, now backed by Neon / psycopg2
# ---------------------------------------------------------------------------

class SupabaseSchedulerClient:
    """
    Fetches scheduling domain data from Neon PostgreSQL and maps to optimized
    core models.  The public interface is identical to the original Supabase
    version so no other files need to change.
    """

    def __init__(self, client=None):
        self._injected_client = client
        self.logger = logging.getLogger("optimized.neon.client")

    # ------------------------------------------------------------------
    # Domain data fetching
    # ------------------------------------------------------------------

    def fetch_batch_data(self, batch_id: str, college_id: str) -> Dict[str, Any]:
        """Fetch all domain data for a single batch."""
        self.logger.info(f"Fetching domain data for batch={batch_id}, college={college_id}")

        # 1. Batch info
        rows = _query(
            "SELECT *, department_id FROM batches WHERE id = %s LIMIT 1",
            (batch_id,),
        )
        if not rows:
            raise ValueError(f"Batch {batch_id} not found")
        batch = self._map_batch(rows[0])
        self.logger.info(f"Batch: {batch.name} (semester {batch.semester})")

        # 2. Subjects via batch_subjects join
        bs_rows = _query(
            """
            SELECT
                bs.subject_id,
                bs.assigned_faculty_id,
                bs.required_hours_per_week,
                row_to_json(s) AS subjects
            FROM batch_subjects bs
            JOIN subjects s ON s.id = bs.subject_id
            WHERE bs.batch_id = %s
            """,
            (batch_id,),
        )

        subjects: List[Subject] = []
        subject_ids: List[str] = []
        assigned_faculty_map: Dict[str, str] = {}

        for bs in bs_rows:
            subj_data = bs.get("subjects")
            if isinstance(subj_data, str):
                subj_data = json.loads(subj_data)
            if not subj_data:
                continue
            subj_data["required_hours_per_week"] = bs.get("required_hours_per_week", 3)
            subjects.append(self._map_subject(subj_data))
            subject_ids.append(subj_data["id"])
            if bs.get("assigned_faculty_id"):
                assigned_faculty_map[subj_data["id"]] = bs["assigned_faculty_id"]

        batch.subjects = subject_ids
        self.logger.info(f"Subjects: {len(subjects)} assigned to batch")

        # 3. Faculty
        faculty_dict: Dict[str, dict] = {}
        faculty_qualifications_map: Dict[str, List[str]] = {}

        # 3a. Assigned faculty
        if assigned_faculty_map:
            assigned_ids = list(set(assigned_faculty_map.values()))
            assigned_rows = _query(
                "SELECT * FROM users WHERE id = ANY(%s::uuid[])",
                (assigned_ids,),
            )
            for u in assigned_rows:
                faculty_dict[u["id"]] = u
            for subject_id, faculty_id in assigned_faculty_map.items():
                faculty_qualifications_map.setdefault(faculty_id, []).append(subject_id)

        # 3b. Qualified faculty
        if subject_ids:
            qual_rows = _query(
                """
                SELECT fqs.faculty_id, fqs.subject_id, row_to_json(u) AS users
                FROM faculty_qualified_subjects fqs
                JOIN users u ON u.id = fqs.faculty_id
                WHERE fqs.subject_id = ANY(%s::uuid[])
                """,
                (subject_ids,),
            )
            for fq in qual_rows:
                user_data = fq.get("users")
                if isinstance(user_data, str):
                    user_data = json.loads(user_data)
                if user_data and user_data["id"] not in faculty_dict:
                    faculty_dict[user_data["id"]] = user_data
                fac_id = fq.get("faculty_id")
                sub_id = fq.get("subject_id")
                if fac_id and sub_id:
                    lst = faculty_qualifications_map.setdefault(fac_id, [])
                    if sub_id not in lst:
                        lst.append(sub_id)

        faculty = [
            self._map_faculty(u, faculty_qualifications_map.get(u["id"], []))
            for u in faculty_dict.values()
        ]
        self.logger.info(f"Faculty: {len(faculty)} available")

        # 4. Classrooms
        classrooms_rows = _query(
            "SELECT * FROM classrooms WHERE college_id = %s AND is_available = TRUE",
            (college_id,),
        )
        classrooms = [self._map_room(r) for r in classrooms_rows]
        self.logger.info(f"Classrooms: {len(classrooms)} available")

        # 5. Time slots
        ts_rows = _query(
            "SELECT * FROM time_slots WHERE college_id = %s AND is_active = TRUE",
            (college_id,),
        )
        time_slots = [self._map_time_slot(t) for t in ts_rows]
        self.logger.info(f"Time slots: {len(time_slots)} active")

        return {
            "batch": batch,
            "subjects": subjects,
            "faculty": faculty,
            "classrooms": classrooms,
            "time_slots": time_slots,
            "assigned_faculty_map": assigned_faculty_map,
        }

    # ------------------------------------------------------------------
    # Task management
    # ------------------------------------------------------------------

    def create_task(
        self,
        task_id: str,
        batch_id: str,
        college_id: str,
        created_by: str,
        algo_config: Dict[str, Any],
    ):
        """Create a timetable_generation_tasks record."""
        try:
            academic_year = algo_config.pop("academic_year", "2025-26")
            semester = algo_config.pop("semester", 1)
            task_name = f"Optimized Schedule - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            _execute(
                """
                INSERT INTO timetable_generation_tasks
                    (id, college_id, batch_id, task_name, academic_year, semester,
                     status, current_phase, progress, created_by, algorithm_config)
                VALUES (%s, %s, %s, %s, %s, %s, 'PENDING', 'INITIALIZING', 0, %s, %s)
                """,
                (
                    task_id, college_id, batch_id, task_name,
                    academic_year, semester, created_by,
                    json.dumps(algo_config),
                ),
            )
            self.logger.info(f"Created task record: {task_id}")
        except Exception as e:
            self.logger.warning(f"Could not create task record: {e}")

    def update_task_batch_info(self, task_id: str, semester: int, academic_year: str):
        """Update task with correct semester and academic_year from batch."""
        try:
            _execute(
                "UPDATE timetable_generation_tasks SET semester=%s, academic_year=%s WHERE id=%s",
                (semester, academic_year, task_id),
            )
            self.logger.info(f"Updated task {task_id}: semester={semester}, academic_year={academic_year}")
        except Exception as e:
            self.logger.warning(f"Could not update task batch info: {e}")

    STATUS_MAP = {
        "pending": "PENDING",
        "running": "RUNNING",
        "completed": "COMPLETED",
        "failed": "FAILED",
        "cancelled": "CANCELLED",
    }

    def update_task_status(self, task_id: str, status: str, message: str):
        """Update task status in database."""
        try:
            db_status = self.STATUS_MAP.get(status.lower(), status.upper())
            now = datetime.now().isoformat()
            phase = None
            progress = None
            completed_at = None
            error_details = None

            if status.lower() == "running":
                phase = "CP_SAT"
                msg_l = message.lower()
                if "initializing" in msg_l:
                    progress = 5
                elif "fetching" in msg_l or "fetch" in msg_l:
                    progress = 15
                elif "context" in msg_l:
                    progress = 25
                elif "solver" in msg_l or "running" in msg_l:
                    progress = 50
                else:
                    progress = 60
            elif status.lower() == "completed":
                phase = "COMPLETED"
                progress = 100
                completed_at = now
            elif status.lower() == "failed":
                phase = "FAILED"
                error_details = message

            _execute(
                """
                UPDATE timetable_generation_tasks SET
                    status = %s,
                    current_message = %s,
                    updated_at = %s,
                    current_phase = COALESCE(%s, current_phase),
                    progress = COALESCE(%s, progress),
                    completed_at = COALESCE(%s::timestamptz, completed_at),
                    error_details = COALESCE(%s, error_details)
                WHERE id = %s
                """,
                (db_status, message, now, phase, progress, completed_at, error_details, task_id),
            )
        except Exception as e:
            self.logger.warning(f"Could not update task status: {e}")

    # ------------------------------------------------------------------
    # Saving results
    # ------------------------------------------------------------------

    def save_timetable(
        self,
        task_id: str,
        batch_id: str,
        college_id: str,
        solution: Solution,
        execution_time: float,
    ) -> str:
        from utils.runtime_logger import get_runtime_logger
        rlog = get_runtime_logger()

        timetable_id = str(uuid.uuid4())

        def _serialize_violations(violations):
            result = []
            for v in (violations or []):
                if hasattr(v, "constraint_type"):
                    result.append({
                        "type": v.constraint_type.value if hasattr(v.constraint_type, "value") else str(v.constraint_type),
                        "severity": v.severity,
                        "description": v.description,
                    })
                elif isinstance(v, dict):
                    result.append(v)
            return result

        violations_json = _serialize_violations(solution.constraint_violations)
        hard_count = sum(
            1 for v in (solution.constraint_violations or [])
            if hasattr(v, "constraint_type") and v.constraint_type in (
                ConstraintType.NO_OVERLAP, ConstraintType.ROOM_CAPACITY,
                ConstraintType.FACULTY_AVAILABILITY, ConstraintType.LAB_REQUIREMENTS,
            )
        )
        soft_count = len(solution.constraint_violations or []) - hard_count

        def _json_safe(obj):
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
            try:
                return float(obj)
            except (TypeError, ValueError):
                return str(obj)

        # 1. generated_timetables
        try:
            _execute(
                """
                INSERT INTO generated_timetables
                    (id, generation_task_id, batch_id, college_id, title,
                     academic_year, semester, fitness_score,
                     hard_constraint_violations, constraint_violations,
                     optimization_metrics, generation_method, algorithm_source,
                     status, created_by, is_active, is_published, version)
                VALUES
                    (%s, %s, %s, %s, %s,
                     %s, %s, %s,
                     %s, %s::jsonb,
                     %s::jsonb, %s, %s,
                     %s, %s, %s, %s, %s)
                """,
                (
                    timetable_id, task_id, batch_id, college_id,
                    f"Optimized Timetable - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    str(solution.metadata.get("academic_year", "2025-26")),
                    int(solution.metadata.get("semester", 1)),
                    float(solution.quality_score),
                    hard_count,
                    json.dumps(_json_safe(violations_json)),
                    json.dumps(_json_safe(solution.metadata or {})),
                    "HYBRID", "optimized_ensemble",
                    "draft",
                    str(solution.metadata.get("user_id", college_id)),
                    False, False, 1,
                ),
            )
            rlog.info(f"Created timetable record: {timetable_id}")
        except Exception as e:
            rlog.error(f"FAILED to create timetable record: {e}")
            return timetable_id

        # 2. scheduled_classes
        credits_map = (solution.metadata or {}).get("subject_credits_map", {})
        records = [
            (
                str(uuid.uuid4()),
                timetable_id,
                asgn.batch_id,
                asgn.subject_id,
                asgn.faculty_id,
                asgn.room_id,
                asgn.time_slot.id,
                credits_map.get(asgn.subject_id, 1),
                "LAB" if asgn.is_lab_session else "THEORY",
            )
            for asgn in solution.assignments
        ]
        if records:
            try:
                _execute_many(
                    """
                    INSERT INTO scheduled_classes
                        (id, timetable_id, batch_id, subject_id, faculty_id,
                         classroom_id, time_slot_id, credit_hour_number, class_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    records,
                )
                rlog.info(f"Saved {len(records)} scheduled classes")
            except Exception as e:
                rlog.error(f"FAILED to save scheduled classes: {e}")

        # 3. algorithm_execution_metrics
        try:
            _execute(
                """
                INSERT INTO algorithm_execution_metrics
                    (generation_task_id, total_execution_time_ms, final_score,
                     solutions_found, hard_constraint_violations,
                     soft_constraint_violations, metrics_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    task_id,
                    int(execution_time * 1000),
                    float(solution.quality_score),
                    1, hard_count, soft_count,
                    json.dumps(_json_safe({
                        "solver_name": solution.solver_name,
                        "is_valid": solution.is_valid,
                        "hard_constraint_score": solution.hard_constraint_score,
                        "soft_constraint_score": solution.soft_constraint_score,
                        "num_assignments": len(solution.assignments),
                        "violations": len(solution.constraint_violations),
                        "iterations": solution.metadata.get("iterations", 0),
                    })),
                ),
            )
            rlog.info("Saved algorithm execution metrics")
        except Exception as e:
            rlog.error(f"FAILED to save algorithm metrics: {e}")

        return timetable_id

    # ------------------------------------------------------------------
    # Status / result queries
    # ------------------------------------------------------------------

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        try:
            rows = _query(
                "SELECT id, status, current_message, created_at, updated_at "
                "FROM timetable_generation_tasks WHERE id = %s LIMIT 1",
                (task_id,),
            )
            return rows[0] if rows else None
        except Exception:
            return None

    def get_timetable_for_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        try:
            rows = _query(
                "SELECT id, fitness_score, is_published, title, status, created_at "
                "FROM generated_timetables WHERE generation_task_id = %s LIMIT 1",
                (task_id,),
            )
            return rows[0] if rows else None
        except Exception:
            return None

    def get_scheduled_classes(self, timetable_id: str) -> List[Dict[str, Any]]:
        try:
            return _query(
                """
                SELECT
                    sc.*,
                    s.name  AS subject_name,
                    s.code  AS subject_code,
                    u.first_name, u.last_name,
                    c.name  AS classroom_name,
                    ts.day, ts.start_time, ts.end_time, ts.slot_number
                FROM scheduled_classes sc
                LEFT JOIN subjects   s  ON s.id  = sc.subject_id
                LEFT JOIN users      u  ON u.id  = sc.faculty_id
                LEFT JOIN classrooms c  ON c.id  = sc.classroom_id
                LEFT JOIN time_slots ts ON ts.id = sc.time_slot_id
                WHERE sc.timetable_id = %s
                """,
                (timetable_id,),
            )
        except Exception as e:
            self.logger.error(f"Failed to fetch scheduled classes: {e}")
            return []

    # ------------------------------------------------------------------
    # Model mapping helpers (DB row -> core models)
    # ------------------------------------------------------------------

    @staticmethod
    def _map_batch(row: dict) -> Batch:
        return Batch(
            id=row["id"],
            name=row.get("name", ""),
            program=row.get("program", ""),
            semester=row.get("semester", 1),
            year=row.get("year", 1),
            strength=row.get("strength", 60),
            department=row.get("department_id", ""),
            subjects=[],
            academic_year=row.get("academic_year", "2025-26"),
        )

    @staticmethod
    def _map_subject(row: dict) -> Subject:
        is_lab = bool(
            row.get("requires_lab", False)
            or row.get("is_lab", False)
            or (row.get("subject_type", "").upper() in ("LAB", "PRACTICAL"))
            or (row.get("lab_hours") and int(row.get("lab_hours", 0)) > 0)
        )
        rhpw = row.get("required_hours_per_week")
        credits = row.get("credits", 3)
        if rhpw and int(rhpw) > 0:
            hours = int(rhpw)
            if is_lab:
                hours = hours * 2
        elif credits and int(credits) > 0:
            hours = int(credits) * 2 if is_lab else int(credits)
        else:
            hours = int(row.get("weekly_hours", row.get("hours_per_week", 3)))

        return Subject(
            id=row["id"],
            name=row.get("name", ""),
            code=row.get("code", ""),
            credits=row.get("credits", 3),
            hours_per_week=hours,
            is_lab=is_lab,
            is_elective=row.get("is_elective", False),
            max_students=row.get("max_students"),
            room_requirements=row.get("room_requirements", []),
            required_qualifications=row.get("required_qualifications", []),
            prerequisites=row.get("prerequisites", []),
        )

    @staticmethod
    def _map_faculty(row: dict, qualifications: List[str] = None) -> Faculty:
        return Faculty(
            id=row["id"],
            name=row.get("full_name", row.get("name", "")),
            department=row.get("department_id", row.get("department", "")),
            designation=row.get("designation", "Assistant Professor"),
            max_hours_per_week=row.get("max_hours_per_week", 20),
            min_hours_per_week=row.get("min_hours_per_week", 12),
            preferred_time_slots=row.get("preferred_time_slots", []),
            unavailable_slots=row.get("unavailable_slots", []),
            qualifications=qualifications if qualifications is not None else row.get("qualifications", []),
            rank_weight=row.get("rank_weight", 1.0),
        )

    @staticmethod
    def _map_room(row: dict) -> Room:
        return Room(
            id=row["id"],
            name=row.get("name", ""),
            capacity=row.get("capacity", 60),
            room_type=row.get("room_type", "classroom"),
            building=row.get("building", "Main"),
            floor=row.get("floor", 1),
            facilities=row.get("facilities", []),
            is_available=row.get("is_available", True),
        )

    DAY_NAME_MAP = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
    }

    @staticmethod
    def _map_time_slot(row: dict) -> TimeSlot:
        start_hour = row.get("start_hour")
        start_minute = row.get("start_minute", 0)
        duration = row.get("duration_minutes", 60)

        if start_hour is None and "start_time" in row:
            parts = str(row["start_time"]).split(":")
            start_hour = int(parts[0])
            start_minute = int(parts[1]) if len(parts) > 1 else 0
            if "end_time" in row:
                eparts = str(row["end_time"]).split(":")
                end_minutes = int(eparts[0]) * 60 + (int(eparts[1]) if len(eparts) > 1 else 0)
                duration = end_minutes - (start_hour * 60 + start_minute)

        raw_day = row.get("day", row.get("day_of_week", 0))
        if isinstance(raw_day, str):
            day = SupabaseSchedulerClient.DAY_NAME_MAP.get(raw_day.lower(), 0)
        else:
            day = int(raw_day)

        return TimeSlot(
            id=row["id"],
            day=day,
            start_hour=int(start_hour or 9),
            start_minute=int(start_minute),
            duration_minutes=int(duration),
            is_lab_slot=row.get("is_lab_slot", False),
        )
