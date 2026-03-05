"""
EXTRACT layer — pulls raw data from Supabase with validation.

Responsibilities:
  1. Parallel fetch of all domain tables for a batch
  2. Raw row counts & existence validation
  3. Data freshness checks
  4. Populates initial QualityIssue entries for missing / empty data
"""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

from storage.supabase_client import _query as _db_query
from .quality import DataQualityReport

logger = logging.getLogger("optimized.etl.extract")


class Extractor:
    """
    Fetches raw scheduling data from Supabase for one batch.

    Returns a raw-data dict (unprocessed DB rows) plus populates
    the quality report with extraction-phase issues.
    """

    def __init__(self, client=None):
        # client param kept for test injection; production uses psycopg2 via _db_query
        self._client = client

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(
        self,
        batch_id: str,
        college_id: str,
        report: DataQualityReport,
    ) -> Dict[str, Any]:
        """
        Fetch all raw data for a batch in parallel.

        Returns:
            {
                "batch_row": dict,
                "batch_subjects_rows": [dict, ...],
                "faculty_rows": [dict, ...],
                "qualification_rows": [dict, ...],
                "classroom_rows": [dict, ...],
                "time_slot_rows": [dict, ...],
                "faculty_map": {user_id: row, ...},
                "assigned_faculty_map": {subject_id: faculty_id, ...},
            }
        """
        t0 = time.perf_counter()
        logger.info(f"EXTRACT START | batch={batch_id}, college={college_id}")

        # ── Step 1: batch (must succeed) ──────────────────────────────
        batch_row = self._fetch_batch(batch_id, report)
        if batch_row is None:
            raise ValueError(f"Batch {batch_id} not found in database")

        # Extract the batch's department so we scope rooms and faculty
        department_id = batch_row.get("department_id")
        if not department_id:
            logger.warning("Batch has no department_id — rooms and faculty will be college-wide")

        # ── Step 2: parallel fetch of remaining tables ────────────────
        batch_subjects_rows: List[dict] = []
        classroom_rows: List[dict] = []
        time_slot_rows: List[dict] = []

        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = {
                pool.submit(self._fetch_batch_subjects, batch_id): "batch_subjects",
                pool.submit(self._fetch_classrooms, college_id, department_id): "classrooms",
                pool.submit(self._fetch_time_slots, college_id): "time_slots",
            }
            for future in as_completed(futures):
                key = futures[future]
                try:
                    rows = future.result()
                    if key == "batch_subjects":
                        batch_subjects_rows = rows
                    elif key == "classrooms":
                        classroom_rows = rows
                    elif key == "time_slots":
                        time_slot_rows = rows
                except Exception as exc:
                    report.add_error(
                        "fetch_failed", key,
                        f"Failed to fetch {key}: {exc}",
                    )

        # ── Step 3: faculty (depends on batch_subjects + department) ──
        subject_ids = [
            bs.get("subjects", {}).get("id") or bs.get("subject_id")
            for bs in batch_subjects_rows
            if bs.get("subjects") or bs.get("subject_id")
        ]
        assigned_faculty_map: Dict[str, str] = {}
        for bs in batch_subjects_rows:
            sid = (bs.get("subjects") or {}).get("id") or bs.get("subject_id")
            fid = bs.get("assigned_faculty_id")
            if sid and fid:
                assigned_faculty_map[sid] = fid

        faculty_rows, qualification_rows = self._fetch_faculty(
            assigned_faculty_map, subject_ids, department_id, report,
        )

        # ── Step 4: faculty availability + constraint rules (parallel) ─
        faculty_ids = [f.get("id") or f.get("user_id") for f in faculty_rows if f.get("id") or f.get("user_id")]
        faculty_availability_rows: List[dict] = []
        constraint_rules_rows: List[dict] = []

        with ThreadPoolExecutor(max_workers=2) as pool:
            fa_future = pool.submit(self._fetch_faculty_availability, faculty_ids)
            cr_future = pool.submit(self._fetch_constraint_rules, college_id)
            try:
                faculty_availability_rows = fa_future.result()
            except Exception as exc:
                report.add_warning("fetch_failed", "faculty_availability",
                                   f"Could not fetch faculty availability: {exc}")
            try:
                constraint_rules_rows = cr_future.result()
            except Exception as exc:
                report.add_warning("fetch_failed", "constraint_rules",
                                   f"Could not fetch constraint rules: {exc}")

        logger.info(
            f"Faculty availability: {len(faculty_availability_rows)} entries, "
            f"Constraint rules: {len(constraint_rules_rows)} active rules"
        )

        # ── Step 5: validate counts ───────────────────────────────────
        self._validate_counts(
            batch_subjects_rows, faculty_rows,
            classroom_rows, time_slot_rows, report,
        )

        elapsed = time.perf_counter() - t0
        logger.info(
            f"EXTRACT DONE in {elapsed:.2f}s | "
            f"subjects={len(batch_subjects_rows)}, "
            f"faculty={len(faculty_rows)}, "
            f"rooms={len(classroom_rows)}, "
            f"slots={len(time_slot_rows)}"
        )

        return {
            "batch_row": batch_row,
            "batch_subjects_rows": batch_subjects_rows,
            "faculty_rows": faculty_rows,
            "qualification_rows": qualification_rows,
            "classroom_rows": classroom_rows,
            "time_slot_rows": time_slot_rows,
            "assigned_faculty_map": assigned_faculty_map,
            "faculty_availability_rows": faculty_availability_rows,
            "constraint_rules_rows": constraint_rules_rows,
        }

    # ------------------------------------------------------------------
    # Individual fetchers
    # ------------------------------------------------------------------

    def _fetch_batch(self, batch_id: str, report: DataQualityReport) -> Optional[dict]:
        try:
            rows = _db_query(
                "SELECT *, department_id FROM batches WHERE id = %s LIMIT 1",
                (batch_id,),
            )
            return rows[0] if rows else None
        except Exception as exc:
            report.add_error("fetch_failed", "batch", f"Batch fetch error: {exc}")
            return None

    def _fetch_batch_subjects(self, batch_id: str) -> List[dict]:
        """Fetch subjects for a batch from batch_subjects join table.

        Two-step approach:
        1. Primary: fetch from batch_subjects (has faculty assignments, hours overrides)
        2. Fallback: directly query subjects table by department_id + semester
           to catch any subjects that exist in the curriculum but were not
           added to batch_subjects (data entry gap).
        """
        import json as _json
        # Step 1: batch_subjects join (primary source)
        raw_bs = _db_query(
            """
            SELECT bs.subject_id, bs.assigned_faculty_id, bs.required_hours_per_week,
                   row_to_json(s) AS subjects
            FROM batch_subjects bs
            JOIN subjects s ON s.id = bs.subject_id
            WHERE bs.batch_id = %s
            """,
            (batch_id,),
        )
        bs_rows = []
        for r in raw_bs:
            subj = r.get("subjects")
            if isinstance(subj, str):
                subj = _json.loads(subj)
            r["subjects"] = subj
            bs_rows.append(r)

        # Build set of already-fetched subject IDs
        fetched_ids: set = set()
        for r in bs_rows:
            sid = (r.get("subjects") or {}).get("id") or r.get("subject_id")
            if sid:
                fetched_ids.add(sid)

        # Step 2: fallback — get batch info (dept + semester) to query subjects directly
        try:
            bi_rows = _db_query(
                "SELECT department_id, semester FROM batches WHERE id = %s LIMIT 1",
                (batch_id,),
            )
            dept_id = bi_rows[0].get("department_id") if bi_rows else None
            semester = bi_rows[0].get("semester") if bi_rows else None

            if dept_id and semester:
                direct_subjects = _db_query(
                    "SELECT * FROM subjects WHERE department_id = %s AND semester = %s",
                    (dept_id, semester),
                )

                # Add any subjects not already in batch_subjects
                added = 0
                for subj in direct_subjects:
                    if subj["id"] not in fetched_ids:
                        # Synthesize a batch_subjects-like row
                        credits = int(
                            subj.get("credits_per_week") or
                            subj.get("credit_value") or
                            subj.get("weekly_hours") or 2
                        )
                        bs_rows.append({
                            "subject_id": subj["id"],
                            "assigned_faculty_id": None,
                            "required_hours_per_week": credits,
                            "subjects": subj,
                            "_from_fallback": True,  # tag for logging
                        })
                        fetched_ids.add(subj["id"])
                        added += 1

                if added > 0:
                    logger.info(
                        f"Fallback fetch added {added} missing subject(s) for batch "
                        f"{batch_id[:8]} (dept={dept_id[:8]}, sem={semester})"
                    )
        except Exception as exc:
            logger.warning(f"Fallback subject fetch failed for batch {batch_id[:8]}: {exc}")

        return bs_rows

    def _fetch_classrooms(self, college_id: str, department_id: Optional[str] = None) -> List[dict]:
        """
        Fetch classrooms scoped to the batch's department.
        Falls back to all college classrooms if no department_id is given.
        """
        if department_id:
            dept_rooms = _db_query(
                "SELECT * FROM classrooms WHERE college_id=%s AND is_available=TRUE AND department_id=%s",
                (college_id, department_id),
            )
            shared_rooms = _db_query(
                "SELECT * FROM classrooms WHERE college_id=%s AND is_available=TRUE AND department_id IS NULL",
                (college_id,),
            )
            all_rooms = {r["id"]: r for r in dept_rooms + shared_rooms}
            rooms = list(all_rooms.values())
            logger.info(
                f"Classrooms fetched: {len(dept_rooms)} dept-specific + "
                f"{len(shared_rooms)} shared = {len(rooms)} total"
            )
            return rooms
        return _db_query(
            "SELECT * FROM classrooms WHERE college_id=%s AND is_available=TRUE",
            (college_id,),
        )

    def _fetch_time_slots(self, college_id: str) -> List[dict]:
        """
        Fetch active 1-hour teaching slots only (Mon-Sat).

        The DB stores BOTH multi-hour lab slots (e.g. 09:00-11:00, is_lab_slot=True)
        AND their individual 1-hour constituents (09:00-10:00, 10:00-11:00).
        Including both causes 36+ overlap warnings that crash the quality score to 0.

        The solver builds its own 2-hour lab blocks from consecutive 1-hour slots,
        so we only need the 1-hour periods. We also exclude break/lunch slots
        (duration < 60 min or designated lunch periods).

        Result: 36 clean slots (6 days × 6 periods/day).

        NOTE: psycopg2 returns TIME columns as datetime.time objects, not strings.
        We handle both representations so the code works regardless of driver quirks.
        """
        import datetime as _dt

        WORKING_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}

        # Fetch all time slots for this college; day/active filtering done in Python
        # to avoid ANY(%s)/array-cast issues across psycopg2 versions.
        raw_slots = _db_query(
            "SELECT * FROM time_slots WHERE college_id = %s",
            (college_id,),
        )

        def _to_minutes(val) -> int:
            """Convert a TIME column value (str or datetime.time) to total minutes."""
            if val is None:
                return 0
            if isinstance(val, _dt.time):
                return val.hour * 60 + val.minute
            # string: "HH:MM:SS" or "HH:MM"
            try:
                parts = str(val).split(":")
                return int(parts[0]) * 60 + int(parts[1])
            except (ValueError, IndexError):
                return 0

        filtered = []
        for slot in raw_slots:
            # Skip inactive slots
            if slot.get("is_active") is False:
                continue

            # Skip non-working days
            day = slot.get("day", "")
            if day not in WORKING_DAYS:
                continue

            # Calculate duration in minutes
            dur = _to_minutes(slot.get("end_time")) - _to_minutes(slot.get("start_time"))

            # Skip multi-hour lab slots (solver composites them from 1-hr blocks)
            if slot.get("is_lab_slot") and dur > 60:
                continue

            # Skip short break / lunch periods (< 60 min)
            if dur < 60:
                continue

            filtered.append(slot)

        logger.info(
            f"Time slots fetched: {len(filtered)} teaching periods "
            f"(filtered from {len(raw_slots)} raw, Mon-Sat only)"
        )
        return filtered

    def _fetch_faculty(
        self,
        assigned_map: Dict[str, str],
        subject_ids: List[str],
        department_id: Optional[str],
        report: DataQualityReport,
    ) -> tuple:
        """
        Fetch assigned faculty + qualified faculty scoped to department.
        Only fetches faculty who belong to the batch's department.
        Returns (faculty_rows, qual_rows).
        """
        faculty_dict: Dict[str, dict] = {}
        qual_rows: List[dict] = []

        import json as _json
        # Assigned faculty (always include regardless of department)
        if assigned_map:
            assigned_ids = list(set(assigned_map.values()))
            try:
                for u in _db_query(
                    "SELECT * FROM users WHERE id = ANY(%s::uuid[])",
                    (assigned_ids,),
                ):
                    faculty_dict[u["id"]] = u
            except Exception as exc:
                report.add_warning("fetch_failed", "faculty",
                                   f"Could not fetch assigned faculty: {exc}")

        # Qualified faculty — further restricted to the batch's department
        if subject_ids:
            try:
                raw_q = _db_query(
                    """
                    SELECT fqs.faculty_id, fqs.subject_id, row_to_json(u) AS users
                    FROM faculty_qualified_subjects fqs
                    JOIN users u ON u.id = fqs.faculty_id
                    WHERE fqs.subject_id = ANY(%s::uuid[])
                    """,
                    (subject_ids,),
                )
                qual_rows = []
                for fq in raw_q:
                    user = fq.get("users")
                    if isinstance(user, str):
                        user = _json.loads(user)
                    fq["users"] = user
                    qual_rows.append(fq)
                    if not user:
                        continue
                    fid = user["id"]
                    if fid in faculty_dict:
                        continue
                    faculty_dept = user.get("department_id", "")
                    if department_id and faculty_dept and faculty_dept != department_id:
                        logger.debug(f"Skipping faculty {fid} — dept {faculty_dept} != batch dept {department_id}")
                        continue
                    faculty_dict[fid] = user
            except Exception as exc:
                report.add_warning("fetch_failed", "qualifications",
                                   f"Could not fetch faculty qualifications: {exc}")

        logger.info(
            f"Faculty fetched: {len(faculty_dict)} total "
            f"(dept={department_id or 'all'})"
        )
        return list(faculty_dict.values()), qual_rows

    def _fetch_faculty_availability(self, faculty_ids: List[str]) -> List[dict]:
        """Fetch per-slot availability for the given faculty from faculty_availability table.

        Returns rows with: faculty_id, time_slot_id, is_available,
        availability_type ('available'|'unavailable'|'preferred'|'avoid'),
        preference_weight (0.1–2.0).
        """
        if not faculty_ids:
            return []
        try:
            rows = _db_query(
                "SELECT faculty_id, time_slot_id, is_available, availability_type, preference_weight "
                "FROM faculty_availability WHERE faculty_id = ANY(%s::uuid[])",
                (faculty_ids,),
            )
            logger.info(f"Faculty availability rows: {len(rows)}")
            return rows
        except Exception as exc:
            logger.warning(f"faculty_availability fetch failed (table may not exist): {exc}")
            return []

    def _fetch_constraint_rules(self, college_id: str) -> List[dict]:
        """Fetch active constraint rules from constraint_rules table.

        Returns all active rules. Scoping (which departments/batches/subjects/faculty
        they apply to) is handled downstream by the solver.
        """
        try:
            rows = _db_query("SELECT * FROM constraint_rules WHERE is_active = TRUE")
            logger.info(f"Constraint rules fetched: {len(rows)} active")
            return rows
        except Exception as exc:
            logger.warning(f"constraint_rules fetch failed (table may not exist): {exc}")
            return []

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_counts(
        self,
        subjects: List[dict],
        faculty: List[dict],
        rooms: List[dict],
        slots: List[dict],
        report: DataQualityReport,
    ):
        """Flag missing / insufficient data."""
        report.total_subjects = len(subjects)
        report.total_faculty = len(faculty)
        report.total_rooms = len(rooms)
        report.total_time_slots = len(slots)

        if not subjects:
            report.add_error("missing_data", "subject", "No subjects found for batch")
        if not faculty:
            report.add_error("missing_data", "faculty", "No faculty found")
        if not rooms:
            report.add_error("missing_data", "classroom", "No available rooms")
        if not slots:
            report.add_error("missing_data", "time_slot", "No active time slots")

        # Minimum viability
        if len(slots) < len(subjects):
            report.add_warning(
                "insufficient_data", "time_slot",
                f"Only {len(slots)} slots for {len(subjects)} subjects — "
                "may not be schedulable"
            )