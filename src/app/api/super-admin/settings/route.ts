import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Fetch all system settings
export async function GET(request: NextRequest) {
    try {
        // Only super_admin can access system settings
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        let query = supabase
            .from('system_settings')
            .select('*')
            .order('category', { ascending: true });

        if (category) {
            query = query.eq('category', category);
        }

        const { data: settings, error } = await query;

        if (error) {
            console.error('Error fetching settings:', error);
            return NextResponse.json(
                { error: 'Failed to fetch settings' },
                { status: 500 }
            );
        }

        // Transform array to object for easier frontend consumption
        const settingsObject: Record<string, any> = {};
        settings?.forEach(setting => {
            let value = setting.setting_value;

            // Parse value based on type
            if (setting.setting_type === 'boolean') {
                value = setting.setting_value === 'true';
            } else if (setting.setting_type === 'number') {
                value = parseInt(setting.setting_value, 10);
            } else if (setting.setting_type === 'json') {
                try {
                    value = JSON.parse(setting.setting_value);
                } catch (e) {
                    value = setting.setting_value;
                }
            }

            settingsObject[setting.setting_key] = value;
        });

        return NextResponse.json({
            settings: settingsObject,
            raw: settings
        });
    } catch (error) {
        console.error('Error in GET /api/super-admin/settings:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST/PUT - Update system settings (bulk update)
export async function POST(request: NextRequest) {
    try {
        // Only super_admin can update system settings
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const body = await request.json();
        const { settings } = body;

        if (!settings || typeof settings !== 'object') {
            return NextResponse.json(
                { error: 'Settings object is required' },
                { status: 400 }
            );
        }

        for (const [key, value] of Object.entries(settings)) {
            // Determine the type of the value
            let settingType = 'string';
            let settingValue = String(value);

            if (typeof value === 'boolean') {
                settingType = 'boolean';
                settingValue = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                settingType = 'number';
                settingValue = String(value);
            } else if (typeof value === 'object') {
                settingType = 'json';
                settingValue = JSON.stringify(value);
            }

            // Upsert each setting
            await supabase
                .from('system_settings')
                .upsert({
                    setting_key: key,
                    setting_value: settingValue,
                    setting_type: settingType,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'setting_key'
                });
        }


        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Error in POST /api/super-admin/settings:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Update a single setting
export async function PATCH(request: NextRequest) {
    try {
        // Auth check
        const user = requireRoles(request, ['super_admin']);
        if (user instanceof NextResponse) return user;

        const body = await request.json();
        const { key, value, description, category } = body;

        if (!key) {
            return NextResponse.json(
                { error: 'Setting key is required' },
                { status: 400 }
            );
        }

        // Determine the type of the value
        let settingType = 'string';
        let settingValue = String(value);

        if (typeof value === 'boolean') {
            settingType = 'boolean';
            settingValue = value ? 'true' : 'false';
        } else if (typeof value === 'number') {
            settingType = 'number';
            settingValue = String(value);
        } else if (typeof value === 'object') {
            settingType = 'json';
            settingValue = JSON.stringify(value);
        }

        const updateData: Record<string, any> = {
            setting_value: settingValue,
            setting_type: settingType,
            updated_at: new Date().toISOString()
        };

        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;

        const { data, error } = await supabase
            .from('system_settings')
            .upsert({
                setting_key: key,
                ...updateData
            }, {
                onConflict: 'setting_key'
            })
            .select()
            .single();

        if (error) {
            console.error('Error updating setting:', error);
            return NextResponse.json(
                { error: 'Failed to update setting' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Setting updated successfully',
            setting: data
        });
    } catch (error) {
        console.error('Error in PATCH /api/super-admin/settings:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
