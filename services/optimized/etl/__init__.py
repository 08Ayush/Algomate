"""
ETL (Extract, Transform, Load) Pipeline for Optimized Scheduler.

Provides structured data extraction from Supabase, cleaning/validation
transforms, and transactional loading of generated timetables.

Modules:
    extractor  - Parallel data extraction with validation & caching
    transformer - Data cleaning, quality scoring, faculty matching
    loader     - Transactional timetable persistence with rollback
    pipeline   - ETL orchestrator combining all three phases
    quality    - Data quality report & metrics
"""

from .pipeline import ETLPipeline
from .quality import DataQualityReport
from .extractor import Extractor
from .transformer import Transformer
from .loader import Loader

__all__ = [
    "ETLPipeline",
    "DataQualityReport",
    "Extractor",
    "Transformer",
    "Loader",
]
