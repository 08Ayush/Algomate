import { NextRequest, NextResponse } from 'next/server';
import {
  createAuditLog,
  getAuditLogs,
  getRecordAuditTrail,
  getUserActivity,
  getAuditStatistics,
  AuditAction,
} from '@/lib/auditLog';
import { getPaginationParams, createPaginatedResponse } from '@/shared/utils/pagination';
import { requireAuth } from '@/lib/auth';

// ============================================================================
// GET - Query audit logs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get audit trail for specific record
    if (action === 'record_trail') {
      const tableName = searchParams.get('table_name');
      const recordId = searchParams.get('record_id');

      if (!tableName || !recordId) {
        return NextResponse.json(
          { error: 'table_name and record_id are required' },
          { status: 400 }
        );
      }

      const result = await getRecordAuditTrail(tableName, recordId);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Get user activity history
    if (action === 'user_activity') {
      const userId = searchParams.get('user_id');
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!userId) {
        return NextResponse.json(
          { error: 'user_id is required' },
          { status: 400 }
        );
      }

      const result = await getUserActivity(userId, limit);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Get audit statistics
    if (action === 'statistics') {
      const dateFrom = searchParams.get('date_from') || undefined;
      const dateTo = searchParams.get('date_to') || undefined;

      const result = await getAuditStatistics({
        date_from: dateFrom,
        date_to: dateTo,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Get audit logs with filters
    const userId = searchParams.get('user_id') || undefined;
    const auditAction = searchParams.get('audit_action') as AuditAction | undefined;
    const tableName = searchParams.get('table_name') || undefined;
    const recordId = searchParams.get('record_id') || undefined;
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;

    // Pagination (Dual-Mode)
    const { page, limit, offset, isPaginated } = getPaginationParams(request);

    const result = await getAuditLogs({
      user_id: userId,
      action: auditAction,
      table_name: tableName,
      record_id: recordId,
      date_from: dateFrom,
      date_to: dateTo,
      limit: isPaginated ? limit : undefined,
      offset: isPaginated ? offset : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(result.data || [], result.total || 0, page, limit);
      return NextResponse.json({
        success: true,
        data: paginatedResult.data,
        meta: paginatedResult.meta,
      });
    } else {
      return NextResponse.json({
        success: true,
        data: result.data,
        meta: { total: result.total || 0 },
      });
    }
  } catch (error) {
    console.error('❌ Audit logs GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create audit log entry
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    const {
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      changed_fields,
      ip_address,
      user_agent,
      additional_info,
    } = body;

    // Validation
    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions = [
      'insert', 'update', 'delete',
      'login', 'logout', 'login_failed',
      'approve', 'reject', 'publish', 'unpublish',
      'permission_granted', 'permission_revoked',
      'export', 'import',
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Create audit log
    const result = await createAuditLog({
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      changed_fields,
      ip_address,
      user_agent,
      additional_info,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      log_id: result.logId,
      message: 'Audit log created successfully',
    });
  } catch (error) {
    console.error('❌ Audit logs POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
