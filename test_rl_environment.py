"""
Test script for Phase 5 RL Environment
======================================
Verifies that the TimetableGymEnv is correctly implemented
and compatible with Stable-Baselines3.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from services.rl.timetable_gym_env import TimetableGymEnv
from stable_baselines3.common.env_checker import check_env
import numpy as np


def test_environment_creation():
    """Test 1: Environment can be created."""
    print("\n" + "="*70)
    print("Test 1: Environment Creation")
    print("="*70)
    
    try:
        env = TimetableGymEnv()
        print("✓ Environment created successfully")
        print(f"  Observation space: {env.observation_space}")
        print(f"  Action space: {env.action_space}")
        return True
    except Exception as e:
        print(f"✗ Failed to create environment: {e}")
        return False


def test_reset():
    """Test 2: Environment can be reset."""
    print("\n" + "="*70)
    print("Test 2: Environment Reset")
    print("="*70)
    
    try:
        env = TimetableGymEnv()
        obs, info = env.reset()
        
        print("✓ Environment reset successfully")
        print(f"  Observation shape: {obs.shape}")
        print(f"  Observation: {obs}")
        print(f"  Info keys: {list(info.keys())}")
        
        # Verify observation is in bounds
        assert env.observation_space.contains(obs), "Observation out of bounds!"
        print("✓ Observation within bounds")
        
        return True
    except Exception as e:
        print(f"✗ Reset failed: {e}")
        return False


def test_step():
    """Test 3: Environment step function works."""
    print("\n" + "="*70)
    print("Test 3: Environment Step")
    print("="*70)
    
    try:
        env = TimetableGymEnv()
        obs, _ = env.reset()
        
        # Test all actions
        print("\nTesting all 8 actions:")
        action_names = [
            "Increase mutation",
            "Decrease mutation",
            "Increase crossover",
            "Decrease crossover",
            "Increase elitism",
            "Decrease elitism",
            "Elite reset",
            "Do nothing"
        ]
        
        for action in range(8):
            obs, reward, terminated, truncated, info = env.step(action)
            print(f"  Action {action} ({action_names[action]}): reward={reward:.2f}, "
                  f"fitness={info['best_fitness']:.4f}")
            
            # Verify step output
            assert env.observation_space.contains(obs), f"Observation {action} out of bounds!"
            assert isinstance(reward, (int, float)), f"Reward {action} is not numeric!"
            assert isinstance(terminated, bool), f"Terminated {action} is not bool!"
            assert isinstance(truncated, bool), f"Truncated {action} is not bool!"
            
            if terminated or truncated:
                obs, _ = env.reset()
        
        print("\n✓ All actions executed successfully")
        print("✓ Step outputs are valid")
        
        return True
    except Exception as e:
        print(f"✗ Step test failed: {e}")
        return False


def test_episode():
    """Test 4: Complete episode can be run."""
    print("\n" + "="*70)
    print("Test 4: Complete Episode")
    print("="*70)
    
    try:
        env = TimetableGymEnv()
        obs, _ = env.reset()
        
        done = False
        total_reward = 0
        steps = 0
        max_steps = 50
        
        print("\nRunning episode...")
        while not done and steps < max_steps:
            # Random action
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            
            total_reward += reward
            steps += 1
            
            if steps % 10 == 0:
                print(f"  Step {steps}: fitness={info['best_fitness']:.4f}, "
                      f"reward={total_reward:.2f}")
        
        print(f"\n✓ Episode completed in {steps} steps")
        print(f"  Total reward: {total_reward:.2f}")
        print(f"  Final fitness: {info['best_fitness']:.4f}")
        print(f"  Final diversity: {info['diversity']:.4f}")
        print(f"  Generations: {info['generation']}")
        
        return True
    except Exception as e:
        print(f"✗ Episode test failed: {e}")
        return False


def test_gym_compatibility():
    """Test 5: Environment is compatible with Gymnasium API."""
    print("\n" + "="*70)
    print("Test 5: Gymnasium API Compatibility")
    print("="*70)
    
    try:
        env = TimetableGymEnv()
        print("\nRunning Gymnasium environment checker...")
        check_env(env, warn=True, skip_render_check=True)
        print("\n✓ Environment passes Gymnasium compatibility checks")
        return True
    except Exception as e:
        print(f"✗ Compatibility test failed: {e}")
        return False


def test_reward_function():
    """Test 6: Reward function behaves correctly."""
    print("\n" + "="*70)
    print("Test 6: Reward Function Behavior")
    print("="*70)
    
    try:
        env = TimetableGymEnv()
        env.reset()
        
        print("\nTesting reward components:")
        
        # Test fitness improvement reward
        env.current_best_fitness = 0.5
        env.previous_best_fitness = 0.4
        reward1 = env._calculate_reward(0.1)
        print(f"  Fitness improvement (0.1): reward={reward1:.2f}")
        assert reward1 > 0, "Fitness improvement should give positive reward!"
        
        # Test diversity bonus
        env.population_diversity = 0.8
        reward2 = env._calculate_reward(0.0)
        print(f"  High diversity (0.8): reward={reward2:.2f}")
        
        # Test stagnation penalty
        env.generations_without_improvement = 15
        reward3 = env._calculate_reward(0.0)
        print(f"  Stagnation (15 gen): reward={reward3:.2f}")
        assert reward3 < reward2, "Stagnation should reduce reward!"
        
        print("\n✓ Reward function behaves as expected")
        return True
    except Exception as e:
        print(f"✗ Reward function test failed: {e}")
        return False


def test_parameter_bounds():
    """Test 7: GA parameters stay within valid bounds."""
    print("\n" + "="*70)
    print("Test 7: Parameter Bounds")
    print("="*70)
    
    try:
        env = TimetableGymEnv()
        env.reset()
        
        print("\nTesting parameter boundary enforcement:")
        
        # Try to exceed mutation rate bounds
        env.mutation_rate = 0.5
        env._apply_action(0)  # Increase mutation
        print(f"  Mutation rate after max increase: {env.mutation_rate:.4f}")
        assert env.mutation_rate <= 0.5, "Mutation rate exceeded maximum!"
        
        env.mutation_rate = 0.01
        env._apply_action(1)  # Decrease mutation
        print(f"  Mutation rate after min decrease: {env.mutation_rate:.4f}")
        assert env.mutation_rate >= 0.01, "Mutation rate below minimum!"
        
        # Try to exceed crossover rate bounds
        env.crossover_rate = 0.95
        env._apply_action(2)  # Increase crossover
        print(f"  Crossover rate after max increase: {env.crossover_rate:.4f}")
        assert env.crossover_rate <= 0.95, "Crossover rate exceeded maximum!"
        
        env.crossover_rate = 0.5
        env._apply_action(3)  # Decrease crossover
        print(f"  Crossover rate after min decrease: {env.crossover_rate:.4f}")
        assert env.crossover_rate >= 0.5, "Crossover rate below minimum!"
        
        # Test elitism bounds
        env.elitism_count = 10
        env._apply_action(4)  # Increase elitism
        print(f"  Elitism count after max increase: {env.elitism_count}")
        assert env.elitism_count <= 10, "Elitism count exceeded maximum!"
        
        env.elitism_count = 1
        env._apply_action(5)  # Decrease elitism
        print(f"  Elitism count after min decrease: {env.elitism_count}")
        assert env.elitism_count >= 1, "Elitism count below minimum!"
        
        print("\n✓ All parameters stay within valid bounds")
        return True
    except Exception as e:
        print(f"✗ Parameter bounds test failed: {e}")
        return False


def run_all_tests():
    """Run all tests and report results."""
    print("\n" + "╔" + "═"*68 + "╗")
    print("║" + " "*20 + "Phase 5 RL Environment Tests" + " "*20 + "║")
    print("╚" + "═"*68 + "╝")
    
    tests = [
        ("Environment Creation", test_environment_creation),
        ("Environment Reset", test_reset),
        ("Environment Step", test_step),
        ("Complete Episode", test_episode),
        ("Gymnasium Compatibility", test_gym_compatibility),
        ("Reward Function", test_reward_function),
        ("Parameter Bounds", test_parameter_bounds)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n✗ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*70)
    print("Test Summary")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print("\n" + "─"*70)
    print(f"Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print("─"*70)
    
    if passed == total:
        print("\n🎉 All tests passed! Environment is ready for training.")
        print("\nNext steps:")
        print("  1. Install RL dependencies: pip install gymnasium stable-baselines3 torch")
        print("  2. Train agent: python services/rl/train_ga_optimizer.py --mode train")
        print("  3. Test trained model: python services/rl/train_ga_optimizer.py --mode test")
    else:
        print("\n⚠️ Some tests failed. Please fix issues before training.")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
