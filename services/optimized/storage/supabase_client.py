"""
Supabase Database Client for Optimized Scheduler

Connects to the same Supabase database as the scheduler module,
fetches domain data (batches, subjects, faculty, classrooms, time_slots),
and maps them to optimized core models for batch-wise timetable generation.

References: services/scheduler/utils/db_client.py, services/scheduler/hybrid_orchestrator.py
"""

import os
import uuid
import logging
from dataclasses import asdict
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from functools import lru_cache

from dotenv import load_dotenv
from supabase import create_client, Client

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
# Singleton Supabase client (mirrors scheduler/utils/db_client.py)
# ---------------------------------------------------------------------------

_supabase_client: Optional[Client] = None


def _load_env():
    """Load .env from project root (3 levels up from this file)."""
    project_root = Path(__file__).resolve().parents[3]
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        logger.debug(f"Loaded .env from {env_file}")
    else:
        logger.warning(f".env not found at {env_file}")


def get_supabase_client() -> Client:
    """Get or create singleton Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        _load_env()
        url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError(
                "Missing Supabase credentials. "
                "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
            )
        _supabase_client = create_client(url, key)
        logger.info("Supabase client initialized")
    return _supabase_client


def reset_client():
    """Reset singleton client (for testing)."""
    global _supabase_client
    _supabase_client = None


# ---------------------------------------------------------------------------
# SupabaseSchedulerClient – batch-wise domain data fetching
# ---------------------------------------------------------------------------

class SupabaseSchedulerClient:
    """
    Fetches scheduling domain data from Supabase and maps to optimized core models.

    Follows the same DB schema as services/scheduler/hybrid_orchestrator.py:
      - batches (id, name, department_id, semester, year, strength, program)
      - batch_subjects (batch_id, subject_id, assigned_faculty_id, required_hours_per_week)
      - subjects (joined via batch_subjects)
      - users (faculty records)
      - faculty_qualified_subjects (faculty_id, subject_id)
      - classrooms (college_id, is_available)
      - time_slots (college_id, is_active)
      - timetable_generation_tasks (task tracking)
      - generated_timetables (results)
      - scheduled_classes (individual assignments)
      - algorithm_execution_metrics (perf tracking)
    """

    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_client()
        self.logger = logging.getLogger("optimized.supabase.client")

    # ------------------------------------------------------------------
    # Domain data fetching (batch-wise, mirrors _fetch_domain_data)
    # ------------------------------------------------------------------

    def fetch_batch_data(self, batch_id: str, college_id: str) -> Dict[str, Any]:
        """
        Fetch all domain data for a single batch.

        Returns dict with keys:
          batch, subjects, faculty, classrooms, time_slots, assigned_faculty_map
        """
        self.logger.info(f"Fetching domain data for batch={batch_id}, college={college_id}")

        # 1. Batch info
        batch_row = (
            self.client.table("batches")
            .select("*, department_id")
            .eq("id", batch_id)
            .single()
            .execute()
        ).data
        if not batch_row:
            raise ValueError(f"Batch {batch_id} not found")

        batch = self._map_batch(batch_row)
        self.logger.info(f"Batch: {batch.name} (semester {batch.semester})")

        # 2. Subjects via batch_subjects join
        bs_rows = (
            self.client.table("batch_subjects")
            .select("subject_id, assigned_faculty_id, required_hours_per_week, subjects(*)")
            .eq("batch_id", batch_id)
            .execute()
        ).data or []

        subjects: List[Subject] = []
        subject_ids: List[str] = []
        assigned_faculty_map: Dict[str, str] = {}

        for bs in bs_rows:
            subj_data = bs.get("subjects")
            if not subj_data:
                continue
            subj_data["required_hours_per_week"] = bs.get("required_hours_per_week", 3)
            subjects.append(self._map_subject(subj_data))
            subject_ids.append(subj_data["id"])
            if bs.get("assigned_faculty_id"):
                assigned_faculty_map[subj_data["id"]] = bs["assigned_faculty_id"]

        # Update batch.subjects list
        batch.subjects = subject_ids
        self.logger.info(f"Subjects: {len(subjects)} assigned to batch")

        # 3. Faculty – assigned first, then qualified
        faculty_dict: Dict[str, dict] = {}
        # Build qualification map: faculty_id -> [subject_ids they can teach]
        faculty_qualifications_map: Dict[str, List[str]] = {}

        # 3a. Add assigned faculty from batch_subjects.assigned_faculty_id
        if assigned_faculty_map:
            assigned_ids = list(set(assigned_faculty_map.values()))
            assigned_rows = (
                self.client.table("users")
                .select("*")
                .in_("id", assigned_ids)
                .execute()
            ).data or []
            for u in assigned_rows:
                faculty_dict[u["id"]] = u
            
            # Build qualifications from assigned_faculty_map
            for subject_id, faculty_id in assigned_faculty_map.items():
                if faculty_id not in faculty_qualifications_map:
                    faculty_qualifications_map[faculty_id] = []
                faculty_qualifications_map[faculty_id].append(subject_id)

        # 3b. Add qualified faculty from faculty_qualified_subjects table
        if subject_ids:
            qual_rows = (
                self.client.table("faculty_qualified_subjects")
                .select("faculty_id, subject_id, users!faculty_id(*)")
                .in_("subject_id", subject_ids)
                .execute()
            ).data or []
            for fq in qual_rows:
                if fq.get("users") and fq["users"]["id"] not in faculty_dict:
                    faculty_dict[fq["users"]["id"]] = fq["users"]
                
                # Add to qualifications map
                fac_id = fq.get("faculty_id")
                sub_id = fq.get("subject_id")
                if fac_id and sub_id:
                    if fac_id not in faculty_qualifications_map:
                        faculty_qualifications_map[fac_id] = []
                    if sub_id not in faculty_qualifications_map[fac_id]:
                        faculty_qualifications_map[fac_id].append(sub_id)

        # 3c. Map faculty and inject qualifications
        faculty = [
            self._map_faculty(u, faculty_qualifications_map.get(u["id"], []))
            for u in faculty_dict.values()
        ]
        self.logger.info(f"Faculty: {len(faculty)} available")
        # Log qualification stats
        qual_counts = {f.name: len(f.qualifications) for f in faculty}
        self.logger.info(f"Faculty qualifications: {qual_counts}")

        # 4. Classrooms
        classrooms_rows = (
            self.client.table("classrooms")
            .select("*")
            .eq("college_id", college_id)
            .eq("is_available", True)
            .execute()
        ).data or []
        classrooms = [self._map_room(r) for r in classrooms_rows]
        self.logger.info(f"Classrooms: {len(classrooms)} available")

        # 5. Time slots
        ts_rows = (
            self.client.table("time_slots")
            .select("*")
            .eq("college_id", college_id)
            .eq("is_active", True)
            .execute()
        ).data or []
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
    # Task management (mirrors scheduler's _create_task / _update_task_status)
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
            self.client.table("timetable_generation_tasks").insert({
                "id": task_id,
                "college_id": college_id,
                "batch_id": batch_id,
                "task_name": f"Optimized Schedule - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "academic_year": algo_config.pop("academic_year", "2025-26"),
                "semester": algo_config.pop("semester", 1),
                "status": "PENDING",
                "current_phase": "INITIALIZING",
                "progress": 0,
                "created_by": created_by,
                "algorithm_config": algo_config,
            }).execute()
            self.logger.info(f"Created task record: {task_id}")
        except Exception as e:
            self.logger.warning(f"Could not create task record: {e}")

    # Map internal status strings to DB enum values
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
            update_data: Dict[str, Any] = {
                "status": db_status,
                "current_message": message,
                "updated_at": datetime.now().isoformat(),
            }
            # Set phase and progress based on status
            if status.lower() == "running":
                update_data["current_phase"] = "CP_SAT"
                if "Initializing" in message:
                    update_data["progress"] = 5
                elif "Fetching" in message or "fetch" in message.lower():
                    update_data["progress"] = 15
                elif "Context" in message:
                    update_data["progress"] = 25
                elif "solver" in message.lower() or "Running" in message:
                    update_data["progress"] = 50
                else:
                    update_data["progress"] = 60
            elif status.lower() == "completed":
                update_data["current_phase"] = "COMPLETED"
                update_data["progress"] = 100
                update_data["completed_at"] = datetime.now().isoformat()
            elif status.lower() == "failed":
                update_data["current_phase"] = "FAILED"
                update_data["error_details"] = message

            self.client.table("timetable_generation_tasks").update(
                update_data
            ).eq("id", task_id).execute()
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
        """
        Save the generated timetable to the database.

        Creates records in:
          - generated_timetables
          - scheduled_classes
          - algorithm_execution_metrics

        Returns:
            timetable_id
        """
        # Use runtime logger so messages appear in visible log output
        from utils.runtime_logger import get_runtime_logger
        rlog = get_runtime_logger()

        timetable_id = str(uuid.uuid4())

        # Helper: serialize constraint violations (dataclass objects → dicts)
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

        # Helper: make metadata JSON-safe (strip non-serializable values)
        def _json_safe(obj):
            """Recursively convert any object to JSON-safe types."""
            if obj is None:
                return None
            if isinstance(obj, bool):  # must be before int check
                return bool(obj)
            if isinstance(obj, (int,)):
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

        # 1. generated_timetables
        try:
            self.client.table("generated_timetables").insert({
                "id": timetable_id,
                "generation_task_id": task_id,
                "batch_id": batch_id,
                "college_id": college_id,
                "title": f"Optimized Timetable - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "academic_year": str(solution.metadata.get("academic_year", "2025-26")),
                "semester": int(solution.metadata.get("semester", 1)),
                "fitness_score": float(solution.quality_score),
                "hard_constraint_violations": hard_count,
                "constraint_violations": _json_safe(violations_json),
                "optimization_metrics": _json_safe(solution.metadata or {}),
                "generation_method": "HYBRID",
                "algorithm_source": "optimized_ensemble",
                "status": "draft",
                "created_by": str(solution.metadata.get("user_id", college_id)),
                "is_active": False,
                "is_published": False,
                "version": 1,
            }).execute()
            rlog.info(f"Created timetable record: {timetable_id}")
        except Exception as e:
            rlog.error(f"FAILED to create timetable record: {e}")
            # Still return timetable_id but log the error prominently
            return timetable_id

        # 2. scheduled_classes
        # Look up actual credits from solution metadata (populated by orchestrator)
        credits_map = (solution.metadata or {}).get("subject_credits_map", {})
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
                "credit_hour_number": credits_map.get(asgn.subject_id, 1),
                "class_type": "LAB" if asgn.is_lab_session else "THEORY",
            })

        if records:
            try:
                batch_size = 50
                for i in range(0, len(records), batch_size):
                    chunk = records[i : i + batch_size]
                    self.client.table("scheduled_classes").insert(chunk).execute()
                rlog.info(f"Saved {len(records)} scheduled classes")
            except Exception as e:
                rlog.error(f"FAILED to save scheduled classes: {e}")

        # 3. algorithm_execution_metrics
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
                    "iterations": solution.metadata.get("iterations", 0),
                }),
            }).execute()
            rlog.info("Saved algorithm execution metrics")
        except Exception as e:
            rlog.error(f"FAILED to save algorithm metrics: {e}")

        return timetable_id

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Fetch task status from the database."""
        try:
            result = (
                self.client.table("timetable_generation_tasks")
                .select("id, status, current_message, created_at, updated_at")
                .eq("id", task_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            return None

    def get_timetable_for_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Fetch generated timetable linked to a task."""
        try:
            result = (
                self.client.table("generated_timetables")
                .select("id, fitness_score, is_published, title, status, created_at")
                .eq("generation_task_id", task_id)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception:
            return None

    def get_scheduled_classes(self, timetable_id: str) -> List[Dict[str, Any]]:
        """Fetch all scheduled classes for a timetable."""
        try:
            result = (
                self.client.table("scheduled_classes")
                .select(
                    "*, subjects(name, code), users!faculty_id(first_name, last_name), "
                    "classrooms(name), time_slots(day, start_time, end_time, slot_number)"
                )
                .eq("timetable_id", timetable_id)
                .execute()
            )
            return result.data or []
        except Exception as e:
            self.logger.error(f"Failed to fetch scheduled classes: {e}")
            return []

    # ------------------------------------------------------------------
    # Model mapping helpers (DB row → core models)
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
        )

    @staticmethod
    def _map_subject(row: dict) -> Subject:
        return Subject(
            id=row["id"],
            name=row.get("name", ""),
            code=row.get("code", ""),
            credits=row.get("credits", 3),
            hours_per_week=row.get("required_hours_per_week", row.get("hours_per_week", 3)),
            is_lab=row.get("is_lab", False),
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

    # Day name → integer mapping (DB stores enum strings like 'Monday')
    DAY_NAME_MAP = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
    }

    @staticmethod
    def _map_time_slot(row: dict) -> TimeSlot:
        """Map a time_slots DB row to the core TimeSlot model.

        The DB stores:
          - day as enum string ('Monday', 'Tuesday', ...)
          - start_time / end_time as TIME strings ('09:00:00')
          - duration_minutes as generated column
        """
        start_hour = row.get("start_hour")
        start_minute = row.get("start_minute", 0)
        duration = row.get("duration_minutes", 60)

        # Parse 'start_time' / 'end_time' strings (primary path)
        if start_hour is None and "start_time" in row:
            parts = str(row["start_time"]).split(":")
            start_hour = int(parts[0])
            start_minute = int(parts[1]) if len(parts) > 1 else 0
            if "end_time" in row:
                eparts = str(row["end_time"]).split(":")
                end_minutes = int(eparts[0]) * 60 + (int(eparts[1]) if len(eparts) > 1 else 0)
                duration = end_minutes - (start_hour * 60 + start_minute)

        # Map day: handle both string ('Monday') and integer formats
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
