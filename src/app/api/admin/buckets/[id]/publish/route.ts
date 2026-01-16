import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Publish/Unpublish Bucket API
 * POST - Toggle bucket publish status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { is_published, published_by } = body;

    const updateData: any = {
      is_published,
      updated_at: new Date().toISOString()
    };

    if (is_published) {
      updateData.published_at = new Date().toISOString();
      updateData.published_by = published_by;
    } else {
      // Unpublishing
      updateData.published_at = null;
      updateData.published_by = null;
    }

    const { data: bucket, error } = await supabaseAdmin
      .from('elective_buckets')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        batches:batches!elective_buckets_batch_id_fkey (
          id,
          name,
          semester,
          section,
          academic_year,
          course_id,
          department_id,
          departments:departments (id, name, code),
          courses:courses (id, title, code)
        ),
        subjects:subjects!subjects_course_group_id_fkey (id, code, name)
      `)
      .single();

    if (error) {
      console.error('Error updating bucket publish status:', error);
      return NextResponse.json({ error: 'Failed to update bucket' }, { status: 500 });
    }

    return NextResponse.json({ 
      bucket,
      message: is_published ? 'Bucket published successfully' : 'Bucket unpublished successfully'
    });

  } catch (error: any) {
    console.error('Error in bucket publish:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
