import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to authenticate user from token
async function authenticateUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedData = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    console.log('Decoded token data (updated):', { hasId: !!decodedData.id, hasCollegeId: !!decodedData.college_id });
    
    if (!decodedData.id) {
      return null;
    }

    // Check if user exists and get updated info
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, faculty_type, college_id, department_id, first_name, last_name, email, is_active')
      .eq('id', decodedData.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.log('Trying fallback authentication with users table');
      return null;
    }

    // For write operations, only allow admin/college_admin
    if (requireAdmin && !['admin', 'college_admin'].includes(user.role)) {
      return null;
    }

    // For read operations, allow admin, college_admin, and faculty with creator/publisher types
    if (!requireAdmin) {
      const allowedRoles = ['admin', 'college_admin'];
      const allowedFacultyTypes = ['creator', 'publisher'];
      
      if (!allowedRoles.includes(user.role) && 
          !(user.role === 'faculty' && allowedFacultyTypes.includes(user.faculty_type))) {
        return null;
      }
    }

    console.log('Authentication successful via decoded token (users fallback)');
    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user - allow read access for creator/publisher
    const user = await authenticateUser(request, false);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query based on user role
    let query = supabase
      .from('batches')
      .select(`
        *,
        departments (
          id,
          name,
          code
        )
      `)
      .eq('is_active', true);

    // Filter by college for college admin and faculty
    if (user.college_id) {
      query = query.eq('college_id', user.college_id);
    }

    // Filter by department for non-admin users
    if (user.role !== 'admin' && user.role !== 'college_admin' && user.department_id) {
      query = query.eq('department_id', user.department_id);
    }

    const { data: batches, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
    }

    return NextResponse.json({ 
      batches: batches || [],
      message: `Found ${batches?.length || 0} batches`
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user - require admin access for deletion
    const user = await authenticateUser(request, true);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get batch_id from query parameters
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('id');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Verify batch exists and belongs to user's college (for college admins)
    const { data: batch, error: fetchError } = await supabase
      .from('batches')
      .select('id, college_id, name')
      .eq('id', batchId)
      .single();

    if (fetchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Check college authorization for college_admin
    if (user.role === 'college_admin' && batch.college_id !== user.college_id) {
      return NextResponse.json({ error: 'Unauthorized to delete this batch' }, { status: 403 });
    }

    // Delete related records first (in order of dependencies)
    
    // 1. First, get all elective buckets for this batch
    const { data: buckets } = await supabase
      .from('elective_buckets')
      .select('id')
      .eq('batch_id', batchId);

    const bucketIds = buckets?.map(b => b.id) || [];

    // 2. Get all subjects linked to these buckets
    let subjectIds: string[] = [];
    if (bucketIds.length > 0) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .in('course_group_id', bucketIds);
      
      subjectIds = subjects?.map(s => s.id) || [];
    }

    // 3. Delete student course selections for these subjects
    if (subjectIds.length > 0) {
      const { error: selectionsError } = await supabase
        .from('student_course_selections')
        .delete()
        .in('subject_id', subjectIds);
      
      if (selectionsError) {
        console.log('Note: Error deleting student course selections:', selectionsError.message);
      }
    }

    // 2. Delete student batch enrollments
    const { error: enrollmentError } = await supabase
      .from('student_batch_enrollment')
      .delete()
      .eq('batch_id', batchId);

    if (enrollmentError) {
      console.error('Error deleting student enrollments:', enrollmentError);
      return NextResponse.json({ 
        error: 'Failed to delete student enrollments', 
        details: enrollmentError.message 
      }, { status: 500 });
    }

    // 3. Delete batch subjects
    const { error: batchSubjectsError } = await supabase
      .from('batch_subjects')
      .delete()
      .eq('batch_id', batchId);

    if (batchSubjectsError) {
      console.error('Error deleting batch subjects:', batchSubjectsError);
      return NextResponse.json({ 
        error: 'Failed to delete batch subjects', 
        details: batchSubjectsError.message 
      }, { status: 500 });
    }

    // 4. Delete scheduled classes
    const { error: scheduledClassesError } = await supabase
      .from('scheduled_classes')
      .delete()
      .eq('batch_id', batchId);

    if (scheduledClassesError) {
      console.log('Note: No scheduled classes to delete or error:', scheduledClassesError.message);
    }

    // 5. Delete elective buckets (will cascade delete subjects via course_group_id)
    const { error: bucketsError } = await supabase
      .from('elective_buckets')
      .delete()
      .eq('batch_id', batchId);

    if (bucketsError) {
      console.log('Note: No elective buckets to delete or error:', bucketsError.message);
    }

    // 6. Finally, delete the batch itself
    const { error: deleteError } = await supabase
      .from('batches')
      .delete()
      .eq('id', batchId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete batch', 
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Batch "${batch.name}" and all related data (elective buckets, subjects) have been deleted successfully`
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}