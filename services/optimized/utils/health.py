"""Health check and system monitoring."""

from typing import Dict, Any
from datetime import datetime
import logging
import psutil
import os

from utils.metrics import get_metrics_collector
from storage.cache import get_cache


class HealthChecker:
    """System health monitoring."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.start_time = datetime.now()
    
    def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check.
        
        Returns:
            Health status dictionary
        """
        return {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'uptime_seconds': (datetime.now() - self.start_time).total_seconds(),
            'system': self._check_system(),
            'cache': self._check_cache(),
            'metrics': self._check_metrics(),
        }
    
    def _check_system(self) -> Dict[str, Any]:
        """Check system resources."""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_mb': memory.available / (1024 * 1024),
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / (1024 * 1024 * 1024),
                'process_id': os.getpid(),
            }
        except Exception as e:
            self.logger.error(f"System check failed: {e}")
            return {'error': str(e)}
    
    def _check_cache(self) -> Dict[str, Any]:
        """Check cache status."""
        try:
            cache = get_cache()
            stats = cache.get_stats()
            
            return {
                'enabled': True,
                'size': stats['size'],
                'max_size': stats['max_size'],
                'hit_rate': stats['hit_rate'],
                'total_requests': stats['total_requests'],
            }
        except Exception as e:
            self.logger.error(f"Cache check failed: {e}")
            return {'enabled': False, 'error': str(e)}
    
    def _check_metrics(self) -> Dict[str, Any]:
        """Check metrics collection."""
        try:
            collector = get_metrics_collector()
            summary = collector.get_summary()
            
            return {
                'enabled': True,
                'metrics_count': summary['metrics_count'],
                'operations': len(summary['operations']),
                'total_operations': summary['total_operations'],
            }
        except Exception as e:
            self.logger.error(f"Metrics check failed: {e}")
            return {'enabled': False, 'error': str(e)}
    
    def is_healthy(self) -> bool:
        """Quick health check.
        
        Returns:
            True if system is healthy
        """
        health = self.check_health()
        
        # Check critical metrics
        system = health.get('system', {})
        
        if system.get('memory_percent', 0) > 95:
            self.logger.warning("Memory usage critical: >95%")
            return False
        
        if system.get('disk_percent', 0) > 95:
            self.logger.warning("Disk usage critical: >95%")
            return False
        
        return health.get('status') == 'healthy'


# Global health checker
_health_checker: HealthChecker = None


def get_health_checker() -> HealthChecker:
    """Get or create global health checker."""
    global _health_checker
    if _health_checker is None:
        _health_checker = HealthChecker()
    return _health_checker
