import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch classrooms by department
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department_code');
    const departmentId = searchParams.get('department_id');

    console.log('Fetching classrooms with params:', { departmentCode, departmentId });

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

    // Build query to fetch classrooms
    let query = supabase
      .from('classrooms')
      .select(`
        id,
        name,
        building,
        floor_number,
        capacity,
        type,
        has_projector,
        has_ac,
        has_computers,
        has_lab_equipment,
        is_smart_classroom,
        facilities,
        location_notes,
        is_available,
        department:departments!classrooms_department_id_fkey(id, name, code)
      `)
      .eq('is_available', true);

    // Filter by department if provided
    if (deptId) {
      query = query.eq('department_id', deptId);
    }

    const { data: classroomsData, error: classroomsError } = await query.order('name', { ascending: true });

    if (classroomsError) {
      console.error('Error fetching classrooms:', classroomsError);
      return NextResponse.json({ 
        success: false, 
        error: classroomsError.message,
        data: [] 
      }, { status: 500 });
    }

    console.log(`Found ${classroomsData?.length || 0} classrooms`);

    // Transform data
    const transformedData = classroomsData?.map((classroom: any) => {
      const department = Array.isArray(classroom.department) ? classroom.department[0] : classroom.department;
      
      return {
        id: classroom.id,
        name: classroom.name,
        building: classroom.building,
        floor_number: classroom.floor_number,
        capacity: classroom.capacity,
        type: classroom.type,
        has_projector: classroom.has_projector,
        has_ac: classroom.has_ac,
        has_computers: classroom.has_computers,
        has_lab_equipment: classroom.has_lab_equipment,
        is_smart_classroom: classroom.is_smart_classroom,
        facilities: classroom.facilities || [],
        location_notes: classroom.location_notes,
        is_available: classroom.is_available,
        department_name: department?.name || '',
        department_code: department?.code || ''
      };
    }) || [];

    // Calculate statistics
    const totalClassrooms = transformedData.length;
    const lectureHalls = transformedData.filter((c: any) => c.type === 'Lecture Hall').length;
    const labs = transformedData.filter((c: any) => c.type === 'Lab').length;
    const smartClassrooms = transformedData.filter((c: any) => c.is_smart_classroom).length;

    return NextResponse.json({ 
      success: true, 
      data: transformedData,
      statistics: {
        totalClassrooms,
        lectureHalls,
        labs,
        smartClassrooms
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
