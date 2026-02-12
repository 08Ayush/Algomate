"""
Data Quality Report — produced by the Transform phase.

Captures validation issues, cleaning actions, and a numeric quality score
so the solver (and the user) know how trustworthy the input data is.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger("optimized.etl.quality")


# ──────────────────────────────────────────────────────────────────────
# Issue / action records
# ──────────────────────────────────────────────────────────────────────

@dataclass
class QualityIssue:
    """A single data quality issue found during validation."""
    severity: str               # "error" | "warning" | "info"
    category: str               # e.g. "missing_data", "unicode", "qualification"
    entity_type: str            # "faculty" | "subject" | "batch" | …
    entity_id: Optional[str]    # ID of the affected entity (may be None)
    entity_name: Optional[str]  # Human-readable name
    message: str                # What the problem is
    auto_fixed: bool = False    # Was it auto-repaired by the transform?


@dataclass
class CleaningAction:
    """A single cleaning / normalisation step that was applied."""
    entity_type: str
    entity_id: Optional[str]
    field: str
    original_value: str
    cleaned_value: str
    action: str  # e.g. "unicode_fix", "trim", "default_fill"


# ──────────────────────────────────────────────────────────────────────
# Aggregate report
# ──────────────────────────────────────────────────────────────────────

@dataclass
class DataQualityReport:
    """
    Aggregate report produced by the Transform layer.

    Contains all issues, cleaning actions, and computes a quality
    score between 0.0 (unusable) and 1.0 (perfect).
    """
    batch_id: str = ""
    college_id: str = ""

    issues: List[QualityIssue] = field(default_factory=list)
    cleaning_actions: List[CleaningAction] = field(default_factory=list)

    # Counters filled during extraction / transform
    total_subjects: int = 0
    total_faculty: int = 0
    total_rooms: int = 0
    total_time_slots: int = 0
    subjects_with_faculty: int = 0
    faculty_with_qualifications: int = 0
    unicode_fixes: int = 0

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "warning")

    @property
    def quality_score(self) -> float:
        """
        Compute a 0–1 quality score.

        Formula:
          - Start at 1.0
          - Each error  → -0.15
          - Each warning → -0.03
          - Bonus for faculty coverage
        """
        score = 1.0

        score -= self.error_count * 0.15
        score -= self.warning_count * 0.03

        # Faculty coverage factor
        if self.total_subjects > 0:
            coverage = self.subjects_with_faculty / self.total_subjects
            score *= (0.4 + 0.6 * coverage)  # 40..100 % weight

        return max(0.0, min(1.0, round(score, 4)))

    @property
    def is_viable(self) -> bool:
        """Can the solver realistically produce a useful timetable?"""
        return self.quality_score >= 0.25 and self.total_subjects > 0

    # ── Convenience loggers ───────────────────────────────────────────

    def add_error(self, category: str, entity_type: str, message: str,
                  entity_id: str = None, entity_name: str = None,
                  auto_fixed: bool = False):
        self.issues.append(QualityIssue(
            severity="error", category=category,
            entity_type=entity_type, entity_id=entity_id,
            entity_name=entity_name, message=message,
            auto_fixed=auto_fixed,
        ))

    def add_warning(self, category: str, entity_type: str, message: str,
                    entity_id: str = None, entity_name: str = None,
                    auto_fixed: bool = False):
        self.issues.append(QualityIssue(
            severity="warning", category=category,
            entity_type=entity_type, entity_id=entity_id,
            entity_name=entity_name, message=message,
            auto_fixed=auto_fixed,
        ))

    def add_info(self, category: str, entity_type: str, message: str,
                 entity_id: str = None, entity_name: str = None):
        self.issues.append(QualityIssue(
            severity="info", category=category,
            entity_type=entity_type, entity_id=entity_id,
            entity_name=entity_name, message=message,
        ))

    def add_cleaning(self, entity_type: str, entity_id: str,
                     field_name: str, original: str, cleaned: str, action: str):
        self.cleaning_actions.append(CleaningAction(
            entity_type=entity_type, entity_id=entity_id,
            field=field_name, original_value=original,
            cleaned_value=cleaned, action=action,
        ))
        self.unicode_fixes += 1

    # ── Summary ───────────────────────────────────────────────────────

    def summary_dict(self) -> Dict:
        return {
            "quality_score": self.quality_score,
            "is_viable": self.is_viable,
            "total_subjects": self.total_subjects,
            "total_faculty": self.total_faculty,
            "total_rooms": self.total_rooms,
            "total_time_slots": self.total_time_slots,
            "subjects_with_faculty": self.subjects_with_faculty,
            "faculty_with_qualifications": self.faculty_with_qualifications,
            "errors": self.error_count,
            "warnings": self.warning_count,
            "cleaning_actions": len(self.cleaning_actions),
            "unicode_fixes": self.unicode_fixes,
        }

    def log_summary(self, log: logging.Logger = None):
        log = log or logger
        s = self.summary_dict()
        log.info(
            f"DATA QUALITY REPORT | score={s['quality_score']:.2f} "
            f"| viable={s['is_viable']} "
            f"| subjects={s['total_subjects']} "
            f"| faculty={s['total_faculty']} ({s['subjects_with_faculty']}/{s['total_subjects']} covered) "
            f"| rooms={s['total_rooms']} | slots={s['total_time_slots']} "
            f"| errors={s['errors']} warnings={s['warnings']} "
            f"| fixes={s['cleaning_actions']}"
        )
