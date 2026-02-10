import { NextRequest, NextResponse } from "next/server";

/**
 * Scheduler Status API - Proxy to FastAPI Backend
 */

const SCHEDULER_API_URL = process.env.SCHEDULER_API_URL || "http://localhost:8000";

interface TaskStatus {
  taskId: string;
  status: string;
  progress: number;
  phase: string;
  progressMessage: string | null;
  timetableId: string | null;
  fitnessScore: number | null;
  metrics: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse> {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Proxying status request to FastAPI: task=${taskId}`);

    // Forward to FastAPI backend
    const fastApiResponse = await fetch(`${SCHEDULER_API_URL}/status/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!fastApiResponse.ok) {
      if (fastApiResponse.status === 404) {
        return NextResponse.json(
          { error: "Task not found", taskId },
          { status: 404 }
        );
      }
      const errorData = await fastApiResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Status check failed" },
        { status: fastApiResponse.status }
      );
    }

    const data = await fastApiResponse.json();

    // Transform to expected response format
    const response: TaskStatus = {
      taskId: data.task_id,
      status: data.status,
      progress: data.progress,
      phase: data.phase,
      progressMessage: data.message || null,
      timetableId: data.timetable_id || null,
      fitnessScore: data.fitness_score || null,
      metrics: data.metrics || null,
      createdAt: data.created_at || null,
      updatedAt: data.updated_at || null,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Status API error:", error);

    // Check if it's a connection error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          error: "Scheduler service is not running",
          hint: "Start with: python -m services.scheduler.api"
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE endpoint to cancel a running task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse> {
  try {
    const { taskId } = await params;

    console.log(`🛑 Proxying cancel request to FastAPI: task=${taskId}`);

    // Forward to FastAPI backend
    const fastApiResponse = await fetch(`${SCHEDULER_API_URL}/cancel/${taskId}`, {
      method: "DELETE",
    });

    if (!fastApiResponse.ok) {
      const errorData = await fastApiResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Cancel failed" },
        { status: fastApiResponse.status }
      );
    }

    const data = await fastApiResponse.json();

    return NextResponse.json({
      taskId: data.task_id,
      status: data.status,
      message: "Task cancellation requested",
    });

  } catch (error) {
    console.error("Cancel task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
