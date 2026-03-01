import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRoles } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch single demo request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;
    const { id } = await params;

    const { data: demoRequest, error } = await supabase
      .from('demo_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching demo request:', error);
      return NextResponse.json(
        { error: 'Demo request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: demoRequest });
  } catch (error) {
    console.error('Error in GET /api/super-admin/demo-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update demo request status
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
      status,
      demo_scheduled_at,
      demo_completed_at,
      follow_up_notes,
      assigned_to
    } = body;

    // Build update object (only include fields that exist in the table)
    const updateData: Record<string, any> = {};

    if (status) updateData.status = status;
    if (demo_scheduled_at) updateData.demo_scheduled_at = demo_scheduled_at;
    if (demo_completed_at) updateData.demo_completed_at = demo_completed_at;
    if (follow_up_notes !== undefined) updateData.follow_up_notes = follow_up_notes;
    if (assigned_to) updateData.assigned_to = assigned_to;

    // Auto-set demo_completed_at when status changes to demo_completed
    if (status === 'demo_completed' && !demo_completed_at) {
      updateData.demo_completed_at = new Date().toISOString();
    }

    const { data: updatedRequest, error } = await supabase
      .from('demo_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating demo request:', error);
      return NextResponse.json(
        { error: 'Failed to update demo request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error in PATCH /api/super-admin/demo-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete demo request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const { error } = await supabase
      .from('demo_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting demo request:', error);
      return NextResponse.json(
        { error: 'Failed to delete demo request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/super-admin/demo-requests/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
