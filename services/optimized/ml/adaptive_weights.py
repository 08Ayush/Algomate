"""
Adaptive constraint weight adjustment based on feedback.

Automatically tunes constraint weights to improve solution quality
based on stakeholder satisfaction ratings.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
import json

from .feedback import FeedbackSummary


@dataclass
class WeightAdjustmentRecord:
    """Record of a weight adjustment."""
    timestamp: datetime
    weights: Dict[str, float]
    feedback_summary: Optional[FeedbackSummary]
    adjustments_made: Dict[str, float]  # constraint -> multiplier
    reason: str = ""


class AdaptiveConstraintWeightAdjuster:
    """Adjusts constraint weights based on feedback over time.
    
    Uses gradient-based adjustment: increases weights for poorly-satisfied
    constraints and decreases weights for over-satisfied ones.
    
    Attributes:
        weights: Current constraint weights
        learning_rate: Speed of adaptation (0.1-0.3)
        target_score: Target satisfaction score (typically 4.0)
        history: History of adjustments
    """
    
    def __init__(
        self,
        initial_weights: Dict[str, float],
        learning_rate: float = 0.15,
        target_score: float = 4.0,
        min_weight: float = 0.05,
        max_weight: float = 0.50
    ):
        """Initialize adaptive weight adjuster.
        
        Args:
            initial_weights: Initial constraint weights
            learning_rate: Adaptation speed (0.1-0.3 recommended)
            target_score: Target satisfaction (1-5 scale)
            min_weight: Minimum allowed weight
            max_weight: Maximum allowed weight
        """
        self.weights = initial_weights.copy()
        self.learning_rate = learning_rate
        self.target_score = target_score
        self.min_weight = min_weight
        self.max_weight = max_weight
        self.history: List[WeightAdjustmentRecord] = []
        
        # Normalize initial weights with bounds applied
        self._normalize_weights_with_bounds()
    
    def adjust_from_feedback(
        self,
        feedback_summary: FeedbackSummary,
        min_responses: int = 1
    ) -> Dict[str, float]:
        """Adjust weights based on aggregated feedback.
        
        Args:
            feedback_summary: Aggregated feedback from stakeholders
            min_responses: Minimum responses required for adjustment (default: 1)
            
        Returns:
            Updated weights dictionary
        """
        if feedback_summary.total_responses < min_responses:
            return self.weights.copy()
        
        constraint_scores = feedback_summary.constraint_scores
        adjustments = {}
        
        for constraint, current_weight in self.weights.items():
            if constraint not in constraint_scores:
                # No feedback for this constraint, keep current weight
                adjustments[constraint] = current_weight
                continue
            
            score = constraint_scores[constraint]
            
            # Calculate adjustment multiplier based on satisfaction gap
            satisfaction_gap = self.target_score - score
            
            if score < 2.5:  # Very poor satisfaction
                multiplier = 1 + self.learning_rate * 2.0  # +30%
            elif score < 3.0:  # Poor satisfaction
                multiplier = 1 + self.learning_rate * 1.5  # +22.5%
            elif score < 3.5:
                multiplier = 1 + self.learning_rate  # +15%
            elif score < self.target_score:
                multiplier = 1 + self.learning_rate * 0.5  # +7.5%
            elif score > 4.7:  # Excellent - possibly over-weighted
                multiplier = 1 - self.learning_rate * 0.7  # -10.5%
            elif score > 4.5:
                multiplier = 1 - self.learning_rate * 0.5  # -7.5%
            elif score > self.target_score:
                multiplier = 1 - self.learning_rate * 0.3  # -4.5%
            else:  # At target
                multiplier = 1.0
            
            # Apply adjustment
            new_weight = current_weight * multiplier
            adjustments[constraint] = new_weight
        
        # Store adjustments in dict for later comparison
        self.weights = adjustments.copy()
        
        # Normalize with bounds
        self._normalize_weights_with_bounds()
        
        # Record adjustment
        self.history.append(WeightAdjustmentRecord(
            timestamp=datetime.now(),
            weights=self.weights.copy(),
            feedback_summary=feedback_summary,
            adjustments_made={
                k: adjustments[k] / self.weights[k] if k in self.weights and self.weights[k] > 0 else 1.0
                for k in adjustments.keys()
            },
            reason=f"Adjusted based on {feedback_summary.total_responses} responses"
        ))
        
        return self.weights.copy()
    
    def adjust_from_violations(
        self,
        violation_counts: Dict[str, int],
        total_assignments: int
    ) -> Dict[str, float]:
        """Adjust weights based on constraint violations.
        
        Args:
            violation_counts: Number of violations per constraint
            total_assignments: Total number of assignments in solution
            
        Returns:
            Updated weights
        """
        adjustments = {}
        
        for constraint, current_weight in self.weights.items():
            violations = violation_counts.get(constraint, 0)
            violation_rate = violations / total_assignments if total_assignments > 0 else 0
            
            if violation_rate > 0.1:  # More than 10% violations
                multiplier = 1 + self.learning_rate * 1.5
            elif violation_rate > 0.05:
                multiplier = 1 + self.learning_rate
            elif violation_rate == 0:  # No violations
                multiplier = 1 - self.learning_rate * 0.3
            else:
                multiplier = 1.0
            
            new_weight = current_weight * multiplier
            new_weight = max(self.min_weight, min(self.max_weight, new_weight))
            adjustments[constraint] = new_weight
        
        # Normalize
        total = sum(adjustments.values())
        self.weights = {k: v / total for k, v in adjustments.items()}
        
        # Record
        self.history.append(WeightAdjustmentRecord(
            timestamp=datetime.now(),
            weights=self.weights.copy(),
            feedback_summary=None,
            adjustments_made=adjustments,
            reason=f"Adjusted based on violation rates"
        ))
        
        return self.weights.copy()
    
    def get_current_weights(self) -> Dict[str, float]:
        """Get current constraint weights.
        
        Returns:
            Dictionary of constraint -> weight
        """
        return self.weights.copy()
    
    def get_weight_history(self, n: int = 10) -> List[Dict]:
        """Get recent weight adjustment history.
        
        Args:
            n: Number of recent adjustments to return
            
        Returns:
            List of adjustment records
        """
        recent = self.history[-n:] if len(self.history) > n else self.history
        return [
            {
                'timestamp': record.timestamp.isoformat(),
                'weights': record.weights,
                'reason': record.reason,
                'feedback_score': record.feedback_summary.average_rating if record.feedback_summary else None
            }
            for record in recent
        ]
    
    def detect_convergence(
        self,
        window: int = 5,
        threshold: float = 0.02
    ) -> bool:
        """Check if weights have converged (stopped changing).
        
        Args:
            window: Number of recent adjustments to check
            threshold: Maximum average change to consider converged
            
        Returns:
            True if converged, False otherwise
        """
        if len(self.history) < window:
            return False
        
        recent = self.history[-window:]
        changes = []
        
        for i in range(1, len(recent)):
            prev_weights = recent[i-1].weights
            curr_weights = recent[i].weights
            
            # Calculate total absolute change
            total_change = sum(
                abs(curr_weights.get(k, 0) - prev_weights.get(k, 0))
                for k in set(curr_weights.keys()) | set(prev_weights.keys())
            )
            changes.append(total_change)
        
        avg_change = np.mean(changes)
        return avg_change < threshold
    
    def reset(self, new_weights: Optional[Dict[str, float]] = None) -> None:
        """Reset weights to initial or specified values.
        
        Args:
            new_weights: New weights to use, or None to keep current
        """
        if new_weights:
            self.weights = new_weights.copy()
            self._normalize_weights()
        
        self.history = []
    
    def _normalize_weights(self) -> None:
        """Normalize weights to sum to 1.0."""
        total = sum(self.weights.values())
        if total > 0:
            self.weights = {k: v / total for k, v in self.weights.items()}
    
    def _normalize_weights_with_bounds(self) -> None:
        """Normalize weights while respecting min/max bounds.
        
        When bounds conflict with normalization (sum=1.0), bounds take priority.
        """
        # First normalize to get proportions
        total = sum(self.weights.values())
        if total > 0:
            normalized = {k: v / total for k, v in self.weights.items()}
        else:
            normalized = self.weights.copy()
        
        # Apply bounds (this may cause sum != 1.0)
        bounded = {
            k: max(self.min_weight, min(self.max_weight, v))
            for k, v in normalized.items()
        }
        
        # Check if we can re-normalize without violating bounds
        bounded_sum = sum(bounded.values())
        can_normalize = True
        
        if bounded_sum > 0 and abs(bounded_sum - 1.0) > 0.001:
            # Try to scale to sum=1.0
            scale = 1.0 / bounded_sum
            scaled = {k: v * scale for k, v in bounded.items()}
            
            # Check if scaling violates bounds
            for k, v in scaled.items():
                if v < self.min_weight - 0.0001 or v > self.max_weight + 0.0001:
                    can_normalize = False
                    break
            
            if can_normalize:
                self.weights = scaled
            else:
                # Bounds take priority over sum=1.0
                self.weights = bounded
        else:
            self.weights = bounded
    
    def save(self, filepath: str) -> None:
        """Save weights and history to file.
        
        Args:
            filepath: Path to save file
        """
        state = {
            'weights': self.weights,
            'learning_rate': self.learning_rate,
            'target_score': self.target_score,
            'min_weight': self.min_weight,
            'max_weight': self.max_weight,
            'history_count': len(self.history),
            'converged': self.detect_convergence()
        }
        
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
    
    def load(self, filepath: str) -> None:
        """Load weights from file.
        
        Args:
            filepath: Path to load file
        """
        with open(filepath, 'r') as f:
            state = json.load(f)
        
        self.weights = state['weights']
        self.learning_rate = state.get('learning_rate', 0.15)
        self.target_score = state.get('target_score', 4.0)
        self.min_weight = state.get('min_weight', 0.05)
        self.max_weight = state.get('max_weight', 0.50)
