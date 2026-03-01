import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/shared/database/client';
import { requireAuth } from '@/lib/auth';

/**
 * NEP 2020 Scheduler API Endpoint
 * 
 * POST /api/nep-scheduler
 * Body: { batch_id: string, time_limit?: number, save_to_db?: boolean }
 * 
 * This endpoint triggers the Python CP-SAT solver for NEP bucket scheduling.
 */

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { batch_id, time_limit = 30, save_to_db = false } = body;

    if (!batch_id) {
      return NextResponse.json(
        { success: false, error: 'batch_id is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting NEP scheduler for batch: ${batch_id}`);

    // Verify batch exists
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, name, college_id, department_id')
      .eq('id', batch_id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { success: false, error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Execute Python scheduler
    const { spawn } = require('child_process');
    const path = require('path');

    const pythonPath = 'python'; // or 'python3' depending on system
    const schedulerPath = path.join(process.cwd(), 'services', 'scheduler', 'nep_scheduler.py');

    const args = [
      schedulerPath,
      '--batch-id', batch_id,
      '--time-limit', time_limit.toString()
    ];

    if (save_to_db) {
      args.push('--save');
    }

    // Create a promise to handle the Python process
    const schedulerResult = await new Promise<any>((resolve, reject) => {
      const pythonProcess = spawn(pythonPath, args, {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        console.log(output);
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code: number) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          console.error('STDERR:', stderr);
          reject(new Error(`Scheduler failed: ${stderr}`));
        } else {
          try {
            // Try to extract JSON from stdout
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              resolve(result);
            } else {
              reject(new Error('No JSON output from scheduler'));
            }
          } catch (e) {
            reject(new Error('Failed to parse scheduler output'));
          }
        }
      });
    });

    // Return the solution
    return NextResponse.json(schedulerResult);

  } catch (error: any) {
    console.error('❌ NEP Scheduler API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nep-scheduler?batch_id=xxx
 * 
 * Get the latest NEP timetable for a batch
 */
export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
=======
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

>>>>>>> origin/response-time
    const searchParams = request.nextUrl.searchParams;
    const batch_id = searchParams.get('batch_id');

    if (!batch_id) {
      return NextResponse.json(
        { success: false, error: 'batch_id is required' },
        { status: 400 }
      );
    }

    // Fetch latest timetable for this batch
    const { data: timetable, error } = await supabaseAdmin
      .from('generated_timetables')
      .select(`
        *,
        scheduled_classes (
          *,
          subjects (*),
          classrooms (*),
          time_slots (*),
          faculty:users!scheduled_classes_faculty_id_fkey (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('batch_id', batch_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'No timetable found for this batch' },
        { status: 404 }
      );
    }

    // Group by NEP buckets
    const { data: buckets } = await supabaseAdmin
      .from('elective_buckets')
      .select('*')
      .eq('batch_id', batch_id);

    return NextResponse.json({
      success: true,
      timetable,
      buckets: buckets || []
    });

  } catch (error: any) {
    console.error('❌ Error fetching NEP timetable:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
