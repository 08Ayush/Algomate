'use client';

import { useState, useEffect } from 'react';
import { X, Send, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface NotificationComposerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userDepartmentId?: string;
  timetableId?: string;
  batchId?: string;
}

interface Batch {
  id: string;
  name: string;
  semester: number;
  section: string;
}

export function NotificationComposer({
  isOpen,
  onClose,
  userId,
  userDepartmentId,
  timetableId,
  batchId: initialBatchId
}: NotificationComposerProps) {
  // Set default notification type based on whether it's for a published timetable or custom message
  const [type, setType] = useState<'timetable_published' | 'schedule_change' | 'system_alert' | 'approval_request'>(
    timetableId ? 'timetable_published' : 'schedule_change'
  );
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState<'batch' | 'department' | 'custom'>('batch');
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || '');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    if (isOpen && userDepartmentId) {
      fetchBatches();
    }
  }, [isOpen, userDepartmentId]);

  useEffect(() => {
    if (initialBatchId) {
      setSelectedBatchId(initialBatchId);
    }
  }, [initialBatchId]);

  const fetchBatches = async () => {
    try {
      // Get user from localStorage for auth token
      const userData = localStorage.getItem('user');
      if (!userData) return;
      
      const user = JSON.parse(userData);
      const authToken = Buffer.from(JSON.stringify(user)).toString('base64');
      
      const response = await fetch(`/api/batches?department_id=${userDepartmentId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBatches(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    if (recipientType === 'batch' && !selectedBatchId) {
      setError('Please select a batch');
      return;
    }

    setSending(true);
    setError('');

    try {
      const payload: any = {
        sender_id: userId,
        type,
        title: title.trim(),
        message: message.trim(),
        timetable_id: timetableId || null
      };

      if (recipientType === 'batch') {
        payload.broadcast_to_batch = true;
        payload.batch_id = selectedBatchId;
      } else if (recipientType === 'department') {
        payload.broadcast_to_department = true;
        payload.department_id = userDepartmentId;
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setRecipientCount(data.recipients_count || 0);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          resetForm();
        }, 2000);
      } else {
        setError(data.error || 'Failed to send notification');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setType(timetableId ? 'timetable_published' : 'schedule_change');
    setRecipientType('batch');
    setSelectedBatchId(initialBatchId || '');
    setError('');
    setSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Send className="w-6 h-6" />
              Send Notification
            </h2>
            {!timetableId && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Notify students and faculty about schedule changes or important updates
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="m-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">
                Notification sent successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Sent to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Notification Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              disabled={timetableId !== undefined}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {timetableId ? (
                <option value="timetable_published">Timetable Published</option>
              ) : (
                <>
                  <option value="schedule_change">Schedule Change</option>
                  <option value="system_alert">System Alert</option>
                  <option value="approval_request">Approval Request</option>
                </>
              )}
            </select>
            {timetableId && (
              <p className="text-xs text-gray-500 mt-1">
                Notification type is automatically set for published timetables
              </p>
            )}
            {!timetableId && (
              <p className="text-xs text-gray-500 mt-1">
                Use "Schedule Change" for last-minute updates or changes
              </p>
            )}
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Send To
            </label>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setRecipientType('batch')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  recipientType === 'batch'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Specific Batch
              </button>
              <button
                onClick={() => setRecipientType('department')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                  recipientType === 'department'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Entire Department
              </button>
            </div>

            {recipientType === 'batch' && (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a batch...</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} - Semester {batch.semester} ({batch.section})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Urgent: Timetable Change for Monday, Important: Lecture Rescheduled"
              maxLength={100}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Custom Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here to inform students and faculty about the change...&#10;&#10;Example:&#10;Dear Students,&#10;&#10;Due to unforeseen circumstances, the Computer Networks lecture scheduled for Monday at 10:00 AM has been rescheduled to Tuesday at 2:00 PM. Please check the updated timetable.&#10;&#10;Regards,&#10;Faculty Team"
              rows={6}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Notification
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
