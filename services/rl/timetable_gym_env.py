"""
Timetable Gym Environment for Reinforcement Learning
=====================================================
Wraps the Genetic Algorithm (GA) timetable scheduler in a Gymnasium environment
to enable RL-based optimization of GA parameters (mutation rate, crossover rate, etc.)
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Dict, Tuple, Any
import random


class TimetableGymEnv(gym.Env):
    """
    Custom Gymnasium Environment for optimizing GA parameters using RL.
    
    The agent learns to adjust GA parameters dynamically to achieve
    better timetable solutions faster.
    """
    
    metadata = {'render_modes': ['human']}
    
    def __init__(self, ga_scheduler=None, config: Dict[str, Any] = None):
        """
        Initialize the Timetable Gym Environment.
        
        Args:
            ga_scheduler: The Genetic Algorithm scheduler instance
            config: Configuration dict with GA constraints and objectives
        """
        super().__init__()
        
        self.ga_scheduler = ga_scheduler
        self.config = config or {}
        
        # GA Parameters that RL will optimize
        self.mutation_rate = 0.1
        self.crossover_rate = 0.7
        self.elitism_count = 2
        self.stagnation_threshold = 10
        
        # State tracking
        self.current_best_fitness = 0.0
        self.previous_best_fitness = 0.0
        self.generations_without_improvement = 0
        self.population_diversity = 0.0
        self.generation_count = 0
        
        # Action Space: Discrete actions for parameter tuning
        # 0: Increase mutation rate (+0.05)
        # 1: Decrease mutation rate (-0.05)
        # 2: Increase crossover rate (+0.05)
        # 3: Decrease crossover rate (-0.05)
        # 4: Increase elitism (keep top 10% + 1)
        # 5: Decrease elitism (keep top 10% - 1)
        # 6: Trigger elite reset (keep top 10%, randomize rest)
        # 7: Do nothing (maintain current params)
        self.action_space = spaces.Discrete(8)
        
        # Observation Space: State of the GA
        # [0] Current best fitness (0-1)
        # [1] Population diversity (0-1)  
        # [2] Generations without improvement (normalized)
        # [3] Current mutation rate (0-1)
        # [4] Current crossover rate (0-1)
        # [5] Generation count (normalized)
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]),
            high=np.array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
            dtype=np.float32
        )
        
        # Episode configuration
        self.max_generations_per_step = 5
        self.max_total_generations = 100
        
    def reset(self, seed=None, options=None):
        """
        Reset the environment to initial state.
        
        Returns:
            observation: Initial state
            info: Additional information
        """
        super().reset(seed=seed)
        
        # Reset GA parameters to defaults
        self.mutation_rate = 0.1
        self.crossover_rate = 0.7
        self.elitism_count = 2
        
        # Reset state tracking
        self.current_best_fitness = 0.0
        self.previous_best_fitness = 0.0
        self.generations_without_improvement = 0
        self.population_diversity = 1.0  # Start with high diversity
        self.generation_count = 0
        
        observation = self._get_observation()
        info = self._get_info()
        
        return observation, info
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        """
        Execute one step in the environment.
        
        Args:
            action: Action to take (0-7)
            
        Returns:
            observation: New state
            reward: Reward for this action
            terminated: Whether episode ended
            truncated: Whether episode was truncated
            info: Additional information
        """
        # Store previous fitness for reward calculation
        self.previous_best_fitness = self.current_best_fitness
        
        # Apply action to modify GA parameters
        self._apply_action(action)
        
        # Run GA for several generations with current parameters
        fitness_improvement = self._run_ga_generations(self.max_generations_per_step)
        
        # Calculate reward
        reward = self._calculate_reward(fitness_improvement)
        
        # Check if episode should terminate
        terminated = (
            self.current_best_fitness >= 0.99 or  # Near-perfect solution
            self.generation_count >= self.max_total_generations
        )
        
        truncated = False
        
        observation = self._get_observation()
        info = self._get_info()
        
        return observation, reward, terminated, truncated, info
    
    def _apply_action(self, action: int):
        """Apply the selected action to modify GA parameters."""
        if action == 0:  # Increase mutation rate
            self.mutation_rate = min(0.5, self.mutation_rate + 0.05)
        elif action == 1:  # Decrease mutation rate
            self.mutation_rate = max(0.01, self.mutation_rate - 0.05)
        elif action == 2:  # Increase crossover rate
            self.crossover_rate = min(0.95, self.crossover_rate + 0.05)
        elif action == 3:  # Decrease crossover rate
            self.crossover_rate = max(0.5, self.crossover_rate - 0.05)
        elif action == 4:  # Increase elitism
            self.elitism_count = min(10, self.elitism_count + 1)
        elif action == 5:  # Decrease elitism
            self.elitism_count = max(1, self.elitism_count - 1)
        elif action == 6:  # Elite reset
            self._trigger_elite_reset()
        elif action == 7:  # Do nothing
            pass
    
    def _run_ga_generations(self, num_generations: int) -> float:
        """
        Run the GA for specified number of generations.
        
        Args:
            num_generations: Number of generations to execute
            
        Returns:
            fitness_improvement: Change in fitness
        """
        initial_fitness = self.current_best_fitness
        
        # Simulate GA execution (in production, call actual GA)
        # For testing, we'll simulate fitness improvements
        for _ in range(num_generations):
            self.generation_count += 1
            
            # Simulate fitness calculation
            # In production: fitness = self.ga_scheduler.evolve_generation(...)
            fitness_delta = self._simulate_fitness_improvement()
            self.current_best_fitness = min(1.0, self.current_best_fitness + fitness_delta)
            
            # Update diversity (decreases over time, but can increase with mutation)
            self.population_diversity = max(
                0.1,
                self.population_diversity * 0.95 + self.mutation_rate * 0.1
            )
            
            # Track stagnation
            if fitness_delta < 0.001:
                self.generations_without_improvement += 1
            else:
                self.generations_without_improvement = 0
        
        return self.current_best_fitness - initial_fitness
    
    def _simulate_fitness_improvement(self) -> float:
        """
        Simulate fitness improvement based on GA parameters.
        In production, replace with actual GA execution.
        """
        # Higher mutation helps escape local optima
        exploration_factor = self.mutation_rate * 0.1
        
        # Higher crossover promotes solution recombination
        exploitation_factor = self.crossover_rate * 0.05
        
        # Diversity helps find better solutions
        diversity_factor = self.population_diversity * 0.05
        
        # Randomness
        random_factor = random.uniform(-0.01, 0.02)
        
        improvement = exploration_factor + exploitation_factor + diversity_factor + random_factor
        
        # Diminishing returns as fitness approaches 1.0
        improvement *= (1.0 - self.current_best_fitness)
        
        return max(0, improvement)
    
    def _trigger_elite_reset(self):
        """Trigger an elite reset: keep top solutions, randomize rest."""
        # This would reset the GA population in production
        # For now, boost diversity and potentially improve fitness
        self.population_diversity = min(1.0, self.population_diversity + 0.3)
        
    def _calculate_reward(self, fitness_improvement: float) -> float:
        """
        Calculate reward for the action taken.
        
        Reward components:
        1. Fitness improvement (main component)
        2. Diversity bonus (avoid premature convergence)
        3. Efficiency bonus (reach good fitness quickly)
        4. Stagnation penalty
        """
        # Main reward: fitness improvement
        reward = fitness_improvement * 100.0
        
        # Diversity bonus: maintain healthy diversity
        if self.population_diversity > 0.3:
            reward += 5.0
        elif self.population_diversity < 0.1:
            reward -= 10.0  # Penalty for low diversity
        
        # Efficiency bonus: reaching high fitness early
        if self.current_best_fitness > 0.9 and self.generation_count < 50:
            reward += 20.0
        
        # Stagnation penalty
        if self.generations_without_improvement > self.stagnation_threshold:
            reward -= 5.0
        
        # Penalty for too many generations
        if self.generation_count > self.max_total_generations * 0.8:
            reward -= 2.0
        
        return reward
    
    def _get_observation(self) -> np.ndarray:
        """Get current state observation."""
        return np.array([
            self.current_best_fitness,
            self.population_diversity,
            min(1.0, self.generations_without_improvement / 20.0),
            self.mutation_rate,
            self.crossover_rate,
            min(1.0, self.generation_count / self.max_total_generations)
        ], dtype=np.float32)
    
    def _get_info(self) -> Dict:
        """Get additional information about current state."""
        return {
            'generation': self.generation_count,
            'best_fitness': self.current_best_fitness,
            'diversity': self.population_diversity,
            'mutation_rate': self.mutation_rate,
            'crossover_rate': self.crossover_rate,
            'elitism_count': self.elitism_count,
            'stagnation': self.generations_without_improvement
        }
    
    def render(self, mode='human'):
        """Render the environment state."""
        if mode == 'human':
            print(f"\n{'='*60}")
            print(f"Generation: {self.generation_count}")
            print(f"Best Fitness: {self.current_best_fitness:.4f}")
            print(f"Diversity: {self.population_diversity:.4f}")
            print(f"Mutation Rate: {self.mutation_rate:.4f}")
            print(f"Crossover Rate: {self.crossover_rate:.4f}")
            print(f"Stagnation: {self.generations_without_improvement} generations")
            print(f"{'='*60}")


# Register the environment
gym.register(
    id='TimetableGA-v0',
    entry_point='services.rl.timetable_gym_env:TimetableGymEnv',
)
