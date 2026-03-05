"""Database client (legacy - backed by Neon/psycopg2 after Supabase migration)."""

import asyncio
import time
import functools
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import logging
from functools import lru_cache

# Supabase removed - legacy stub so tests that import DatabaseClient still work
Client = None
def create_client(url, key):  # noqa: F811
    return None

from core.models import (
    TimeSlot,
    Room,
    Faculty,
    Batch,
    Subject,
    Assignment,
    Solution,
)


def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """Decorator to retry failed operations.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Delay between retries in seconds
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(self, *args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(self, *args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt < max_retries - 1:
                        self.logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay}s..."
                        )
                        time.sleep(delay * (attempt + 1))  # Exponential backoff
                    else:
                        self.logger.error(
                            f"All {max_retries} attempts failed for {func.__name__}: {e}"
                        )
            
            raise last_exception
        
        return wrapper
    return decorator
from core.context import SchedulingContext, InstitutionConfig
from core.config import DatabaseConfig


class DatabaseClient:
    """Async database client with caching."""
    
    def __init__(self, config: DatabaseConfig):
        """Initialize database client.
        
        Args:
            config: Database configuration
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Always run in offline mode - production uses SupabaseSchedulerClient (psycopg2)
        self.logger.info("DatabaseClient: running in offline mode (use SupabaseSchedulerClient for Neon)")
        self.client: Optional[object] = None
        
        self._cache: Dict[str, tuple[Any, datetime]] = {}
    
    def _get_cache_key(self, table: str, filters: Dict) -> str:
        """Generate cache key from table and filters."""
        filter_str = "_".join(f"{k}={v}" for k, v in sorted(filters.items()))
        return f"{table}:{filter_str}"
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        if not self.config.cache_enabled:
            return None
        
        if key in self._cache:
            value, timestamp = self._cache[key]
            if datetime.now() - timestamp < timedelta(seconds=self.config.cache_ttl):
                self.logger.debug(f"Cache hit for key: {key}")
                return value
            else:
                del self._cache[key]
        
        return None
    
    def _set_cache(self, key: str, value: Any):
        """Set value in cache."""
        if self.config.cache_enabled:
            self._cache[key] = (value, datetime.now())
    
    async def fetch_scheduling_context(self, institution_id: str) -> SchedulingContext:
        """Fetch complete scheduling context for an institution.
        
        Args:
            institution_id: Institution ID
        
        Returns:
            Complete scheduling context
        """
        self.logger.info(f"Fetching scheduling context for institution: {institution_id}")
        
        # Fetch all required data in parallel
        time_slots, rooms, faculty, batches, subjects = await asyncio.gather(
            self.fetch_time_slots(institution_id),
            self.fetch_rooms(institution_id),
            self.fetch_faculty(institution_id),
            self.fetch_batches(institution_id),
            self.fetch_subjects(institution_id),
        )
        
        # Create institution config (simplified for now)
        institution = InstitutionConfig(
            id=institution_id,
            name=f"Institution_{institution_id}",
        )
        
        context = SchedulingContext(
            institution=institution,
            time_slots=time_slots,
            rooms=rooms,
            faculty=faculty,
            batches=batches,
            subjects=subjects,
        )
        
        # Validate context
        errors = context.validate()
        if errors:
            self.logger.warning(f"Context validation warnings: {errors}")
        
        self.logger.info(
            f"Context loaded: {len(time_slots)} slots, {len(rooms)} rooms, "
            f"{len(faculty)} faculty, {len(batches)} batches, {len(subjects)} subjects"
        )
        
        return context
    
    async def fetch_time_slots(self, institution_id: str) -> List[TimeSlot]:
        """Fetch time slots for an institution."""
        cache_key = self._get_cache_key("time_slots", {"institution_id": institution_id})
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        if not self.client:
            return self._generate_default_time_slots()
        
        try:
            response = self.client.table("time_slots").select("*").eq(
                "institution_id", institution_id
            ).execute()
            
            time_slots = [
                TimeSlot(
                    id=row['id'],
                    day=row['day'],
                    start_hour=row['start_hour'],
                    start_minute=row['start_minute'],
                    duration_minutes=row['duration_minutes'],
                    is_lab_slot=row.get('is_lab_slot', False),
                )
                for row in response.data
            ]
            
            self._set_cache(cache_key, time_slots)
            return time_slots
        
        except Exception as e:
            self.logger.error(f"Failed to fetch time slots: {e}")
            return self._generate_default_time_slots()
    
    async def fetch_rooms(self, institution_id: str) -> List[Room]:
        """Fetch rooms for an institution."""
        cache_key = self._get_cache_key("rooms", {"institution_id": institution_id})
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        if not self.client:
            return []
        
        try:
            response = self.client.table("rooms").select("*").eq(
                "institution_id", institution_id
            ).execute()
            
            rooms = [
                Room(
                    id=row['id'],
                    name=row['name'],
                    capacity=row['capacity'],
                    room_type=row['room_type'],
                    building=row.get('building', 'Main'),
                    floor=row.get('floor', 1),
                    facilities=row.get('facilities', []),
                    is_available=row.get('is_available', True),
                )
                for row in response.data
            ]
            
            self._set_cache(cache_key, rooms)
            return rooms
        
        except Exception as e:
            self.logger.error(f"Failed to fetch rooms: {e}")
            return []
    
    async def fetch_faculty(self, institution_id: str) -> List[Faculty]:
        """Fetch faculty for an institution."""
        cache_key = self._get_cache_key("faculty", {"institution_id": institution_id})
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        if not self.client:
            return []
        
        try:
            response = self.client.table("faculty").select("*").eq(
                "institution_id", institution_id
            ).execute()
            
            faculty = [
                Faculty(
                    id=row['id'],
                    name=row['name'],
                    department=row['department'],
                    designation=row.get('designation', 'Assistant Professor'),
                    max_hours_per_week=row.get('max_hours_per_week', 20),
                    min_hours_per_week=row.get('min_hours_per_week', 12),
                    preferred_time_slots=row.get('preferred_time_slots', []),
                    unavailable_slots=row.get('unavailable_slots', []),
                    qualifications=row.get('qualifications', []),
                    rank_weight=row.get('rank_weight', 1.0),
                )
                for row in response.data
            ]
            
            self._set_cache(cache_key, faculty)
            return faculty
        
        except Exception as e:
            self.logger.error(f"Failed to fetch faculty: {e}")
            return []
    
    async def fetch_batches(self, institution_id: str) -> List[Batch]:
        """Fetch batches for an institution."""
        cache_key = self._get_cache_key("batches", {"institution_id": institution_id})
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        if not self.client:
            return []
        
        try:
            response = self.client.table("batches").select("*").eq(
                "institution_id", institution_id
            ).execute()
            
            batches = [
                Batch(
                    id=row['id'],
                    name=row['name'],
                    program=row['program'],
                    semester=row['semester'],
                    year=row['year'],
                    strength=row['strength'],
                    department=row['department'],
                    subjects=row.get('subjects', []),
                )
                for row in response.data
            ]
            
            self._set_cache(cache_key, batches)
            return batches
        
        except Exception as e:
            self.logger.error(f"Failed to fetch batches: {e}")
            return []
    
    async def fetch_subjects(self, institution_id: str) -> List[Subject]:
        """Fetch subjects for an institution."""
        cache_key = self._get_cache_key("subjects", {"institution_id": institution_id})
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        if not self.client:
            return []
        
        try:
            response = self.client.table("subjects").select("*").eq(
                "institution_id", institution_id
            ).execute()
            
            subjects = [
                Subject(
                    id=row['id'],
                    name=row['name'],
                    code=row['code'],
                    credits=row['credits'],
                    hours_per_week=row['hours_per_week'],
                    is_lab=row.get('is_lab', False),
                    is_elective=row.get('is_elective', False),
                    max_students=row.get('max_students'),
                    room_requirements=row.get('room_requirements', []),
                    required_qualifications=row.get('required_qualifications', []),
                    prerequisites=row.get('prerequisites', []),
                )
                for row in response.data
            ]
            
            self._set_cache(cache_key, subjects)
            return subjects
        
        except Exception as e:
            self.logger.error(f"Failed to fetch subjects: {e}")
            return []
    
    async def save_solution(self, solution: Solution, institution_id: str) -> bool:
        """Save a solution to the database.
        
        Args:
            solution: Solution to save
            institution_id: Institution ID
        
        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            self.logger.warning("Cannot save solution: database not connected")
            return False
        
        try:
            solution_data = {
                'id': solution.id,
                'institution_id': institution_id,
                'quality_score': solution.quality_score,
                'solver_name': solution.solver_name,
                'execution_time': solution.execution_time,
                'is_valid': solution.is_valid,
                'created_at': solution.created_at.isoformat(),
                'metadata': solution.metadata,
            }
            
            self.client.table("solutions").insert(solution_data).execute()
            
            # Save assignments
            assignment_data = [
                {
                    'solution_id': solution.id,
                    'batch_id': assignment.batch_id,
                    'subject_id': assignment.subject_id,
                    'faculty_id': assignment.faculty_id,
                    'room_id': assignment.room_id,
                    'time_slot_id': assignment.time_slot.id,
                    'is_lab_session': assignment.is_lab_session,
                }
                for assignment in solution.assignments
            ]
            
            if assignment_data:
                self.client.table("assignments").insert(assignment_data).execute()
            
            self.logger.info(f"Saved solution {solution.id} with {len(solution.assignments)} assignments")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to save solution: {e}")
            return False
    
    def _generate_default_time_slots(self) -> List[TimeSlot]:
        """Generate default time slots (9 AM - 5 PM, Mon-Sat)."""
        time_slots = []
        slot_id = 0
        
        for day in range(6):  # Monday to Saturday
            for hour in range(9, 17):  # 9 AM to 5 PM
                if hour == 13:  # Skip 1 PM (lunch break)
                    continue
                
                time_slots.append(
                    TimeSlot(
                        id=f"slot_{slot_id}",
                        day=day,
                        start_hour=hour,
                        start_minute=0,
                        duration_minutes=60,
                        is_lab_slot=(hour >= 14),  # Afternoon slots for labs
                    )
                )
                slot_id += 1
        
        return time_slots
    
    def clear_cache(self):
        """Clear all cached data."""
        self._cache.clear()
        self.logger.info("Cache cleared")
