"""Performance metrics and tracking utilities."""

import time
import functools
import logging
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict
import statistics


@dataclass
class PerformanceMetric:
    """Single performance metric measurement."""
    name: str
    value: float
    unit: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TimingResult:
    """Result of a timing operation."""
    operation: str
    duration: float
    success: bool
    error: Optional[str] = None


class MetricsCollector:
    """Collects and aggregates performance metrics."""
    
    def __init__(self):
        self.metrics: List[PerformanceMetric] = []
        self.timings: Dict[str, List[float]] = defaultdict(list)
        self.counters: Dict[str, int] = defaultdict(int)
        self.logger = logging.getLogger(__name__)
    
    def record_metric(
        self,
        name: str,
        value: float,
        unit: str = "count",
        **metadata
    ):
        """Record a performance metric.
        
        Args:
            name: Metric name
            value: Metric value
            unit: Unit of measurement (e.g., 'ms', 'count', 'bytes')
            **metadata: Additional metadata
        """
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            metadata=metadata
        )
        self.metrics.append(metric)
        
        self.logger.debug(
            f"Metric recorded: {name}={value}{unit}",
            extra={'metric': metric}
        )
    
    def record_timing(self, operation: str, duration: float):
        """Record operation timing.
        
        Args:
            operation: Operation name
            duration: Duration in seconds
        """
        self.timings[operation].append(duration)
        self.record_metric(operation, duration * 1000, "ms")
    
    def increment_counter(self, name: str, amount: int = 1):
        """Increment a counter.
        
        Args:
            name: Counter name
            amount: Amount to increment
        """
        self.counters[name] += amount
        self.logger.debug(f"Counter {name} incremented to {self.counters[name]}")
    
    def get_timing_stats(self, operation: str) -> Dict[str, float]:
        """Get statistics for an operation's timings.
        
        Args:
            operation: Operation name
        
        Returns:
            Dictionary with min, max, mean, median, std
        """
        timings = self.timings.get(operation, [])
        
        if not timings:
            return {}
        
        return {
            'count': len(timings),
            'min': min(timings),
            'max': max(timings),
            'mean': statistics.mean(timings),
            'median': statistics.median(timings),
            'std': statistics.stdev(timings) if len(timings) > 1 else 0.0,
            'total': sum(timings)
        }
    
    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        """Get statistics for all operations."""
        return {
            operation: self.get_timing_stats(operation)
            for operation in self.timings.keys()
        }
    
    def get_counter(self, name: str) -> int:
        """Get counter value."""
        return self.counters.get(name, 0)
    
    def get_all_counters(self) -> Dict[str, int]:
        """Get all counters."""
        return dict(self.counters)
    
    def reset(self):
        """Reset all metrics."""
        self.metrics.clear()
        self.timings.clear()
        self.counters.clear()
        self.logger.info("Metrics reset")
    
    def get_summary(self) -> Dict:
        """Get comprehensive metrics summary."""
        return {
            'metrics_count': len(self.metrics),
            'operations': list(self.timings.keys()),
            'timing_stats': self.get_all_stats(),
            'counters': self.get_all_counters(),
            'total_operations': sum(len(v) for v in self.timings.values())
        }


# Global metrics collector
_metrics_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> MetricsCollector:
    """Get or create global metrics collector."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector


def timer(operation_name: Optional[str] = None):
    """Decorator to time function execution.
    
    Args:
        operation_name: Custom operation name (defaults to function name)
    
    Example:
        @timer()
        def my_function():
            pass
        
        @timer("custom_operation")
        def another_function():
            pass
    """
    def decorator(func: Callable) -> Callable:
        op_name = operation_name or func.__name__
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            collector = get_metrics_collector()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                collector.record_timing(op_name, duration)
                collector.increment_counter(f"{op_name}_success")
                return result
            
            except Exception as e:
                duration = time.time() - start_time
                collector.record_timing(f"{op_name}_failed", duration)
                collector.increment_counter(f"{op_name}_error")
                raise
        
        return wrapper
    return decorator


class Timer:
    """Context manager for timing code blocks.
    
    Example:
        with Timer("my_operation"):
            # code to time
            pass
        
        with Timer("db_query") as t:
            # code
            pass
        print(f"Took {t.duration}s")
    """
    
    def __init__(self, operation: str, log: bool = True):
        self.operation = operation
        self.log = log
        self.start_time = None
        self.duration = None
        self.collector = get_metrics_collector()
        self.logger = logging.getLogger(__name__)
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration = time.time() - self.start_time
        
        if exc_type is None:
            self.collector.record_timing(self.operation, self.duration)
            if self.log:
                self.logger.debug(
                    f"{self.operation} completed in {self.duration*1000:.2f}ms"
                )
        else:
            self.collector.record_timing(f"{self.operation}_failed", self.duration)
            if self.log:
                self.logger.error(
                    f"{self.operation} failed after {self.duration*1000:.2f}ms"
                )
        
        return False  # Don't suppress exceptions


def log_performance(func: Callable) -> Callable:
    """Decorator that logs function performance with detailed metrics.
    
    Example:
        @log_performance
        def expensive_operation():
            pass
    """
    logger = logging.getLogger(func.__module__)
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        collector = get_metrics_collector()
        start_time = time.time()
        
        logger.info(f"Starting {func.__name__}")
        
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            logger.info(
                f"Completed {func.__name__} in {duration*1000:.2f}ms"
            )
            
            collector.record_timing(func.__name__, duration)
            collector.increment_counter(f"{func.__name__}_calls")
            
            return result
        
        except Exception as e:
            duration = time.time() - start_time
            
            logger.exception(
                f"Failed {func.__name__} after {duration*1000:.2f}ms: {e}"
            )
            
            collector.record_timing(f"{func.__name__}_error", duration)
            collector.increment_counter(f"{func.__name__}_errors")
            
            raise
    
    return wrapper
