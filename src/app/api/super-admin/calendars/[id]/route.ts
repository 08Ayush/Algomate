import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRoles } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch single calendar
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const { id } = await params;

        const { data: calendar, error } = await supabase
            .from('academic_calendars')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching calendar:', error);
            return NextResponse.json(
                { error: 'Calendar not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ calendar });
    } catch (error) {
        console.error('Error in GET /api/super-admin/calendars/[id]:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Update calendar
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const { id } = await params;
        const body = await request.json();

        const {
            name,
            description,
            calendar_type,
            duration_months,
            terms_per_year,
            is_default,
            is_active
        } = body;

        // Build update object
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (calendar_type !== undefined) updateData.calendar_type = calendar_type;
        if (duration_months !== undefined) updateData.duration_months = duration_months;
        if (terms_per_year !== undefined) updateData.terms_per_year = terms_per_year;
        if (is_active !== undefined) updateData.is_active = is_active;

        // Handle default setting
        if (is_default === true) {
            // First unset all defaults
            await supabase
                .from('academic_calendars')
                .update({ is_default: false })
                .eq('is_default', true);
            updateData.is_default = true;
        } else if (is_default === false) {
            updateData.is_default = false;
        }

        const { data: updatedCalendar, error } = await supabase
            .from('academic_calendars')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating calendar:', error);
            return NextResponse.json(
                { error: 'Failed to update calendar' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Calendar updated successfully',
            calendar: updatedCalendar
        });
    } catch (error) {
        console.error('Error in PATCH /api/super-admin/calendars/[id]:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE - Delete calendar
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const { id } = await params;

        // Check if calendar is in use
        const { data: usageCheck, error: usageError } = await supabase
            .from('college_calendars')
            .select('id')
            .eq('calendar_id', id)
            .limit(1);

        if (usageError) {
            console.error('Error checking calendar usage:', usageError);
        }

        if (usageCheck && usageCheck.length > 0) {
            return NextResponse.json(
                { error: 'Cannot delete calendar that is in use by colleges' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('academic_calendars')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting calendar:', error);
            return NextResponse.json(
                { error: 'Failed to delete calendar' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Calendar deleted successfully'
        });
    } catch (error) {
        console.error('Error in DELETE /api/super-admin/calendars/[id]:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
