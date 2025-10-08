import { TimetableChangeLog } from '@/store/api-simple';

// Change tracking service for logging timetable modifications
export class ChangeTrackingService {
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static logTimetableCreated(
    timetableId: number,
    userId: number,
    userName: string,
    userRole: string,
    timetableName: string
  ): TimetableChangeLog {
    return {
      id: this.generateId(),
      timetable_id: timetableId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      change_type: 'created',
      description: `Created new timetable: ${timetableName}`,
      timestamp: new Date().toISOString(),
      session_id: this.generateSessionId()
    };
  }

  static logTimetableFinalized(
    timetableId: number,
    userId: number,
    userName: string,
    userRole: string,
    message?: string
  ): TimetableChangeLog {
    return {
      id: this.generateId(),
      timetable_id: timetableId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      change_type: 'finalized',
      description: `Finalized timetable and sent for approval${message ? `: ${message}` : ''}`,
      timestamp: new Date().toISOString(),
      session_id: this.generateSessionId()
    };
  }

  static logTimetablePublished(
    timetableId: number,
    userId: number,
    userName: string,
    userRole: string,
    message?: string
  ): TimetableChangeLog {
    return {
      id: this.generateId(),
      timetable_id: timetableId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      change_type: 'published',
      description: `Approved and published timetable${message ? `: ${message}` : ''}`,
      timestamp: new Date().toISOString(),
      session_id: this.generateSessionId()
    };
  }

  static logClassAdded(
    timetableId: number,
    userId: number,
    userName: string,
    userRole: string,
    classData: any,
    sessionId?: string
  ): TimetableChangeLog {
    return {
      id: this.generateId(),
      timetable_id: timetableId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      change_type: 'class_added',
      description: `Added ${classData.subject_name || 'class'} ${classData.class_type || ''} on ${classData.day || ''} ${classData.time || ''}`,
      affected_entity: 'class',
      affected_entity_id: classData.id,
      new_value: classData,
      timestamp: new Date().toISOString(),
      session_id: sessionId || this.generateSessionId()
    };
  }

  static logClassUpdated(
    timetableId: number,
    userId: number,
    userName: string,
    userRole: string,
    oldData: any,
    newData: any,
    sessionId?: string
  ): TimetableChangeLog {
    const changes = this.getChangedFields(oldData, newData);
    const changeDescription = this.generateChangeDescription(changes, newData);

    return {
      id: this.generateId(),
      timetable_id: timetableId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      change_type: 'class_updated',
      description: `Updated ${newData.subject_name || 'class'}: ${changeDescription}`,
      affected_entity: 'class',
      affected_entity_id: newData.id,
      old_value: oldData,
      new_value: newData,
      timestamp: new Date().toISOString(),
      session_id: sessionId || this.generateSessionId()
    };
  }

  static logClassDeleted(
    timetableId: number,
    userId: number,
    userName: string,
    userRole: string,
    classData: any,
    sessionId?: string
  ): TimetableChangeLog {
    return {
      id: this.generateId(),
      timetable_id: timetableId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      change_type: 'class_deleted',
      description: `Removed ${classData.subject_name || 'class'} ${classData.class_type || ''} from ${classData.day || ''} ${classData.time || ''}`,
      affected_entity: 'class',
      affected_entity_id: classData.id,
      old_value: classData,
      timestamp: new Date().toISOString(),
      session_id: sessionId || this.generateSessionId()
    };
  }

  static logBulkUpdate(
    timetableId: number,
    userId: number,
    userName: string,
    userRole: string,
    changes: Array<{ type: 'added' | 'updated' | 'deleted', data: any, oldData?: any }>,
    description?: string
  ): TimetableChangeLog[] {
    const sessionId = this.generateSessionId();
    const logs: TimetableChangeLog[] = [];

    // Create a summary log for bulk operations
    const summaryLog: TimetableChangeLog = {
      id: this.generateId(),
      timetable_id: timetableId,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      change_type: 'updated',
      description: description || `Bulk update: ${changes.length} changes made`,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      new_value: { change_count: changes.length, changes: changes.map(c => c.type) }
    };
    
    logs.push(summaryLog);

    // Create individual logs for each change
    changes.forEach(change => {
      switch (change.type) {
        case 'added':
          logs.push(this.logClassAdded(timetableId, userId, userName, userRole, change.data, sessionId));
          break;
        case 'updated':
          logs.push(this.logClassUpdated(timetableId, userId, userName, userRole, change.oldData, change.data, sessionId));
          break;
        case 'deleted':
          logs.push(this.logClassDeleted(timetableId, userId, userName, userRole, change.data, sessionId));
          break;
      }
    });

    return logs;
  }

  private static getChangedFields(oldData: any, newData: any): Record<string, { old: any, new: any }> {
    const changes: Record<string, { old: any, new: any }> = {};
    
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    
    allKeys.forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes[key] = { old: oldData[key], new: newData[key] };
      }
    });
    
    return changes;
  }

  private static generateChangeDescription(changes: Record<string, { old: any, new: any }>, newData: any): string {
    const descriptions: string[] = [];
    
    Object.entries(changes).forEach(([field, { old, new: newVal }]) => {
      switch (field) {
        case 'classroom':
        case 'classroom_name':
          descriptions.push(`classroom changed from ${old} to ${newVal}`);
          break;
        case 'timeslot':
        case 'time':
          descriptions.push(`time changed from ${old} to ${newVal}`);
          break;
        case 'faculty':
        case 'faculty_name':
          descriptions.push(`faculty changed from ${old} to ${newVal}`);
          break;
        case 'subject':
        case 'subject_name':
          descriptions.push(`subject changed from ${old} to ${newVal}`);
          break;
        case 'class_type':
          descriptions.push(`type changed from ${old} to ${newVal}`);
          break;
        default:
          descriptions.push(`${field} changed from ${old} to ${newVal}`);
      }
    });
    
    return descriptions.join(', ');
  }

  // Version management
  static createVersion(
    timetableId: number,
    userId: number,
    versionNumber: number,
    description: string,
    dataSnapshot: any,
    changeSummary: string,
    isMajorVersion: boolean = false
  ) {
    return {
      id: this.generateId(),
      timetable_id: timetableId,
      version_number: versionNumber,
      created_by: userId,
      created_at: new Date().toISOString(),
      description,
      data_snapshot: dataSnapshot,
      change_summary: changeSummary,
      is_major_version: isMajorVersion
    };
  }

  // Statistics calculation
  static calculateStats(changeLogs: TimetableChangeLog[]) {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const changesLast24h = changeLogs.filter(log => 
      new Date(log.timestamp) > last24h
    );
    
    const userCounts = changeLogs.reduce((acc, log) => {
      acc[log.user_name] = (acc[log.user_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const changeTypeCounts = changeLogs.reduce((acc, log) => {
      acc[log.change_type] = (acc[log.change_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostActiveUser = Object.entries(userCounts).reduce((a, b) => 
      userCounts[a[0]] > userCounts[b[0]] ? a : b
    )?.[0] || 'No activity';
    
    const mostCommonChangeType = Object.entries(changeTypeCounts).reduce((a, b) => 
      changeTypeCounts[a[0]] > changeTypeCounts[b[0]] ? a : b
    )?.[0] || 'No changes';

    return {
      total_changes: changeLogs.length,
      changes_last_24h: changesLast24h.length,
      most_active_user: mostActiveUser,
      most_common_change_type: mostCommonChangeType,
      version_count: 0, // Would be calculated from versions
      last_major_version: 'N/A'
    };
  }
}

// Hook for using change tracking in components
export function useChangeTracking() {
  const logChange = (changeLog: TimetableChangeLog) => {
    // In a real app, this would send to the backend
    console.log('Change logged:', changeLog);
    
    // Could also trigger notifications, update local state, etc.
  };

  const logBulkChanges = (changeLogs: TimetableChangeLog[]) => {
    // In a real app, this would batch send to the backend
    console.log('Bulk changes logged:', changeLogs);
  };

  return {
    logChange,
    logBulkChanges,
    ChangeTrackingService
  };
}