/**
 * Enhanced Audit Logging Service
 * Comprehensive change tracking for compliance and debugging
 */

import { supabase } from '@/shared/database/client';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction = 
  | 'insert' | 'update' | 'delete'
  | 'login' | 'logout' | 'login_failed'
  | 'approve' | 'reject' | 'publish' | 'unpublish'
  | 'permission_granted' | 'permission_revoked'
  | 'export' | 'import';

export interface AuditLogInput {
  user_id?: string;
  action: AuditAction;
  table_name?: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields?: string[];
  ip_address?: string;
  user_agent?: string;
  additional_info?: Record<string, any>;
}

export interface AuditLog extends AuditLogInput {
  id: string;
  timestamp: string;
}

// ============================================================================
// CREATE AUDIT LOG
// ============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  data: AuditLogInput
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    // Get current user if not provided
    let userId = data.user_id;

    // Determine changed fields if not provided
    let changedFields = data.changed_fields;
    if (!changedFields && data.old_values && data.new_values) {
      changedFields = Object.keys(data.new_values).filter(
        (key) => JSON.stringify(data.old_values![key]) !== JSON.stringify(data.new_values![key])
      );
    }

    const { data: log, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: data.action,
        table_name: data.table_name,
        record_id: data.record_id,
        old_values: data.old_values,
        new_values: data.new_values,
        changed_fields: changedFields,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        additional_info: data.additional_info,
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to create audit log:', error);
      return { success: false, error: error.message };
    }

    return { success: true, logId: log.id };
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// QUERY AUDIT LOGS
// ============================================================================

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters?: {
  user_id?: string;
  action?: AuditAction;
  table_name?: string;
  record_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; data?: AuditLog[]; total?: number; error?: string }> {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.table_name) {
      query = query.eq('table_name', filters.table_name);
    }

    if (filters?.record_id) {
      query = query.eq('record_id', filters.record_id);
    }

    if (filters?.date_from) {
      query = query.gte('timestamp', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('timestamp', filters.date_to);
    }

    query = query.order('timestamp', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [], total: count || 0 };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get audit trail for a specific record
 */
export async function getRecordAuditTrail(
  tableName: string,
  recordId: string
): Promise<{ success: boolean; data?: AuditLog[]; error?: string }> {
  return getAuditLogs({ table_name: tableName, record_id: recordId });
}

/**
 * Get user activity history
 */
export async function getUserActivity(
  userId: string,
  limit: number = 50
): Promise<{ success: boolean; data?: AuditLog[]; error?: string }> {
  return getAuditLogs({ user_id: userId, limit });
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get audit statistics
 */
export async function getAuditStatistics(filters?: {
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  data?: {
    total_logs: number;
    by_action: Record<string, number>;
    by_table: Record<string, number>;
    by_user: Record<string, number>;
    most_active_users: Array<{ user_id: string; count: number }>;
    most_modified_tables: Array<{ table_name: string; count: number }>;
  };
  error?: string;
}> {
  try {
    let query = supabase.from('audit_logs').select('*');

    if (filters?.date_from) {
      query = query.gte('timestamp', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('timestamp', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          total_logs: 0,
          by_action: {},
          by_table: {},
          by_user: {},
          most_active_users: [],
          most_modified_tables: [],
        },
      };
    }

    // Count by action
    const byAction: Record<string, number> = {};
    data.forEach((log: any) => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
    });

    // Count by table
    const byTable: Record<string, number> = {};
    data.forEach((log: any) => {
      if (log.table_name) {
        byTable[log.table_name] = (byTable[log.table_name] || 0) + 1;
      }
    });

    // Count by user
    const byUser: Record<string, number> = {};
    data.forEach((log: any) => {
      if (log.user_id) {
        byUser[log.user_id] = (byUser[log.user_id] || 0) + 1;
      }
    });

    // Most active users
    const mostActiveUsers = Object.entries(byUser)
      .map(([user_id, count]) => ({ user_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Most modified tables
    const mostModifiedTables = Object.entries(byTable)
      .map(([table_name, count]) => ({ table_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      success: true,
      data: {
        total_logs: data.length,
        by_action: byAction,
        by_table: byTable,
        by_user: byUser,
        most_active_users: mostActiveUsers,
        most_modified_tables: mostModifiedTables,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log authentication events
 */
export async function logAuthEvent(
  action: 'login' | 'logout' | 'login_failed',
  userId?: string,
  additionalInfo?: Record<string, any>
): Promise<{ success: boolean; logId?: string; error?: string }> {
  return createAuditLog({
    user_id: userId,
    action,
    additional_info: additionalInfo,
  });
}

/**
 * Log approval/rejection events
 */
export async function logWorkflowEvent(
  action: 'approve' | 'reject' | 'publish' | 'unpublish',
  tableName: string,
  recordId: string,
  userId?: string,
  additionalInfo?: Record<string, any>
): Promise<{ success: boolean; logId?: string; error?: string }> {
  return createAuditLog({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    additional_info: additionalInfo,
  });
}

/**
 * Log data export/import events
 */
export async function logDataTransferEvent(
  action: 'export' | 'import',
  tableName: string,
  recordCount: number,
  userId?: string,
  additionalInfo?: Record<string, any>
): Promise<{ success: boolean; logId?: string; error?: string }> {
  return createAuditLog({
    user_id: userId,
    action,
    table_name: tableName,
    additional_info: {
      ...additionalInfo,
      record_count: recordCount,
    },
  });
}

/**
 * Wrapper for tracking database changes
 * 
 * @example
 * const result = await trackDatabaseChange(
 *   'update',
 *   'timetables',
 *   'timetable-123',
 *   async () => {
 *     return await supabase.from('timetables').update({...}).eq('id', id);
 *   },
 *   oldValues,
 *   newValues
 * );
 */
export async function trackDatabaseChange<T>(
  action: 'insert' | 'update' | 'delete',
  tableName: string,
  recordId: string,
  operationFn: () => Promise<T>,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  userId?: string
): Promise<{ result?: T; success: boolean; error?: string }> {
  try {
    const result = await operationFn();

    // Log the change (non-blocking)
    createAuditLog({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
    }).catch((error) => {
      console.error('⚠️ Warning: Failed to create audit log:', error);
    });

    return { result, success: true };
  } catch (error) {
    console.error(`❌ Error in ${action} operation:`, error);
    return { success: false, error: String(error) };
  }
}
