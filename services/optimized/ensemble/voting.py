"""Voting strategies for solution selection."""

from abc import ABC, abstractmethod
from typing import List
import logging

from core.models import Solution
from core.config import EnsembleConfig


class VotingStrategy(ABC):
    """Abstract base class for voting strategies."""
    
    @abstractmethod
    def select_best(self, solutions: List[Solution]) -> Solution:
        """Select best solution from candidates."""
        pass


class WeightedVoting(VotingStrategy):
    """Weighted voting based on solver weights and quality scores."""
    
    def __init__(self, config: EnsembleConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Build weight map
        self.weights = {
            'cpsat': config.cpsat.weight,
            'tabu': config.tabu.weight,
            'vns': config.vns.weight,
        }
    
    def select_best(self, solutions: List[Solution]) -> Solution:
        """Select solution with highest weighted score."""
        if not solutions:
            return None
        
        if len(solutions) == 1:
            return solutions[0]
        
        # Calculate weighted scores
        weighted_scores = []
        
        for solution in solutions:
            solver_weight = self.weights.get(solution.solver_name, 1.0)
            weighted_score = solution.quality_score * solver_weight
            weighted_scores.append((weighted_score, solution))
            
            self.logger.debug(
                f"{solution.solver_name}: "
                f"quality={solution.quality_score:.2f}, "
                f"weight={solver_weight:.2f}, "
                f"weighted={weighted_score:.2f}"
            )
        
        # Sort by weighted score
        weighted_scores.sort(reverse=True, key=lambda x: x[0])
        
        best_solution = weighted_scores[0][1]
        
        self.logger.info(
            f"Selected solution from {best_solution.solver_name} "
            f"with weighted score: {weighted_scores[0][0]:.2f}"
        )
        
        return best_solution


class MajorityVoting(VotingStrategy):
    """Majority voting - select most common solution pattern."""
    
    def select_best(self, solutions: List[Solution]) -> Solution:
        """Select solution with most similar assignments."""
        # Simplified: just return highest quality
        return max(solutions, key=lambda s: s.quality_score)


class BestQualityVoting(VotingStrategy):
    """Simple best quality selection."""
    
    def select_best(self, solutions: List[Solution]) -> Solution:
        """Select solution with highest quality score."""
        if not solutions:
            return None
        
        best = max(solutions, key=lambda s: s.quality_score)
        
        logger = logging.getLogger(__name__)
        logger.info(
            f"Selected solution from {best.solver_name} "
            f"with quality: {best.quality_score:.2f}"
        )
        
        return best
