import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test database connection by fetching departments
    const { data: departments, error } = await supabase
      .from('departments')
      .select('id, name, code')
      .limit(5);

    if (error) {
      console.error('Database connection error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          message: 'Database connection failed' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      departments: departments || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Test failed' 
      },
      { status: 500 }
    );
  }
}