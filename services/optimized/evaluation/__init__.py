"""
Industry-Standard Evaluation Module for Optimized Scheduler.

Provides:
  1. Precision / Recall — constraint satisfaction & assignment coverage
  2. ROC-AUC — ML predictor classification performance
  3. Business KPIs — schedule quality, utilization, NEP compliance
  4. Bias & Fairness — faculty equity, departmental balance, seniority bias
  5. Explainability — SHAP values, LIME explanations, feature contributions

Usage::

    from evaluation import SchedulerEvaluator

    evaluator = SchedulerEvaluator(context)
    report = evaluator.evaluate(solution)
    report.print_summary()
"""

from .precision_recall import PrecisionRecallEvaluator
from .roc_auc import ROCAUCEvaluator
from .business_kpis import BusinessKPIEvaluator
from .bias_fairness import BiasFairnessEvaluator
from .explainability import ExplainabilityEvaluator
from .runner import SchedulerEvaluator, EvaluationReport

__all__ = [
    "SchedulerEvaluator",
    "EvaluationReport",
    "PrecisionRecallEvaluator",
    "ROCAUCEvaluator",
    "BusinessKPIEvaluator",
    "BiasFairnessEvaluator",
    "ExplainabilityEvaluator",
]
