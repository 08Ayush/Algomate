import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;
        if (!user.id || !user.college_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const pool = getPool();
        const result = await pool.query(
            `SELECT * FROM constraint_rules
             WHERE college_id = $1
             ORDER BY created_at DESC
             LIMIT 500`,
            [user.college_id]
        );

        return NextResponse.json({
            success: true,
            data: result.rows,
            meta: { total: result.rowCount ?? 0 }
        });
    } catch (error: any) {
        console.error('Error fetching constraints:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;
        if (!user.id || !user.college_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { rule_name, rule_type, description, rule_parameters, weight, is_active } = body;

        if (!rule_name) {
            return NextResponse.json({ success: false, error: 'Rule name is required' }, { status: 400 });
        }

        const pool = getPool();
        const result = await pool.query(
            `INSERT INTO constraint_rules
               (id, rule_name, rule_type, description, rule_parameters, weight, is_active, created_by, college_id, created_at, updated_at)
             VALUES
               (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6, $7, $8, NOW(), NOW())
             RETURNING *`,
            [
                rule_name,
                rule_type || 'HARD',
                description || null,
                JSON.stringify(rule_parameters || {}),
                weight ?? 5,
                is_active !== undefined ? is_active : true,
                user.id,
                user.college_id
            ]
        );

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error creating constraint:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;
        if (!user.id || !user.college_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, rule_name, rule_type, description, rule_parameters, weight, is_active } = body;

        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const pool = getPool();
        const result = await pool.query(
            `UPDATE constraint_rules
             SET rule_name = $1, rule_type = $2, description = $3,
                 rule_parameters = $4::jsonb, weight = $5, is_active = $6, updated_at = NOW()
             WHERE id = $7 AND college_id = $8
             RETURNING *`,
            [
                rule_name,
                rule_type,
                description || null,
                JSON.stringify(rule_parameters || {}),
                weight,
                is_active,
                id,
                user.college_id
            ]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Constraint not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error updating constraint:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;
        if (!user.id || !user.college_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const pool = getPool();
        await pool.query(
            `DELETE FROM constraint_rules WHERE id = $1 AND college_id = $2`,
            [id, user.college_id]
        );

        return NextResponse.json({ success: true, message: 'Constraint deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting constraint:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
