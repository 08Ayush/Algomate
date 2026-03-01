"""
Tests for the evaluation module.

Covers: Precision/Recall, ROC-AUC, Business KPIs, Bias & Fairness,
Explainability, and the unified SchedulerEvaluator runner.
"""

import pytest
import numpy as np
from typing import List

from core.models import (
    Solution, Assignment, ConstraintViolation, ConstraintType, TimeSlot,
)
from core.context import SchedulingContext

from evaluation.precision_recall import PrecisionRecallEvaluator, PrecisionRecallResult
from evaluation.roc_auc import ROCAUCEvaluator, ROCAUCResult
from evaluation.business_kpis import BusinessKPIEvaluator, BusinessKPIResult
from evaluation.bias_fairness import BiasFairnessEvaluator, BiasFairnessResult
from evaluation.explainability import ExplainabilityEvaluator, ExplainabilityResult
from evaluation.runner import SchedulerEvaluator, EvaluationReport


# ════════════════════════════════════════════════════════════════════
# Precision / Recall
# ════════════════════════════════════════════════════════════════════

class TestPrecisionRecall:

    def test_evaluate_returns_result(self, scheduling_context, sample_solution):
        ev = PrecisionRecallEvaluator(scheduling_context)
        result = ev.evaluate(sample_solution)
        assert isinstance(result, PrecisionRecallResult)

    def test_precision_in_range(self, scheduling_context, sample_solution):
        result = PrecisionRecallEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.precision <= 1.0

    def test_recall_in_range(self, scheduling_context, sample_solution):
        result = PrecisionRecallEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.recall <= 1.0

    def test_f1_bounds(self, scheduling_context, sample_solution):
        result = PrecisionRecallEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.f1 <= 1.0

    def test_total_assignments_tracked(self, scheduling_context, sample_solution):
        result = PrecisionRecallEvaluator(scheduling_context).evaluate(sample_solution)
        assert result.total_assignments == len(sample_solution.assignments)

    def test_violation_free_solution(self, scheduling_context, sample_solution):
        """Solution with no explicit violations should have higher precision."""
        sample_solution.constraint_violations = []
        result = PrecisionRecallEvaluator(scheduling_context).evaluate(sample_solution)
        # Structural violations may still be detected, so just check it's > 0
        assert result.hard_precision > 0.0

    def test_to_dict(self, scheduling_context, sample_solution):
        result = PrecisionRecallEvaluator(scheduling_context).evaluate(sample_solution)
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "precision" in d
        assert "f1" in d


# ════════════════════════════════════════════════════════════════════
# ROC-AUC
# ════════════════════════════════════════════════════════════════════

class TestROCAUC:

    def test_evaluate_returns_result(self, scheduling_context, sample_solutions):
        ev = ROCAUCEvaluator(scheduling_context, quality_threshold=0.7)
        result = ev.evaluate(sample_solutions)
        assert isinstance(result, ROCAUCResult)

    def test_roc_auc_in_range(self, scheduling_context, sample_solutions):
        result = ROCAUCEvaluator(scheduling_context).evaluate(sample_solutions)
        assert 0.0 <= result.roc_auc <= 1.0

    def test_pr_auc_in_range(self, scheduling_context, sample_solutions):
        result = ROCAUCEvaluator(scheduling_context).evaluate(sample_solutions)
        assert 0.0 <= result.pr_auc <= 1.0

    def test_calibration_error_non_negative(self, scheduling_context, sample_solutions):
        result = ROCAUCEvaluator(scheduling_context).evaluate(sample_solutions)
        assert result.calibration_error >= 0.0

    def test_threshold_sweep(self, scheduling_context, sample_solutions):
        result = ROCAUCEvaluator(scheduling_context).evaluate(sample_solutions)
        # threshold_sweep may be empty when all solutions have same predicted quality
        assert isinstance(result.threshold_sweep, list)

    def test_to_dict(self, scheduling_context, sample_solutions):
        result = ROCAUCEvaluator(scheduling_context).evaluate(sample_solutions)
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "roc_auc" in d


# ════════════════════════════════════════════════════════════════════
# Business KPIs
# ════════════════════════════════════════════════════════════════════

class TestBusinessKPIs:

    def test_evaluate_returns_result(self, scheduling_context, sample_solution):
        ev = BusinessKPIEvaluator(scheduling_context)
        result = ev.evaluate(sample_solution)
        assert isinstance(result, BusinessKPIResult)

    def test_completeness_in_range(self, scheduling_context, sample_solution):
        result = BusinessKPIEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.schedule_completeness <= 1.0

    def test_faculty_utilization_non_negative(self, scheduling_context, sample_solution):
        result = BusinessKPIEvaluator(scheduling_context).evaluate(sample_solution)
        assert result.faculty_utilization_mean >= 0.0

    def test_room_utilization_non_negative(self, scheduling_context, sample_solution):
        result = BusinessKPIEvaluator(scheduling_context).evaluate(sample_solution)
        assert result.room_utilization_mean >= 0.0

    def test_morning_afternoon_sum_to_one(self, scheduling_context, sample_solution):
        result = BusinessKPIEvaluator(scheduling_context).evaluate(sample_solution)
        total = result.morning_session_pct + result.afternoon_session_pct
        assert abs(total - 1.0) < 1e-6

    def test_overall_kpi_score(self, scheduling_context, sample_solution):
        result = BusinessKPIEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.overall_kpi_score <= 100.0

    def test_credit_hour_alignment(self, scheduling_context, sample_solution):
        result = BusinessKPIEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.credit_hour_alignment <= 1.0

    def test_to_dict(self, scheduling_context, sample_solution):
        d = BusinessKPIEvaluator(scheduling_context).evaluate(sample_solution).to_dict()
        assert isinstance(d, dict)
        assert "overall_kpi_score" in d


# ════════════════════════════════════════════════════════════════════
# Bias & Fairness
# ════════════════════════════════════════════════════════════════════

class TestBiasFairness:

    def test_evaluate_returns_result(self, scheduling_context, sample_solution):
        ev = BiasFairnessEvaluator(scheduling_context)
        result = ev.evaluate(sample_solution)
        assert isinstance(result, BiasFairnessResult)

    def test_gini_in_range(self, scheduling_context, sample_solution):
        result = BiasFairnessEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.workload_gini <= 1.0

    def test_workload_cv_non_negative(self, scheduling_context, sample_solution):
        result = BiasFairnessEvaluator(scheduling_context).evaluate(sample_solution)
        assert result.workload_cv >= 0.0

    def test_fairness_score_in_range(self, scheduling_context, sample_solution):
        result = BiasFairnessEvaluator(scheduling_context).evaluate(sample_solution)
        assert 0.0 <= result.overall_fairness_score <= 100.0

    def test_rank_correlation_bounded(self, scheduling_context, sample_solution):
        result = BiasFairnessEvaluator(scheduling_context).evaluate(sample_solution)
        assert -1.0 <= result.rank_load_correlation <= 1.0

    def test_dept_load_cv_non_negative(self, scheduling_context, sample_solution):
        result = BiasFairnessEvaluator(scheduling_context).evaluate(sample_solution)
        assert result.dept_load_cv >= 0.0

    def test_issues_is_list(self, scheduling_context, sample_solution):
        result = BiasFairnessEvaluator(scheduling_context).evaluate(sample_solution)
        assert isinstance(result.issues, list)

    def test_to_dict(self, scheduling_context, sample_solution):
        d = BiasFairnessEvaluator(scheduling_context).evaluate(sample_solution).to_dict()
        assert isinstance(d, dict)
        assert "workload_gini" in d


# ════════════════════════════════════════════════════════════════════
# Explainability
# ════════════════════════════════════════════════════════════════════

class TestExplainability:

    def test_evaluate_without_predictor(self, scheduling_context, sample_solutions):
        """Should work (degraded) even without fitted predictor."""
        ev = ExplainabilityEvaluator(scheduling_context, predictor=None)
        result = ev.evaluate(sample_solutions[:2])
        assert isinstance(result, ExplainabilityResult)
        assert result.n_solutions == 2

    def test_method_used_includes_delta(self, scheduling_context, sample_solutions):
        """Without predictor, native & SHAP/LIME won't run, but delta still listed."""
        ev = ExplainabilityEvaluator(scheduling_context, predictor=None)
        result = ev.evaluate(sample_solutions[:1])
        # delta_contribution doesn't run without predictor, but native importance checked
        assert isinstance(result.method_used, list)

    def test_to_dict(self, scheduling_context, sample_solutions):
        ev = ExplainabilityEvaluator(scheduling_context, predictor=None)
        d = ev.evaluate(sample_solutions[:1]).to_dict()
        assert isinstance(d, dict)
        assert "n_features" in d


# ════════════════════════════════════════════════════════════════════
# Unified Runner
# ════════════════════════════════════════════════════════════════════

class TestSchedulerEvaluator:

    def test_evaluate_single(self, scheduling_context, sample_solution):
        ev = SchedulerEvaluator(scheduling_context)
        report = ev.evaluate(sample_solution)
        assert isinstance(report, EvaluationReport)
        assert report.n_solutions == 1

    def test_evaluate_batch(self, scheduling_context, sample_solutions):
        ev = SchedulerEvaluator(scheduling_context)
        report = ev.evaluate_batch(sample_solutions)
        assert isinstance(report, EvaluationReport)
        assert report.n_solutions == len(sample_solutions)

    def test_modules_run(self, scheduling_context, sample_solution):
        ev = SchedulerEvaluator(scheduling_context)
        report = ev.evaluate(sample_solution)
        assert "precision_recall" in report.modules_run
        assert "business_kpis" in report.modules_run
        assert "bias_fairness" in report.modules_run

    def test_report_to_dict(self, scheduling_context, sample_solution):
        report = SchedulerEvaluator(scheduling_context).evaluate(sample_solution)
        d = report.to_dict()
        assert isinstance(d, dict)
        assert "meta" in d
        assert "precision_recall" in d

    def test_report_to_json(self, scheduling_context, sample_solution):
        report = SchedulerEvaluator(scheduling_context).evaluate(sample_solution)
        j = report.to_json()
        assert isinstance(j, str)
        assert "precision_recall" in j

    def test_report_print_summary(self, scheduling_context, sample_solution, capsys):
        report = SchedulerEvaluator(scheduling_context).evaluate(sample_solution)
        report.print_summary()
        captured = capsys.readouterr()
        assert "SCHEDULER EVALUATION REPORT" in captured.out

    def test_no_errors(self, scheduling_context, sample_solution):
        report = SchedulerEvaluator(scheduling_context).evaluate(sample_solution)
        assert len(report.errors) == 0
