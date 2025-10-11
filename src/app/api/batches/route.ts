import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch batches by department
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department_code');
    const departmentId = searchParams.get('department_id');

    console.log('Fetching batches with params:', { departmentCode, departmentId });

    let deptId = departmentId;

    // Get department ID from code if needed
    if (!deptId && departmentCode) {
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('code', departmentCode)
        .single();

      if (deptError) {
        console.error('Error fetching department:', deptError);
        return NextResponse.json({ 
          success: false, 
          error: 'Department not found',
          data: [] 
        });
      }

      deptId = deptData?.id;
    }

    // Build query to fetch batches
    let query = supabase
      .from('batches')
      .select(`
        id,
        name,
        semester,
        academic_year,
        section,
        division,
        department_id,
        college_id,
        expected_strength,
        actual_strength,
        max_hours_per_day,
        preferred_start_time,
        preferred_end_time,
        is_active,
        created_at,
        department:departments!batches_department_id_fkey(id, name, code),
        class_coordinator:users!batches_class_coordinator_fkey(id, first_name, last_name, email)
      `)
      .eq('is_active', true);

    // Filter by department if provided
    if (deptId) {
      query = query.eq('department_id', deptId);
    }

    const { data: batchesData, error: batchesError } = await query.order('semester', { ascending: true }).order('section', { ascending: true });

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json({ 
        success: false, 
        error: batchesError.message,
        data: [] 
      }, { status: 500 });
    }

    console.log(`Found ${batchesData?.length || 0} batches`);

    // Transform data
    const transformedData = batchesData?.map((batch: any) => {
      const department = Array.isArray(batch.department) ? batch.department[0] : batch.department;
      const coordinator = Array.isArray(batch.class_coordinator) ? batch.class_coordinator[0] : batch.class_coordinator;
      
      return {
        id: batch.id,
        name: batch.name,
        semester: batch.semester,
        academic_year: batch.academic_year,
        section: batch.section,
        division: batch.division,
        department_id: batch.department_id,
        college_id: batch.college_id,
        expected_strength: batch.expected_strength,
        actual_strength: batch.actual_strength,
        max_hours_per_day: batch.max_hours_per_day,
        preferred_start_time: batch.preferred_start_time,
        preferred_end_time: batch.preferred_end_time,
        is_active: batch.is_active,
        created_at: batch.created_at,
        department_name: department?.name || '',
        department_code: department?.code || '',
        coordinator_name: coordinator ? `${coordinator.first_name} ${coordinator.last_name}` : null,
        coordinator_email: coordinator?.email || null
      };
    }) || [];

    // Calculate statistics
    const totalBatches = transformedData.length;
    const totalStudents = transformedData.reduce((sum: number, b: any) => sum + (b.actual_strength || 0), 0);
    const semesterGroups = transformedData.reduce((acc: any, batch: any) => {
      acc[batch.semester] = (acc[batch.semester] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ 
      success: true, 
      data: transformedData,
      statistics: {
        totalBatches,
        totalStudents,
        semesterGroups
      },
      count: transformedData.length
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      data: []
    }, { status: 500 });
  }
}

// POST - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      semester, 
      academic_year, 
      section, 
      division,
      expected_strength, 
      actual_strength,
      department_code,
      department_id
    } = body;

    console.log('Creating batch:', body);

    // Get department ID if code is provided
    let deptId = department_id;
    if (!deptId && department_code) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, college_id')
        .eq('code', department_code)
        .single();
      
      deptId = deptData?.id;
    }

    if (!deptId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Department not found' 
      }, { status: 400 });
    }

    // Get college_id from department
    const { data: deptData } = await supabase
      .from('departments')
      .select('college_id')
      .eq('id', deptId)
      .single();

    const collegeId = deptData?.college_id;

    // Insert new batch
    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .insert({
        name,
        college_id: collegeId,
        department_id: deptId,
        semester,
        academic_year,
        section: section || 'A',
        division: division || null,
        expected_strength: expected_strength || 60,
        actual_strength: actual_strength || 0,
        is_active: true
      })
      .select()
      .single();

    if (batchError) {
      console.error('Error creating batch:', batchError);
      return NextResponse.json({ 
        success: false, 
        error: batchError.message 
      }, { status: 500 });
    }

    console.log('Batch created successfully:', batchData);

    return NextResponse.json({ 
      success: true, 
      data: batchData,
      message: 'Batch created successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE - Delete a batch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('id');

    if (!batchId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Batch ID is required' 
      }, { status: 400 });
    }

    console.log('Deleting batch:', batchId);

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('batches')
      .update({ is_active: false })
      .eq('id', batchId);

    if (deleteError) {
      console.error('Error deleting batch:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: deleteError.message 
      }, { status: 500 });
    }

    console.log('Batch deleted successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Batch deleted successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
