import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/constraints
 * Fetches constraint rules from database, optionally filtered by department
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('department_id');

    let query = supabase
      .from('constraint_rules')
      .select('*')
      .order('rule_type', { ascending: true }) // HARD first, then SOFT, then PREFERENCE
      .order('weight', { ascending: false }); // Higher weights first

    const { data: rules, error } = await query;

    if (error) {
      console.error('❌ Error fetching constraint rules:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch constraint rules',
          data: []
        },
        { status: 500 }
      );
    }

    // Filter by department if specified
    let filteredRules = rules || [];
    
    if (departmentId) {
      filteredRules = filteredRules.filter(rule => 
        !rule.applies_to_departments || 
        rule.applies_to_departments.length === 0 || 
        rule.applies_to_departments.includes(departmentId)
      );
    }

    console.log(`✅ Fetched ${filteredRules.length} constraint rules${departmentId ? ` for department ${departmentId}` : ''}`);

    return NextResponse.json({
      success: true,
      data: filteredRules,
      count: filteredRules.length
    });
  } catch (error: any) {
    console.error('❌ Error in constraints API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        data: []
      },
      { status: 500 }
    );
  }
}
