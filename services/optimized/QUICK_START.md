# Quick Start Guide

## Installation

1. **Install Python 3.9 or higher**

2. **Install dependencies**:
```bash
cd services/optimized
pip install -r requirements.txt
```

3. **Set up environment**:
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Supabase credentials
# SUPABASE_URL=your_url_here
# SUPABASE_KEY=your_key_here
# SCHEDULER_PROFILE=development
```

4. **Verify installation**:
```bash
python -c "from core import EnsembleConfig; print('✅ Installation successful!')"
```

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov

# Run specific test file
pytest tests/test_models.py

# Run with verbose output
pytest -v
```

## Code Quality

```bash
# Format code with black
black .

# Check code with flake8
flake8 .

# Type checking with mypy
mypy .
```

## Using Configuration Profiles

```python
from core.profiles import get_profile_config

# Development (fast iteration, single solver)
config = get_profile_config("development")

# Staging (full ensemble, similar to production)
config = get_profile_config("staging")

# Production (optimized, all features)
config = get_profile_config("production")

# Testing (minimal, deterministic)
config = get_profile_config("testing")

# Or use environment variable
# Set SCHEDULER_PROFILE=production
config = get_profile_config()
```

## Examples

### Basic Usage

```python
from core import SchedulingContext, InstitutionConfig
from core.profiles import get_profile_config
from storage import DatabaseClient

# Load configuration
config = get_profile_config("development")

# Create database client
db = DatabaseClient(config.database)

# Fetch data (async)
import asyncio

async def fetch_data():
    time_slots = await db.fetch_time_slots("institution_id")
    rooms = await db.fetch_rooms("institution_id")
    faculty = await db.fetch_faculty("institution_id")
    batches = await db.fetch_batches("institution_id")
    subjects = await db.fetch_subjects("institution_id")
    
    # Create scheduling context
    context = SchedulingContext(
        time_slots=time_slots,
        rooms=rooms,
        faculty=faculty,
        batches=batches,
        subjects=subjects,
        config=InstitutionConfig(
            institution_id="institution_id",
            academic_year="2025-26"
        )
    )
    
    return context

# Run
context = asyncio.run(fetch_data())
```

### Using Metrics

```python
from utils.metrics import timer, Timer, get_metrics_collector

# Decorator
@timer()
def my_function():
    pass

# Context manager
with Timer("operation_name"):
    # code to time
    pass

# Get statistics
collector = get_metrics_collector()
stats = collector.get_all_stats()
print(stats)
```

### Using Validation

```python
from utils.validation import Validator

validator = Validator()

# Validate individual entities
validator.validate_time_slot(slot)
validator.validate_room(room)
validator.validate_faculty(faculty)

# Validate all
report = validator.validate_all(
    time_slots, rooms, faculty, batches, subjects
)

if report['valid']:
    print("✅ All validations passed")
else:
    print(f"❌ {report['error_count']} errors found")
    for error in report['errors']:
        print(f"  - {error}")
```

### Using Cache

```python
from storage.cache import cache_result, get_cache

# Decorator
@cache_result(ttl=600, key_prefix="schedule")
def expensive_operation(param):
    # expensive computation
    return result

# Manual caching
cache = get_cache()
cache.set("key", "value", ttl=300)
value = cache.get("key")

# Statistics
stats = cache.get_stats()
print(f"Hit rate: {stats['hit_rate']}")
```

### Health Checks

```python
from utils.health import get_health_checker

checker = get_health_checker()

# Quick check
if checker.is_healthy():
    print("✅ System is healthy")
else:
    print("⚠️ System has issues")

# Detailed report
health = checker.check_health()
print(health)
```

## Environment Variables

```bash
# Required
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Optional
SCHEDULER_PROFILE=development  # or staging, production, testing
LOG_LEVEL=INFO
CACHE_ENABLED=true
CACHE_TTL=3600
MAX_WORKERS=3
```

## Next Steps

Phase 1 is 100% complete. Ready for:
- ✅ Integration testing with real data
- ✅ Performance benchmarking
- 🔜 Phase 3: ML Layer implementation
- 🔜 Phase 4: Adaptive Learning
- 🔜 Phase 5: Production Polish
