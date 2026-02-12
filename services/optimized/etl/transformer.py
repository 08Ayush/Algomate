"""
TRANSFORM layer — cleans, normalises, and maps raw DB rows into domain models.

Responsibilities:
  1. Unicode / encoding normalisation (â€" → —, etc.)
  2. Faculty-qualification fuzzy-matching
  3. Deduplication (subjects, faculty)
  4. Subject ↔ faculty coverage analysis
  5. Room-type / capacity sanity checks
  6. Time-slot consistency checks
  7. Maps raw rows → core.models dataclasses
  8. Populates DataQualityReport with all issues found
"""

from __future__ import annotations

import logging
import re
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

from core.models import (
    Batch,
    Faculty,
    Room,
    Subject,
    TimeSlot,
)
from .quality import DataQualityReport

logger = logging.getLogger("optimized.etl.transform")

# ── Unicode replacement map ──────────────────────────────────────────
_UNICODE_FIXES: Dict[str, str] = {
    "\u00e2\u20ac\u201c": "–",   # â€"  → en-dash
    "\u00e2\u20ac\u201d": "—",   # â€"  → em-dash (variant)
    "\u00e2\u20ac\u2122": "'",   # â€™  → curly apostrophe
    "\u00e2\u20ac\u0153": '"',   # â€œ  → left double quote
    "\u00e2\u20ac\u009d": '"',   # â€   → right double quote
    "\u00c2\u00a0": " ",         # Â    → space (NBSP double-encoded)
    "\u00c3\u00a9": "é",         # Ã©   → é
    "\u00c3\u00b1": "ñ",         # Ã±   → ñ
}

# Day name → integer (mirrors SupabaseSchedulerClient.DAY_NAME_MAP)
DAY_NAME_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2,
    "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
}


class Transformer:
    """
    Converts raw Supabase data into clean, validated domain objects.

    Usage::

        transformer = Transformer()
        domain = transformer.transform(raw_data, report)
        # domain = {"batch": Batch, "subjects": [...], "faculty": [...],
        #           "classrooms": [...], "time_slots": [...]}
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def transform(
        self,
        raw: Dict[str, Any],
        report: DataQualityReport,
    ) -> Dict[str, Any]:
        """
        Transform raw extracted data into domain model objects.

        Parameters
        ----------
        raw : dict
            Output from Extractor.extract()
        report : DataQualityReport
            Accumulates issues found during transformation.

        Returns
        -------
        dict  with keys: batch, subjects, faculty, classrooms, time_slots
        """
        t0 = time.perf_counter()
        logger.info("TRANSFORM START")

        # 1. Batch
        batch = self._transform_batch(raw["batch_row"], report)

        # 2. Subjects (from batch_subjects join rows)
        subjects = self._transform_subjects(
            raw["batch_subjects_rows"], report,
        )

        # 3. Faculty + qualification wiring
        faculty = self._transform_faculty(
            raw["faculty_rows"],
            raw.get("qualification_rows", []),
            raw.get("assigned_faculty_map", {}),
            subjects,
            report,
        )

        # 4. Classrooms
        classrooms = self._transform_rooms(raw["classroom_rows"], subjects, report)

        # 5. Time slots
        time_slots = self._transform_time_slots(raw["time_slot_rows"], report)

        # 6. Wire subject IDs into batch.subjects
        batch.subjects = [s.id for s in subjects]

        # 7. Faculty-subject coverage summary
        self._assess_faculty_coverage(subjects, faculty, report)

        elapsed = time.perf_counter() - t0
        logger.info(f"TRANSFORM DONE in {elapsed:.2f}s")
        return {
            "batch": batch,
            "subjects": subjects,
            "faculty": faculty,
            "classrooms": classrooms,
            "time_slots": time_slots,
        }

    # ------------------------------------------------------------------
    # Sub-transformers
    # ------------------------------------------------------------------

    def _transform_batch(self, row: dict, report: DataQualityReport) -> Batch:
        name = self._fix_unicode(row.get("name", ""))
        return Batch(
            id=row["id"],
            name=name,
            program=row.get("program", ""),
            semester=row.get("semester", 1),
            year=row.get("year", 1),
            strength=max(1, int(row.get("strength", 60))),
            department=row.get("department_id", ""),
            subjects=[],
        )

    def _transform_subjects(
        self,
        batch_subjects_rows: List[dict],
        report: DataQualityReport,
    ) -> List[Subject]:
        seen: Dict[str, Subject] = {}
        for bs in batch_subjects_rows:
            sub_data = bs.get("subjects", {}) or {}
            sid = sub_data.get("id") or bs.get("subject_id")
            if not sid:
                continue
            if sid in seen:
                report.add_warning(
                    "duplicate", "subject", sid,
                    f"Duplicate subject in batch_subjects: {sid}",
                )
                continue

            raw_name = sub_data.get("name", "")
            cleaned_name = self._fix_unicode(raw_name)
            if cleaned_name != raw_name:
                report.add_cleaning(
                    "subject", sid, "name",
                    raw_name, cleaned_name, "unicode_fix",
                )
                report.unicode_fixes += 1

            hours = (
                bs.get("required_hours_per_week")
                or sub_data.get("hours_per_week", 3)
            )

            # Build required_qualifications — if the DB has none, derive
            # from the subject's name, code, and id so that the
            # qualification matching in can_teach() has something to
            # compare against.
            raw_req_quals = sub_data.get("required_qualifications") or []
            if not raw_req_quals:
                # Auto-populate so assigned-faculty wiring works
                derived = [cleaned_name]
                code = sub_data.get("code", "")
                if code:
                    derived.append(code)
                derived.append(sid)
                raw_req_quals = derived

            # ── Heuristic lab detection ───────────────────────
            # Many DBs don't carry an is_lab column; detect from
            # subject name ("Lab", "Workshop", "Practical") or
            # NEP code suffix 'P' (e.g. 24DS603P = practical).
            db_is_lab = bool(sub_data.get("is_lab", False))
            if not db_is_lab:
                name_lower = cleaned_name.lower()
                code_val = (sub_data.get("code") or "").strip()
                db_is_lab = (
                    " lab" in name_lower
                    or name_lower.endswith(" lab")
                    or "workshop" in name_lower
                    or "practical" in name_lower
                    or (len(code_val) >= 2 and code_val[-1].upper() == "P")
                )

            subj = Subject(
                id=sid,
                name=cleaned_name,
                code=sub_data.get("code", ""),
                credits=int(sub_data.get("credits", 3)),
                hours_per_week=int(hours),
                is_lab=db_is_lab,
                is_elective=bool(sub_data.get("is_elective", False)),
                max_students=sub_data.get("max_students"),
                room_requirements=sub_data.get("room_requirements") or [],
                required_qualifications=raw_req_quals,
                prerequisites=sub_data.get("prerequisites") or [],
            )

            # Sanity checks
            if subj.hours_per_week <= 0:
                report.add_warning(
                    "invalid_value", "subject", sid,
                    f"Subject '{cleaned_name}' has hours_per_week={subj.hours_per_week}, defaulting to 3",
                )
                subj.hours_per_week = 3

            if subj.credits <= 0:
                report.add_warning(
                    "invalid_value", "subject", sid,
                    f"Subject '{cleaned_name}' has credits={subj.credits}, defaulting to 3",
                )
                subj.credits = 3

            seen[sid] = subj

        report.total_subjects = len(seen)
        return list(seen.values())

    def _transform_faculty(
        self,
        faculty_rows: List[dict],
        qualification_rows: List[dict],
        assigned_map: Dict[str, str],
        subjects: List[Subject],
        report: DataQualityReport,
    ) -> List[Faculty]:
        """Build Faculty objects and wire qualifications from multiple sources."""
        # Build a subject code/name lookup for fuzzy matching
        subject_lookup: Dict[str, Subject] = {s.id: s for s in subjects}

        # Build qual map: faculty_id → set of subject_ids
        qual_map: Dict[str, Set[str]] = defaultdict(set)
        for qr in qualification_rows:
            fid = qr.get("faculty_id")
            sid = qr.get("subject_id")
            if fid and sid:
                qual_map[fid].add(sid)

        # Also consider assigned_faculty_map as implicit qualification
        for sid, fid in assigned_map.items():
            qual_map[fid].add(sid)

        seen: Dict[str, Faculty] = {}
        for row in faculty_rows:
            fid = row["id"]
            if fid in seen:
                continue

            raw_name = (
                row.get("full_name")
                or f"{row.get('first_name', '')} {row.get('last_name', '')}".strip()
                or row.get("name", "")
            )
            cleaned_name = self._fix_unicode(raw_name)
            if cleaned_name != raw_name:
                report.add_cleaning("faculty", fid, "name", raw_name, cleaned_name, "unicode_fix")
                report.unicode_fixes += 1

            # Build qualifications list from qual_map
            # Each entry is a subject_id that this faculty can teach
            qualifications: List[str] = []
            for sid in qual_map.get(fid, set()):
                sub = subject_lookup.get(sid)
                if sub:
                    # Store required_qualifications values so can_teach() works
                    qualifications.extend(sub.required_qualifications)
                    # Also add subject name for name-based matching
                    if sub.name:
                        qualifications.append(sub.name)
                    # Also add a pseudo-qual matching the subject code
                    if sub.code:
                        qualifications.append(sub.code)
                    qualifications.append(sid)

            fac = Faculty(
                id=fid,
                name=cleaned_name,
                department=row.get("department_id", row.get("department", "")),
                designation=row.get("designation", "Assistant Professor"),
                max_hours_per_week=int(row.get("max_hours_per_week", 20)),
                min_hours_per_week=int(row.get("min_hours_per_week", 12)),
                preferred_time_slots=row.get("preferred_time_slots") or [],
                unavailable_slots=row.get("unavailable_slots") or [],
                qualifications=list(set(qualifications)),
                rank_weight=float(row.get("rank_weight", 1.0)),
            )
            seen[fid] = fac

        report.total_faculty = len(seen)
        report.faculty_with_qualifications = sum(
            1 for f in seen.values() if f.qualifications
        )
        return list(seen.values())

    def _transform_rooms(
        self,
        classroom_rows: List[dict],
        subjects: List[Subject],
        report: DataQualityReport,
    ) -> List[Room]:
        has_lab_subject = any(s.is_lab for s in subjects)
        rooms: List[Room] = []
        has_lab_room = False

        for row in classroom_rows:
            raw_name = row.get("name", "")
            cleaned_name = self._fix_unicode(raw_name)
            if cleaned_name != raw_name:
                report.add_cleaning(
                    "classroom", row["id"], "name",
                    raw_name, cleaned_name, "unicode_fix",
                )
                report.unicode_fixes += 1

            capacity = int(row.get("capacity", 60))
            if capacity <= 0:
                report.add_warning(
                    "invalid_value", "classroom", row["id"],
                    f"Room '{cleaned_name}' has capacity={capacity}, defaulting to 30",
                )
                capacity = 30

            room_type = (row.get("room_type") or "classroom").lower()
            if room_type == "lab":
                has_lab_room = True

            room = Room(
                id=row["id"],
                name=cleaned_name,
                capacity=capacity,
                room_type=room_type,
                building=row.get("building", "Main"),
                floor=int(row.get("floor", 1)),
                facilities=row.get("facilities") or [],
                is_available=bool(row.get("is_available", True)),
            )
            rooms.append(room)

        report.total_rooms = len(rooms)

        if has_lab_subject and not has_lab_room:
            report.add_warning(
                "missing_facility", "classroom",
                entity_id=None,
                message="Batch has lab subjects but no lab-type room found — auto-creating virtual lab room",
            )
            # Auto-create a virtual lab room so lab subjects can be scheduled
            # Use the largest batch strength as capacity
            max_strength = max(
                (int(r.get("capacity", 60)) for r in classroom_rows),
                default=60,
            )
            virtual_lab = Room(
                id="virtual-lab-001",
                name="Lab (Auto-generated)",
                capacity=max_strength,
                room_type="lab",
                building="Virtual",
                floor=1,
                facilities=["lab", "computer"],
                is_available=True,
            )
            rooms.append(virtual_lab)
            report.total_rooms = len(rooms)

        return rooms

    def _transform_time_slots(
        self,
        time_slot_rows: List[dict],
        report: DataQualityReport,
    ) -> List[TimeSlot]:
        slots: List[TimeSlot] = []
        seen_ids: Set[str] = set()

        for row in time_slot_rows:
            tsid = row["id"]
            if tsid in seen_ids:
                report.add_warning("duplicate", "time_slot", tsid, "Duplicate time slot")
                continue
            seen_ids.add(tsid)

            # Parse start_hour / start_minute
            start_hour = row.get("start_hour")
            start_minute = row.get("start_minute", 0)
            duration = row.get("duration_minutes", 60)

            if start_hour is None and "start_time" in row:
                parts = str(row["start_time"]).split(":")
                start_hour = int(parts[0])
                start_minute = int(parts[1]) if len(parts) > 1 else 0
                if "end_time" in row:
                    eparts = str(row["end_time"]).split(":")
                    end_m = int(eparts[0]) * 60 + (int(eparts[1]) if len(eparts) > 1 else 0)
                    duration = end_m - (start_hour * 60 + start_minute)

            if start_hour is None:
                report.add_warning(
                    "invalid_value", "time_slot", tsid,
                    "Missing start_hour and start_time, defaulting to 09:00",
                )
                start_hour = 9

            # Day mapping
            raw_day = row.get("day", row.get("day_of_week", 0))
            if isinstance(raw_day, str):
                day = DAY_NAME_MAP.get(raw_day.lower(), 0)
            else:
                day = int(raw_day)

            if duration <= 0:
                report.add_warning(
                    "invalid_value", "time_slot", tsid,
                    f"Duration {duration} ≤ 0, defaulting to 60",
                )
                duration = 60

            slot = TimeSlot(
                id=tsid,
                day=day,
                start_hour=int(start_hour),
                start_minute=int(start_minute),
                duration_minutes=int(duration),
                is_lab_slot=bool(row.get("is_lab_slot", False)),
            )
            slots.append(slot)

        report.total_time_slots = len(slots)

        # Check for overlapping slots on the same day
        by_day: Dict[int, List[TimeSlot]] = defaultdict(list)
        for s in slots:
            by_day[s.day].append(s)
        for day, day_slots in by_day.items():
            day_slots.sort(key=lambda s: s.start_hour * 60 + s.start_minute)
            for i in range(len(day_slots) - 1):
                if day_slots[i].overlaps_with(day_slots[i + 1]):
                    report.add_warning(
                        "overlap", "time_slot",
                        entity_id=f"{day_slots[i].id}/{day_slots[i+1].id}",
                        message=(
                            f"Overlapping time slots on day {day}: "
                            f"{day_slots[i].start_hour}:{day_slots[i].start_minute:02d} "
                            f"and {day_slots[i+1].start_hour}:{day_slots[i+1].start_minute:02d}"
                        ),
                    )

        return slots

    # ------------------------------------------------------------------
    # Coverage analysis
    # ------------------------------------------------------------------

    def _assess_faculty_coverage(
        self,
        subjects: List[Subject],
        faculty: List[Faculty],
        report: DataQualityReport,
    ):
        """Check what fraction of subjects have at least one qualified faculty."""
        covered = 0
        for subj in subjects:
            has_qualified = any(
                fac.can_teach(subj) or subj.id in fac.qualifications
                for fac in faculty
            )
            if has_qualified:
                covered += 1
            else:
                report.add_warning(
                    "no_qualified_faculty", "subject", subj.id,
                    f"No qualified faculty for subject '{subj.name}' ({subj.code})",
                )

        report.subjects_with_faculty = covered
        total = len(subjects) or 1
        coverage_pct = (covered / total) * 100
        logger.info(f"Faculty coverage: {covered}/{len(subjects)} subjects ({coverage_pct:.0f}%)")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _fix_unicode(text: str) -> str:
        """Fix common double-encoded UTF-8 artefacts."""
        if not text:
            return text
        result = text
        for bad, good in _UNICODE_FIXES.items():
            result = result.replace(bad, good)
        # Collapse multiple spaces
        result = re.sub(r"  +", " ", result).strip()
        return result
