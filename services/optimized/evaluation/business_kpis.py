"""
Business KPI evaluation for timetable scheduling.

Domain-specific key performance indicators:
  1. Schedule Completeness — % of required teaching hours placed
  2. Faculty Utilization — hours assigned / max capacity
  3. Room Utilization — slot-hours used / total available
  4. Student Experience — morning/afternoon balance, gap minimisation
  5. Faculty Satisfaction — preference adherence, workload balance
  6. NEP 2020 Compliance — Choice-Based Credit, lab/theory ratio
  7. Operational Efficiency — solver speed, constraint satisfaction
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Set

import numpy as np

from core.models import Assignment, ConstraintType, Solution
from core.context import SchedulingContext


@dataclass
class BusinessKPIResult:
    """Container for all business KPIs."""

    # ── Schedule completeness ───────────────────────────────────
    schedule_completeness: float = 0.0    # 0-1
    total_required_hours: int = 0
    total_scheduled_hours: int = 0

    # ── Faculty utilization ─────────────────────────────────────
    faculty_utilization_mean: float = 0.0   # avg hours/max
    faculty_utilization_std: float = 0.0
    faculty_idle_count: int = 0             # faculty with 0 assignments
    faculty_overloaded_count: int = 0       # above max_hours
    faculty_within_range_count: int = 0     # min ≤ hours ≤ max

    # ── Room utilization ────────────────────────────────────────
    room_utilization_mean: float = 0.0
    room_utilization_std: float = 0.0
    rooms_unused_count: int = 0
    capacity_waste_pct: float = 0.0        # avg (capacity-students)/capacity

    # ── Student experience ──────────────────────────────────────
    morning_session_pct: float = 0.0       # % classes before 12:00
    afternoon_session_pct: float = 0.0
    avg_daily_gaps: float = 0.0            # avg idle slots between classes
    max_consecutive_hours: int = 0
    days_with_classes_avg: float = 0.0     # avg working days per batch

    # ── Faculty satisfaction ────────────────────────────────────
    preference_adherence: float = 0.0      # % classes in preferred slots
    unavailable_slot_violations: int = 0   # classes in unavailable slots
    max_daily_load: int = 0                # max classes any faculty has in a day

    # ── NEP 2020 compliance ─────────────────────────────────────
    lab_theory_ratio: float = 0.0          # lab hours / total hours
    elective_coverage: float = 0.0         # electives scheduled / total electives
    credit_hour_alignment: float = 0.0     # hours match credit requirement

    # ── Operational efficiency ──────────────────────────────────
    solver_time_seconds: float = 0.0
    constraint_satisfaction_rate: float = 0.0
    hard_constraint_pass_rate: float = 0.0

    # ── Composite score ─────────────────────────────────────────
    overall_kpi_score: float = 0.0         # weighted aggregate 0-100

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {}
        for k, v in self.__dict__.items():
            if isinstance(v, float):
                d[k] = round(v, 4)
            else:
                d[k] = v
        return d


# Weight presets for composite score
_WEIGHTS = {
    "schedule_completeness": 0.25,
    "faculty_utilization": 0.15,
    "room_utilization": 0.10,
    "student_experience": 0.15,
    "faculty_satisfaction": 0.10,
    "nep_compliance": 0.10,
    "constraint_satisfaction": 0.15,
}


class BusinessKPIEvaluator:
    """Computes domain-specific KPIs for a scheduling solution."""

    def __init__(self, context: SchedulingContext):
        self.context = context
        self._subject_map = {s.id: s for s in context.subjects}
        self._room_map = {r.id: r for r in context.rooms}
        self._faculty_map = {f.id: f for f in context.faculty}
        self._batch_map = {b.id: b for b in context.batches}
        self._slot_map = {ts.id: ts for ts in context.time_slots}

    def evaluate(self, solution: Solution) -> BusinessKPIResult:
        """Compute all business KPIs."""
        r = BusinessKPIResult()
        assigns = solution.assignments

        # ── 1. Schedule completeness ────────────────────────────
        self._completeness(assigns, r)

        # ── 2. Faculty utilization ──────────────────────────────
        self._faculty_utilization(assigns, r)

        # ── 3. Room utilization ─────────────────────────────────
        self._room_utilization(assigns, r)

        # ── 4. Student experience ───────────────────────────────
        self._student_experience(assigns, r)

        # ── 5. Faculty satisfaction ─────────────────────────────
        self._faculty_satisfaction(assigns, r)

        # ── 6. NEP compliance ───────────────────────────────────
        self._nep_compliance(assigns, r)

        # ── 7. Operational efficiency ───────────────────────────
        self._operational(solution, r)

        # ── Composite ──────────────────────────────────────────
        self._composite_score(r)

        return r

    # ================================================================
    # Sub-evaluators
    # ================================================================

    def _completeness(self, assigns: List[Assignment], r: BusinessKPIResult):
        # Count required hours across all batches (not just unique subjects)
        required = sum(
            self.context.get_subject(sid).hours_per_week
            for batch in self.context.batches
            for sid in batch.subjects
            if self.context.get_subject(sid) is not None
        )
        r.total_required_hours = required
        r.total_scheduled_hours = len(assigns)
        r.schedule_completeness = min(len(assigns) / max(required, 1), 1.0)

    def _faculty_utilization(self, assigns: List[Assignment], r: BusinessKPIResult):
        load: Dict[str, int] = defaultdict(int)
        for a in assigns:
            load[a.faculty_id] += 1

        utils: List[float] = []
        for fac in self.context.faculty:
            hours = load.get(fac.id, 0)
            cap = max(fac.max_hours_per_week, 1)
            utils.append(hours / cap)
            if hours == 0:
                r.faculty_idle_count += 1
            elif hours > fac.max_hours_per_week:
                r.faculty_overloaded_count += 1
            elif hours >= fac.min_hours_per_week:
                r.faculty_within_range_count += 1

        if utils:
            r.faculty_utilization_mean = float(np.mean(utils))
            r.faculty_utilization_std = float(np.std(utils))

    def _room_utilization(self, assigns: List[Assignment], r: BusinessKPIResult):
        room_slots: Dict[str, Set[str]] = defaultdict(set)
        for a in assigns:
            room_slots[a.room_id].add(a.time_slot.id)

        total_slots = len(self.context.time_slots)
        utils: List[float] = []
        waste: List[float] = []

        for room in self.context.rooms:
            used = len(room_slots.get(room.id, set()))
            utils.append(used / max(total_slots, 1))
            if used == 0:
                r.rooms_unused_count += 1

        # Capacity waste
        for a in assigns:
            room = self._room_map.get(a.room_id)
            batch = self._batch_map.get(a.batch_id)
            if room and batch and room.capacity > 0:
                waste.append((room.capacity - batch.strength) / room.capacity)

        if utils:
            r.room_utilization_mean = float(np.mean(utils))
            r.room_utilization_std = float(np.std(utils))
        if waste:
            r.capacity_waste_pct = float(np.mean(waste))

    def _student_experience(self, assigns: List[Assignment], r: BusinessKPIResult):
        if not assigns:
            return

        morning = sum(1 for a in assigns if a.time_slot.start_hour < 12)
        r.morning_session_pct = morning / len(assigns)
        r.afternoon_session_pct = 1.0 - r.morning_session_pct

        # Gaps per batch per day
        batch_day: Dict[str, Dict[int, List[int]]] = defaultdict(lambda: defaultdict(list))
        for a in assigns:
            start_min = a.time_slot.start_hour * 60 + a.time_slot.start_minute
            batch_day[a.batch_id][a.time_slot.day].append(start_min)

        all_gaps: List[int] = []
        max_consec = 0
        days_per_batch: List[int] = []

        for bid, days in batch_day.items():
            days_per_batch.append(len(days))
            for day, starts in days.items():
                starts.sort()
                gaps = 0
                consec = 1
                for i in range(1, len(starts)):
                    diff = starts[i] - starts[i - 1]
                    slot_dur = 60  # default
                    if diff > slot_dur + 10:  # more than slot + 10min buffer
                        gaps += 1
                        consec = 1
                    else:
                        consec += 1
                        max_consec = max(max_consec, consec)
                all_gaps.append(gaps)

        r.avg_daily_gaps = float(np.mean(all_gaps)) if all_gaps else 0.0
        r.max_consecutive_hours = max_consec
        r.days_with_classes_avg = float(np.mean(days_per_batch)) if days_per_batch else 0.0

    def _faculty_satisfaction(self, assigns: List[Assignment], r: BusinessKPIResult):
        pref_count = 0
        unavail_count = 0
        fac_day_load: Dict[str, Dict[int, int]] = defaultdict(lambda: defaultdict(int))

        for a in assigns:
            fac = self._faculty_map.get(a.faculty_id)
            if fac:
                if a.time_slot.id in fac.preferred_time_slots:
                    pref_count += 1
                if a.time_slot.id in fac.unavailable_slots:
                    unavail_count += 1
            fac_day_load[a.faculty_id][a.time_slot.day] += 1

        # Check if any faculty have preferences defined
        has_prefs = any(
            len(f.preferred_time_slots) > 0 for f in self.context.faculty
        )
        if has_prefs and assigns:
            r.preference_adherence = pref_count / len(assigns)
        else:
            r.preference_adherence = 1.0  # No preferences = fully satisfied

        r.unavailable_slot_violations = unavail_count

        # Max daily load
        if fac_day_load:
            r.max_daily_load = max(
                max(days.values()) for days in fac_day_load.values()
            )

    def _nep_compliance(self, assigns: List[Assignment], r: BusinessKPIResult):
        lab_hours = sum(1 for a in assigns if a.is_lab_session)
        total = max(len(assigns), 1)
        r.lab_theory_ratio = lab_hours / total

        # Elective coverage
        elective_subjects = {s.id for s in self.context.subjects if s.is_elective}
        if elective_subjects:
            scheduled_electives = {
                a.subject_id for a in assigns if a.subject_id in elective_subjects
            }
            r.elective_coverage = len(scheduled_electives) / len(elective_subjects)
        else:
            r.elective_coverage = 1.0

        # Credit-hour alignment
        alignment: List[float] = []
        subj_hours: Dict[str, int] = defaultdict(int)
        for a in assigns:
            subj_hours[a.subject_id] += 1

        for subj in self.context.subjects:
            scheduled = subj_hours.get(subj.id, 0)
            required = subj.hours_per_week
            if required > 0:
                alignment.append(min(scheduled / required, 1.0))

        r.credit_hour_alignment = float(np.mean(alignment)) if alignment else 0.0

    def _operational(self, solution: Solution, r: BusinessKPIResult):
        r.solver_time_seconds = solution.execution_time

        violations = solution.constraint_violations
        total_constraints = max(len(violations) + 10, 10)  # estimated
        r.constraint_satisfaction_rate = 1.0 - len(violations) / total_constraints

        hard_v = sum(
            1 for v in violations
            if v.constraint_type in {
                ConstraintType.NO_OVERLAP, ConstraintType.ROOM_CAPACITY,
                ConstraintType.FACULTY_AVAILABILITY, ConstraintType.LAB_REQUIREMENTS,
            }
        )
        r.hard_constraint_pass_rate = 1.0 if hard_v == 0 else max(0.0, 1.0 - hard_v / 10.0)

    # ================================================================
    # Composite score (0 – 100)
    # ================================================================

    def _composite_score(self, r: BusinessKPIResult):
        """Weighted aggregate of all KPIs into a 0-100 score."""
        components = {
            "schedule_completeness": r.schedule_completeness,
            "faculty_utilization": min(r.faculty_utilization_mean, 1.0),
            "room_utilization": min(r.room_utilization_mean, 1.0),
            "student_experience": max(0, 1.0 - r.avg_daily_gaps * 0.2),
            "faculty_satisfaction": r.preference_adherence,
            "nep_compliance": (r.credit_hour_alignment + r.elective_coverage) / 2,
            "constraint_satisfaction": r.constraint_satisfaction_rate,
        }

        score = 0.0
        for key, val in components.items():
            weight = _WEIGHTS.get(key, 0.1)
            score += weight * val

        r.overall_kpi_score = round(score * 100, 2)
