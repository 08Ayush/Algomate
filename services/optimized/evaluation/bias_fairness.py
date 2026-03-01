"""
Bias & Fairness evaluation for timetable scheduling.

Detects systematic disparities in how the algorithm treats:
  1. Faculty workload equity (Gini coefficient, CV)
  2. Department balance (cross-department load parity)
  3. Seniority / rank bias (correlation between rank & quality)
  4. Time-slot fairness (morning vs afternoon per faculty)
  5. Room quality distribution across batches
  6. Gender / group balance (if demographic data available)
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from core.models import Assignment, Solution
from core.context import SchedulingContext


@dataclass
class BiasFairnessResult:
    """Container for bias & fairness metrics."""

    # ── Workload equity ─────────────────────────────────────────
    workload_gini: float = 0.0             # 0 = perfect equity, 1 = total disparity
    workload_cv: float = 0.0               # coefficient of variation
    workload_range_ratio: float = 0.0      # max_load / min_load (non-zero)
    workload_per_faculty: Dict[str, int] = field(default_factory=dict)

    # ── Department balance ──────────────────────────────────────
    dept_load_cv: float = 0.0              # CV of avg per-faculty load across depts
    dept_loads: Dict[str, float] = field(default_factory=dict)  # dept -> avg hours

    # ── Seniority / rank bias ───────────────────────────────────
    rank_load_correlation: float = 0.0     # Pearson r(rank_weight, hours)
    rank_quality_correlation: float = 0.0  # Pearson r(rank_weight, slot quality)
    rank_is_biased: bool = False           # |r| > 0.3

    # ── Time-slot fairness ──────────────────────────────────────
    morning_pct_cv: float = 0.0            # CV of morning% across faculty
    morning_pct_per_faculty: Dict[str, float] = field(default_factory=dict)
    timeslot_gini: float = 0.0             # Gini of time slot usage

    # ── Room quality ────────────────────────────────────────────
    room_capacity_cv_across_batches: float = 0.0   # CV of avg room capacity per batch
    avg_room_capacity_per_batch: Dict[str, float] = field(default_factory=dict)

    # ── Overall fairness score ──────────────────────────────────
    overall_fairness_score: float = 0.0    # 0-100, higher = fairer

    # ── Flagged issues ──────────────────────────────────────────
    issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {}
        for k, v in self.__dict__.items():
            if isinstance(v, float):
                d[k] = round(v, 4)
            elif isinstance(v, dict):
                d[k] = {
                    dk: round(dv, 4) if isinstance(dv, float) else dv
                    for dk, dv in v.items()
                }
            else:
                d[k] = v
        return d


class BiasFairnessEvaluator:
    """Evaluate algorithmic fairness in scheduling solutions."""

    # Thresholds for flagging
    GINI_THRESHOLD = 0.25
    CV_THRESHOLD = 0.35
    CORRELATION_THRESHOLD = 0.30

    def __init__(self, context: SchedulingContext):
        self.context = context
        self._faculty_map = {f.id: f for f in context.faculty}
        self._room_map = {r.id: r for r in context.rooms}
        self._batch_map = {b.id: b for b in context.batches}
        self._slot_map = {ts.id: ts for ts in context.time_slots}

    def evaluate(self, solution: Solution) -> BiasFairnessResult:
        """Run all fairness checks."""
        r = BiasFairnessResult()
        assigns = solution.assignments

        self._workload_equity(assigns, r)
        self._department_balance(assigns, r)
        self._seniority_bias(assigns, r)
        self._timeslot_fairness(assigns, r)
        self._room_quality(assigns, r)
        self._composite_fairness(r)

        return r

    # ================================================================
    # Sub-evaluators
    # ================================================================

    def _workload_equity(self, assigns: List[Assignment], r: BiasFairnessResult):
        """Faculty workload distribution."""
        load: Dict[str, int] = defaultdict(int)
        for a in assigns:
            load[a.faculty_id] += 1

        # Include idle faculty (0 hours)
        for f in self.context.faculty:
            if f.id not in load:
                load[f.id] = 0

        r.workload_per_faculty = dict(load)
        hours = list(load.values())

        if len(hours) < 2:
            return

        arr = np.array(hours, dtype=float)
        r.workload_gini = self._gini_coefficient(arr)
        mean = np.mean(arr)
        std = np.std(arr)
        r.workload_cv = float(std / mean) if mean > 0 else 0.0

        non_zero = [h for h in hours if h > 0]
        if non_zero:
            r.workload_range_ratio = max(non_zero) / min(non_zero)

        if r.workload_gini > self.GINI_THRESHOLD:
            r.issues.append(
                f"High workload inequality (Gini={r.workload_gini:.3f} > {self.GINI_THRESHOLD})"
            )
        if r.workload_cv > self.CV_THRESHOLD:
            r.issues.append(
                f"High workload variation (CV={r.workload_cv:.3f} > {self.CV_THRESHOLD})"
            )

    def _department_balance(self, assigns: List[Assignment], r: BiasFairnessResult):
        """Cross-department load parity."""
        dept_faculty: Dict[str, List[str]] = defaultdict(list)
        for f in self.context.faculty:
            dept_faculty[f.department].append(f.id)

        if len(dept_faculty) < 2:
            r.dept_load_cv = 0.0
            return

        fac_load: Dict[str, int] = defaultdict(int)
        for a in assigns:
            fac_load[a.faculty_id] += 1

        dept_avgs: Dict[str, float] = {}
        for dept, fids in dept_faculty.items():
            loads = [fac_load.get(fid, 0) for fid in fids]
            dept_avgs[dept] = float(np.mean(loads)) if loads else 0.0

        r.dept_loads = dept_avgs
        avgs = list(dept_avgs.values())
        mean = np.mean(avgs)
        std = np.std(avgs)
        r.dept_load_cv = float(std / mean) if mean > 0 else 0.0

        if r.dept_load_cv > self.CV_THRESHOLD:
            r.issues.append(
                f"Department load imbalance (CV={r.dept_load_cv:.3f})"
            )

    def _seniority_bias(self, assigns: List[Assignment], r: BiasFairnessResult):
        """Check if higher-rank faculty get better treatment."""
        ranks: List[float] = []
        hours: List[float] = []
        slot_scores: List[float] = []

        fac_load: Dict[str, int] = defaultdict(int)
        fac_morning: Dict[str, int] = defaultdict(int)
        fac_total: Dict[str, int] = defaultdict(int)

        for a in assigns:
            fac_load[a.faculty_id] += 1
            fac_total[a.faculty_id] += 1
            if a.time_slot.start_hour < 12:
                fac_morning[a.faculty_id] += 1

        for f in self.context.faculty:
            if f.id in fac_load:
                ranks.append(f.rank_weight)
                hours.append(fac_load[f.id])
                # Slot quality = morning % (proxy for preferability)
                total = fac_total.get(f.id, 1)
                morn = fac_morning.get(f.id, 0)
                slot_scores.append(morn / max(total, 1))

        if len(ranks) < 3:
            return

        r.rank_load_correlation = float(self._pearson(ranks, hours))
        r.rank_quality_correlation = float(self._pearson(ranks, slot_scores))
        r.rank_is_biased = (
            abs(r.rank_load_correlation) > self.CORRELATION_THRESHOLD
            or abs(r.rank_quality_correlation) > self.CORRELATION_THRESHOLD
        )

        if r.rank_is_biased:
            r.issues.append(
                f"Seniority bias detected (load r={r.rank_load_correlation:.3f}, "
                f"quality r={r.rank_quality_correlation:.3f})"
            )

    def _timeslot_fairness(self, assigns: List[Assignment], r: BiasFairnessResult):
        """Morning/afternoon distribution fairness across faculty."""
        fac_morning: Dict[str, int] = defaultdict(int)
        fac_total: Dict[str, int] = defaultdict(int)

        for a in assigns:
            fac_total[a.faculty_id] += 1
            if a.time_slot.start_hour < 12:
                fac_morning[a.faculty_id] += 1

        morning_pcts: List[float] = []
        for fid in fac_total:
            pct = fac_morning.get(fid, 0) / max(fac_total[fid], 1)
            r.morning_pct_per_faculty[fid] = pct
            morning_pcts.append(pct)

        if len(morning_pcts) < 2:
            return

        arr = np.array(morning_pcts)
        mean = np.mean(arr)
        std = np.std(arr)
        r.morning_pct_cv = float(std / mean) if mean > 0 else 0.0

        # Gini on total slot usage
        slot_usage: Dict[str, int] = defaultdict(int)
        for a in assigns:
            slot_usage[a.time_slot.id] += 1
        if slot_usage:
            r.timeslot_gini = self._gini_coefficient(
                np.array(list(slot_usage.values()), dtype=float)
            )

        if r.morning_pct_cv > self.CV_THRESHOLD:
            r.issues.append(
                f"Uneven morning slot distribution (CV={r.morning_pct_cv:.3f})"
            )

    def _room_quality(self, assigns: List[Assignment], r: BiasFairnessResult):
        """Room quality (capacity) fairness across batches."""
        batch_caps: Dict[str, List[int]] = defaultdict(list)

        for a in assigns:
            room = self._room_map.get(a.room_id)
            if room:
                batch_caps[a.batch_id].append(room.capacity)

        avg_caps: Dict[str, float] = {}
        for bid, caps in batch_caps.items():
            avg_caps[bid] = float(np.mean(caps))

        r.avg_room_capacity_per_batch = avg_caps

        if len(avg_caps) < 2:
            return

        vals = list(avg_caps.values())
        mean = np.mean(vals)
        std = np.std(vals)
        r.room_capacity_cv_across_batches = float(std / mean) if mean > 0 else 0.0

        if r.room_capacity_cv_across_batches > self.CV_THRESHOLD:
            r.issues.append(
                f"Uneven room quality across batches (CV={r.room_capacity_cv_across_batches:.3f})"
            )

    # ================================================================
    # Composite fairness score (0 – 100)
    # ================================================================

    def _composite_fairness(self, r: BiasFairnessResult):
        """Higher = fairer. Penalise high Gini, CV, and bias."""
        penalties = []

        # Workload equity: penalise high Gini
        penalties.append(min(r.workload_gini / 0.5, 1.0))  # 0.5+ = max penalty

        # Department balance
        penalties.append(min(r.dept_load_cv / 0.5, 1.0))

        # Seniority bias
        bias_mag = max(abs(r.rank_load_correlation), abs(r.rank_quality_correlation))
        penalties.append(min(bias_mag / 0.5, 1.0))

        # Time-slot fairness
        penalties.append(min(r.morning_pct_cv / 0.5, 1.0))

        # Room quality
        penalties.append(min(r.room_capacity_cv_across_batches / 0.5, 1.0))

        avg_penalty = np.mean(penalties)
        r.overall_fairness_score = round((1.0 - avg_penalty) * 100, 2)

    # ================================================================
    # Statistical helpers
    # ================================================================

    @staticmethod
    def _gini_coefficient(arr: np.ndarray) -> float:
        """Compute Gini coefficient (0 = equality, 1 = inequality)."""
        if len(arr) == 0:
            return 0.0
        arr = arr.flatten().astype(float)
        if np.amin(arr) < 0:
            arr -= np.amin(arr)
        arr = np.sort(arr)
        n = len(arr)
        total = np.sum(arr)
        if total == 0:
            return 0.0
        index = np.arange(1, n + 1)
        return float((2 * np.sum(index * arr) - (n + 1) * total) / (n * total))

    @staticmethod
    def _pearson(x: List[float], y: List[float]) -> float:
        """Pearson correlation coefficient."""
        if len(x) < 2:
            return 0.0
        ax = np.array(x, dtype=float)
        ay = np.array(y, dtype=float)
        mx, my = np.mean(ax), np.mean(ay)
        sx, sy = np.std(ax), np.std(ay)
        if sx == 0 or sy == 0:
            return 0.0
        return float(np.mean((ax - mx) * (ay - my)) / (sx * sy))
