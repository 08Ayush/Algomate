import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create server-side supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing departments API...')
    console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('🔑 Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Get college_id from query params if provided
    const { searchParams } = new URL(request.url);
    const college_id = searchParams.get('college_id');

    // Test connection first with more detailed logging
    const { data: connectionTest, error: connectionError } = await supabaseAdmin
      .from('departments')
      .select('count')
      .limit(1)

    console.log('📊 Connection test result:', { connectionTest, connectionError })

    if (connectionError) {
      console.error('❌ Connection error:', connectionError)
      return NextResponse.json({
        error: 'Database connection failed',
        details: connectionError,
        code: connectionError.code,
        message: connectionError.message
      }, { status: 500 })
    }

    // Build query - filter by college_id if provided
    let query = supabaseAdmin
      .from('departments')
      .select(`
        id,
        name,
        code,
        description,
        is_active,
        college_id
      `)
      .eq('is_active', true);

    // Filter by college_id if provided
    if (college_id) {
      query = query.eq('college_id', college_id);
    }

    const { data: departments, error } = await query.order('name');

    if (error) {
      console.error('Department fetch error:', error)
      return NextResponse.json({
        error: 'Failed to fetch departments',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      departments: departments || [],
      count: departments?.length || 0
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Create sample departments if none exist
    const sampleDepartments = [
      {
        name: 'Computer Science and Engineering',
        code: 'CSE',
        description: 'Department of Computer Science and Engineering',
        max_hours_per_day: 8,
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        default_class_duration: 60,
        algorithm_priority: 1,
        is_active: true
      },
      {
        name: 'Information Technology',
        code: 'IT',
        description: 'Department of Information Technology',
        max_hours_per_day: 8,
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        default_class_duration: 60,
        algorithm_priority: 2,
        is_active: true
      },
      {
        name: 'Electronics and Communication Engineering',
        code: 'ECE',
        description: 'Department of Electronics and Communication Engineering',
        max_hours_per_day: 8,
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        default_class_duration: 60,
        algorithm_priority: 3,
        is_active: true
      },
      {
        name: 'Mechanical Engineering',
        code: 'ME',
        description: 'Department of Mechanical Engineering',
        max_hours_per_day: 8,
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        default_class_duration: 60,
        algorithm_priority: 4,
        is_active: true
      },
      {
        name: 'Civil Engineering',
        code: 'CE',
        description: 'Department of Civil Engineering',
        max_hours_per_day: 8,
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        default_class_duration: 60,
        algorithm_priority: 5,
        is_active: true
      }
    ]

    const { data, error } = await supabaseAdmin
      .from('departments')
      .insert(sampleDepartments)
      .select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({
        error: 'Failed to create departments',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Sample departments created successfully',
      departments: data
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}