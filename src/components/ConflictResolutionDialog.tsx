/**
 * Conflict Resolution Dialog
 * Displays cross-department conflicts and allows resolution
 */

'use client';

import { useState } from 'react';
import { AlertTriangle, X, Calendar, Clock, User, MapPin, BookOpen, Building } from 'lucide-react';

interface ConflictingTimetable {
  timetable_id: string;
  timetable_title: string;
  department_id: string;
  department_name: string;
  batch_id: string;
  batch_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
}

interface ResourceConflict {
  conflict_id?: string;
  resource_type: 'FACULTY' | 'CLASSROOM';
  resource_id: string;
  resource_name?: string;
  time_slot_id: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  conflicting_timetables: ConflictingTimetable[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  conflict_description: string;
}

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ResourceConflict[];
  conflictCount: number;
  criticalCount: number;
  timetableId: string;
  timetableTitle: string;
  onResolve?: () => void;
}

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflicts,
  conflictCount,
  criticalCount,
  timetableId,
  timetableTitle,
  onResolve
}: ConflictResolutionDialogProps) {
  const [resolving, setResolving] = useState(false);
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleMarkResolved = async () => {
    if (selectedConflicts.size === 0) {
      alert('Please select conflicts to mark as resolved');
      return;
    }

    setResolving(true);
    try {
      const response = await fetch('/api/cross-department-conflicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflict_ids: Array.from(selectedConflicts)
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Marked ${selectedConflicts.size} conflicts as resolved`);
        setSelectedConflicts(new Set());
        if (onResolve) onResolve();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      alert('Failed to resolve conflicts');
    } finally {
      setResolving(false);
    }
  };

  const toggleConflict = (conflictId: string) => {
    const newSelected = new Set(selectedConflicts);
    if (newSelected.has(conflictId)) {
      newSelected.delete(conflictId);
    } else {
      newSelected.add(conflictId);
    }
    setSelectedConflicts(newSelected);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'HIGH': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Cross-Department Conflicts Detected
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Timetable: <span className="font-semibold">{timetableTitle}</span>
              </p>
              <div className="flex gap-4 mt-2">
                <span className="text-sm">
                  <span className="font-semibold text-red-600">{conflictCount}</span> total conflicts
                </span>
                {criticalCount > 0 && (
                  <span className="text-sm">
                    <span className="font-semibold text-red-600">{criticalCount}</span> critical
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Cannot publish:</strong> The following resources are already scheduled by other departments at the same time. 
              You must either modify your timetable or coordinate with the other departments.
            </p>
          </div>

          {conflicts.map((conflict, index) => (
            <div
              key={conflict.conflict_id || index}
              className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-5 space-y-4"
            >
              {/* Conflict Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(conflict.severity)}`}>
                      {conflict.severity}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                      {conflict.resource_type}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {conflict.resource_type === 'FACULTY' ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                    {conflict.resource_name || 'Unknown Resource'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {conflict.conflict_description}
                  </p>
                </div>
                {conflict.conflict_id && (
                  <input
                    type="checkbox"
                    checked={selectedConflicts.has(conflict.conflict_id)}
                    onChange={() => toggleConflict(conflict.conflict_id!)}
                    className="mt-1"
                  />
                )}
              </div>

              {/* Time Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold">{conflict.day}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{conflict.start_time} - {conflict.end_time}</span>
                </div>
              </div>

              {/* Conflicting Timetables */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Scheduled in {conflict.conflicting_timetables.length} timetable(s):
                </h4>
                {conflict.conflicting_timetables.map((tt, ttIndex) => (
                  <div
                    key={ttIndex}
                    className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {tt.department_name}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-600 dark:text-gray-400">{tt.batch_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <BookOpen className="w-4 h-4" />
                      <span>{tt.subject_name}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Timetable: {tt.timetable_title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedConflicts.size > 0 && (
              <span>{selectedConflicts.size} conflict(s) selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
            {conflicts.some(c => c.conflict_id) && (
              <button
                onClick={handleMarkResolved}
                disabled={resolving || selectedConflicts.size === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resolving ? 'Resolving...' : 'Mark Selected as Resolved'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
