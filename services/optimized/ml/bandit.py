"""
Multi-Armed Bandit for solver selection using Thompson Sampling.

Learns which solver performs best over time and adapts selection strategy
to maximize solution quality.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
import json


@dataclass
class SolverStats:
    """Statistics for a single solver."""
    name: str
    alpha: float = 1.0  # Successes + 1 (Beta distribution parameter)
    beta: float = 1.0   # Failures + 1 (Beta distribution parameter)
    total_uses: int = 0
    total_reward: float = 0.0
    last_used: Optional[datetime] = None
    
    @property
    def expected_reward(self) -> float:
        """Expected reward (mean of Beta distribution)."""
        return self.alpha / (self.alpha + self.beta)
    
    @property
    def average_reward(self) -> float:
        """Historical average reward."""
        return self.total_reward / self.total_uses if self.total_uses > 0 else 0.0


@dataclass
class BanditRecord:
    """Record of a single bandit action."""
    solver: str
    reward: float
    timestamp: datetime = field(default_factory=datetime.now)


class SolverBandit:
    """Multi-Armed Bandit for adaptive solver selection.
    
    Uses Thompson Sampling with Beta distributions to balance
    exploration (trying all solvers) and exploitation (using best solver).
    
    Attributes:
        solvers: List of solver names
        stats: Statistics for each solver
        history: History of actions taken
    """
    
    def __init__(self, solvers: List[str], prior_alpha: float = 1.0, prior_beta: float = 1.0):
        """Initialize bandit with uniform prior.
        
        Args:
            solvers: List of solver names (e.g., ['cpsat', 'tabu', 'vns'])
            prior_alpha: Prior successes (Beta distribution)
            prior_beta: Prior failures (Beta distribution)
        """
        self.solvers = solvers
        self.stats: Dict[str, SolverStats] = {
            solver: SolverStats(name=solver, alpha=prior_alpha, beta=prior_beta)
            for solver in solvers
        }
        self.history: List[BanditRecord] = []
    
    def select_solver(self, temperature: float = 1.0) -> str:
        """Select solver using Thompson Sampling.
        
        Args:
            temperature: Controls exploration (higher = more exploration)
            
        Returns:
            Selected solver name
        """
        # Sample from each solver's Beta distribution
        samples = {}
        for solver in self.solvers:
            stat = self.stats[solver]
            # Sample from Beta(alpha, beta) scaled by temperature
            sample = np.random.beta(stat.alpha, stat.beta) ** temperature
            samples[solver] = sample
        
        # Return solver with highest sample
        selected = max(samples, key=samples.get)
        return selected
    
    def update(self, solver: str, reward: float) -> None:
        """Update solver statistics based on observed reward.
        
        Args:
            solver: Solver that was used
            reward: Observed reward (quality score 0-1, higher is better)
        """
        if solver not in self.stats:
            raise ValueError(f"Unknown solver: {solver}")
        
        stat = self.stats[solver]
        
        # Update Beta distribution parameters
        # High reward (>0.8) = success, low reward (<0.5) = failure
        if reward > 0.8:
            stat.alpha += 1.0
        elif reward < 0.5:
            stat.beta += 1.0
        else:
            # Medium quality: fractional update
            stat.alpha += reward
            stat.beta += (1.0 - reward)
        
        # Update statistics
        stat.total_uses += 1
        stat.total_reward += reward
        stat.last_used = datetime.now()
        
        # Record in history
        self.history.append(BanditRecord(
            solver=solver,
            reward=reward
        ))
    
    def get_probabilities(self) -> Dict[str, float]:
        """Get current win probability estimates for each solver.
        
        Returns:
            Dictionary of solver -> probability
        """
        return {
            solver: stat.expected_reward
            for solver, stat in self.stats.items()
        }
    
    def get_best_solver(self) -> str:
        """Get currently best solver based on expected reward.
        
        Returns:
            Solver name with highest expected reward
        """
        probs = self.get_probabilities()
        return max(probs, key=probs.get)
    
    def get_statistics(self) -> Dict[str, Dict]:
        """Get detailed statistics for all solvers.
        
        Returns:
            Dictionary with solver statistics
        """
        return {
            solver: {
                'expected_reward': stat.expected_reward,
                'average_reward': stat.average_reward,
                'total_uses': stat.total_uses,
                'alpha': stat.alpha,
                'beta': stat.beta,
                'last_used': stat.last_used.isoformat() if stat.last_used else None
            }
            for solver, stat in self.stats.items()
        }
    
    def get_recent_history(self, n: int = 10) -> List[Dict]:
        """Get recent action history.
        
        Args:
            n: Number of recent actions to return
            
        Returns:
            List of recent actions
        """
        recent = self.history[-n:] if len(self.history) > n else self.history
        return [
            {
                'solver': record.solver,
                'reward': record.reward,
                'timestamp': record.timestamp.isoformat()
            }
            for record in recent
        ]
    
    def reset(self, solver: Optional[str] = None) -> None:
        """Reset bandit statistics.
        
        Args:
            solver: Specific solver to reset, or None to reset all
        """
        if solver:
            if solver in self.stats:
                self.stats[solver] = SolverStats(name=solver)
        else:
            self.stats = {
                solver: SolverStats(name=solver)
                for solver in self.solvers
            }
            self.history = []
    
    def save(self, filepath: str) -> None:
        """Save bandit state to file.
        
        Args:
            filepath: Path to save file
        """
        state = {
            'solvers': self.solvers,
            'stats': {
                solver: {
                    'alpha': stat.alpha,
                    'beta': stat.beta,
                    'total_uses': stat.total_uses,
                    'total_reward': stat.total_reward,
                    'last_used': stat.last_used.isoformat() if stat.last_used else None
                }
                for solver, stat in self.stats.items()
            },
            'history_count': len(self.history)
        }
        
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
    
    def load(self, filepath: str) -> None:
        """Load bandit state from file.
        
        Args:
            filepath: Path to load file
        """
        with open(filepath, 'r') as f:
            state = json.load(f)
        
        self.solvers = state['solvers']
        self.stats = {}
        
        for solver, stat_dict in state['stats'].items():
            stat = SolverStats(
                name=solver,
                alpha=stat_dict['alpha'],
                beta=stat_dict['beta'],
                total_uses=stat_dict['total_uses'],
                total_reward=stat_dict['total_reward']
            )
            if stat_dict.get('last_used'):
                stat.last_used = datetime.fromisoformat(stat_dict['last_used'])
            self.stats[solver] = stat


class EpsilonGreedyBandit:
    """Alternative: Epsilon-Greedy bandit (simpler, less optimal).
    
    With probability epsilon, explores random solver.
    Otherwise, exploits best known solver.
    """
    
    def __init__(self, solvers: List[str], epsilon: float = 0.1):
        """Initialize epsilon-greedy bandit.
        
        Args:
            solvers: List of solver names
            epsilon: Exploration probability (0-1)
        """
        self.solvers = solvers
        self.epsilon = epsilon
        self.rewards: Dict[str, List[float]] = {s: [] for s in solvers}
    
    def select_solver(self) -> str:
        """Select solver using epsilon-greedy strategy."""
        if np.random.random() < self.epsilon:
            # Explore: random solver
            return np.random.choice(self.solvers)
        else:
            # Exploit: best solver
            avg_rewards = {
                solver: np.mean(rewards) if rewards else 0.0
                for solver, rewards in self.rewards.items()
            }
            return max(avg_rewards, key=avg_rewards.get)
    
    def update(self, solver: str, reward: float) -> None:
        """Update solver statistics."""
        self.rewards[solver].append(reward)
    
    def get_best_solver(self) -> str:
        """Get best solver."""
        avg_rewards = {
            solver: np.mean(rewards) if rewards else 0.0
            for solver, rewards in self.rewards.items()
        }
        return max(avg_rewards, key=avg_rewards.get)
