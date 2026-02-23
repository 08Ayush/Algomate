"""
FastAPI Server for Hybrid Timetable Scheduler

Run with: 
  cd d:\\COMP\\academic_campass_2025
  envs\\Scripts\\python services\\scheduler\\api.py

Or: uvicorn services.scheduler.api:app --reload --port 8000

Endpoints:
- POST /generate - Start timetable generation  
- GET /status/{task_id} - Get generation status
- GET /health - Health check
"""

import sys
import os
from pathlib import Path

# Add project root to Python path for imports to work
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import asyncio
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import scheduler components (now using absolute imports)
from services.scheduler.hybrid_orchestrator import HybridOrchestrator, PipelineResult
from services.scheduler.config import HybridConfig, CPSATConfig, GAConfig, DEFAULT_CONFIG
from services.scheduler.utils.db_client import get_supabase_client
from services.scheduler.utils.logger import scheduler_logger

# ============================================================================
# Pydantic Models for API
# ============================================================================

class GenerateRequest(BaseModel):
    """Request body for timetable generation."""
    batch_id: str
    college_id: str
    user_id: str
    cpsat_time_limit: Optional[int] = 300  # seconds
    ga_generations: Optional[int] = 100
    population_size: Optional[int] = 50
    strategy: Optional[str] = "sequential"  # sequential, parallel, iterative


class GenerateResponse(BaseModel):
    """Response for generation start."""
    success: bool
    task_id: str
    status: str
    message: str


class TaskStatusResponse(BaseModel):
    """Response for task status."""
    task_id: str
    status: str  # pending, running, completed, failed
    progress: float  # 0.0 to 1.0
    phase: str
    message: Optional[str] = None
    timetable_id: Optional[str] = None
    fitness_score: Optional[float] = None
    hard_constraint_violations: Optional[int] = 0
    metrics: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    timestamp: str


# ============================================================================
# In-memory task tracking (for real-time progress)
# ============================================================================

# Active tasks tracked in memory for real-time updates
active_tasks: Dict[str, Dict[str, Any]] = {}


def update_task_progress(task_id: str, phase: str, progress: float, message: str = ""):
    """Update task progress in memory."""
    if task_id in active_tasks:
        active_tasks[task_id].update({
            "phase": phase,
            "progress": progress,
            "message": message,
            "updated_at": datetime.now().isoformat()
        })
        scheduler_logger.info(f"[{task_id}] {phase}: {progress:.0%} - {message}")


# ============================================================================
# FastAPI App
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    scheduler_logger.info("Scheduler API starting up...")
    yield
    scheduler_logger.info("Scheduler API shutting down...")


app = FastAPI(
    title="Hybrid Timetable Scheduler API",
    description="CP-SAT + Genetic Algorithm timetable generation service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="hybrid-scheduler",
        version="1.0.0",
        timestamp=datetime.now().isoformat()
    )


@app.post("/generate", response_model=GenerateResponse)
async def generate_timetable(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Start timetable generation.
    
    This endpoint returns immediately with a task ID.
    Use GET /status/{task_id} to poll for progress.
    """
    task_id = str(uuid.uuid4())
    
    scheduler_logger.info(f"New generation request: task={task_id}, batch={request.batch_id}")
    
    # Initialize task tracking
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
        "updated_at": datetime.now().isoformat()
    }
    
    # Build config
    config = HybridConfig(
        cpsat=CPSATConfig(
            max_time_seconds=request.cpsat_time_limit or 300,
            num_solutions=10
        ),
        ga=GAConfig(
            population_size=request.population_size or 50,
            generations=request.ga_generations or 100,
            mutation_rate=0.15,
            crossover_rate=0.8
        )
    )
    
    # Store strategy in task tracking (not in config)
    active_tasks[task_id]["strategy"] = request.strategy or "sequential"
    
    # Start background task
    background_tasks.add_task(
        run_generation,
        task_id,
        request.batch_id,
        request.college_id,
        request.user_id,
        config
    )
    
    return GenerateResponse(
        success=True,
        task_id=task_id,
        status="started",
        message="Timetable generation started. Poll /status/{task_id} for updates."
    )


@app.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get the status of a generation task.
    
    Poll this endpoint to track progress.
    """
    # Check in-memory first (for active/recent tasks)
    if task_id in active_tasks:
        task = active_tasks[task_id]
        return TaskStatusResponse(
            task_id=task_id,
            status=task["status"],
            progress=task["progress"],
            phase=task["phase"],
            message=task.get("message"),
            timetable_id=task.get("timetable_id"),
            fitness_score=task.get("fitness_score"),
            metrics=task.get("metrics"),
            created_at=task.get("created_at"),
            updated_at=task.get("updated_at")
        )
    
    # Check database for older tasks
    try:
        supabase = get_supabase_client()
        result = supabase.table("timetable_generation_tasks").select(
            "id, status, current_message, created_at, updated_at"
        ).eq("id", task_id).single().execute()
        
        if result.data:
            task_data = result.data
            
            # Check for associated timetable
            timetable_result = supabase.table("generated_timetables").select(
                "id, fitness_score"
            ).eq("generation_task_id", task_id).limit(1).execute()
            
            timetable = timetable_result.data[0] if timetable_result.data else None
            
            return TaskStatusResponse(
                task_id=task_id,
                status=task_data["status"],
                progress=1.0 if task_data["status"] == "completed" else 0.5,
                phase=task_data["status"].upper(),
                message=task_data.get("current_message"),
                timetable_id=timetable["id"] if timetable else None,
                fitness_score=timetable["fitness_score"] if timetable else None,
                created_at=task_data.get("created_at"),
                updated_at=task_data.get("updated_at")
            )
    except Exception as e:
        scheduler_logger.error(f"Error fetching task from DB: {e}")
    
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


@app.delete("/cancel/{task_id}")
async def cancel_task(task_id: str):
    """
    Cancel a running task.
    """
    if task_id in active_tasks:
        active_tasks[task_id]["status"] = "cancelled"
        active_tasks[task_id]["message"] = "Cancelled by user"
        
        # Update in database if exists
        try:
            supabase = get_supabase_client()
            supabase.table("timetable_generation_tasks").update({
                "status": "cancelled",
                "current_message": "Cancelled by user",
                "updated_at": datetime.now().isoformat()
            }).eq("id", task_id).execute()
        except Exception as e:
            scheduler_logger.warning(f"Failed to update cancelled task in DB: {e}")
        
        return {"task_id": task_id, "status": "cancelled"}
    
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


# ============================================================================
# Background Task Runner
# ============================================================================

async def run_generation(
    task_id: str,
    batch_id: str,
    college_id: str,
    user_id: str,
    config: HybridConfig
):
    """
    Run the timetable generation in the background.
    """
    try:
        active_tasks[task_id]["status"] = "running"
        update_task_progress(task_id, "INITIALIZING", 0.05, "Setting up orchestrator...")
        
        # Create orchestrator
        orchestrator = HybridOrchestrator(config)
        
        # Progress callback for real-time updates
        def progress_callback(phase: str, progress: float):
            phase_names = {
                "init": "INITIALIZING",
                "fetch": "FETCHING_DATA",
                "cpsat": "CP-SAT_SOLVER",
                "cpsat_done": "CP-SAT_COMPLETE",
                "ga": "GENETIC_ALGORITHM",
                "ga_done": "GA_COMPLETE",
                "done": "COMPLETED"
            }
            phase_name = phase_names.get(phase, phase.upper())
            update_task_progress(task_id, phase_name, progress, f"Running {phase_name}...")
        
        # Run the pipeline
        update_task_progress(task_id, "RUNNING", 0.10, "Starting hybrid pipeline...")
        
        # FIX: Run blocking orchestrator in a separate thread to ensure Main Loop stays active
        # This prevents the API from freezing (timeouts) while GA runs
        result: PipelineResult = await asyncio.to_thread(
            orchestrator.run,
            batch_id=batch_id,
            college_id=college_id,
            created_by=user_id,
            progress_callback=progress_callback
        )
        
        # Update final status
        if result.status == "success":
            active_tasks[task_id].update({
                "status": "completed",
                "phase": "COMPLETED",
                "progress": 1.0,
                "message": "Timetable generated successfully!",
                "timetable_id": result.timetable_id,
                "fitness_score": result.best_fitness,
                "metrics": {
                    "cpsat_solutions": result.cpsat_solutions,
                    "ga_generations": result.ga_generations,
                    "total_time": result.total_time_seconds,
                    "num_assignments": result.num_assignments
                }
            })
            scheduler_logger.info(f"Task {task_id} completed: timetable={result.timetable_id}")
        else:
            active_tasks[task_id].update({
                "status": "failed",
                "phase": "FAILED",
                "progress": 0.0,
                "message": result.error_message or "Generation failed"
            })
            scheduler_logger.error(f"Task {task_id} failed: {result.error_message}")
            
    except Exception as e:
        scheduler_logger.exception(f"Task {task_id} exception: {e}")
        active_tasks[task_id].update({
            "status": "failed",
            "phase": "ERROR",
            "progress": 0.0,
            "message": str(e)
        })


# ============================================================================
# Main entry point
# ============================================================================

if __name__ == "__main__":
    print("Starting Hybrid Scheduler API...")
    print("Swagger UI: http://localhost:8000/docs")
    print("ReDoc: http://localhost:8000/redoc")
    uvicorn.run(
        "services.scheduler.api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
