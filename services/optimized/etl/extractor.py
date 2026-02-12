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

from storage.supabase_client import get_supabase_client
from .quality import DataQualityReport

logger = logging.getLogger("optimized.etl.extract")


class Extractor:
    """
    Fetches raw scheduling data from Supabase for one batch.

    Returns a raw-data dict (unprocessed DB rows) plus populates
    the quality report with extraction-phase issues.
    """

    def __init__(self, client=None):
        self.client = client or get_supabase_client()

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

        # ── Step 2: parallel fetch of remaining tables ────────────────
        batch_subjects_rows: List[dict] = []
        classroom_rows: List[dict] = []
        time_slot_rows: List[dict] = []

        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = {
                pool.submit(self._fetch_batch_subjects, batch_id): "batch_subjects",
                pool.submit(self._fetch_classrooms, college_id): "classrooms",
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

        # ── Step 3: faculty (depends on batch_subjects) ───────────────
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
            assigned_faculty_map, subject_ids, report,
        )

        # ── Step 4: validate counts ───────────────────────────────────
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
        }

    # ------------------------------------------------------------------
    # Individual fetchers
    # ------------------------------------------------------------------

    def _fetch_batch(self, batch_id: str, report: DataQualityReport) -> Optional[dict]:
        try:
            result = (
                self.client.table("batches")
                .select("*, department_id")
                .eq("id", batch_id)
                .single()
                .execute()
            )
            return result.data
        except Exception as exc:
            report.add_error("fetch_failed", "batch", f"Batch fetch error: {exc}")
            return None

    def _fetch_batch_subjects(self, batch_id: str) -> List[dict]:
        result = (
            self.client.table("batch_subjects")
            .select("subject_id, assigned_faculty_id, required_hours_per_week, subjects(*)")
            .eq("batch_id", batch_id)
            .execute()
        )
        return result.data or []

    def _fetch_classrooms(self, college_id: str) -> List[dict]:
        result = (
            self.client.table("classrooms")
            .select("*")
            .eq("college_id", college_id)
            .eq("is_available", True)
            .execute()
        )
        return result.data or []

    def _fetch_time_slots(self, college_id: str) -> List[dict]:
        result = (
            self.client.table("time_slots")
            .select("*")
            .eq("college_id", college_id)
            .eq("is_active", True)
            .execute()
        )
        return result.data or []

    def _fetch_faculty(
        self,
        assigned_map: Dict[str, str],
        subject_ids: List[str],
        report: DataQualityReport,
    ) -> tuple:
        """Fetch assigned faculty + qualified faculty. Returns (faculty_rows, qual_rows)."""
        faculty_dict: Dict[str, dict] = {}
        qual_rows: List[dict] = []

        # Assigned faculty
        if assigned_map:
            assigned_ids = list(set(assigned_map.values()))
            try:
                result = (
                    self.client.table("users")
                    .select("*")
                    .in_("id", assigned_ids)
                    .execute()
                )
                for u in (result.data or []):
                    faculty_dict[u["id"]] = u
            except Exception as exc:
                report.add_warning(
                    "fetch_failed", "faculty",
                    f"Could not fetch assigned faculty: {exc}",
                )

        # Qualified faculty
        if subject_ids:
            try:
                result = (
                    self.client.table("faculty_qualified_subjects")
                    .select("faculty_id, subject_id, users!faculty_id(*)")
                    .in_("subject_id", subject_ids)
                    .execute()
                )
                qual_rows = result.data or []
                for fq in qual_rows:
                    if fq.get("users") and fq["users"]["id"] not in faculty_dict:
                        faculty_dict[fq["users"]["id"]] = fq["users"]
            except Exception as exc:
                report.add_warning(
                    "fetch_failed", "qualifications",
                    f"Could not fetch faculty qualifications: {exc}",
                )

        return list(faculty_dict.values()), qual_rows

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
