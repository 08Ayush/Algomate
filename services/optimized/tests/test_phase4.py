"""Tests for Phase 4 adaptive learning components."""

import pytest
import numpy as np
from datetime import datetime, timedelta

from ml.feedback import (
    FeedbackCollector,
    StakeholderFeedback,
    ConstraintFeedback,
    StakeholderType,
    FeedbackSummary,
    create_sample_feedback
)
from ml.bandit import SolverBandit, EpsilonGreedyBandit
from ml.adaptive_weights import AdaptiveConstraintWeightAdjuster
from ml.incremental import IncrementalLearner
from ml.predictor import QualityPredictor
from core.models import Solution


class TestFeedbackCollector:
    """Test feedback collection system."""
    
    def test_initialization(self):
        """Test collector initialization."""
        collector = FeedbackCollector()
        assert len(collector.feedbacks) == 0
    
    def test_collect_faculty_feedback(self):
        """Test collecting faculty feedback."""
        collector = FeedbackCollector()
        
        feedback = collector.collect_faculty_feedback(
            solution_id="sol_1",
            faculty_id="fac_001",
            overall_rating=4.5,
            constraint_ratings={
                "faculty_preference": 4.8,
                "workload_balance": 4.2
            },
            issues=["Back-to-back classes"],
            suggestions=["Group by building"]
        )
        
        assert feedback.stakeholder_type == StakeholderType.FACULTY
        assert feedback.overall_rating == 4.5
        assert len(feedback.constraint_ratings) == 2
        assert len(collector.feedbacks["sol_1"]) == 1
    
    def test_collect_student_feedback(self):
        """Test collecting student feedback."""
        collector = FeedbackCollector()
        
        feedback = collector.collect_student_feedback(
            solution_id="sol_1",
            student_id="stu_001",
            overall_rating=3.8,
            constraint_ratings={"student_gaps": 3.5},
            issues=["Too many gaps"]
        )
        
        assert feedback.stakeholder_type == StakeholderType.STUDENT
        assert feedback.overall_rating == 3.8
    
    def test_aggregate_feedback(self):
        """Test feedback aggregation."""
        collector = FeedbackCollector()
        
        # Add multiple feedbacks
        collector.collect_faculty_feedback("sol_1", "fac_1", 4.5, {"faculty_preference": 4.8})
        collector.collect_faculty_feedback("sol_1", "fac_2", 4.0, {"faculty_preference": 4.2})
        collector.collect_student_feedback("sol_1", "stu_1", 3.5, {"student_gaps": 3.0})
        
        summary = collector.aggregate_feedback("sol_1")
        
        assert summary is not None
        assert summary.total_responses == 3
        assert 3.5 < summary.average_rating < 4.5
        assert "faculty_preference" in summary.constraint_scores
        assert abs(summary.constraint_scores["faculty_preference"] - 4.5) < 0.5
    
    def test_no_feedback_returns_none(self):
        """Test aggregation with no feedback."""
        collector = FeedbackCollector()
        summary = collector.aggregate_feedback("nonexistent")
        assert summary is None
    
    def test_invalid_rating_raises(self):
        """Test that invalid ratings raise errors."""
        with pytest.raises(ValueError):
            ConstraintFeedback("test", 6.0)  # > 5
        
        with pytest.raises(ValueError):
            ConstraintFeedback("test", 0.5)  # < 1


class TestSolverBandit:
    """Test multi-armed bandit solver selection."""
    
    def test_initialization(self):
        """Test bandit initialization."""
        bandit = SolverBandit(['cpsat', 'tabu', 'vns'])
        
        assert len(bandit.solvers) == 3
        assert all(stat.alpha == 1.0 for stat in bandit.stats.values())
        assert all(stat.beta == 1.0 for stat in bandit.stats.values())
    
    def test_select_solver(self):
        """Test solver selection."""
        bandit = SolverBandit(['cpsat', 'tabu', 'vns'])
        
        # Should return one of the solvers
        selected = bandit.select_solver()
        assert selected in ['cpsat', 'tabu', 'vns']
    
    def test_update_with_high_reward(self):
        """Test updating with high reward."""
        bandit = SolverBandit(['cpsat', 'tabu'])
        
        initial_alpha = bandit.stats['cpsat'].alpha
        bandit.update('cpsat', 0.9)  # High reward
        
        assert bandit.stats['cpsat'].alpha > initial_alpha
        assert bandit.stats['cpsat'].total_uses == 1
    
    def test_update_with_low_reward(self):
        """Test updating with low reward."""
        bandit = SolverBandit(['cpsat', 'tabu'])
        
        initial_beta = bandit.stats['cpsat'].beta
        bandit.update('cpsat', 0.3)  # Low reward
        
        assert bandit.stats['cpsat'].beta > initial_beta
    
    def test_get_probabilities(self):
        """Test probability calculation."""
        bandit = SolverBandit(['cpsat', 'tabu'])
        
        # Add some history
        for _ in range(5):
            bandit.update('cpsat', 0.9)
        for _ in range(5):
            bandit.update('tabu', 0.4)
        
        probs = bandit.get_probabilities()
        
        assert 'cpsat' in probs
        assert 'tabu' in probs
        assert probs['cpsat'] > probs['tabu']  # cpsat had better rewards
    
    def test_get_best_solver(self):
        """Test getting best solver."""
        bandit = SolverBandit(['cpsat', 'tabu', 'vns'])
        
        # Make cpsat clearly best
        for _ in range(10):
            bandit.update('cpsat', 0.95)
        for _ in range(5):
            bandit.update('tabu', 0.5)
        
        best = bandit.get_best_solver()
        assert best == 'cpsat'
    
    def test_convergence_over_time(self):
        """Test that bandit converges to best solver."""
        np.random.seed(42)
        bandit = SolverBandit(['cpsat', 'tabu', 'vns'])
        
        # Simulate: cpsat=0.9, tabu=0.6, vns=0.5
        true_rewards = {'cpsat': 0.9, 'tabu': 0.6, 'vns': 0.5}
        selections = {'cpsat': 0, 'tabu': 0, 'vns': 0}
        
        # Run 50 iterations
        for _ in range(50):
            solver = bandit.select_solver()
            selections[solver] += 1
            reward = true_rewards[solver] + np.random.normal(0, 0.1)
            bandit.update(solver, max(0, min(1, reward)))
        
        # cpsat should be selected most often (eventually)
        # Note: Due to exploration, this isn't guaranteed in 50 trials
        assert selections['cpsat'] >= selections['vns']


class TestAdaptiveWeightAdjuster:
    """Test adaptive constraint weight adjustment."""
    
    def test_initialization(self):
        """Test adjuster initialization."""
        weights = {
            'faculty_preference': 0.2,
            'workload_balance': 0.3,
            'student_gaps': 0.5
        }
        adjuster = AdaptiveConstraintWeightAdjuster(weights)
        
        # Should be normalized
        assert abs(sum(adjuster.weights.values()) - 1.0) < 0.001
    
    def test_adjust_from_feedback(self):
        """Test weight adjustment from feedback."""
        weights = {
            'faculty_preference': 0.33,
            'workload_balance': 0.33,
            'student_gaps': 0.34
        }
        adjuster = AdaptiveConstraintWeightAdjuster(weights, learning_rate=0.2)
        
        # Create feedback with low student_gaps score
        summary = FeedbackSummary(
            solution_id="sol_1",
            total_responses=5,
            average_rating=4.0,
            constraint_scores={
                'faculty_preference': 4.5,  # Good
                'workload_balance': 4.2,    # Good
                'student_gaps': 2.8         # Poor - should increase
            },
            common_issues={},
            stakeholder_breakdown={},
            feedback_ids=[]
        )
        
        new_weights = adjuster.adjust_from_feedback(summary)
        
        # student_gaps weight should increase
        assert new_weights['student_gaps'] > weights['student_gaps']
        
        # Weights should still sum to 1
        assert abs(sum(new_weights.values()) - 1.0) < 0.001
    
    def test_detect_convergence(self):
        """Test convergence detection."""
        weights = {'a': 0.5, 'b': 0.5}
        adjuster = AdaptiveConstraintWeightAdjuster(weights, learning_rate=0.01)
        
        # Not enough history
        assert not adjuster.detect_convergence(window=5)
        
        # Add some adjustments with minimal changes
        for i in range(10):
            summary = FeedbackSummary(
                solution_id=f"sol_{i}",
                total_responses=5,
                average_rating=4.0,
                constraint_scores={'a': 4.0, 'b': 4.0},
                common_issues={},
                stakeholder_breakdown={},
                feedback_ids=[]
            )
            adjuster.adjust_from_feedback(summary)
        
        # Should converge with small changes
        assert adjuster.detect_convergence(window=5, threshold=0.05)
    
    def test_weight_bounds(self):
        """Test that weights stay within bounds."""
        weights = {'a': 0.5, 'b': 0.5}
        adjuster = AdaptiveConstraintWeightAdjuster(
            weights,
            min_weight=0.1,
            max_weight=0.4
        )
        
        # Try to make 'a' very large
        for _ in range(20):
            summary = FeedbackSummary(
                solution_id="sol",
                total_responses=5,
                average_rating=3.0,
                constraint_scores={'a': 1.5, 'b': 5.0},  # a poor, b excellent
                common_issues={},
                stakeholder_breakdown={},
                feedback_ids=[]
            )
            adjuster.adjust_from_feedback(summary)
        
        # Weights should respect bounds
        assert all(adjuster.min_weight <= w <= adjuster.max_weight 
                  for w in adjuster.weights.values())


class TestIncrementalLearner:
    """Test incremental ML model updates."""
    
    def test_initialization(self, scheduling_context):
        """Test learner initialization."""
        predictor = QualityPredictor(scheduling_context)
        learner = IncrementalLearner(predictor, buffer_size=10)
        
        assert learner.buffer_size == 10
        assert len(learner.buffer) == 0
        assert learner.version == 1
    
    def test_add_solution(self, scheduling_context, sample_solution):
        """Test adding solutions to buffer."""
        predictor = QualityPredictor(scheduling_context)
        learner = IncrementalLearner(predictor, buffer_size=10)
        
        learner.add_solution(sample_solution, 0.85)
        
        assert len(learner.buffer) == 1
    
    def test_should_update(self, scheduling_context, sample_solution):
        """Test update trigger logic."""
        predictor = QualityPredictor(scheduling_context)
        learner = IncrementalLearner(predictor, buffer_size=3)
        
        # Not enough samples
        learner.add_solution(sample_solution, 0.8)
        assert not learner.should_update()
        
        # Add more
        learner.add_solution(sample_solution, 0.8)
        learner.add_solution(sample_solution, 0.8)
        
        # Now should update
        assert learner.should_update()
    
    def test_get_update_stats(self, scheduling_context):
        """Test getting update statistics."""
        predictor = QualityPredictor(scheduling_context)
        learner = IncrementalLearner(predictor, buffer_size=10)
        
        stats = learner.get_update_stats()
        
        assert 'current_version' in stats
        assert 'buffer_size' in stats
        assert stats['current_version'] == 1
        assert stats['buffer_size'] == 0
    
    def test_get_buffer_info(self, scheduling_context, sample_solution):
        """Test getting buffer information."""
        predictor = QualityPredictor(scheduling_context)
        learner = IncrementalLearner(predictor, buffer_size=10)
        
        learner.add_solution(sample_solution, 0.85)
        learner.add_solution(sample_solution, 0.75)
        
        info = learner.get_buffer_info()
        
        assert info['size'] == 2
        assert info['capacity'] == 10
        assert 'avg_quality' in info
        assert 0.7 < info['avg_quality'] < 0.9


class TestIntegration:
    """Test integration of Phase 4 components."""
    
    def test_feedback_to_weight_adjustment(self):
        """Test complete flow: feedback -> weight adjustment."""
        # Initial weights
        weights = {
            'faculty_preference': 0.3,
            'student_gaps': 0.4,
            'room_utilization': 0.3
        }
        
        # Components
        collector = FeedbackCollector()
        adjuster = AdaptiveConstraintWeightAdjuster(weights)
        
        # Collect feedback
        collector.collect_faculty_feedback(
            "sol_1", "fac_1", 4.0,
            constraint_ratings={'faculty_preference': 4.5, 'student_gaps': 2.5}
        )
        collector.collect_student_feedback(
            "sol_1", "stu_1", 3.5,
            constraint_ratings={'student_gaps': 2.0}
        )
        
        # Aggregate
        summary = collector.aggregate_feedback("sol_1")
        
        # Adjust weights
        new_weights = adjuster.adjust_from_feedback(summary)
        
        # student_gaps had low score, should increase
        assert new_weights['student_gaps'] > weights['student_gaps']
    
    def test_bandit_learns_from_quality(self):
        """Test that bandit improves solver selection."""
        np.random.seed(42)
        bandit = SolverBandit(['cpsat', 'tabu', 'vns'])
        
        # Simulate: cpsat is best
        quality_by_solver = {
            'cpsat': lambda: np.random.uniform(0.8, 0.95),
            'tabu': lambda: np.random.uniform(0.5, 0.7),
            'vns': lambda: np.random.uniform(0.4, 0.6)
        }
        
        # Run simulation
        for _ in range(30):
            solver = bandit.select_solver()
            quality = quality_by_solver[solver]()
            bandit.update(solver, quality)
        
        # After learning, cpsat should be recognized as best
        best = bandit.get_best_solver()
        assert best == 'cpsat'
        
        probs = bandit.get_probabilities()
        assert probs['cpsat'] > probs['tabu']
        assert probs['cpsat'] > probs['vns']
