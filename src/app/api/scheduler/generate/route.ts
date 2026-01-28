import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spawn } from "child_process";
import path from "path";

interface GenerateRequest {
  batchId: string;
  collegeId: string;
  config?: {
    cpsatTimeLimit?: number;
    gaGenerations?: number;
    populationSize?: number;
  };
}

interface TaskResponse {
  taskId: string;
  status: string;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body: GenerateRequest = await request.json();
    const { batchId, collegeId, config } = body;

    if (!batchId || !collegeId) {
      return NextResponse.json(
        { error: "Missing required fields: batchId, collegeId" },
        { status: 400 }
      );
    }

    // Verify user has permission for this college
    const { data: userProfile } = await supabase
      .from("users")
      .select("college_id, role")
      .eq("id", user.id)
      .single();

    if (!userProfile || userProfile.college_id !== collegeId) {
      return NextResponse.json(
        { error: "Access denied to this college" },
        { status: 403 }
      );
    }

    // Verify batch exists and belongs to this college
    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select("id, college_id")
      .eq("id", batchId)
      .eq("college_id", collegeId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: "Batch not found or access denied" },
        { status: 404 }
      );
    }

    // Spawn Python process
    const pythonScript = path.join(
      process.cwd(),
      "services",
      "scheduler",
      "hybrid_orchestrator.py"
    );

    const taskId = await runSchedulerAsync(
      pythonScript,
      batchId,
      collegeId,
      user.id,
      config
    );

    const response: TaskResponse = {
      taskId,
      status: "started",
      message: "Timetable generation started. Poll status endpoint for updates.",
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    console.error("Scheduler API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

async function runSchedulerAsync(
  scriptPath: string,
  batchId: string,
  collegeId: string,
  userId: string,
  config?: GenerateRequest["config"]
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Determine Python path based on OS
    const isWindows = process.platform === "win32";
    const venvPath = path.join(process.cwd(), ".venv");
    const pythonPath = isWindows
      ? path.join(venvPath, "Scripts", "python.exe")
      : path.join(venvPath, "bin", "python");

    // Build command arguments
    const args = [
      scriptPath,
      "--batch-id", batchId,
      "--college-id", collegeId,
      "--user-id", userId,
    ];

    // Add optional config parameters
    if (config?.cpsatTimeLimit) {
      args.push("--cpsat-time", String(config.cpsatTimeLimit));
    }
    if (config?.gaGenerations) {
      args.push("--ga-generations", String(config.gaGenerations));
    }
    if (config?.populationSize) {
      args.push("--population", String(config.populationSize));
    }

    console.log(`Starting scheduler: ${pythonPath} ${args.join(" ")}`);

    const childProcess = spawn(pythonPath, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    let stdout = "";
    let stderr = "";
    let taskId: string | null = null;

    childProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log("[Scheduler stdout]:", output);

      // Try to extract task_id from output
      const taskIdMatch = output.match(/"task_id":\s*"([^"]+)"/);
      if (taskIdMatch && !taskId) {
        taskId = taskIdMatch[1];
      }
    });

    childProcess.stderr.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      console.error("[Scheduler stderr]:", output);
    });

    childProcess.on("error", (error) => {
      console.error("Failed to start scheduler process:", error);
      reject(new Error(`Failed to start scheduler: ${error.message}`));
    });

    childProcess.on("close", (code) => {
      console.log(`Scheduler process exited with code ${code}`);
      
      if (code === 0) {
        // Try to parse result from stdout
        try {
          // Find the JSON result in output
          const jsonMatch = stdout.match(/\{[\s\S]*"task_id"[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            resolve(result.task_id);
            return;
          }
        } catch (parseError) {
          console.error("Failed to parse scheduler output:", parseError);
        }
        
        if (taskId) {
          resolve(taskId);
        } else {
          reject(new Error("Scheduler completed but no task ID found"));
        }
      } else {
        reject(new Error(`Scheduler exited with code ${code}: ${stderr || "Unknown error"}`));
      }
    });

    // Set a timeout to return early with a generated task ID
    // The process continues running in the background
    setTimeout(() => {
      if (taskId) {
        resolve(taskId);
      } else {
        // Generate a temporary task ID if not yet received
        const tempTaskId = `pending-${Date.now()}`;
        console.log(`Returning temporary task ID: ${tempTaskId}`);
        resolve(tempTaskId);
      }
    }, 3000);
  });
}

// GET endpoint to check if scheduler service is available
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: "scheduler",
    status: "available",
    version: "1.0.0",
    features: [
      "CP-SAT constraint solver",
      "Genetic Algorithm optimization",
      "Hybrid pipeline orchestration",
    ],
  });
}
