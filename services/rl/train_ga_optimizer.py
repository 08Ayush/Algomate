"""
Train RL Agent to Optimize Genetic Algorithm Parameters
========================================================
Uses PPO (Proximal Policy Optimization) from Stable-Baselines3
to learn optimal GA parameter adjustments dynamically.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import gymnasium as gym
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.callbacks import CheckpointCallback, EvalCallback
from stable_baselines3.common.vec_env import DummyVecEnv
import torch

from services.rl.timetable_gym_env import TimetableGymEnv


def make_env():
    """Create and return the timetable environment."""
    return TimetableGymEnv()


def train_rl_agent(
    total_timesteps: int = 100000,
    save_path: str = "models/ppo_timetable_ga",
    log_path: str = "logs/ppo_timetable_ga",
    checkpoint_freq: int = 10000,
    eval_freq: int = 5000
):
    """
    Train the RL agent to optimize GA parameters.
    
    Args:
        total_timesteps: Total training steps
        save_path: Path to save trained model
        log_path: Path for tensorboard logs
        checkpoint_freq: Steps between model checkpoints
        eval_freq: Steps between evaluations
    """
    print("="*70)
    print("Timetable GA Optimizer - RL Training")
    print("="*70)
    
    # Create directories
    os.makedirs(save_path, exist_ok=True)
    os.makedirs(log_path, exist_ok=True)
    
    # Create environment
    print("\n[1/5] Creating Gym Environment...")
    env = make_env()
    
    # Check environment follows Gym API
    print("[2/5] Validating Environment...")
    check_env(env, warn=True)
    print("✓ Environment validation passed!")
    
    # Wrap in vectorized environment for SB3
    vec_env = DummyVecEnv([make_env])
    
    # Create evaluation environment
    eval_env = DummyVecEnv([make_env])
    
    # Configure PPO hyperparameters
    print("\n[3/5] Configuring PPO Agent...")
    model = PPO(
        policy="MlpPolicy",
        env=vec_env,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,  # Encourage exploration
        vf_coef=0.5,
        max_grad_norm=0.5,
        verbose=1,
        tensorboard_log=log_path,
        device='cuda' if torch.cuda.is_available() else 'cpu'
    )
    
    print(f"✓ Using device: {model.device}")
    print(f"✓ Policy architecture: {model.policy}")
    
    # Setup callbacks
    print("\n[4/5] Setting up Callbacks...")
    
    # Checkpoint callback: save model periodically
    checkpoint_callback = CheckpointCallback(
        save_freq=checkpoint_freq,
        save_path=save_path,
        name_prefix='ppo_ga_optimizer',
        save_replay_buffer=False,
        save_vecnormalize=True
    )
    
    # Evaluation callback: evaluate agent performance
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=save_path,
        log_path=log_path,
        eval_freq=eval_freq,
        deterministic=True,
        render=False,
        n_eval_episodes=5
    )
    
    print("✓ Checkpoints will be saved every", checkpoint_freq, "steps")
    print("✓ Evaluation every", eval_freq, "steps")
    
    # Train the agent
    print("\n[5/5] Starting Training...")
    print("-"*70)
    print(f"Total timesteps: {total_timesteps:,}")
    print(f"Training will take approximately {total_timesteps / 2048:.0f} policy updates")
    print("-"*70)
    
    try:
        model.learn(
            total_timesteps=total_timesteps,
            callback=[checkpoint_callback, eval_callback],
            progress_bar=True
        )
        
        # Save final model
        final_model_path = os.path.join(save_path, "ppo_ga_optimizer_final")
        model.save(final_model_path)
        
        print("\n" + "="*70)
        print("✓ Training Complete!")
        print(f"✓ Final model saved to: {final_model_path}")
        print("="*70)
        
        return model
        
    except KeyboardInterrupt:
        print("\n\n[!] Training interrupted by user")
        interrupted_path = os.path.join(save_path, "ppo_ga_optimizer_interrupted")
        model.save(interrupted_path)
        print(f"✓ Model saved to: {interrupted_path}")
        return model


def test_trained_agent(model_path: str = "models/ppo_timetable_ga/ppo_ga_optimizer_final"):
    """
    Test the trained RL agent on a timetabling episode.
    
    Args:
        model_path: Path to the trained model
    """
    print("\n" + "="*70)
    print("Testing Trained Agent")
    print("="*70)
    
    # Load trained model
    print(f"\nLoading model from: {model_path}")
    model = PPO.load(model_path)
    
    # Create test environment
    env = make_env()
    
    # Run test episodes
    num_episodes = 3
    
    for episode in range(num_episodes):
        print(f"\n{'─'*70}")
        print(f"Episode {episode + 1}/{num_episodes}")
        print(f"{'─'*70}")
        
        obs, info = env.reset()
        done = False
        total_reward = 0
        steps = 0
        
        while not done:
            # Agent selects action
            action, _states = model.predict(obs, deterministic=True)
            
            # Execute action
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            
            total_reward += reward
            steps += 1
            
            # Render state every 10 steps
            if steps % 10 == 0:
                env.render()
        
        print(f"\n{'─'*70}")
        print(f"Episode {episode + 1} Summary:")
        print(f"  Total Steps: {steps}")
        print(f"  Total Reward: {total_reward:.2f}")
        print(f"  Final Fitness: {info['best_fitness']:.4f}")
        print(f"  Generations: {info['generation']}")
        print(f"  Final Mutation Rate: {info['mutation_rate']:.4f}")
        print(f"  Final Crossover Rate: {info['crossover_rate']:.4f}")
        print(f"{'─'*70}")
    
    env.close()
    print("\n✓ Testing complete!")


def compare_rl_vs_static():
    """
    Compare RL-optimized GA parameters vs static default parameters.
    """
    print("\n" + "="*70)
    print("Comparing RL-Optimized vs Static GA Parameters")
    print("="*70)
    
    # Test with static parameters
    print("\n[Static GA Parameters]")
    env_static = make_env()
    obs, _ = env_static.reset()
    done = False
    total_reward_static = 0
    
    while not done:
        # Always do nothing (keep default parameters)
        action = 7
        obs, reward, terminated, truncated, info = env_static.step(action)
        done = terminated or truncated
        total_reward_static += reward
    
    static_fitness = info['best_fitness']
    static_generations = info['generation']
    
    print(f"  Final Fitness: {static_fitness:.4f}")
    print(f"  Generations: {static_generations}")
    print(f"  Total Reward: {total_reward_static:.2f}")
    
    # Test with RL agent
    print("\n[RL-Optimized Parameters]")
    model_path = "models/ppo_timetable_ga/ppo_ga_optimizer_final"
    
    if os.path.exists(model_path + ".zip"):
        model = PPO.load(model_path)
        env_rl = make_env()
        obs, _ = env_rl.reset()
        done = False
        total_reward_rl = 0
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env_rl.step(action)
            done = terminated or truncated
            total_reward_rl += reward
        
        rl_fitness = info['best_fitness']
        rl_generations = info['generation']
        
        print(f"  Final Fitness: {rl_fitness:.4f}")
        print(f"  Generations: {rl_generations}")
        print(f"  Total Reward: {total_reward_rl:.2f}")
        
        # Comparison
        print("\n" + "─"*70)
        print("Comparison Results:")
        print(f"  Fitness Improvement: {(rl_fitness - static_fitness) * 100:.2f}%")
        print(f"  Generation Efficiency: {(static_generations - rl_generations) / static_generations * 100:.2f}% fewer generations")
        print(f"  Reward Improvement: {(total_reward_rl - total_reward_static):.2f}")
        print("─"*70)
    else:
        print("  [!] Trained model not found. Please train first.")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train RL agent for GA optimization")
    parser.add_argument('--mode', type=str, default='train', 
                       choices=['train', 'test', 'compare'],
                       help='Mode: train, test, or compare')
    parser.add_argument('--timesteps', type=int, default=100000,
                       help='Total training timesteps')
    parser.add_argument('--model-path', type=str, 
                       default='models/ppo_timetable_ga/ppo_ga_optimizer_final',
                       help='Path to model for testing')
    
    args = parser.parse_args()
    
    if args.mode == 'train':
        train_rl_agent(total_timesteps=args.timesteps)
    elif args.mode == 'test':
        test_trained_agent(model_path=args.model_path)
    elif args.mode == 'compare':
        compare_rl_vs_static()
