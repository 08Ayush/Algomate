import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);



export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (!user || !user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: userData, error } = await supabase
            .from('users')
            .select('first_name, last_name, email, phone, designation, max_hours_per_day, max_hours_per_week, preferred_days, preferred_time_start, preferred_time_end')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching settings:', error);
            return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: userData });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (!user || !user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            first_name,
            last_name,
            phone,
            designation,
            max_hours_per_day,
            max_hours_per_week,
            preferred_days,
            preferred_time_start,
            preferred_time_end
        } = body;

        const updates: any = {};
        if (first_name) updates.first_name = first_name;
        if (last_name) updates.last_name = last_name;
        if (phone !== undefined) updates.phone = phone;
        if (designation) updates.designation = designation;
        if (max_hours_per_day) updates.max_hours_per_day = parseInt(max_hours_per_day);
        if (max_hours_per_week) updates.max_hours_per_week = parseInt(max_hours_per_week);
        if (preferred_days) updates.preferred_days = preferred_days;
        if (preferred_time_start) updates.preferred_time_start = preferred_time_start;
        if (preferred_time_end) updates.preferred_time_end = preferred_time_end;

        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating settings:', error);
            return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Settings updated successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
