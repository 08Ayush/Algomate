"""
FastAPI Server Entry Point for Optimized Scheduler

Usage:
  cd academic_campass_2025
  python services/optimized/api/server.py

Or with uvicorn directly:
  cd services/optimized
  uvicorn api.routes:app --reload --port 8001
"""

import sys
from pathlib import Path

# Ensure the optimized package root is on sys.path so that
# `from core.models import ...` style imports work.
_OPTIMIZED_ROOT = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _OPTIMIZED_ROOT.parent.parent

if str(_OPTIMIZED_ROOT) not in sys.path:
    sys.path.insert(0, str(_OPTIMIZED_ROOT))
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import uvicorn
from utils.runtime_logger import get_runtime_logger


def main():
    """Launch the Optimized Scheduler API server."""
    logger = get_runtime_logger()

    logger.info("=" * 60)
    logger.info("  OPTIMIZED SCHEDULER API SERVER")
    logger.info("=" * 60)
    logger.info(f"  Project root : {_PROJECT_ROOT}")
    logger.info(f"  Optimized pkg: {_OPTIMIZED_ROOT}")
    logger.info(f"  Port         : 8001")
    logger.info(f"  Swagger UI   : http://localhost:8001/docs")
    logger.info(f"  ReDoc        : http://localhost:8001/redoc")
    logger.info("=" * 60)

    uvicorn.run(
        "api.routes:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
