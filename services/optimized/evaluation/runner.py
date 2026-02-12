"""
Unified evaluation runner for the timetable scheduling algorithm.

Orchestrates all five evaluators and produces an EvaluationReport that
aggregates: Precision/Recall, ROC-AUC, Business KPIs, Bias & Fairness,
and Explainability (SHAP / LIME).

Usage:
    from evaluation import SchedulerEvaluator

    evaluator = SchedulerEvaluator(context)
    report = evaluator.evaluate(solution)
    report.print_summary()
    data = report.to_dict()
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from core.models import Solution
from core.context import SchedulingContext
from ml.predictor import QualityPredictor

from evaluation.precision_recall import PrecisionRecallEvaluator, PrecisionRecallResult
from evaluation.roc_auc import ROCAUCEvaluator, ROCAUCResult
from evaluation.business_kpis import BusinessKPIEvaluator, BusinessKPIResult
from evaluation.bias_fairness import BiasFairnessEvaluator, BiasFairnessResult
from evaluation.explainability import ExplainabilityEvaluator, ExplainabilityResult

logger = logging.getLogger(__name__)


# ====================================================================
# Evaluation report
# ====================================================================

@dataclass
class EvaluationReport:
    """Complete evaluation report aggregating all modules."""

    # Module results (None if not run / failed)
    precision_recall: Optional[PrecisionRecallResult] = None
    roc_auc: Optional[ROCAUCResult] = None
    business_kpis: Optional[BusinessKPIResult] = None
    bias_fairness: Optional[BiasFairnessResult] = None
    explainability: Optional[ExplainabilityResult] = None

    # Meta
    n_solutions: int = 0
    evaluation_time_seconds: float = 0.0
    modules_run: List[str] = field(default_factory=list)
    errors: Dict[str, str] = field(default_factory=dict)

    # ── Serialisation ───────────────────────────────────────────

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "meta": {
                "n_solutions": self.n_solutions,
                "evaluation_time_seconds": round(self.evaluation_time_seconds, 3),
                "modules_run": self.modules_run,
                "errors": self.errors,
            },
        }
        if self.precision_recall:
            d["precision_recall"] = self.precision_recall.to_dict()
        if self.roc_auc:
            d["roc_auc"] = self.roc_auc.to_dict()
        if self.business_kpis:
            d["business_kpis"] = self.business_kpis.to_dict()
        if self.bias_fairness:
            d["bias_fairness"] = self.bias_fairness.to_dict()
        if self.explainability:
            d["explainability"] = self.explainability.to_dict()
        return d

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)

    # ── Human-readable summary ──────────────────────────────────

    def print_summary(self):
        w = 60
        print("=" * w)
        print("  SCHEDULER EVALUATION REPORT")
        print("=" * w)
        print(f"  Solutions evaluated : {self.n_solutions}")
        print(f"  Evaluation time     : {self.evaluation_time_seconds:.2f}s")
        print(f"  Modules run         : {', '.join(self.modules_run)}")
        if self.errors:
            print(f"  Errors              : {self.errors}")
        print("-" * w)

        # ── Precision / Recall ──────────────────────────────────
        if self.precision_recall:
            pr = self.precision_recall
            print("\n  >> Precision / Recall")
            print(f"     Precision  : {pr.precision:.4f}")
            print(f"     Recall     : {pr.recall:.4f}")
            print(f"     F1 Score   : {pr.f1:.4f}")
            print(f"     Hard Prec. : {pr.hard_precision:.4f}")
            print(f"     Soft Prec. : {pr.soft_precision:.4f}")
            print(f"     Lab Prec.  : {pr.lab_precision:.4f}")
            print(f"     Lab Recall : {pr.lab_recall:.4f}")

        # ── ROC-AUC ─────────────────────────────────────────────
        if self.roc_auc:
            ra = self.roc_auc
            print("\n  >> ROC-AUC & Calibration")
            print(f"     ROC-AUC       : {ra.roc_auc:.4f}")
            print(f"     PR-AUC        : {ra.pr_auc:.4f}")
            print(f"     Accuracy      : {ra.accuracy:.4f}")
            print(f"     Calibration   : {ra.calibration_error:.4f}")
            print(f"     Best threshold: {ra.optimal_threshold:.2f} (F1={ra.optimal_f1:.4f})")

        # ── Business KPIs ───────────────────────────────────────
        if self.business_kpis:
            bk = self.business_kpis
            print("\n  >> Business KPIs")
            print(f"     Schedule completeness : {bk.schedule_completeness:.1%}")
            print(f"     Faculty utilization   : {bk.faculty_utilization_mean:.1%} ± {bk.faculty_utilization_std:.1%}")
            print(f"     Room utilization      : {bk.room_utilization_mean:.1%}")
            print(f"     Preference adherence  : {bk.preference_adherence:.1%}")
            print(f"     Credit-hour alignment : {bk.credit_hour_alignment:.1%}")
            print(f"     Overall KPI score     : {bk.overall_kpi_score:.1f} / 100")

        # ── Bias & Fairness ─────────────────────────────────────
        if self.bias_fairness:
            bf = self.bias_fairness
            print("\n  >> Bias & Fairness")
            print(f"     Workload Gini    : {bf.workload_gini:.4f}")
            print(f"     Workload CV      : {bf.workload_cv:.4f}")
            print(f"     Department CV    : {bf.dept_load_cv:.4f}")
            print(f"     Rank bias        : {'YES' if bf.rank_is_biased else 'No'}")
            print(f"     Fairness score   : {bf.overall_fairness_score:.1f} / 100")
            if bf.issues:
                print("     Issues:")
                for issue in bf.issues:
                    print(f"       - {issue}")

        # ── Explainability ──────────────────────────────────────
        if self.explainability:
            ex = self.explainability
            print("\n  >> Explainability")
            print(f"     Methods used  : {', '.join(ex.method_used)}")
            print(f"     SHAP available: {ex.shap_available}")
            print(f"     LIME available: {ex.lime_available}")
            if ex.shap_top_features:
                print("     Top SHAP features:")
                for name, val in ex.shap_top_features[:5]:
                    print(f"       {name:40s} {val:.6f}")
            elif ex.global_importance:
                print("     Top features (GBDT importance):")
                for name, val in ex.global_importance[:5]:
                    print(f"       {name:40s} {val:.6f}")

        print("\n" + "=" * w)


# ====================================================================
# Unified evaluator
# ====================================================================

class SchedulerEvaluator:
    """Runs all evaluation modules and returns an EvaluationReport."""

    def __init__(
        self,
        context: SchedulingContext,
        predictor: Optional[QualityPredictor] = None,
        quality_threshold: float = 0.7,
    ):
        """
        Args:
            context: Scheduling context (shared by all evaluators).
            predictor: Fitted QualityPredictor (needed for ROC-AUC & explainability).
            quality_threshold: Good/bad cutoff for ROC-AUC binary classification.
        """
        self.context = context
        self.predictor = predictor
        self.quality_threshold = quality_threshold

        # Instantiate sub-evaluators
        self._pr = PrecisionRecallEvaluator(context)
        self._roc = ROCAUCEvaluator(context, quality_threshold=quality_threshold)
        self._kpi = BusinessKPIEvaluator(context)
        self._bf = BiasFairnessEvaluator(context)
        self._ex = ExplainabilityEvaluator(context, predictor=predictor)

    # ----------------------------------------------------------------
    # Single solution evaluation
    # ----------------------------------------------------------------

    def evaluate(self, solution: Solution) -> EvaluationReport:
        """Evaluate a single solution with all modules."""
        return self.evaluate_batch([solution])

    # ----------------------------------------------------------------
    # Batch evaluation
    # ----------------------------------------------------------------

    def evaluate_batch(
        self,
        solutions: List[Solution],
        *,
        predicted_scores: Optional[List[float]] = None,
        run_explainability: bool = True,
    ) -> EvaluationReport:
        """Evaluate multiple solutions.

        Args:
            solutions: One or more Solution objects.
            predicted_scores: Pre-computed predicted quality scores (for ROC-AUC).
            run_explainability: Run SHAP/LIME (can be slow for large batches).
        """
        t0 = time.time()
        report = EvaluationReport(n_solutions=len(solutions))

        # ── 1. Precision / Recall (per solution, aggregate) ─────
        self._safe_run(
            report,
            "precision_recall",
            lambda: self._aggregate_precision_recall(solutions),
        )

        # ── 2. ROC-AUC (needs multiple solutions ideally) ───────
        if self.predictor is not None and self.predictor.is_fitted:
            self._safe_run(
                report,
                "roc_auc",
                lambda: self._roc.evaluate(solutions, predicted_scores),
            )

        # ── 3. Business KPIs (per solution, aggregate) ──────────
        self._safe_run(
            report,
            "business_kpis",
            lambda: self._aggregate_kpis(solutions),
        )

        # ── 4. Bias & Fairness (per solution, aggregate) ────────
        self._safe_run(
            report,
            "bias_fairness",
            lambda: self._aggregate_fairness(solutions),
        )

        # ── 5. Explainability ───────────────────────────────────
        if run_explainability:
            self._safe_run(
                report,
                "explainability",
                lambda: self._ex.evaluate(solutions),
            )

        report.evaluation_time_seconds = time.time() - t0
        return report

    # ----------------------------------------------------------------
    # Private helpers
    # ----------------------------------------------------------------

    def _safe_run(self, report: EvaluationReport, name: str, fn):
        """Run evaluator, catch errors, store result."""
        try:
            result = fn()
            setattr(report, name, result)
            report.modules_run.append(name)
        except Exception as e:
            logger.error("Evaluation module '%s' failed: %s", name, e, exc_info=True)
            report.errors[name] = str(e)

    def _aggregate_precision_recall(
        self, solutions: List[Solution]
    ) -> PrecisionRecallResult:
        """Run precision/recall on each solution and average."""
        if len(solutions) == 1:
            return self._pr.evaluate(solutions[0])

        results = [self._pr.evaluate(s) for s in solutions]
        # Average numeric fields
        avg = PrecisionRecallResult()
        n = len(results)
        avg.precision = sum(r.precision for r in results) / n
        avg.recall = sum(r.recall for r in results) / n
        avg.f1 = sum(r.f1 for r in results) / n
        avg.hard_precision = sum(r.hard_precision for r in results) / n
        avg.soft_precision = sum(r.soft_precision for r in results) / n
        avg.lab_precision = sum(r.lab_precision for r in results) / n
        avg.lab_recall = sum(r.lab_recall for r in results) / n
        avg.total_assignments = sum(r.total_assignments for r in results)
        avg.total_violations = sum(r.total_violations for r in results)
        return avg

    def _aggregate_kpis(self, solutions: List[Solution]) -> BusinessKPIResult:
        if len(solutions) == 1:
            return self._kpi.evaluate(solutions[0])

        results = [self._kpi.evaluate(s) for s in solutions]
        # Take the one with best overall score as representative
        best = max(results, key=lambda r: r.overall_kpi_score)
        return best

    def _aggregate_fairness(self, solutions: List[Solution]) -> BiasFairnessResult:
        if len(solutions) == 1:
            return self._bf.evaluate(solutions[0])

        results = [self._bf.evaluate(s) for s in solutions]
        best = max(results, key=lambda r: r.overall_fairness_score)
        return best
