"""
FastAPI Routes for Optimized Timetable Scheduler

Provides endpoints for batch-wise timetable generation,
task status polling, result retrieval, and configuration.

Run with:
  cd academic_campass_2025
  python -m services.optimized.api.server

Or: uvicorn services.optimized.api.routes:app --reload --port 8001

Endpoints:
  POST /generate              Start batch-wise timetable generation
  POST /generate/multi        Generate for multiple batches
  GET  /status/{task_id}      Poll task progress
  GET  /result/{timetable_id} Get generated timetable details
  DELETE /cancel/{task_id}    Cancel a running task
  GET  /config                Current solver configuration
  GET  /health                Health check
"""

import sys
import os
import uuid
import time as _time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Ensure project root is importable
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# Optimized module imports
from core.config import EnsembleConfig, get_config, SolverConfig
from pipeline.orchestrator import OptimizedOrchestrator, PipelineResult
from storage.supabase_client import SupabaseSchedulerClient
from utils.runtime_logger import (
    get_runtime_logger,
    log_request,
    log_response,
)

runtime_logger = get_runtime_logger()


# ============================================================================
# Pydantic request / response models
# ============================================================================

class GenerateRequest(BaseModel):
    """Request body for single-batch timetable generation.

    Accepts both the proxy format (cpsat_time_limit, ga_generations, etc.)
    and direct format (solver_timeout, voting_strategy) for flexibility.
    """
    batch_id: str
    college_id: str
    user_id: str
    # Direct format
    solver_timeout: Optional[int] = None
    voting_strategy: Optional[str] = "weighted"
    # Proxy format (from Next.js /api/scheduler/generate)
    cpsat_time_limit: Optional[int] = None
    ga_generations: Optional[int] = None
    population_size: Optional[int] = None
    strategy: Optional[str] = None
    # ETL pipeline flag
    use_etl: bool = True

    @property
    def effective_timeout(self) -> int:
        """Resolve timeout: prefer solver_timeout, fallback to cpsat_time_limit."""
        return self.solver_timeout or self.cpsat_time_limit or 300


class MultiBatchRequest(BaseModel):
    """Request body for multi-batch timetable generation."""
    batch_ids: List[str]
    college_id: str
    user_id: str
    solver_timeout: Optional[int] = 300


class GenerateResponse(BaseModel):
    """Immediate response after starting generation."""
    success: bool
    task_id: str
    status: str
    message: str


class MultiBatchResponse(BaseModel):
    """Response after starting multi-batch generation."""
    success: bool
    task_ids: List[str]
    message: str


class TaskStatusResponse(BaseModel):
    """Task progress response."""
    task_id: str
    status: str
    progress: float
    phase: str
    message: Optional[str] = None
    timetable_id: Optional[str] = None
    fitness_score: Optional[float] = None
    metrics: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TimetableResponse(BaseModel):
    """Generated timetable details."""
    timetable_id: str
    task_id: str
    batch_id: str
    fitness_score: float
    is_published: bool
    title: str
    assignments: List[Dict[str, Any]]
    created_at: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    timestamp: str
    solvers: List[str]


# ============================================================================
# In-memory task tracking (for real-time progress polling)
# ============================================================================

active_tasks: Dict[str, Dict[str, Any]] = {}


def _update_task_memory(task_id: str, **kwargs):
    """Update in-memory task state."""
    if task_id in active_tasks:
        active_tasks[task_id].update(kwargs)
        active_tasks[task_id]["updated_at"] = datetime.now().isoformat()


# ============================================================================
# Lifespan (startup / shutdown)
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    runtime_logger.info("Optimized Scheduler API starting up...")
    runtime_logger.info(f"  Swagger UI : http://localhost:8001/docs")
    runtime_logger.info(f"  ReDoc      : http://localhost:8001/redoc")
    yield
    runtime_logger.info("Optimized Scheduler API shutting down...")


# ============================================================================
# FastAPI application
# ============================================================================

app = FastAPI(
    title="Optimized Timetable Scheduler API",
    description=(
        "Batch-wise timetable generation using Hybrid GA + CP-SAT "
        "with ML-guided ensemble optimization"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# CORS – allow Next.js frontend (localhost:3000) and any origin in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Logging middleware – logs every request/response
# ============================================================================

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log every request and response with timing."""
    start = _time.perf_counter()
    log_request(request.method, request.url.path)

    response: Response = await call_next(request)

    elapsed_ms = (_time.perf_counter() - start) * 1000
    log_response(request.method, request.url.path, response.status_code, elapsed_ms)
    return response


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    config = get_config()
    enabled = [s.name for s in config.get_enabled_solvers()]
    return HealthResponse(
        status="healthy",
        service="optimized-scheduler",
        version="2.0.0",
        timestamp=datetime.now().isoformat(),
        solvers=enabled,
    )


@app.post("/generate", response_model=GenerateResponse)
async def generate_timetable(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start timetable generation for a single batch.

    Returns immediately with a task_id.
    Poll GET /status/{task_id} for progress.
    """
    task_id = str(uuid.uuid4())

    runtime_logger.info(
        f"New generation request: task={task_id}, "
        f"batch={request.batch_id}, college={request.college_id}"
    )

    timeout = request.effective_timeout

    # Initialise in-memory tracking
    active_tasks[task_id] = {
        "task_id": task_id,
        "status": "pending",
        "phase": "INITIALIZING",
        "progress": 0.0,
        "message": "Task created, starting generation...",
        "batch_id": request.batch_id,
        "college_id": request.college_id,
        "user_id": request.user_id,
        "timetable_id": None,
        "fitness_score": None,
        "metrics": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }

    # Start background task
    background_tasks.add_task(
        _run_generation_background,
        task_id,
        request.batch_id,
        request.college_id,
        request.user_id,
        timeout,
        request.use_etl,
    )

    return GenerateResponse(
        success=True,
        task_id=task_id,
        status="started",
        message="Timetable generation started. Poll /status/{task_id} for updates.",
    )


@app.post("/generate/multi", response_model=MultiBatchResponse)
async def generate_multi_batch(
    request: MultiBatchRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start timetable generation for multiple batches.

    Each batch gets its own task_id. All run sequentially in background.
    """
    task_ids = []
    parent_id = str(uuid.uuid4())

    runtime_logger.info(
        f"Multi-batch request: parent={parent_id}, "
        f"batches={len(request.batch_ids)}"
    )

    for bid in request.batch_ids:
        tid = str(uuid.uuid4())
        task_ids.append(tid)
        active_tasks[tid] = {
            "task_id": tid,
            "status": "pending",
            "phase": "QUEUED",
            "progress": 0.0,
            "message": "Queued for multi-batch run",
            "batch_id": bid,
            "college_id": request.college_id,
            "user_id": request.user_id,
            "timetable_id": None,
            "fitness_score": None,
            "metrics": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

    background_tasks.add_task(
        _run_multi_batch_background,
        task_ids,
        request.batch_ids,
        request.college_id,
        request.user_id,
        request.solver_timeout or 300,
    )

    return MultiBatchResponse(
        success=True,
        task_ids=task_ids,
        message=f"Generation started for {len(request.batch_ids)} batches.",
    )


@app.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get task status.

    Checks in-memory first, falls back to Supabase.
    """
    # In-memory check
    if task_id in active_tasks:
        t = active_tasks[task_id]
        return TaskStatusResponse(
            task_id=task_id,
            status=t["status"],
            progress=t["progress"],
            phase=t["phase"],
            message=t.get("message"),
            timetable_id=t.get("timetable_id"),
            fitness_score=t.get("fitness_score"),
            metrics=t.get("metrics"),
            created_at=t.get("created_at"),
            updated_at=t.get("updated_at"),
        )

    # Supabase fallback
    try:
        db = SupabaseSchedulerClient()
        task_data = db.get_task_status(task_id)
        if task_data:
            tt = db.get_timetable_for_task(task_id)
            return TaskStatusResponse(
                task_id=task_id,
                status=task_data["status"],
                progress=1.0 if task_data["status"] == "COMPLETED" else 0.5,
                phase=task_data["status"].upper(),
                message=task_data.get("current_message"),
                timetable_id=tt["id"] if tt else None,
                fitness_score=tt["fitness_score"] if tt else None,
                created_at=task_data.get("created_at"),
                updated_at=task_data.get("updated_at"),
            )
    except Exception as e:
        runtime_logger.error(f"Error fetching task from DB: {e}")

    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


@app.get("/result/{timetable_id}", response_model=TimetableResponse)
async def get_timetable_result(timetable_id: str):
    """Fetch a generated timetable with its scheduled classes."""
    try:
        db = SupabaseSchedulerClient()
        classes = db.get_scheduled_classes(timetable_id)

        # Get timetable metadata
        tt = (
            db.client.table("generated_timetables")
            .select("*")
            .eq("id", timetable_id)
            .single()
            .execute()
        ).data

        if not tt:
            raise HTTPException(status_code=404, detail="Timetable not found")

        return TimetableResponse(
            timetable_id=timetable_id,
            task_id=tt.get("generation_task_id", ""),
            batch_id=tt.get("batch_id", ""),
            fitness_score=tt.get("fitness_score", 0),
            is_published=tt.get("is_published", False),
            title=tt.get("title", ""),
            assignments=classes,
            created_at=tt.get("created_at"),
        )
    except HTTPException:
        raise
    except Exception as e:
        runtime_logger.error(f"Error fetching timetable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/cancel/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a running task."""
    if task_id in active_tasks:
        active_tasks[task_id]["status"] = "cancelled"
        active_tasks[task_id]["message"] = "Cancelled by user"
        runtime_logger.info(f"Task {task_id} cancelled by user")

        try:
            db = SupabaseSchedulerClient()
            db.update_task_status(task_id, "cancelled", "Cancelled by user")
        except Exception:
            pass

        return {"task_id": task_id, "status": "cancelled"}

    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


@app.get("/config")
async def get_configuration() -> Dict[str, Any]:
    """Get current solver configuration."""
    config = get_config()
    return {
        "parallel_execution": config.parallel_execution,
        "max_workers": config.max_workers,
        "voting_strategy": config.voting_strategy,
        "solvers": {
            "cpsat": {
                "enabled": config.cpsat.enabled,
                "weight": config.cpsat.weight,
                "timeout": config.cpsat.timeout_seconds,
            },
            "tabu": {
                "enabled": config.tabu.enabled,
                "weight": config.tabu.weight,
                "timeout": config.tabu.timeout_seconds,
            },
            "vns": {
                "enabled": config.vns.enabled,
                "weight": config.vns.weight,
                "timeout": config.vns.timeout_seconds,
            },
        },
        "ml": {
            "enabled": config.ml.enabled,
            "feature_count": config.ml.feature_count,
        },
    }


# ============================================================================
# Background runners
# ============================================================================

async def _run_generation_background(
    task_id: str,
    batch_id: str,
    college_id: str,
    user_id: str,
    solver_timeout: int,
    use_etl: bool = True,
):
    """Run single-batch generation in background."""
    try:
        _update_task_memory(task_id, status="running", phase="INITIALIZING", progress=0.05)

        orchestrator = OptimizedOrchestrator()

        def progress_cb(phase: str, progress: float):
            phase_map = {
                "init": "INITIALIZING",
                "fetch": "FETCHING_DATA",
                "etl_done": "ETL_COMPLETE",
                "context": "BUILDING_CONTEXT",
                "solver_done": "SOLVER_COMPLETE",
                "done": "COMPLETED",
            }
            _update_task_memory(
                task_id,
                phase=phase_map.get(phase, phase.upper()),
                progress=progress,
                message=f"Running {phase}...",
            )

        # Use ETL pipeline if enabled, otherwise use legacy path
        run_fn = orchestrator.run_with_etl if use_etl else orchestrator.run
        result: PipelineResult = run_fn(
            batch_id=batch_id,
            college_id=college_id,
            user_id=user_id,
            solver_timeout=solver_timeout,
            progress_callback=progress_cb,
        )

        if result.status == "success":
            _update_task_memory(
                task_id,
                status="completed",
                phase="COMPLETED",
                progress=1.0,
                message="Timetable generated successfully!",
                timetable_id=result.timetable_id,
                fitness_score=result.best_score,
                metrics={
                    "num_assignments": result.num_assignments,
                    "solver_name": result.solver_name,
                    "total_time": result.total_time_seconds,
                    "is_valid": result.is_valid,
                    "step_log": result.step_log,
                },
            )
        else:
            _update_task_memory(
                task_id,
                status="failed",
                phase="FAILED",
                progress=0.0,
                message=result.error_message or "Generation failed",
            )

    except Exception as e:
        runtime_logger.exception(f"Task {task_id} exception: {e}")
        _update_task_memory(
            task_id,
            status="failed",
            phase="ERROR",
            progress=0.0,
            message=str(e),
        )


async def _run_multi_batch_background(
    task_ids: List[str],
    batch_ids: List[str],
    college_id: str,
    user_id: str,
    solver_timeout: int,
):
    """Run multi-batch generation sequentially in background."""
    orchestrator = OptimizedOrchestrator()

    for tid, bid in zip(task_ids, batch_ids):
        try:
            _update_task_memory(tid, status="running", phase="INITIALIZING", progress=0.05)

            def progress_cb(phase: str, progress: float, _tid=tid):
                _update_task_memory(_tid, phase=phase.upper(), progress=progress)

            result = orchestrator.run(
                batch_id=bid,
                college_id=college_id,
                user_id=user_id,
                solver_timeout=solver_timeout,
                progress_callback=progress_cb,
            )

            if result.status == "success":
                _update_task_memory(
                    tid,
                    status="completed",
                    phase="COMPLETED",
                    progress=1.0,
                    timetable_id=result.timetable_id,
                    fitness_score=result.best_score,
                    message="Completed",
                )
            else:
                _update_task_memory(
                    tid,
                    status="failed",
                    phase="FAILED",
                    message=result.error_message,
                )
        except Exception as e:
            runtime_logger.exception(f"Multi-batch task {tid} failed: {e}")
            _update_task_memory(tid, status="failed", phase="ERROR", message=str(e))
