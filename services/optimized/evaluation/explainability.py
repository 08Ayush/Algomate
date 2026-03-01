"""
Explainability module for timetable scheduling quality predictions.

Provides:
  1. SHAP — TreeExplainer for the GradientBoostingRegressor
  2. LIME — local surrogate explanations for individual predictions
  3. Feature-contribution breakdown (native GBDT importances + delta)
  4. Global vs local explanation comparison

Works with ml/predictor.py (QualityPredictor) and ml/features.py (FeatureExtractor).

The module degrades gracefully when optional packages (shap, lime) are
not installed — it falls back to built-in feature importance.
"""

from __future__ import annotations

import logging
import warnings
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from core.models import Solution
from core.context import SchedulingContext
from ml.predictor import QualityPredictor
from ml.features import FeatureExtractor

logger = logging.getLogger(__name__)

# ── Optional dependency probes ──────────────────────────────────────
_HAS_SHAP = False
_HAS_LIME = False

try:
    import shap                 # type: ignore
    _HAS_SHAP = True
except ImportError:
    pass

try:
    from lime import lime_tabular   # type: ignore
    _HAS_LIME = True
except ImportError:
    pass


# ====================================================================
# Result dataclass
# ====================================================================

@dataclass
class ExplainabilityResult:
    """Aggregated explanation for one or more solutions."""

    # ── Global feature importance (always available) ────────────
    global_importance: List[Tuple[str, float]] = field(default_factory=list)
    feature_groups: Dict[str, float] = field(default_factory=dict)

    # ── SHAP results ────────────────────────────────────────────
    shap_available: bool = False
    shap_values: Optional[np.ndarray] = None        # (n_solutions, n_features)
    shap_base_value: float = 0.0
    shap_top_features: List[Tuple[str, float]] = field(default_factory=list)  # (name, mean |SHAP|)

    # ── LIME results (per-solution) ─────────────────────────────
    lime_available: bool = False
    lime_explanations: List[Dict[str, float]] = field(default_factory=list)   # per solution

    # ── Per-solution local explanations ─────────────────────────
    local_explanations: List[Dict[str, float]] = field(default_factory=list)

    # ── Meta ────────────────────────────────────────────────────
    n_solutions: int = 0
    n_features: int = 0
    method_used: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "n_solutions": self.n_solutions,
            "n_features": self.n_features,
            "method_used": self.method_used,
            "shap_available": self.shap_available,
            "lime_available": self.lime_available,
            "shap_base_value": round(self.shap_base_value, 4),
            "global_importance": [
                (n, round(v, 6)) for n, v in self.global_importance
            ],
            "feature_groups": {
                k: round(v, 4) for k, v in self.feature_groups.items()
            },
            "shap_top_features": [
                (n, round(v, 6)) for n, v in self.shap_top_features
            ],
        }
        if self.local_explanations:
            d["local_explanations_sample"] = [
                {k: round(v, 6) for k, v in exp.items()}
                for exp in self.local_explanations[:3]  # first 3
            ]
        return d


# ====================================================================
# Evaluator
# ====================================================================

class ExplainabilityEvaluator:
    """SHAP / LIME / native explainability for the scheduling ML predictor."""

    TOP_N = 20

    def __init__(self, context: SchedulingContext, predictor: Optional[QualityPredictor] = None):
        """
        Args:
            context: Scheduling context
            predictor: A *fitted* QualityPredictor.  If None, only native
                       importance can be provided.
        """
        self.context = context
        self.predictor = predictor
        self.feature_extractor = FeatureExtractor(context)

    # ----------------------------------------------------------------
    # Public API
    # ----------------------------------------------------------------

    def evaluate(
        self,
        solutions: List[Solution],
        *,
        run_shap: bool = True,
        run_lime: bool = True,
        lime_num_features: int = 15,
        lime_num_samples: int = 500,
    ) -> ExplainabilityResult:
        """Run all available explainability methods.

        Args:
            solutions: Solutions whose predictions will be explained.
            run_shap: Attempt SHAP if package available.
            run_lime: Attempt LIME if package available.
            lime_num_features: Features per LIME explanation.
            lime_num_samples: Perturbation samples for LIME.
        """
        r = ExplainabilityResult(n_solutions=len(solutions))

        if not solutions:
            return r

        # ── Feature matrix ──────────────────────────────────────
        X, names = self._build_feature_matrix(solutions)
        r.n_features = len(names)

        # ── 1. Native GBDT importance (always) ──────────────────
        r.global_importance = self._native_importance(names)
        r.feature_groups = self._group_importance(r.global_importance)
        r.method_used.append("native_gbdt_importance")

        # ── 2. SHAP ─────────────────────────────────────────────
        if run_shap and _HAS_SHAP and self._predictor_ready():
            try:
                self._run_shap(X, names, r)
                r.method_used.append("shap_tree_explainer")
            except Exception as e:
                logger.warning("SHAP explanation failed: %s", e)

        # ── 3. LIME ─────────────────────────────────────────────
        if run_lime and _HAS_LIME and self._predictor_ready():
            try:
                self._run_lime(X, names, r, lime_num_features, lime_num_samples)
                r.method_used.append("lime_tabular")
            except Exception as e:
                logger.warning("LIME explanation failed: %s", e)

        # ── 4. Local per-solution contribution (delta method) ───
        self._local_contributions(X, names, r)
        r.method_used.append("delta_contribution")

        return r

    # ----------------------------------------------------------------
    # Internal helpers
    # ----------------------------------------------------------------

    def _predictor_ready(self) -> bool:
        return self.predictor is not None and self.predictor.is_fitted

    def _build_feature_matrix(
        self, solutions: List[Solution]
    ) -> Tuple[np.ndarray, List[str]]:
        rows = []
        for sol in solutions:
            fv = self.feature_extractor.extract(sol)
            rows.append(fv.features)
        X = np.array(rows)
        names = self.feature_extractor.feature_names
        return X, names

    # ── Native importance ───────────────────────────────────────

    def _native_importance(self, names: List[str]) -> List[Tuple[str, float]]:
        if not self._predictor_ready():
            return []
        return self.predictor.get_feature_importance(top_n=self.TOP_N)  # type: ignore[union-attr]

    def _group_importance(
        self, importances: List[Tuple[str, float]]
    ) -> Dict[str, float]:
        """Aggregate feature importance by feature group prefix."""
        groups: Dict[str, float] = defaultdict(float)
        for name, val in importances:
            prefix = name.split("_")[0] if "_" in name else name
            groups[prefix] += val
        # Normalise
        total = sum(groups.values()) or 1.0
        return {k: v / total for k, v in sorted(groups.items(), key=lambda x: -x[1])}

    # ── SHAP ────────────────────────────────────────────────────

    def _run_shap(
        self, X: np.ndarray, names: List[str], r: ExplainabilityResult
    ):
        assert self.predictor is not None
        X_scaled = self.predictor.scaler.transform(X)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            explainer = shap.TreeExplainer(self.predictor.model)
            sv = explainer.shap_values(X_scaled)

        r.shap_available = True
        r.shap_values = sv
        r.shap_base_value = float(explainer.expected_value)

        # Mean |SHAP| per feature → top features
        mean_abs = np.mean(np.abs(sv), axis=0)
        order = np.argsort(mean_abs)[::-1]
        r.shap_top_features = [
            (names[i], float(mean_abs[i])) for i in order[: self.TOP_N]
        ]

    # ── LIME ────────────────────────────────────────────────────

    def _run_lime(
        self,
        X: np.ndarray,
        names: List[str],
        r: ExplainabilityResult,
        num_features: int,
        num_samples: int,
    ):
        assert self.predictor is not None
        X_scaled = self.predictor.scaler.transform(X)

        explainer = lime_tabular.LimeTabularExplainer(
            training_data=X_scaled,
            feature_names=names,
            mode="regression",
            verbose=False,
        )

        r.lime_available = True
        r.lime_explanations = []

        # Explain up to 10 solutions to keep runtime reasonable
        for row in X_scaled[: min(10, len(X_scaled))]:
            exp = explainer.explain_instance(
                row,
                self.predictor.model.predict,
                num_features=num_features,
                num_samples=num_samples,
            )
            contrib = {name: weight for name, weight in exp.as_list()}
            r.lime_explanations.append(contrib)

    # ── Delta contributions ─────────────────────────────────────

    def _local_contributions(
        self, X: np.ndarray, names: List[str], r: ExplainabilityResult
    ):
        """Approximate per-feature contribution via baseline delta.

        For each solution, compare prediction vs. prediction-with-feature-set-to-mean.
        Works without SHAP / LIME.
        """
        if not self._predictor_ready():
            return

        assert self.predictor is not None
        X_scaled = self.predictor.scaler.transform(X)
        baseline = np.mean(X_scaled, axis=0)

        r.local_explanations = []
        for row in X_scaled:
            contribs: Dict[str, float] = {}
            pred_full = float(self.predictor.model.predict(row.reshape(1, -1))[0])

            for j in range(len(names)):
                modified = row.copy()
                modified[j] = baseline[j]
                pred_mod = float(self.predictor.model.predict(modified.reshape(1, -1))[0])
                contribs[names[j]] = pred_full - pred_mod  # positive = feature pushed score up

            r.local_explanations.append(contribs)
