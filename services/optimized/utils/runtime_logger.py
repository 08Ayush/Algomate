"""
Runtime Logger for Optimized Scheduler

Provides detailed step-by-step logging for algorithm execution,
FastAPI request/response logging, and pipeline phase tracking.

Each pipeline step is logged with timing, counts, and status
so operators can trace exactly what happened during a generation run.
"""

import logging
import sys
import time
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
from contextlib import contextmanager
from functools import wraps


# ---------------------------------------------------------------------------
# Runtime logger setup
# ---------------------------------------------------------------------------

_runtime_logger: Optional[logging.Logger] = None


def get_runtime_logger() -> logging.Logger:
    """Get or create the runtime logger with file + console handlers."""
    global _runtime_logger
    if _runtime_logger is not None:
        return _runtime_logger

    logger = logging.getLogger("optimized.runtime")
    logger.setLevel(logging.DEBUG)

    # Avoid duplicate handlers
    if logger.handlers:
        _runtime_logger = logger
        return logger

    # ── Console handler ──────────────────────────────────────────
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    ))
    logger.addHandler(console)

    # ── File handler (detailed) ──────────────────────────────────
    log_dir = Path(__file__).resolve().parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / f"runtime_{datetime.now():%Y%m%d}.log"

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(file_handler)

    _runtime_logger = logger
    logger.info(f"Runtime log file: {log_file}")
    return logger


# ---------------------------------------------------------------------------
# Step tracker – wraps each pipeline phase with timing
# ---------------------------------------------------------------------------

class PipelineStepTracker:
    """
    Tracks and logs individual pipeline steps with timing and context.

    Usage:
        tracker = PipelineStepTracker(task_id="abc-123")
        with tracker.step("FETCH_DATA", "Fetching batch domain data"):
            data = client.fetch_batch_data(...)
        with tracker.step("RUN_SOLVER", "Running ensemble solver"):
            solution = coordinator.solve()
    """

    def __init__(self, task_id: str, logger: Optional[logging.Logger] = None):
        self.task_id = task_id
        self.logger = logger or get_runtime_logger()
        self.steps: list[Dict[str, Any]] = []
        self.start_time = time.perf_counter()
        self.logger.info(f"[{task_id}] Pipeline tracker initialised")

    @contextmanager
    def step(self, name: str, description: str = ""):
        """Context manager that logs step start/end with elapsed time."""
        step_start = time.perf_counter()
        step_info: Dict[str, Any] = {
            "name": name,
            "description": description,
            "started_at": datetime.now().isoformat(),
            "status": "running",
        }
        self.steps.append(step_info)
        self.logger.info(f"[{self.task_id}] >> STEP {name}: {description}")

        try:
            yield step_info
            elapsed = time.perf_counter() - step_start
            step_info["status"] = "completed"
            step_info["elapsed_seconds"] = round(elapsed, 3)
            self.logger.info(
                f"[{self.task_id}] << STEP {name}: completed in {elapsed:.3f}s"
            )
        except Exception as exc:
            elapsed = time.perf_counter() - step_start
            step_info["status"] = "failed"
            step_info["elapsed_seconds"] = round(elapsed, 3)
            step_info["error"] = str(exc)
            self.logger.error(
                f"[{self.task_id}] << STEP {name}: FAILED after {elapsed:.3f}s – {exc}"
            )
            raise

    @property
    def total_elapsed(self) -> float:
        return round(time.perf_counter() - self.start_time, 3)

    def summary(self) -> Dict[str, Any]:
        """Return a summary dict suitable for JSON serialisation."""
        return {
            "task_id": self.task_id,
            "total_elapsed_seconds": self.total_elapsed,
            "steps": self.steps,
        }


# ---------------------------------------------------------------------------
# Request logger middleware helper
# ---------------------------------------------------------------------------

def log_request(method: str, path: str, body: Any = None):
    """Log an incoming API request."""
    logger = get_runtime_logger()
    logger.info(f"API REQUEST  {method} {path}")
    if body:
        logger.debug(f"  Body: {body}")


def log_response(method: str, path: str, status_code: int, elapsed_ms: float):
    """Log an API response."""
    logger = get_runtime_logger()
    level = logging.WARNING if status_code >= 400 else logging.INFO
    logger.log(level, f"API RESPONSE {method} {path} -> {status_code} ({elapsed_ms:.1f}ms)")


# ---------------------------------------------------------------------------
# Function-level timing decorator
# ---------------------------------------------------------------------------

def timed(func):
    """Decorator that logs function entry, exit, and elapsed time."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_runtime_logger()
        fname = func.__qualname__
        logger.debug(f">>> {fname} started")
        t0 = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            elapsed = (time.perf_counter() - t0) * 1000
            logger.debug(f"<<< {fname} completed in {elapsed:.1f}ms")
            return result
        except Exception as exc:
            elapsed = (time.perf_counter() - t0) * 1000
            logger.error(f"<<< {fname} failed after {elapsed:.1f}ms: {exc}")
            raise
    return wrapper
