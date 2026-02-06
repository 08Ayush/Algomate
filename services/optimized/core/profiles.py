"""Configuration profiles for different environments."""

from dataclasses import dataclass, replace
from typing import Optional
from pathlib import Path
import os

from .config import EnsembleConfig, SolverConfig, MLConfig, DatabaseConfig


@dataclass
class Profile:
    """Configuration profile for specific environment."""
    name: str
    description: str
    config: EnsembleConfig


class ConfigurationProfiles:
    """Manages configuration profiles for different environments."""
    
    @staticmethod
    def development() -> EnsembleConfig:
        """Development profile - optimized for fast iteration."""
        return EnsembleConfig(
            parallel_execution=False,  # Easier debugging
            max_workers=1,
            voting_strategy="best",
            
            cpsat=SolverConfig(
                name="cpsat",
                enabled=True,
                weight=1.0,
                timeout_seconds=60,  # Shorter timeout for dev
                parameters={
                    "num_search_workers": 4,
                    "max_time_in_seconds": 60,
                    "random_seed": 42,
                }
            ),
            
            tabu=SolverConfig(
                name="tabu",
                enabled=False,  # Disabled in dev for speed
                weight=0.0,
                timeout_seconds=30,
                parameters={
                    "tabu_tenure": 5,
                    "max_iterations": 100,
                    "aspiration_threshold": 0.9,
                }
            ),
            
            vns=SolverConfig(
                name="vns",
                enabled=False,  # Disabled in dev for speed
                weight=0.0,
                timeout_seconds=30,
                parameters={
                    "neighborhood_sizes": [1, 2],
                    "max_iterations": 50,
                    "shake_intensity": 0.3,
                }
            ),
            
            ml=MLConfig(
                enabled=False,  # Disabled in dev
                feature_count=89,
                n_estimators=50,  # Smaller model
                learning_rate=0.1,
                max_depth=3,
            ),
            
            database=DatabaseConfig(
                url=os.getenv("SUPABASE_URL", ""),
                api_key=os.getenv("SUPABASE_KEY", ""),
                cache_enabled=True,
                cache_ttl=600,  # 10 minutes
                timeout=10,
            ),
            
            log_level="DEBUG",
            log_to_file=True,
            solution_cache_size=10,
            enable_profiling=True,
        )
    
    @staticmethod
    def staging() -> EnsembleConfig:
        """Staging profile - similar to production but with logging."""
        return EnsembleConfig(
            parallel_execution=True,
            max_workers=3,
            voting_strategy="weighted",
            
            cpsat=SolverConfig(
                name="cpsat",
                enabled=True,
                weight=0.70,
                timeout_seconds=180,
                parameters={
                    "num_search_workers": 6,
                    "max_time_in_seconds": 180,
                    "random_seed": 42,
                }
            ),
            
            tabu=SolverConfig(
                name="tabu",
                enabled=True,
                weight=0.20,
                timeout_seconds=120,
                parameters={
                    "tabu_tenure": 10,
                    "max_iterations": 500,
                    "aspiration_threshold": 0.95,
                }
            ),
            
            vns=SolverConfig(
                name="vns",
                enabled=True,
                weight=0.10,
                timeout_seconds=120,
                parameters={
                    "neighborhood_sizes": [1, 2, 3],
                    "max_iterations": 250,
                    "shake_intensity": 0.3,
                }
            ),
            
            ml=MLConfig(
                enabled=True,
                feature_count=89,
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                update_threshold=50,
            ),
            
            database=DatabaseConfig(
                url=os.getenv("SUPABASE_URL", ""),
                api_key=os.getenv("SUPABASE_KEY", ""),
                cache_enabled=True,
                cache_ttl=1800,  # 30 minutes
                timeout=20,
            ),
            
            log_level="INFO",
            log_to_file=True,
            solution_cache_size=50,
            enable_profiling=True,
        )
    
    @staticmethod
    def production() -> EnsembleConfig:
        """Production profile - fully optimized."""
        return EnsembleConfig(
            parallel_execution=True,
            max_workers=3,
            voting_strategy="weighted",
            
            cpsat=SolverConfig(
                name="cpsat",
                enabled=True,
                weight=0.70,
                timeout_seconds=300,
                parameters={
                    "num_search_workers": 8,
                    "max_time_in_seconds": 300,
                    "random_seed": 42,
                }
            ),
            
            tabu=SolverConfig(
                name="tabu",
                enabled=True,
                weight=0.20,
                timeout_seconds=180,
                parameters={
                    "tabu_tenure": 10,
                    "max_iterations": 1000,
                    "aspiration_threshold": 0.95,
                }
            ),
            
            vns=SolverConfig(
                name="vns",
                enabled=True,
                weight=0.10,
                timeout_seconds=180,
                parameters={
                    "neighborhood_sizes": [1, 2, 3, 5],
                    "max_iterations": 500,
                    "shake_intensity": 0.3,
                }
            ),
            
            ml=MLConfig(
                enabled=True,
                feature_count=89,
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                update_threshold=50,
                retrain_on_startup=False,
            ),
            
            database=DatabaseConfig(
                url=os.getenv("SUPABASE_URL", ""),
                api_key=os.getenv("SUPABASE_KEY", ""),
                cache_enabled=True,
                cache_ttl=3600,  # 1 hour
                timeout=30,
                max_retries=3,
            ),
            
            log_level="INFO",
            log_to_file=True,
            solution_cache_size=100,
            enable_profiling=False,
        )
    
    @staticmethod
    def testing() -> EnsembleConfig:
        """Testing profile - minimal, fast, deterministic."""
        return EnsembleConfig(
            parallel_execution=False,
            max_workers=1,
            voting_strategy="best",
            
            cpsat=SolverConfig(
                name="cpsat",
                enabled=True,
                weight=1.0,
                timeout_seconds=10,
                parameters={
                    "num_search_workers": 1,
                    "max_time_in_seconds": 10,
                    "random_seed": 42,  # Fixed seed for reproducibility
                }
            ),
            
            tabu=SolverConfig(
                name="tabu",
                enabled=False,
                weight=0.0,
                timeout_seconds=5,
                parameters={
                    "tabu_tenure": 3,
                    "max_iterations": 10,
                    "aspiration_threshold": 0.9,
                }
            ),
            
            vns=SolverConfig(
                name="vns",
                enabled=False,
                weight=0.0,
                timeout_seconds=5,
                parameters={
                    "neighborhood_sizes": [1],
                    "max_iterations": 10,
                    "shake_intensity": 0.3,
                }
            ),
            
            ml=MLConfig(
                enabled=False,
                feature_count=89,
            ),
            
            database=DatabaseConfig(
                url="",  # No database in tests
                api_key="",
                cache_enabled=False,
                timeout=5,
            ),
            
            log_level="WARNING",
            log_to_file=False,
            solution_cache_size=5,
            enable_profiling=False,
        )
    
    @staticmethod
    def get_profile(name: str) -> EnsembleConfig:
        """Get configuration profile by name.
        
        Args:
            name: Profile name (development, staging, production, testing)
        
        Returns:
            EnsembleConfig for the specified profile
        
        Raises:
            ValueError: If profile name is unknown
        """
        profiles = {
            "development": ConfigurationProfiles.development,
            "dev": ConfigurationProfiles.development,
            "staging": ConfigurationProfiles.staging,
            "stage": ConfigurationProfiles.staging,
            "production": ConfigurationProfiles.production,
            "prod": ConfigurationProfiles.production,
            "testing": ConfigurationProfiles.testing,
            "test": ConfigurationProfiles.testing,
        }
        
        profile_func = profiles.get(name.lower())
        
        if profile_func is None:
            raise ValueError(
                f"Unknown profile: {name}. "
                f"Available: {', '.join(set(profiles.keys()))}"
            )
        
        return profile_func()
    
    @staticmethod
    def from_environment() -> EnsembleConfig:
        """Get configuration profile from environment variable.
        
        Reads SCHEDULER_PROFILE environment variable.
        Defaults to 'development' if not set.
        
        Returns:
            EnsembleConfig based on environment
        """
        profile_name = os.getenv("SCHEDULER_PROFILE", "development")
        return ConfigurationProfiles.get_profile(profile_name)


def get_profile_config(profile: Optional[str] = None) -> EnsembleConfig:
    """Convenience function to get configuration by profile.
    
    Args:
        profile: Profile name or None to use environment
    
    Returns:
        EnsembleConfig instance
    """
    if profile:
        return ConfigurationProfiles.get_profile(profile)
    return ConfigurationProfiles.from_environment()
