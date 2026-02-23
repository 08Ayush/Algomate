import { NextRequest, NextResponse } from "next/server";

/**
 * Scheduler API - Proxy to FastAPI Backend
 * 
 * The Python scheduler runs as a FastAPI server on port 8000.
 * This route proxies requests to the FastAPI backend.
 */

const SCHEDULER_API_URL = process.env.SCHEDULER_API_URL || "http://localhost:8000";

interface GenerateRequest {
  batchId: string;
  collegeId: string;
  config?: {
    cpsatTimeLimit?: number;
    gaGenerations?: number;
    populationSize?: number;
    strategy?: string;
  };
}

interface TaskResponse {
  taskId: string;
  status: string;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body: GenerateRequest = await request.json();
    const { batchId, collegeId, config } = body;

    if (!batchId || !collegeId) {
      return NextResponse.json(
        { error: "Missing required fields: batchId, collegeId" },
        { status: 400 }
      );
    }

    // Get user from auth header (base64 encoded user object from frontend)
    const authHeader = request.headers.get("Authorization");
    let userId = "";

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = Buffer.from(token, "base64").toString();
        const userData = JSON.parse(decoded);
        userId = userData.id;
      } catch {
        return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    console.log(`📅 Proxying generate request to FastAPI: batch=${batchId}`);

    // Forward to FastAPI backend
    const fastApiResponse = await fetch(`${SCHEDULER_API_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batch_id: batchId,
        college_id: collegeId,
        user_id: userId,
        cpsat_time_limit: config?.cpsatTimeLimit || 300,
        ga_generations: config?.gaGenerations || 100,
        population_size: config?.populationSize || 50,
        strategy: config?.strategy || "sequential"
      }),
    });

    if (!fastApiResponse.ok) {
      const errorData = await fastApiResponse.json().catch(() => ({}));
      console.error("FastAPI error:", errorData);
      return NextResponse.json(
        { error: errorData.detail || "Scheduler service error" },
        { status: fastApiResponse.status }
      );
    }

    const data = await fastApiResponse.json();

    const response: TaskResponse = {
      taskId: data.task_id,
      status: data.status,
      message: data.message,
    };

    return NextResponse.json(response, { status: 202 });

  } catch (error) {
    console.error("Scheduler API error:", error);

    // Check if it's a connection error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          error: "Scheduler service is not running. Please start it with: python -m services.scheduler.api",
          details: "Connection refused to " + SCHEDULER_API_URL
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

// GET endpoint to check if scheduler service is available
export async function GET(): Promise<NextResponse> {
  try {
    const healthResponse = await fetch(`${SCHEDULER_API_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (healthResponse.ok) {
      const data = await healthResponse.json();
      return NextResponse.json({
        service: "scheduler-proxy",
        backend: data,
        status: "connected",
      });
    } else {
      return NextResponse.json({
        service: "scheduler-proxy",
        status: "backend_error",
        message: "FastAPI backend returned error",
      }, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json({
      service: "scheduler-proxy",
      status: "disconnected",
      message: "FastAPI backend is not running",
      hint: "Start with: python -m services.scheduler.api",
    }, { status: 503 });
  }
}
