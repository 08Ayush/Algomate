"""Unit tests for metrics collection."""

import pytest
import time

from utils.metrics import (
    MetricsCollector,
    get_metrics_collector,
    timer,
    Timer,
    log_performance,
)


class TestMetricsCollector:
    """Tests for MetricsCollector class."""
    
    def test_record_metric(self):
        """Test recording a metric."""
        collector = MetricsCollector()
        
        collector.record_metric("test_metric", 42.5, "ms")
        
        assert len(collector.metrics) == 1
        assert collector.metrics[0].name == "test_metric"
        assert collector.metrics[0].value == 42.5
    
    def test_record_timing(self):
        """Test recording timing."""
        collector = MetricsCollector()
        
        collector.record_timing("operation", 0.5)
        
        assert "operation" in collector.timings
        assert len(collector.timings["operation"]) == 1
    
    def test_increment_counter(self):
        """Test counter increment."""
        collector = MetricsCollector()
        
        collector.increment_counter("test_count")
        collector.increment_counter("test_count", 5)
        
        assert collector.get_counter("test_count") == 6
    
    def test_timing_stats(self):
        """Test timing statistics."""
        collector = MetricsCollector()
        
        for i in range(5):
            collector.record_timing("op", i * 0.1)
        
        stats = collector.get_timing_stats("op")
        
        assert stats['count'] == 5
        assert stats['min'] == 0.0
        assert stats['max'] == 0.4


class TestTimerDecorator:
    """Tests for timer decorator."""
    
    def test_timer_decorator(self):
        """Test @timer decorator."""
        collector = get_metrics_collector()
        collector.reset()
        
        @timer()
        def slow_function():
            time.sleep(0.01)
            return "done"
        
        result = slow_function()
        
        assert result == "done"
        assert "slow_function" in collector.timings
    
    def test_timer_with_custom_name(self):
        """Test @timer with custom name."""
        collector = get_metrics_collector()
        collector.reset()
        
        @timer("custom_op")
        def my_function():
            return "result"
        
        result = my_function()
        
        assert result == "result"
        assert "custom_op" in collector.timings


class TestTimerContext:
    """Tests for Timer context manager."""
    
    def test_timer_context(self):
        """Test Timer context manager."""
        collector = get_metrics_collector()
        collector.reset()
        
        with Timer("test_operation") as t:
            time.sleep(0.01)
        
        assert t.duration > 0
        assert "test_operation" in collector.timings
    
    def test_timer_duration(self):
        """Test Timer duration measurement."""
        with Timer("test", log=False) as t:
            time.sleep(0.01)
        
        assert t.duration >= 0.01
        assert t.duration < 0.1


class TestLogPerformance:
    """Tests for log_performance decorator."""
    
    def test_log_performance(self):
        """Test @log_performance decorator."""
        collector = get_metrics_collector()
        collector.reset()
        
        @log_performance
        def compute():
            return sum(range(1000))
        
        result = compute()
        
        assert result == sum(range(1000))
        assert collector.get_counter("compute_calls") == 1
