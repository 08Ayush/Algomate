import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TaskStatus {
  taskId: string;
  status: string;
  progressMessage: string | null;
  timetableId: string | null;
  fitnessScore: number | null;
  createdAt: string;
  updatedAt: string;
  algorithmConfig: Record<string, unknown> | null;
  metrics: {
    cpsat_solutions?: number;
    ga_generations?: number;
    total_evaluations?: number;
    best_fitness?: number;
  } | null;
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

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle pending task IDs (temporary IDs returned before process started)
    if (taskId.startsWith("pending-")) {
      return NextResponse.json({
        taskId,
        status: "pending",
        progressMessage: "Scheduler is starting...",
        timetableId: null,
        fitnessScore: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        algorithmConfig: null,
        metrics: null,
      } as TaskStatus);
    }

    // Fetch task status from database
    const { data: task, error: taskError } = await supabase
      .from("timetable_generation_tasks")
      .select(
        `
        id,
        status,
        progress_message,
        created_at,
        updated_at,
        algorithm_config,
        college_id
      `
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found", taskId },
        { status: 404 }
      );
    }

    // Check user has access (same college)
    const { data: profile } = await supabase
      .from("profiles")
      .select("college_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.college_id !== task.college_id) {
      return NextResponse.json(
        { error: "Access denied to this task" },
        { status: 403 }
      );
    }

    // Fetch associated timetable if exists
    const { data: timetables } = await supabase
      .from("generated_timetables")
      .select("id, fitness_score")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1);

    const timetable = timetables?.[0];

    // Fetch algorithm metrics if available
    let metrics = null;
    if (timetable) {
      const { data: metricsData } = await supabase
        .from("algorithm_execution_metrics")
        .select("metrics_json, iterations, final_score")
        .eq("task_id", taskId)
        .single();

      if (metricsData) {
        metrics = {
          ga_generations: metricsData.iterations,
          best_fitness: metricsData.final_score,
          ...metricsData.metrics_json,
        };
      }
    }

    const response: TaskStatus = {
      taskId: task.id,
      status: task.status,
      progressMessage: task.progress_message,
      timetableId: timetable?.id || null,
      fitnessScore: timetable?.fitness_score || null,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      algorithmConfig: task.algorithm_config,
      metrics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Status API error:", error);
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

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update task status to cancelled
    const { error: updateError } = await supabase
      .from("timetable_generation_tasks")
      .update({
        status: "cancelled",
        progress_message: "Cancelled by user",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to cancel task" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      taskId,
      status: "cancelled",
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
