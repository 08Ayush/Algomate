import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';

// GET - Fetch all academic calendars
export async function GET(request: NextRequest) {
    try {
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const { data: calendars, error } = await supabase
            .from('academic_calendars')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching calendars:', error);
            return NextResponse.json(
                { error: 'Failed to fetch calendars' },
                { status: 500 }
            );
        }

        // Transform to include usage count (college_calendars join not supported on Neon)
        const transformedCalendars = (calendars || []).map((cal: Record<string, unknown>) => ({
            ...cal,
            used_by: 0
        }));

        return NextResponse.json({ calendars: transformedCalendars });
    } catch (error) {
        console.error('Error in GET /api/super-admin/calendars:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create a new academic calendar
export async function POST(request: NextRequest) {
    try {
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const body = await request.json();
        const {
            name,
            description,
            calendar_type,
            duration_months,
            terms_per_year,
            is_default = false
        } = body;

        // Validate required fields
        if (!name || !calendar_type) {
            return NextResponse.json(
                { error: 'Name and calendar type are required' },
                { status: 400 }
            );
        }

        // If setting as default, unset other defaults first
        if (is_default) {
            await supabase
                .from('academic_calendars')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        // Insert new calendar
        const { data: newCalendar, error } = await supabase
            .from('academic_calendars')
            .insert({
                name,
                description,
                calendar_type,
                duration_months: duration_months || 6,
                terms_per_year: terms_per_year || 2,
                is_default,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating calendar:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to create calendar' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Calendar created successfully',
            calendar: newCalendar
        });
    } catch (error) {
        console.error('Error in POST /api/super-admin/calendars:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
