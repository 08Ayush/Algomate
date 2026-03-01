"""
Incremental learning for ML quality predictor.

Updates the ML model continuously with new solutions without
requiring complete retraining from scratch.
"""

from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import numpy as np
from pathlib import Path
import logging

from core.models import Solution
from .predictor import QualityPredictor

logger = logging.getLogger(__name__)


@dataclass
class ModelUpdate:
    """Record of a model update."""
    version: int
    timestamp: datetime
    buffer_size: int
    old_r2: float
    new_r2: float
    old_mae: float
    new_mae: float
    improvement: float
    training_samples: int


class IncrementalLearner:
    """Manages incremental updates to ML quality predictor.
    
    Buffers new solutions and periodically retrains the model
    using both historical and new data.
    
    Attributes:
        predictor: ML quality predictor
        buffer: Recent solutions awaiting model update
        buffer_size: Number of solutions to buffer before updating
        version: Current model version
        update_history: History of model updates
    """
    
    def __init__(
        self,
        predictor: QualityPredictor,
        buffer_size: int = 50,
        min_update_interval_days: int = 7
    ):
        """Initialize incremental learner.
        
        Args:
            predictor: Quality predictor to update
            buffer_size: Number of solutions to buffer before update
            min_update_interval_days: Minimum days between updates
        """
        self.predictor = predictor
        self.buffer_size = buffer_size
        self.min_update_interval = timedelta(days=min_update_interval_days)
        self.buffer: List[Tuple[Solution, float]] = []
        self.version = 1
        self.update_history: List[ModelUpdate] = []
        self.last_update: Optional[datetime] = None
    
    def add_solution(
        self,
        solution: Solution,
        actual_quality: float
    ) -> bool:
        """Add solution to training buffer.
        
        Args:
            solution: Generated solution
            actual_quality: True quality score (0-1 scale)
            
        Returns:
            True if model was updated, False otherwise
        """
        self.buffer.append((solution, actual_quality))
        logger.debug(f"Added solution to buffer (size: {len(self.buffer)}/{self.buffer_size})")
        
        # Check if ready to update
        if self.should_update():
            return self.update_model()
        
        return False
    
    def should_update(self) -> bool:
        """Check if model should be updated.
        
        Returns:
            True if update conditions are met
        """
        # Check buffer size
        if len(self.buffer) < self.buffer_size:
            return False
        
        # Check time since last update
        if self.last_update is not None:
            time_since_update = datetime.now() - self.last_update
            if time_since_update < self.min_update_interval:
                logger.info(f"Skipping update: only {time_since_update.days} days since last update")
                return False
        
        return True
    
    def update_model(self) -> bool:
        """Retrain model with buffered data plus historical data.
        
        Returns:
            True if update succeeded, False otherwise
        """
        if not self.buffer:
            logger.warning("Cannot update model: buffer is empty")
            return False
        
        logger.info(f"Updating model (version {self.version} -> {self.version + 1})")
        logger.info(f"Buffer size: {len(self.buffer)} solutions")
        
        try:
            # Get old metrics (before update)
            old_metrics = {}
            if self.predictor.is_fitted:
                test_solutions = [s for s, _ in self.buffer[:20]]  # Use first 20 for testing
                old_metrics = self.predictor.evaluate(test_solutions)
            
            # Load historical solutions (if available)
            historical = self._load_historical_solutions()
            logger.info(f"Loaded {len(historical)} historical solutions")
            
            # Combine historical + new data
            all_solutions = historical + [s for s, _ in self.buffer]
            all_qualities = [q for _, q in historical] + [q for _, q in self.buffer]
            
            logger.info(f"Training on {len(all_solutions)} total solutions")
            
            # Retrain model
            self.predictor.fit(all_solutions, all_qualities)
            
            # Get new metrics
            new_metrics = self.predictor.evaluate(test_solutions) if test_solutions else {}
            
            # Calculate improvement
            improvement = 0.0
            if old_metrics and new_metrics:
                improvement = new_metrics.get('r2_score', 0) - old_metrics.get('r2_score', 0)
            
            # Save updated model
            model_dir = Path("models")
            model_dir.mkdir(exist_ok=True)
            model_path = model_dir / f"predictor_v{self.version + 1}.pkl"
            self.predictor.save(str(model_path))
            
            # Record update
            update_record = ModelUpdate(
                version=self.version + 1,
                timestamp=datetime.now(),
                buffer_size=len(self.buffer),
                old_r2=old_metrics.get('r2_score', 0),
                new_r2=new_metrics.get('r2_score', 0),
                old_mae=old_metrics.get('mae', 0),
                new_mae=new_metrics.get('mae', 0),
                improvement=improvement,
                training_samples=len(all_solutions)
            )
            self.update_history.append(update_record)
            
            # Update state
            self.version += 1
            self.last_update = datetime.now()
            self.buffer = []  # Clear buffer
            
            logger.info(f"✓ Model updated to v{self.version}")
            logger.info(f"  R² score: {old_metrics.get('r2_score', 0):.4f} -> {new_metrics.get('r2_score', 0):.4f} (Δ{improvement:+.4f})")
            logger.info(f"  MAE: {old_metrics.get('mae', 0):.4f} -> {new_metrics.get('mae', 0):.4f}")
            
            return True
            
        except Exception as e:
            logger.error(f"Model update failed: {e}")
            return False
    
    def force_update(self) -> bool:
        """Force model update regardless of buffer size or time.
        
        Returns:
            True if update succeeded
        """
        if not self.buffer:
            logger.warning("Cannot force update: buffer is empty")
            return False
        
        # Temporarily disable checks
        old_buffer_size = self.buffer_size
        old_interval = self.min_update_interval
        
        self.buffer_size = 1
        self.min_update_interval = timedelta(seconds=0)
        
        result = self.update_model()
        
        # Restore settings
        self.buffer_size = old_buffer_size
        self.min_update_interval = old_interval
        
        return result
    
    def _load_historical_solutions(
        self,
        max_solutions: int = 500
    ) -> List[Tuple[Solution, float]]:
        """Load historical solutions from database or storage.
        
        Args:
            max_solutions: Maximum number of solutions to load
            
        Returns:
            List of (solution, quality) tuples
        """
        # TODO: Implement database loading
        # For now, return empty list
        # In production, query from solution_history table
        return []
    
    def get_update_stats(self) -> Dict:
        """Get statistics about model updates.
        
        Returns:
            Dictionary with update statistics
        """
        if not self.update_history:
            return {
                'current_version': self.version,
                'total_updates': 0,
                'buffer_size': len(self.buffer),
                'last_update': None,
                'avg_improvement': 0.0,
                'total_training_samples': 0
            }
        
        avg_improvement = np.mean([u.improvement for u in self.update_history])
        total_samples = sum(u.training_samples for u in self.update_history)
        
        return {
            'current_version': self.version,
            'total_updates': len(self.update_history),
            'buffer_size': len(self.buffer),
            'buffer_progress': f"{len(self.buffer)}/{self.buffer_size}",
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'avg_improvement': float(avg_improvement),
            'latest_r2': self.update_history[-1].new_r2 if self.update_history else 0.0,
            'latest_mae': self.update_history[-1].new_mae if self.update_history else 0.0,
            'total_training_samples': total_samples
        }
    
    def get_update_history(self, n: int = 10) -> List[Dict]:
        """Get recent update history.
        
        Args:
            n: Number of recent updates to return
            
        Returns:
            List of update records
        """
        recent = self.update_history[-n:] if len(self.update_history) > n else self.update_history
        return [
            {
                'version': update.version,
                'timestamp': update.timestamp.isoformat(),
                'buffer_size': update.buffer_size,
                'r2_improvement': update.improvement,
                'new_r2': update.new_r2,
                'new_mae': update.new_mae,
                'training_samples': update.training_samples
            }
            for update in recent
        ]
    
    def reset_buffer(self) -> None:
        """Clear the solution buffer."""
        self.buffer = []
        logger.info("Buffer cleared")
    
    def get_buffer_info(self) -> Dict:
        """Get information about current buffer.
        
        Returns:
            Dictionary with buffer information
        """
        if not self.buffer:
            return {
                'size': 0,
                'capacity': self.buffer_size,
                'ready_for_update': False,
                'solutions': []
            }
        
        qualities = [q for _, q in self.buffer]
        
        return {
            'size': len(self.buffer),
            'capacity': self.buffer_size,
            'ready_for_update': self.should_update(),
            'avg_quality': float(np.mean(qualities)),
            'min_quality': float(np.min(qualities)),
            'max_quality': float(np.max(qualities)),
            'solutions': [
                {
                    'id': s.id,
                    'quality': q,
                    'solver': s.solver_name
                }
                for s, q in self.buffer[-5:]  # Last 5 solutions
            ]
        }
