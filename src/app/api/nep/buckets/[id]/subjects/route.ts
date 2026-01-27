import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupabaseElectiveBucketRepository } from '@/modules/elective';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucketRepo = new SupabaseElectiveBucketRepository(supabase);

// POST - Add subjects to bucket
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const body = await request.json();
    const { subjectIds } = body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return NextResponse.json(
        { error: 'subjectIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Link subjects to bucket
    await bucketRepo.linkSubjects(params.id, subjectIds);

    return NextResponse.json({
      success: true,
      message: 'Subjects added to bucket successfully'
    });

  } catch (error: any) {
    console.error('Error adding subjects:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove subject from bucket
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subjectId query parameter is required' },
        { status: 400 }
      );
    }

    // Unlink subject from bucket
    await bucketRepo.unlinkSubjects([subjectId]);

    return NextResponse.json({
      success: true,
      message: 'Subject removed from bucket successfully'
    });

  } catch (error: any) {
    console.error('Error removing subject:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update/Replace all subjects in bucket
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const body = await request.json();
    const { subject_ids } = body;

    if (!Array.isArray(subject_ids)) {
      return NextResponse.json(
        { error: 'subject_ids must be an array' },
        { status: 400 }
      );
    }

    // Link subjects to bucket
    await bucketRepo.linkSubjects(params.id, subject_ids);

    return NextResponse.json({
      success: true,
      message: 'Subjects linked to bucket successfully'
    });

  } catch (error: any) {
    console.error('Error linking subjects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
