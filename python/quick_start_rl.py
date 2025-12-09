"""
Quick Start Script for Phase 5 RL Environment
==============================================
Runs a minimal test to verify RL setup is working correctly.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("╔" + "═"*68 + "╗")
print("║" + " "*15 + "Phase 5 RL Environment Quick Start" + " "*19 + "║")
print("╚" + "═"*68 + "╝")

# Step 1: Check imports
print("\n[1/4] Checking dependencies...")
try:
    import gymnasium as gym
    print("  ✓ gymnasium installed")
except ImportError:
    print("  ✗ gymnasium not found")
    print("  → Install: .venv\\Scripts\\python -m pip install gymnasium")
    sys.exit(1)

try:
    import stable_baselines3
    print("  ✓ stable_baselines3 installed")
except ImportError:
    print("  ✗ stable_baselines3 not found")
    print("  → Install: .venv\\Scripts\\python -m pip install stable-baselines3")
    sys.exit(1)

try:
    import torch
    print("  ✓ torch installed")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  → Device: {device}")
except ImportError:
    print("  ✗ torch not found")
    print("  → Install: .venv\\Scripts\\python -m pip install torch")
    sys.exit(1)

try:
    import numpy as np
    print("  ✓ numpy installed")
except ImportError:
    print("  ✗ numpy not found")
    print("  → Install: .venv\\Scripts\\python -m pip install numpy")
    sys.exit(1)

# Step 2: Import custom environment
print("\n[2/4] Loading TimetableGymEnv...")
try:
    from services.rl.timetable_gym_env import TimetableGymEnv
    print("  ✓ TimetableGymEnv loaded successfully")
except Exception as e:
    print(f"  ✗ Failed to load TimetableGymEnv: {e}")
    sys.exit(1)

# Step 3: Create and test environment
print("\n[3/4] Testing environment...")
try:
    env = TimetableGymEnv()
    obs, info = env.reset()
    print("  ✓ Environment created and reset")
    print(f"    Observation shape: {obs.shape}")
    print(f"    Observation space: {env.observation_space}")
    print(f"    Action space: {env.action_space}")
    
    # Take a few steps
    print("\n  Taking 3 sample steps:")
    for i in range(3):
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        print(f"    Step {i+1}: action={action}, reward={reward:.2f}, "
              f"fitness={info['best_fitness']:.4f}")
        
        if terminated or truncated:
            obs, info = env.reset()
    
    print("\n  ✓ Environment step function working")
except Exception as e:
    print(f"  ✗ Environment test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 4: Verify Gym API compatibility
print("\n[4/4] Verifying Gymnasium API compatibility...")
try:
    from stable_baselines3.common.env_checker import check_env
    check_env(env, warn=True, skip_render_check=True)
    print("  ✓ Environment passes Gymnasium compatibility checks")
except Exception as e:
    print(f"  ✗ Compatibility check failed: {e}")
    sys.exit(1)

# Success!
print("\n" + "="*70)
print("🎉 SUCCESS! Phase 5 RL Environment is ready to use.")
print("="*70)
print("\nNext steps:")
print("  1. Run full tests: python test_rl_environment.py")
print("  2. Train agent (quick): python services\\rl\\train_ga_optimizer.py --mode train --timesteps 10000")
print("  3. Train agent (full): python services\\rl\\train_ga_optimizer.py --mode train --timesteps 100000")
print("\nFor TensorBoard monitoring:")
print("  python -m tensorboard.main --logdir logs/ppo_timetable_ga")
print("  Then open: http://localhost:6006")
print("\n" + "="*70)
