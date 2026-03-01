import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getAuthenticatedUser(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    try {
        const token = authHeader.substring(7);
        return JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (error) {
        return null;
    }
}

import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (!user || !user.id || !user.college_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Pagination (Dual-Mode)
        const { page, limit, isPaginated } = getPaginationParams(request);

        // Use college_id directly as confirmed by the User's schema update
        let query = supabase
            .from('constraint_rules')
            .select('*', { count: 'exact' })
            .eq('college_id', user.college_id)
            .order('created_at', { ascending: false });

        // Apply Pagination or Safety Limit
        if (isPaginated && page && limit) {
            const { from, to } = getPaginationRange(page, limit);
            query = query.range(from, to);
        } else {
            query = query.limit(500); // Safety cap
        }

        const { data: constraints, count, error } = await query;

        if (error) {
            console.error('Error fetching constraints:', error);
            return NextResponse.json({ success: false, error: 'Failed to fetch constraints' }, { status: 500 });
        }

        if (isPaginated && page && limit) {
            const paginatedResult = createPaginatedResponse(constraints || [], count || 0, page, limit);
            return NextResponse.json({
                success: true,
                data: paginatedResult.data,
                meta: paginatedResult.meta
            });
        } else {
            return NextResponse.json({
                success: true,
                data: constraints || [],
                meta: { total: count || 0 }
            });
        }
    } catch (error: any) {
        console.error('SERVER ERROR in constraints route:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (!user || !user.id || !user.college_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { rule_name, rule_type, description, rule_parameters, weight, is_active } = body;

        const { data, error } = await supabase
            .from('constraint_rules')
            .insert([
                {
                    rule_name,
                    rule_type,
                    description,
                    rule_parameters: rule_parameters || {},
                    weight: weight || 1.0,
                    is_active: is_active !== undefined ? is_active : true,
                    created_by: user.id,
                    college_id: user.college_id // Added field
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating constraint:', error);
            return NextResponse.json({ success: false, error: 'Failed to create constraint' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (!user || !user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, rule_name, rule_type, description, rule_parameters, weight, is_active } = body;

        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const { data, error } = await supabase
            .from('constraint_rules')
            .update({
                rule_name,
                rule_type,
                description,
                rule_parameters,
                weight,
                is_active,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating constraint:', error);
            return NextResponse.json({ success: false, error: 'Failed to update constraint' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (!user || !user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const { error } = await supabase
            .from('constraint_rules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting constraint:', error);
            return NextResponse.json({ success: false, error: 'Failed to delete constraint' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Constraint deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
