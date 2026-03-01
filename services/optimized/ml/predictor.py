"""ML-based quality predictor for scheduling solutions."""

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from typing import List, Optional, Tuple, Dict
import pickle
import logging
from pathlib import Path

from ml.features import FeatureExtractor, FeatureVector
from core.models import Solution
from core.context import SchedulingContext


class QualityPredictor:
    """Predicts solution quality using Gradient Boosting."""
    
    def __init__(self, context: SchedulingContext, model_path: Optional[str] = None):
        """Initialize quality predictor.
        
        Args:
            context: Scheduling context
            model_path: Path to saved model (optional)
        """
        self.context = context
        self.feature_extractor = FeatureExtractor(context)
        self.scaler = StandardScaler()
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            min_samples_split=10,
            min_samples_leaf=4,
            subsample=0.8,
            random_state=42
        )
        self.is_fitted = False
        self.logger = logging.getLogger(__name__)
        
        # Load model if path provided
        if model_path and Path(model_path).exists():
            self.load(model_path)
    
    def fit(self, solutions: List[Solution], quality_scores: Optional[List[float]] = None):
        """Train the predictor on historical solutions.
        
        Args:
            solutions: List of solutions to train on
            quality_scores: Optional explicit quality scores (uses solution.quality_score if None)
        """
        if not solutions:
            raise ValueError("Cannot train on empty solution list")
        
        # Extract features
        features = []
        targets = []
        
        for i, solution in enumerate(solutions):
            try:
                feature_vec = self.feature_extractor.extract(solution)
                features.append(feature_vec.features)
                
                # Use provided scores or solution scores
                if quality_scores:
                    targets.append(quality_scores[i])
                else:
                    targets.append(solution.quality_score)
                    
            except Exception as e:
                self.logger.warning(f"Failed to extract features from solution {solution.id}: {e}")
                continue
        
        if not features:
            raise ValueError("No valid features extracted")
        
        X = np.array(features)
        y = np.array(targets)
        
        # Normalize features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.logger.info(f"Training quality predictor on {len(X)} samples...")
        self.model.fit(X_scaled, y)
        self.is_fitted = True
        
        # Log training metrics
        train_score = self.model.score(X_scaled, y)
        self.logger.info(f"Training R² score: {train_score:.4f}")
        
        # Feature importance
        importances = self.model.feature_importances_
        top_features = np.argsort(importances)[-10:]
        
        self.logger.info("Top 10 important features:")
        for idx in reversed(top_features):
            self.logger.info(
                f"  {self.feature_extractor.feature_names[idx]}: "
                f"{importances[idx]:.4f}"
            )
    
    def predict(self, solution: Solution) -> Tuple[float, float]:
        """Predict quality score for a solution.
        
        Args:
            solution: Solution to predict quality for
            
        Returns:
            Tuple of (predicted_score, confidence)
        """
        if not self.is_fitted:
            raise RuntimeError("Predictor not fitted. Call fit() first.")
        
        # Extract features
        feature_vec = self.feature_extractor.extract(solution)
        X = feature_vec.features.reshape(1, -1)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Predict
        predicted = self.model.predict(X_scaled)[0]
        
        # Estimate confidence using prediction variance
        # (for gradient boosting, we approximate confidence)
        confidence = self._estimate_confidence(X_scaled)
        
        return float(predicted), float(confidence)
    
    def predict_batch(self, solutions: List[Solution]) -> List[Tuple[float, float]]:
        """Predict quality scores for multiple solutions.
        
        Args:
            solutions: List of solutions
            
        Returns:
            List of (predicted_score, confidence) tuples
        """
        if not self.is_fitted:
            raise RuntimeError("Predictor not fitted. Call fit() first.")
        
        # Extract features for all solutions
        features = []
        for solution in solutions:
            try:
                feature_vec = self.feature_extractor.extract(solution)
                features.append(feature_vec.features)
            except Exception as e:
                self.logger.warning(f"Failed to extract features: {e}")
                features.append(None)
        
        # Predict for valid features
        results = []
        valid_indices = [i for i, f in enumerate(features) if f is not None]
        
        if valid_indices:
            X = np.array([features[i] for i in valid_indices])
            X_scaled = self.scaler.transform(X)
            predictions = self.model.predict(X_scaled)
            
            # Estimate confidences
            confidences = [self._estimate_confidence(x.reshape(1, -1)) for x in X_scaled]
            
            pred_idx = 0
            for i in range(len(solutions)):
                if i in valid_indices:
                    results.append((float(predictions[pred_idx]), float(confidences[pred_idx])))
                    pred_idx += 1
                else:
                    results.append((0.0, 0.0))
        else:
            results = [(0.0, 0.0)] * len(solutions)
        
        return results
    
    def _estimate_confidence(self, X_scaled: np.ndarray) -> float:
        """Estimate prediction confidence.
        
        For Gradient Boosting, we use the prediction from individual trees
        to estimate variance as a proxy for confidence.
        
        Args:
            X_scaled: Scaled feature vector
            
        Returns:
            Confidence score (0-1)
        """
        try:
            # Get predictions from all estimators
            predictions = np.array([
                tree.predict(X_scaled)[0] 
                for tree in self.model.estimators_[:, 0]
            ])
            
            # Calculate standard deviation
            std = np.std(predictions)
            
            # Convert to confidence (lower std = higher confidence)
            # Normalize to 0-1 range
            confidence = 1.0 / (1.0 + std)
            
            return min(max(confidence, 0.0), 1.0)
        except Exception:
            return 0.5  # Default moderate confidence
    
    def evaluate(self, solutions: List[Solution], quality_scores: Optional[List[float]] = None) -> Dict[str, float]:
        """Evaluate predictor on test solutions.
        
        Args:
            solutions: Test solutions
            quality_scores: True quality scores (uses solution.quality_score if None)
            
        Returns:
            Dictionary of evaluation metrics
        """
        if not self.is_fitted:
            raise RuntimeError("Predictor not fitted. Call fit() first.")
        
        # Extract features
        features = []
        targets = []
        
        for i, solution in enumerate(solutions):
            try:
                feature_vec = self.feature_extractor.extract(solution)
                features.append(feature_vec.features)
                
                if quality_scores:
                    targets.append(quality_scores[i])
                else:
                    targets.append(solution.quality_score)
            except Exception as e:
                self.logger.warning(f"Failed to extract features: {e}")
                continue
        
        if not features:
            return {}
        
        X = np.array(features)
        y = np.array(targets)
        X_scaled = self.scaler.transform(X)
        
        # Predictions
        y_pred = self.model.predict(X_scaled)
        
        # Calculate metrics
        r2 = self.model.score(X_scaled, y)
        mae = np.mean(np.abs(y - y_pred))
        mse = np.mean((y - y_pred) ** 2)
        rmse = np.sqrt(mse)
        
        # Correlation (handle zero variance case)
        with np.errstate(invalid='ignore'):
            correlation = np.corrcoef(y, y_pred)[0, 1]
            # If NaN (due to zero variance), set to 0
            if np.isnan(correlation):
                correlation = 0.0
        
        return {
            'r2_score': float(r2),
            'mae': float(mae),
            'mse': float(mse),
            'rmse': float(rmse),
            'correlation': float(correlation),
            'n_samples': len(y),
        }
    
    def save(self, path: str):
        """Save model to disk.
        
        Args:
            path: Path to save model
        """
        if not self.is_fitted:
            raise RuntimeError("Cannot save unfitted model")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_extractor.feature_names,
            'is_fitted': self.is_fitted,
        }
        
        with open(path, 'wb') as f:
            pickle.dump(model_data, f)
        
        self.logger.info(f"Model saved to {path}")
    
    def load(self, path: str):
        """Load model from disk.
        
        Args:
            path: Path to saved model
        """
        with open(path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.is_fitted = model_data['is_fitted']
        
        # Verify feature names match
        if model_data['feature_names'] != self.feature_extractor.feature_names:
            self.logger.warning("Feature names mismatch - model may not work correctly")
        
        self.logger.info(f"Model loaded from {path}")
    
    def get_feature_importance(self, top_n: int = 20) -> List[Tuple[str, float]]:
        """Get top N most important features.
        
        Args:
            top_n: Number of top features to return
            
        Returns:
            List of (feature_name, importance) tuples
        """
        if not self.is_fitted:
            raise RuntimeError("Predictor not fitted")
        
        importances = self.model.feature_importances_
        indices = np.argsort(importances)[-top_n:]
        
        return [
            (self.feature_extractor.feature_names[i], importances[i])
            for i in reversed(indices)
        ]
