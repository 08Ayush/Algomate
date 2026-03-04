import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const college_id = searchParams.get('college_id');

    const pool = getPool();
    const params: any[] = [];
    let where = 'WHERE is_active = true';

    if (college_id) {
      params.push(college_id);
      where += ` AND college_id = $${params.length}`;
    }

    const { rows: departments } = await pool.query(
      `SELECT id, name, code, description, is_active, college_id
       FROM departments
       ${where}
       ORDER BY name
       LIMIT 500`,
      params
    );

    return NextResponse.json({
      success: true,
      departments,
      data: departments,
      count: departments.length,
      meta: { total: departments.length }
    });
  } catch (error: any) {
    console.error('Department fetch error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

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

    const pool = getPool();
    const values = sampleDepartments.map((_, i) => {
      const o = i * 4;
      return `(gen_random_uuid(), $${o+1}, $${o+2}, $${o+3}, $${o+4}, true)`;
    }).join(', ');
    const flat = sampleDepartments.flatMap(d => [d.name, d.code, d.description, d.algorithm_priority]);

    const { rows: data } = await pool.query(
      `INSERT INTO departments (id, name, code, description, algorithm_priority, is_active) VALUES ${values} RETURNING *`,
      flat
    );

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
