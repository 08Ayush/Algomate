"""Configuration management for the ensemble scheduler."""

from dataclasses import dataclass, field
from typing import Dict, Optional
from pathlib import Path
import os
import json


@dataclass
class SolverConfig:
    """Configuration for individual solvers."""
    name: str
    enabled: bool = True
    weight: float = 1.0
    timeout_seconds: int = 300
    parameters: Dict = field(default_factory=dict)


@dataclass
class MLConfig:
    """Configuration for ML components."""
    enabled: bool = True
    model_path: Optional[Path] = None
    patterns_path: Optional[Path] = None
    
    # Feature extraction
    feature_count: int = 89
    feature_normalization: bool = True
    
    # Quality prediction
    n_estimators: int = 100
    learning_rate: float = 0.1
    max_depth: int = 5
    
    # Incremental learning
    update_threshold: int = 50
    retrain_on_startup: bool = False


@dataclass
class DatabaseConfig:
    """Database configuration."""
    url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    cache_enabled: bool = True
    cache_ttl: int = 3600  # seconds


@dataclass
class EnsembleConfig:
    """Main ensemble configuration."""
    
    # Ensemble settings
    parallel_execution: bool = True
    max_workers: int = 3
    voting_strategy: str = "weighted"  # "weighted", "majority", "best"
    
    # Solver configurations
    cpsat: SolverConfig = field(default_factory=lambda: SolverConfig(
        name="cpsat",
        enabled=True,
        weight=0.70,
        timeout_seconds=300,
        parameters={
            "num_search_workers": 8,
            "max_time_in_seconds": 300,
            "random_seed": 42,
        }
    ))
    
    tabu: SolverConfig = field(default_factory=lambda: SolverConfig(
        name="tabu",
        enabled=True,
        weight=0.20,
        timeout_seconds=180,
        parameters={
            "tabu_tenure": 10,
            "max_iterations": 1000,
            "aspiration_threshold": 0.95,
        }
    ))
    
    vns: SolverConfig = field(default_factory=lambda: SolverConfig(
        name="vns",
        enabled=True,
        weight=0.10,
        timeout_seconds=180,
        parameters={
            "neighborhood_sizes": [1, 2, 3, 5],
            "max_iterations": 500,
            "shake_intensity": 0.3,
        }
    ))
    
    # ML configuration
    ml: MLConfig = field(default_factory=MLConfig)
    
    # Database configuration
    database: DatabaseConfig = field(default_factory=lambda: DatabaseConfig(
        url=os.getenv("SUPABASE_URL", ""),
        api_key=os.getenv("SUPABASE_KEY", ""),
    ))
    
    # Logging
    log_level: str = "INFO"
    log_to_file: bool = True
    log_file_path: Optional[Path] = None
    
    # Performance
    solution_cache_size: int = 100
    enable_profiling: bool = False
    
    @classmethod
    def from_json(cls, json_path: Path) -> 'EnsembleConfig':
        """Load configuration from JSON file."""
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Convert nested dicts to dataclass instances
        if 'cpsat' in data:
            data['cpsat'] = SolverConfig(**data['cpsat'])
        if 'tabu' in data:
            data['tabu'] = SolverConfig(**data['tabu'])
        if 'vns' in data:
            data['vns'] = SolverConfig(**data['vns'])
        if 'ml' in data:
            data['ml'] = MLConfig(**data['ml'])
        if 'database' in data:
            data['database'] = DatabaseConfig(**data['database'])
        
        return cls(**data)
    
    def to_json(self, json_path: Path):
        """Save configuration to JSON file."""
        data = {
            'parallel_execution': self.parallel_execution,
            'max_workers': self.max_workers,
            'voting_strategy': self.voting_strategy,
            'cpsat': {
                'name': self.cpsat.name,
                'enabled': self.cpsat.enabled,
                'weight': self.cpsat.weight,
                'timeout_seconds': self.cpsat.timeout_seconds,
                'parameters': self.cpsat.parameters,
            },
            'tabu': {
                'name': self.tabu.name,
                'enabled': self.tabu.enabled,
                'weight': self.tabu.weight,
                'timeout_seconds': self.tabu.timeout_seconds,
                'parameters': self.tabu.parameters,
            },
            'vns': {
                'name': self.vns.name,
                'enabled': self.vns.enabled,
                'weight': self.vns.weight,
                'timeout_seconds': self.vns.timeout_seconds,
                'parameters': self.vns.parameters,
            },
            'log_level': self.log_level,
            'log_to_file': self.log_to_file,
        }
        
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def get_enabled_solvers(self) -> list[SolverConfig]:
        """Get list of enabled solvers."""
        solvers = []
        if self.cpsat.enabled:
            solvers.append(self.cpsat)
        if self.tabu.enabled:
            solvers.append(self.tabu)
        if self.vns.enabled:
            solvers.append(self.vns)
        return solvers
    
    def normalize_weights(self):
        """Normalize solver weights to sum to 1.0."""
        total_weight = sum(
            solver.weight
            for solver in self.get_enabled_solvers()
        )
        
        if total_weight > 0:
            self.cpsat.weight /= total_weight
            self.tabu.weight /= total_weight
            self.vns.weight /= total_weight


# Global configuration instance
_config: Optional[EnsembleConfig] = None


def get_config() -> EnsembleConfig:
    """Get or create global configuration instance."""
    global _config
    if _config is None:
        # Try to load from environment or use defaults
        config_path = os.getenv("SCHEDULER_CONFIG_PATH")
        if config_path and Path(config_path).exists():
            _config = EnsembleConfig.from_json(Path(config_path))
        else:
            _config = EnsembleConfig()
            _config.normalize_weights()
    return _config


def set_config(config: EnsembleConfig):
    """Set global configuration instance."""
    global _config
    _config = config
