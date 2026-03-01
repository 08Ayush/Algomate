"""
Precision / Recall evaluation for timetable scheduling.

In the scheduling context:
  - **Precision** = Of all assignments the solver made, how many are
    actually valid (no constraint violations)?
  - **Recall** = Of all required assignments (subjects × hours_per_week),
    how many were successfully scheduled?
  - **F1** = Harmonic mean of Precision and Recall.
  - **Per-constraint Precision** = Fraction of assignments satisfying
    each specific constraint type.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Set, Tuple

from core.models import (
    Assignment,
    ConstraintType,
    ConstraintViolation,
    Solution,
)
from core.context import SchedulingContext


# Hard constraint types
_HARD_CONSTRAINTS = {
    ConstraintType.NO_OVERLAP,
    ConstraintType.ROOM_CAPACITY,
    ConstraintType.FACULTY_AVAILABILITY,
    ConstraintType.LAB_REQUIREMENTS,
}


@dataclass
class PrecisionRecallResult:
    """Container for all precision / recall metrics."""
    # Overall
    precision: float = 0.0
    recall: float = 0.0
    f1: float = 0.0

    # Hard vs soft
    hard_precision: float = 0.0   # assignments free of hard violations
    soft_precision: float = 0.0   # assignments free of soft violations

    # Per-constraint precision (fraction of assignments satisfying each)
    constraint_precision: Dict[str, float] = field(default_factory=dict)

    # Subject-level recall (hours scheduled / hours required)
    subject_recall: Dict[str, float] = field(default_factory=dict)
    subjects_fully_covered: int = 0
    subjects_partially_covered: int = 0
    subjects_uncovered: int = 0

    # Counts
    total_assignments: int = 0
    valid_assignments: int = 0
    expected_assignments: int = 0

    # Lab-specific
    lab_precision: float = 0.0   # lab assignments in lab rooms
    lab_recall: float = 0.0      # lab hours covered

    def to_dict(self) -> Dict[str, Any]:
        return {
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1, 4),
            "hard_precision": round(self.hard_precision, 4),
            "soft_precision": round(self.soft_precision, 4),
            "lab_precision": round(self.lab_precision, 4),
            "lab_recall": round(self.lab_recall, 4),
            "total_assignments": self.total_assignments,
            "valid_assignments": self.valid_assignments,
            "expected_assignments": self.expected_assignments,
            "subjects_fully_covered": self.subjects_fully_covered,
            "subjects_partially_covered": self.subjects_partially_covered,
            "subjects_uncovered": self.subjects_uncovered,
            "constraint_precision": {
                k: round(v, 4) for k, v in self.constraint_precision.items()
            },
        }


class PrecisionRecallEvaluator:
    """Computes precision, recall, and F1 for a scheduling solution."""

    def __init__(self, context: SchedulingContext):
        self.context = context
        # Build lookups
        self._subject_map = {s.id: s for s in context.subjects}
        self._room_map = {r.id: r for r in context.rooms}
        self._faculty_map = {f.id: f for f in context.faculty}
        self._slot_map = {ts.id: ts for ts in context.time_slots}

    def evaluate(self, solution: Solution) -> PrecisionRecallResult:
        """Run full precision / recall analysis."""
        result = PrecisionRecallResult()
        assignments = solution.assignments
        result.total_assignments = len(assignments)

        # ── Expected assignments (per batch × subject) ──────────
        # Each batch independently requires its subjects' hours.
        expected_per_batch_subject: Dict[str, int] = {}  # "batch|subject" -> hours
        expected_per_subject: Dict[str, int] = defaultdict(int)

        for batch in self.context.batches:
            for sid in batch.subjects:
                subj = self._subject_map.get(sid)
                if subj:
                    expected_per_batch_subject[f"{batch.id}|{sid}"] = subj.hours_per_week
                    expected_per_subject[sid] += subj.hours_per_week

        result.expected_assignments = sum(expected_per_batch_subject.values())

        # ── Violation index: which assignments are affected ─────
        violated_hard: Set[str] = set()
        violated_soft: Set[str] = set()
        violated_by_type: Dict[ConstraintType, Set[str]] = defaultdict(set)

        for v in solution.constraint_violations:
            for aid in v.affected_assignments:
                violated_by_type[v.constraint_type].add(aid)
                if v.constraint_type in _HARD_CONSTRAINTS:
                    violated_hard.add(aid)
                else:
                    violated_soft.add(aid)

        # Also detect overlaps / capacity issues structurally
        structural_violations = self._detect_structural_violations(assignments)
        violated_hard |= structural_violations

        valid_ids = {
            a.id for a in assignments if a.id not in violated_hard
        }
        result.valid_assignments = len(valid_ids)

        # ── Precision ───────────────────────────────────────────
        n = max(result.total_assignments, 1)
        result.precision = len(valid_ids) / n
        result.hard_precision = (n - len(violated_hard)) / n
        result.soft_precision = (n - len(violated_soft)) / n

        # ── Per-constraint precision ────────────────────────────
        for ct in ConstraintType:
            affected = violated_by_type.get(ct, set())
            result.constraint_precision[ct.value] = (n - len(affected)) / n

        # ── Subject-level recall (now per batch×subject) ──────
        placed_per_batch_subject: Dict[str, int] = defaultdict(int)
        for a in assignments:
            if a.id in valid_ids:
                key = f"{a.batch_id}|{a.subject_id}"
                placed_per_batch_subject[key] += 1

        for key, required in expected_per_batch_subject.items():
            placed = placed_per_batch_subject.get(key, 0)
            recall_val = min(placed / max(required, 1), 1.0)
            result.subject_recall[key] = recall_val
            if placed >= required:
                result.subjects_fully_covered += 1
            elif placed > 0:
                result.subjects_partially_covered += 1
            else:
                result.subjects_uncovered += 1

        # ── Overall recall ──────────────────────────────────────
        total_placed = sum(
            min(placed_per_batch_subject.get(k, 0), expected_per_batch_subject[k])
            for k in expected_per_batch_subject
        )
        result.recall = total_placed / max(result.expected_assignments, 1)

        # ── F1 ──────────────────────────────────────────────────
        if result.precision + result.recall > 0:
            result.f1 = (
                2 * result.precision * result.recall
                / (result.precision + result.recall)
            )

        # ── Lab-specific ────────────────────────────────────────
        result.lab_precision, result.lab_recall = self._lab_metrics(
            assignments, valid_ids, expected_per_batch_subject,
        )

        return result

    # ------------------------------------------------------------------
    # Structural violation detection
    # ------------------------------------------------------------------

    def _detect_structural_violations(
        self, assignments: List[Assignment],
    ) -> Set[str]:
        """Detect overlapping / invalid assignments structurally."""
        violated: Set[str] = set()

        # Faculty overlaps (same faculty, same time slot)
        faculty_slot: Dict[Tuple[str, str], List[str]] = defaultdict(list)
        # Room overlaps (same room, same time slot)
        room_slot: Dict[Tuple[str, str], List[str]] = defaultdict(list)
        # Batch overlaps (same batch, same time slot)
        batch_slot: Dict[Tuple[str, str], List[str]] = defaultdict(list)

        for a in assignments:
            faculty_slot[(a.faculty_id, a.time_slot.id)].append(a.id)
            room_slot[(a.room_id, a.time_slot.id)].append(a.id)
            batch_slot[(a.batch_id, a.time_slot.id)].append(a.id)

        for key, ids in faculty_slot.items():
            if len(ids) > 1:
                violated.update(ids)

        for key, ids in room_slot.items():
            if len(ids) > 1:
                violated.update(ids)

        for key, ids in batch_slot.items():
            if len(ids) > 1:
                violated.update(ids)

        # Room capacity violations
        for a in assignments:
            room = self._room_map.get(a.room_id)
            if room:
                batch = None
                for b in self.context.batches:
                    if b.id == a.batch_id:
                        batch = b
                        break
                if batch and batch.strength > room.capacity:
                    violated.add(a.id)

        # Lab in non-lab room
        for a in assignments:
            if a.is_lab_session:
                room = self._room_map.get(a.room_id)
                if room and room.room_type != "lab":
                    violated.add(a.id)

        return violated

    # ------------------------------------------------------------------
    # Lab metrics
    # ------------------------------------------------------------------

    def _lab_metrics(
        self,
        assignments: List[Assignment],
        valid_ids: Set[str],
        expected_per_batch_subject: Dict[str, int],
    ) -> Tuple[float, float]:
        """Compute lab-specific precision and recall."""
        lab_subjects = {s.id for s in self.context.subjects if s.is_lab}
        if not lab_subjects:
            return 1.0, 1.0

        lab_assigns = [a for a in assignments if a.subject_id in lab_subjects]
        if not lab_assigns:
            return 0.0, 0.0

        # Precision: lab assignments placed in lab rooms
        in_lab_room = sum(
            1 for a in lab_assigns
            if self._room_map.get(a.room_id, None)
            and self._room_map[a.room_id].room_type == "lab"
        )
        precision = in_lab_room / max(len(lab_assigns), 1)

        # Recall: lab hours scheduled (across all batches)
        required = sum(
            hrs for key, hrs in expected_per_batch_subject.items()
            if key.split("|")[1] in lab_subjects
        )
        placed = sum(1 for a in lab_assigns if a.id in valid_ids)
        recall = min(placed / max(required, 1), 1.0)

        return precision, recall
