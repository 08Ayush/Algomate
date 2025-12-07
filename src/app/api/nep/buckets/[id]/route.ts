import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

// DELETE individual bucket
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

    if (!bucketId) {
      return NextResponse.json(
        { error: 'Bucket ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // First, verify the bucket belongs to this user's college
    const { data: bucketData, error: fetchError } = await supabase
      .from('elective_buckets')
      .select(`
        id,
        bucket_name,
        batch_id,
        batches!inner (
          id,
          college_id
        )
      `)
      .eq('id', bucketId)
      .single();

    if (fetchError || !bucketData) {
      console.error('Bucket not found:', fetchError);
      return NextResponse.json(
        { error: 'Bucket not found' },
        { status: 404 }
      );
    }

    // Security check: Verify bucket belongs to user's college
    const batchCollegeId = Array.isArray(bucketData.batches) 
      ? bucketData.batches[0]?.college_id 
      : bucketData.batches?.college_id;

    if (batchCollegeId !== user.college_id) {
      return NextResponse.json(
        { error: 'Unauthorized: Bucket belongs to different college' },
        { status: 403 }
      );
    }

    // Get subjects in this bucket before deletion
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('course_group_id', bucketId);

    // Reset course_group_id for subjects in this bucket (return to available pool)
    if (subjects && subjects.length > 0) {
      const { error: resetError } = await supabase
        .from('subjects')
        .update({ course_group_id: null })
        .in('id', subjects.map(s => s.id));

      if (resetError) {
        console.error('Error resetting subjects:', resetError);
        return NextResponse.json(
          { error: 'Failed to reset subjects from bucket' },
          { status: 500 }
        );
      }
    }

    // Delete the bucket
    const { error: deleteError } = await supabase
      .from('elective_buckets')
      .delete()
      .eq('id', bucketId);

    if (deleteError) {
      console.error('Error deleting bucket:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete bucket' },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted bucket ${bucketId} and reset ${subjects?.length || 0} subjects`);

    return NextResponse.json({
      success: true,
      message: 'Bucket deleted successfully',
      subjectsReset: subjects?.length || 0
    });
  } catch (error) {
    console.error('Error in DELETE /api/nep/buckets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update individual bucket
export async function PUT(
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
    const { bucket_name, is_common_slot, min_selection, max_selection } = body;

    if (!bucketId) {
      return NextResponse.json(
        { error: 'Bucket ID is required' },
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
        { error: 'Unauthorized: Bucket belongs to different college' },
        { status: 403 }
      );
    }

    // Update bucket
    const updateData: any = {};
    if (bucket_name !== undefined) updateData.bucket_name = bucket_name;
    if (is_common_slot !== undefined) updateData.is_common_slot = is_common_slot;
    if (min_selection !== undefined) updateData.min_selection = min_selection;
    if (max_selection !== undefined) updateData.max_selection = max_selection;

    const { data: updatedBucket, error: updateError } = await supabase
      .from('elective_buckets')
      .update(updateData)
      .eq('id', bucketId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating bucket:', updateError);
      return NextResponse.json(
        { error: 'Failed to update bucket' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bucket updated successfully',
      bucket: updatedBucket
    });
  } catch (error) {
    console.error('Error in PUT /api/nep/buckets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
