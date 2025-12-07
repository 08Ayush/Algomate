import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

// Add subjects to a bucket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bucketId = params.id;
    const body = await request.json();
    const { subjectIds } = body;

    if (!bucketId || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return NextResponse.json(
        { error: 'Bucket ID and subject IDs are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify bucket belongs to user's college
    const { data: bucketData, error: fetchError } = await supabase
      .from('elective_buckets')
      .select(`
        id,
        batches!inner (
          college_id
        )
      `)
      .eq('id', bucketId)
      .single();

    if (fetchError || !bucketData) {
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      );
    }

    // Security check
    const batchCollegeId = Array.isArray(bucketData.batches) 
      ? bucketData.batches[0]?.college_id 
      : bucketData.batches?.college_id;

    if (batchCollegeId !== user.college_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Add subjects to bucket
    const { error: updateError } = await supabase
      .from('subjects')
      .update({ course_group_id: bucketId })
      .in('id', subjectIds)
      .eq('college_id', user.college_id);

    if (updateError) {
      console.error('Error adding subjects to bucket:', updateError);
      return NextResponse.json(
        { error: 'Failed to add subjects to bucket' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${subjectIds.length} subject(s) added to bucket`
    });
  } catch (error) {
    console.error('Error in POST /api/nep/buckets/[id]/subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove subjects from a bucket
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bucketId = params.id;
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    if (!bucketId || !subjectId) {
      return NextResponse.json(
        { error: 'Bucket ID and subject ID are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify subject belongs to this bucket and user's college
    const { data: subjectData, error: fetchError } = await supabase
      .from('subjects')
      .select('id, course_group_id, college_id')
      .eq('id', subjectId)
      .eq('course_group_id', bucketId)
      .eq('college_id', user.college_id)
      .single();

    if (fetchError || !subjectData) {
      return NextResponse.json(
        { error: 'Subject not found in this bucket' },
        { status: 404 }
      );
    }

    // Remove subject from bucket (set course_group_id to null)
    const { error: updateError } = await supabase
      .from('subjects')
      .update({ course_group_id: null })
      .eq('id', subjectId);

    if (updateError) {
      console.error('Error removing subject from bucket:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove subject from bucket' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subject removed from bucket'
    });
  } catch (error) {
    console.error('Error in DELETE /api/nep/buckets/[id]/subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
