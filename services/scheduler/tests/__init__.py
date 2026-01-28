"""
Test suite for the hybrid scheduler package.

Run tests with:
    pytest services/scheduler/tests/ -v
    
Run with coverage:
    pytest services/scheduler/tests/ --cov=services.scheduler --cov-report=html
"""

__all__ = [
    'test_chromosome_encoder',
    'test_fitness_calculator',
    'test_integration',
]
