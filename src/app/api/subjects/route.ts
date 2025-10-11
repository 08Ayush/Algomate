import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Fetch subjects by department
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department_code');
    const departmentId = searchParams.get('department_id');
    const semester = searchParams.get('semester');

    console.log('Fetching subjects with params:', { departmentCode, departmentId, semester });

    // Build query to fetch subjects
    let query = supabase
      .from('subjects')
      .select(`
        id,
        name,
        code,
        college_id,
        department_id,
        semester,
        credits_per_week,
        subject_type,
        preferred_duration,
        max_continuous_hours,
        requires_lab,
        requires_projector,
        is_core_subject,
        description,
        is_active,
        department:departments!subjects_department_id_fkey(id, name, code)
      `)
      .eq('is_active', true);

    // Filter by department if provided
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else if (departmentCode) {
      // Get department ID from code
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

      if (deptData) {
        query = query.eq('department_id', deptData.id);
      }
    }

    const { data: subjectsData, error: subjectsError } = await query.order('code', { ascending: true });

    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError);
      return NextResponse.json({ 
        success: false, 
        error: subjectsError.message,
        data: [] 
      }, { status: 500 });
    }

    console.log(`Found ${subjectsData?.length || 0} subjects`);

    // Transform data - now using semester column directly from subjects table
    const transformedData = subjectsData?.map((subject: any) => {
      const department = Array.isArray(subject.department) ? subject.department[0] : subject.department;
      
      // Get semester directly from subject (single value, not array)
      const semester = subject.semester;
      
      console.log(`Subject ${subject.code}: Semester ${semester}, Type: ${subject.subject_type}`);
      
      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        college_id: subject.college_id,
        department_id: subject.department_id,
        department_name: department?.name || '',
        department_code: department?.code || '',
        semester: semester,
        credits: subject.credits_per_week,
        subject_type: subject.subject_type,
        preferred_duration: subject.preferred_duration,
        max_continuous_hours: subject.max_continuous_hours,
        requires_lab: subject.requires_lab,
        requires_projector: subject.requires_projector,
        is_core_subject: subject.is_core_subject,
        description: subject.description,
        is_active: subject.is_active
      };
    }) || [];

    // Filter by semester if provided
    let filteredData = transformedData;
    if (semester) {
      const semNum = parseInt(semester);
      filteredData = transformedData.filter(s => s.semester === semNum);
    }

    // Group by semester
    const groupedBySemester: { [key: number]: any[] } = {};
    
    // Initialize all semester arrays (1-8)
    for (let sem = 1; sem <= 8; sem++) {
      groupedBySemester[sem] = [];
    }
    
    // Populate with subjects based on their semester column
    filteredData.forEach(subject => {
      const sem = subject.semester;
      if (sem >= 1 && sem <= 8) {
        groupedBySemester[sem].push(subject);
      }
    });

    // Log grouping results
    Object.keys(groupedBySemester).forEach(sem => {
      console.log(`Semester ${sem}: ${groupedBySemester[parseInt(sem)].length} subjects`);
    });

    // Calculate statistics
    const totalSubjects = filteredData.length;
    const totalCredits = filteredData.reduce((sum, s) => sum + (s.credits || 0), 0);
    const coreSubjects = filteredData.filter(s => s.is_core_subject).length;
    const theorySubjects = filteredData.filter(s => s.subject_type === 'THEORY').length;
    const labSubjects = filteredData.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length;

    return NextResponse.json({ 
      success: true, 
      data: filteredData,
      groupedBySemester,
      statistics: {
        totalSubjects,
        totalCredits,
        coreSubjects,
        theorySubjects,
        labSubjects
      },
      count: filteredData.length
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

// POST - Create a new subject
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      college_id,
      department_id,
      semester,
      credits_per_week,
      subject_type,
      preferred_duration,
      max_continuous_hours,
      requires_lab,
      requires_projector,
      is_core_subject,
      description
    } = body;

    console.log('Creating new subject:', { name, code, semester, subject_type });

    // Validate required fields
    if (!name || !code || !department_id || !semester || !credits_per_week || !subject_type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, code, department_id, semester, credits_per_week, subject_type'
      }, { status: 400 });
    }

    // Check if subject code already exists in the department
    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id, code')
      .eq('code', code)
      .eq('department_id', department_id)
      .single();

    if (existingSubject) {
      return NextResponse.json({
        success: false,
        error: `Subject with code "${code}" already exists in this department`
      }, { status: 409 });
    }

    // Insert new subject
    const { data: newSubject, error: insertError } = await supabase
      .from('subjects')
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        college_id: college_id,
        department_id: department_id,
        semester: parseInt(semester),
        credits_per_week: parseInt(credits_per_week),
        subject_type: subject_type,
        preferred_duration: preferred_duration || 60,
        max_continuous_hours: max_continuous_hours || 1,
        requires_lab: requires_lab || false,
        requires_projector: requires_projector || false,
        is_core_subject: is_core_subject || false,
        description: description || null,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting subject:', insertError);
      return NextResponse.json({
        success: false,
        error: insertError.message
      }, { status: 500 });
    }

    console.log('✅ Subject created successfully:', newSubject.id);

    return NextResponse.json({
      success: true,
      message: 'Subject created successfully',
      data: newSubject
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error creating subject:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
