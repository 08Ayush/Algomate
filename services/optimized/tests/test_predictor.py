"""Tests for ML quality predictor."""

import pytest
import numpy as np
from pathlib import Path

from ml.predictor import QualityPredictor
from core.models import Solution


class TestQualityPredictor:
    """Test ML quality predictor."""
    
    def test_initialization(self, scheduling_context):
        """Test predictor initialization."""
        predictor = QualityPredictor(scheduling_context)
        
        assert predictor.context == scheduling_context
        assert predictor.feature_extractor is not None
        assert predictor.is_fitted is False
    
    def test_fit_with_solutions(self, scheduling_context, sample_solutions):
        """Test fitting predictor."""
        predictor = QualityPredictor(scheduling_context)
        
        # Create varying quality scores
        quality_scores = [s.quality_score for s in sample_solutions]
        
        predictor.fit(sample_solutions, quality_scores)
        
        assert predictor.is_fitted is True
    
    def test_predict_before_fit_raises(self, scheduling_context, sample_solution):
        """Test prediction before fitting raises error."""
        predictor = QualityPredictor(scheduling_context)
        
        with pytest.raises(RuntimeError, match="not fitted"):
            predictor.predict(sample_solution)
    
    def test_predict_after_fit(self, scheduling_context, sample_solutions):
        """Test prediction after fitting."""
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions)
        
        # Predict on first solution
        predicted, confidence = predictor.predict(sample_solutions[0])
        
        assert isinstance(predicted, float)
        assert isinstance(confidence, float)
        assert 0 <= confidence <= 1
    
    def test_predict_batch(self, scheduling_context, sample_solutions):
        """Test batch prediction."""
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions[:3])
        
        # Predict on remaining solutions
        results = predictor.predict_batch(sample_solutions[3:])
        
        assert len(results) == len(sample_solutions[3:])
        for predicted, confidence in results:
            assert isinstance(predicted, float)
            assert isinstance(confidence, float)
    
    def test_evaluate(self, scheduling_context, sample_solutions):
        """Test model evaluation."""
        predictor = QualityPredictor(scheduling_context)
        
        # Split data
        train = sample_solutions[:4]
        test = sample_solutions[4:]
        
        predictor.fit(train)
        metrics = predictor.evaluate(test)
        
        assert 'r2_score' in metrics
        assert 'mae' in metrics
        assert 'mse' in metrics
        assert 'rmse' in metrics
        assert 'correlation' in metrics
        assert metrics['n_samples'] == len(test)
    
    def test_feature_importance(self, scheduling_context, sample_solutions):
        """Test feature importance extraction."""
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions)
        
        importance = predictor.get_feature_importance(top_n=10)
        
        assert len(importance) == 10
        assert all(isinstance(name, str) and isinstance(score, (float, np.floating)) 
                   for name, score in importance)
        
        # Check sorted descending
        scores = [score for _, score in importance]
        assert scores == sorted(scores, reverse=True)
    
    def test_save_and_load(self, scheduling_context, sample_solutions, tmp_path):
        """Test model persistence."""
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions)
        
        # Save model
        model_path = tmp_path / "model.pkl"
        predictor.save(str(model_path))
        
        assert model_path.exists()
        
        # Load model
        new_predictor = QualityPredictor(scheduling_context)
        new_predictor.load(str(model_path))
        
        assert new_predictor.is_fitted is True
        
        # Predictions should match
        pred1, conf1 = predictor.predict(sample_solutions[0])
        pred2, conf2 = new_predictor.predict(sample_solutions[0])
        
        assert abs(pred1 - pred2) < 1e-6
    
    def test_save_before_fit_raises(self, scheduling_context, tmp_path):
        """Test saving unfitted model raises error."""
        predictor = QualityPredictor(scheduling_context)
        
        with pytest.raises(RuntimeError, match="Cannot save unfitted model"):
            predictor.save(str(tmp_path / "model.pkl"))
    
    def test_fit_with_empty_solutions_raises(self, scheduling_context):
        """Test fitting with empty list raises error."""
        predictor = QualityPredictor(scheduling_context)
        
        with pytest.raises(ValueError, match="Cannot train on empty"):
            predictor.fit([])
    
    def test_predict_confidence_range(self, scheduling_context, sample_solutions):
        """Test that confidence is in valid range."""
        predictor = QualityPredictor(scheduling_context)
        predictor.fit(sample_solutions[:4])
        
        for solution in sample_solutions[4:]:
            _, confidence = predictor.predict(solution)
            assert 0.0 <= confidence <= 1.0
