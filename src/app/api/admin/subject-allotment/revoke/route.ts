import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Revoke Subject Allotment API
 * POST - Revoke allotments for a bucket (unlock students to re-select)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bucket_id, revoked_by } = body;

    if (!bucket_id) {
      return NextResponse.json({ 
        error: 'Missing required field: bucket_id' 
      }, { status: 400 });
    }

    // Step 1: Get count of allotments to be revoked
    const { data: existingAllotments, error: countError } = await supabaseAdmin
      .from('subject_allotments_permanent')
      .select('id, student_id')
      .eq('bucket_id', bucket_id);

    if (countError) {
      console.error('Error fetching existing allotments:', countError);
      return NextResponse.json({ error: 'Failed to fetch allotments' }, { status: 500 });
    }

    if (!existingAllotments || existingAllotments.length === 0) {
      return NextResponse.json({ 
        error: 'No allotments found for this bucket' 
      }, { status: 404 });
    }

    const allotmentCount = existingAllotments.length;

    // Step 2: Delete permanent allotments
    const { error: deleteError } = await supabaseAdmin
      .from('subject_allotments_permanent')
      .delete()
      .eq('bucket_id', bucket_id);

    if (deleteError) {
      console.error('Error deleting allotments:', deleteError);
      return NextResponse.json({ error: 'Failed to delete allotments' }, { status: 500 });
    }

    // Step 3: Unlock student choices - reset is_allotted and allotment_status
    const { error: unlockError } = await supabaseAdmin
      .from('student_subject_choices')
      .update({ 
        is_allotted: false,
        allotment_status: null,
        allotted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('bucket_id', bucket_id);

    if (unlockError) {
      console.error('Error unlocking student choices:', unlockError);
      return NextResponse.json({ error: 'Failed to unlock student choices' }, { status: 500 });
    }

    console.log(`✅ Revoked ${allotmentCount} allotments for bucket ${bucket_id}`);

    return NextResponse.json({
      success: true,
      message: `Successfully revoked ${allotmentCount} allotments`,
      stats: {
        allotments_revoked: allotmentCount,
        bucket_id: bucket_id,
        revoked_by: revoked_by,
        revoked_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error in revoke allotment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
