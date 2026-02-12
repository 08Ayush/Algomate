"""
ROC-AUC evaluation for the ML Quality Predictor.

The predictor (GradientBoostingRegressor) outputs a continuous quality score.
To compute classification metrics (ROC-AUC, PR-AUC) we threshold predictions
into "good" vs "bad" solutions and compare against ground truth.

Provides:
  - ROC curve + AUC
  - Precision-Recall curve + AUC
  - Calibration analysis (predicted vs actual quality)
  - Threshold sweep for optimal operating point
  - Per-solver ROC comparison
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from core.models import Solution
from core.context import SchedulingContext

logger = logging.getLogger("optimized.evaluation.roc_auc")


@dataclass
class ROCAUCResult:
    """Container for all ROC / classification metrics."""
    # Binary classification @ default threshold
    roc_auc: float = 0.0
    pr_auc: float = 0.0
    accuracy: float = 0.0
    precision_at_threshold: float = 0.0
    recall_at_threshold: float = 0.0
    f1_at_threshold: float = 0.0
    threshold_used: float = 0.7

    # Calibration
    calibration_error: float = 0.0  # Mean absolute calibration error
    calibration_bins: List[Dict[str, float]] = field(default_factory=list)

    # Regression baseline
    r2: float = 0.0
    mae: float = 0.0
    rmse: float = 0.0
    correlation: float = 0.0

    # Threshold sweep
    optimal_threshold: float = 0.7
    optimal_f1: float = 0.0
    threshold_sweep: List[Dict[str, float]] = field(default_factory=list)

    # Per-solver breakdown
    per_solver_auc: Dict[str, float] = field(default_factory=dict)

    n_samples: int = 0
    n_positive: int = 0
    n_negative: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "roc_auc": round(self.roc_auc, 4),
            "pr_auc": round(self.pr_auc, 4),
            "accuracy": round(self.accuracy, 4),
            "precision_at_threshold": round(self.precision_at_threshold, 4),
            "recall_at_threshold": round(self.recall_at_threshold, 4),
            "f1_at_threshold": round(self.f1_at_threshold, 4),
            "threshold_used": self.threshold_used,
            "optimal_threshold": round(self.optimal_threshold, 4),
            "optimal_f1": round(self.optimal_f1, 4),
            "calibration_error": round(self.calibration_error, 4),
            "r2": round(self.r2, 4),
            "mae": round(self.mae, 4),
            "rmse": round(self.rmse, 4),
            "correlation": round(self.correlation, 4),
            "n_samples": self.n_samples,
            "n_positive": self.n_positive,
            "n_negative": self.n_negative,
            "per_solver_auc": {
                k: round(v, 4) for k, v in self.per_solver_auc.items()
            },
        }


class ROCAUCEvaluator:
    """
    Evaluates the ML quality predictor as a binary classifier.

    Given a set of solutions with actual quality scores and predicted
    quality scores, computes ROC-AUC, PR-AUC, calibration, and
    threshold-sweep analysis.
    """

    def __init__(
        self,
        context: SchedulingContext,
        quality_threshold: float = 0.7,
    ):
        """
        Args:
            context: Scheduling context.
            quality_threshold: Score above which a solution is "good".
        """
        self.context = context
        self.quality_threshold = quality_threshold

    def evaluate(
        self,
        solutions: List[Solution],
        predicted_scores: Optional[List[float]] = None,
    ) -> ROCAUCResult:
        """
        Evaluate predictor performance.

        If predicted_scores is None, uses solution.predicted_quality
        (set by QualityPredictor.predict()).

        Args:
            solutions: Solutions with actual quality_score set.
            predicted_scores: Predicted quality values (0-1).

        Returns:
            ROCAUCResult with all metrics.
        """
        result = ROCAUCResult(threshold_used=self.quality_threshold)

        if len(solutions) < 2:
            logger.warning("Need >= 2 solutions for ROC-AUC evaluation")
            return result

        # Gather actual vs predicted
        actuals: List[float] = []
        preds: List[float] = []
        solvers: List[str] = []

        for i, sol in enumerate(solutions):
            actual = sol.quality_score
            if predicted_scores is not None:
                pred = predicted_scores[i]
            elif sol.predicted_quality is not None:
                pred = sol.predicted_quality
            else:
                continue
            actuals.append(actual)
            preds.append(pred)
            solvers.append(sol.solver_name or "unknown")

        if len(actuals) < 2:
            logger.warning("Not enough predictions for evaluation")
            return result

        y_true = np.array(actuals)
        y_pred = np.array(preds)
        result.n_samples = len(y_true)

        # ── Regression metrics ──────────────────────────────────
        result.r2 = float(1.0 - np.sum((y_true - y_pred) ** 2) /
                          max(np.sum((y_true - y_true.mean()) ** 2), 1e-10))
        result.mae = float(np.mean(np.abs(y_true - y_pred)))
        result.rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
        if np.std(y_true) > 0 and np.std(y_pred) > 0:
            result.correlation = float(np.corrcoef(y_true, y_pred)[0, 1])

        # ── Binary classification ───────────────────────────────
        y_true_bin = (y_true >= self.quality_threshold).astype(int)
        y_pred_bin = (y_pred >= self.quality_threshold).astype(int)
        result.n_positive = int(y_true_bin.sum())
        result.n_negative = int((1 - y_true_bin).sum())

        # Accuracy
        result.accuracy = float(np.mean(y_true_bin == y_pred_bin))

        # Precision / Recall / F1 at threshold
        tp = int(np.sum((y_true_bin == 1) & (y_pred_bin == 1)))
        fp = int(np.sum((y_true_bin == 0) & (y_pred_bin == 1)))
        fn = int(np.sum((y_true_bin == 1) & (y_pred_bin == 0)))

        result.precision_at_threshold = tp / max(tp + fp, 1)
        result.recall_at_threshold = tp / max(tp + fn, 1)
        if result.precision_at_threshold + result.recall_at_threshold > 0:
            result.f1_at_threshold = (
                2 * result.precision_at_threshold * result.recall_at_threshold
                / (result.precision_at_threshold + result.recall_at_threshold)
            )

        # ── ROC-AUC (manual trapezoid) ──────────────────────────
        result.roc_auc = self._compute_roc_auc(y_true_bin, y_pred)

        # ── PR-AUC ──────────────────────────────────────────────
        result.pr_auc = self._compute_pr_auc(y_true_bin, y_pred)

        # ── Calibration ─────────────────────────────────────────
        result.calibration_error, result.calibration_bins = (
            self._calibration_analysis(y_true, y_pred)
        )

        # ── Threshold sweep ─────────────────────────────────────
        result.threshold_sweep, result.optimal_threshold, result.optimal_f1 = (
            self._threshold_sweep(y_true, y_pred)
        )

        # ── Per-solver AUC ──────────────────────────────────────
        result.per_solver_auc = self._per_solver_auc(
            y_true_bin, y_pred, solvers,
        )

        return result

    # ------------------------------------------------------------------
    # ROC-AUC (no sklearn dependency)
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_roc_auc(y_true: np.ndarray, y_scores: np.ndarray) -> float:
        """Compute ROC-AUC using the trapezoidal rule."""
        if len(np.unique(y_true)) < 2:
            return 0.5  # undefined for single class

        # Sort by predicted score descending
        order = np.argsort(-y_scores)
        y_sorted = y_true[order]

        n_pos = y_true.sum()
        n_neg = len(y_true) - n_pos
        if n_pos == 0 or n_neg == 0:
            return 0.5

        tp = 0
        fp = 0
        auc = 0.0
        prev_fpr = 0.0

        for i in range(len(y_sorted)):
            if y_sorted[i] == 1:
                tp += 1
            else:
                fp += 1
                tpr = tp / n_pos
                fpr = fp / n_neg
                auc += (fpr - prev_fpr) * tpr
                prev_fpr = fpr

        return float(auc)

    @staticmethod
    def _compute_pr_auc(y_true: np.ndarray, y_scores: np.ndarray) -> float:
        """Compute Precision-Recall AUC."""
        if y_true.sum() == 0:
            return 0.0

        order = np.argsort(-y_scores)
        y_sorted = y_true[order]

        tp_cum = np.cumsum(y_sorted)
        n = np.arange(1, len(y_sorted) + 1)
        precisions = tp_cum / n
        recalls = tp_cum / y_true.sum()

        # Trapezoidal
        auc = 0.0
        for i in range(1, len(recalls)):
            auc += (recalls[i] - recalls[i - 1]) * (precisions[i] + precisions[i - 1]) / 2

        return float(auc)

    # ------------------------------------------------------------------
    # Calibration
    # ------------------------------------------------------------------

    @staticmethod
    def _calibration_analysis(
        y_true: np.ndarray, y_pred: np.ndarray, n_bins: int = 10,
    ) -> Tuple[float, List[Dict[str, float]]]:
        """Compute calibration error and per-bin stats."""
        bins_list: List[Dict[str, float]] = []
        errors: List[float] = []

        for i in range(n_bins):
            lo = i / n_bins
            hi = (i + 1) / n_bins
            mask = (y_pred >= lo) & (y_pred < hi)
            if not mask.any():
                continue
            mean_pred = float(y_pred[mask].mean())
            mean_actual = float(y_true[mask].mean())
            error = abs(mean_pred - mean_actual)
            errors.append(error)
            bins_list.append({
                "bin_low": round(lo, 2),
                "bin_high": round(hi, 2),
                "count": int(mask.sum()),
                "mean_predicted": round(mean_pred, 4),
                "mean_actual": round(mean_actual, 4),
                "calibration_error": round(error, 4),
            })

        mce = float(np.mean(errors)) if errors else 0.0
        return mce, bins_list

    # ------------------------------------------------------------------
    # Threshold sweep
    # ------------------------------------------------------------------

    @staticmethod
    def _threshold_sweep(
        y_true: np.ndarray, y_pred: np.ndarray,
    ) -> Tuple[List[Dict[str, float]], float, float]:
        """Sweep thresholds from 0.1 to 0.95 and find optimal F1."""
        sweep: List[Dict[str, float]] = []
        best_f1 = 0.0
        best_thresh = 0.5

        for t_int in range(10, 96, 5):
            t = t_int / 100.0
            y_tb = (y_true >= t).astype(int)
            y_pb = (y_pred >= t).astype(int)

            if y_tb.sum() == 0 and (1 - y_tb).sum() == 0:
                continue

            tp = int(((y_tb == 1) & (y_pb == 1)).sum())
            fp = int(((y_tb == 0) & (y_pb == 1)).sum())
            fn = int(((y_tb == 1) & (y_pb == 0)).sum())

            prec = tp / max(tp + fp, 1)
            rec = tp / max(tp + fn, 1)
            f1 = 2 * prec * rec / max(prec + rec, 1e-10)

            sweep.append({
                "threshold": t,
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "tp": tp, "fp": fp, "fn": fn,
            })

            if f1 > best_f1:
                best_f1 = f1
                best_thresh = t

        return sweep, best_thresh, best_f1

    # ------------------------------------------------------------------
    # Per-solver AUC
    # ------------------------------------------------------------------

    def _per_solver_auc(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        solvers: List[str],
    ) -> Dict[str, float]:
        """Compute ROC-AUC grouped by solver name."""
        results: Dict[str, float] = {}
        solver_arr = np.array(solvers)

        for name in set(solvers):
            mask = solver_arr == name
            if mask.sum() < 2 or len(np.unique(y_true[mask])) < 2:
                results[name] = 0.5
                continue
            results[name] = self._compute_roc_auc(y_true[mask], y_pred[mask])

        return results
