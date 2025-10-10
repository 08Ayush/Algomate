'use client';

import React, { useState } from 'react';
import { X, Clock, MapPin, Users, User, Calendar, AlertCircle, CheckCircle, XCircle, Edit, Trash2, UserPlus } from 'lucide-react';

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  venue: string;
  department_id: string;
  department_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_by_name?: string;
  max_participants?: number;
  current_participants?: number;
  queue_position?: number;
  conflict_with?: string[];
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  budget_allocated?: number;
  registration_required?: boolean;
}

interface EventDetailModalProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: EventData) => void;
  onDelete?: (eventId: string) => void;
  onApprove?: (eventId: string) => void;
  onReject?: (eventId: string, reason: string) => void;
  onRegister?: (eventId: string) => void;
  onUnregister?: (eventId: string) => void;
  currentUserId?: string;
  userRole?: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  seminar: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  workshop: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  conference: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  cultural: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  sports: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  technical: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  examination: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  meeting: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  other: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
};

const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', icon: AlertCircle },
  approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: CheckCircle },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', icon: XCircle }
};

export default function EventDetailModal({
  event,
  open,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onRegister,
  onUnregister,
  currentUserId,
  userRole
}: EventDetailModalProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!event || !open) return null;

  const statusConfig = STATUS_COLORS[event.status];
  const StatusIcon = statusConfig.icon;

  const canEdit = currentUserId === event.created_by || userRole === 'admin';
  const canDelete = currentUserId === event.created_by || userRole === 'admin';
  const canApprove = userRole === 'admin' || userRole === 'hod';
  const canRegister = event.registration_required && event.status === 'approved';

  const isConflicted = event.conflict_with && event.conflict_with.length > 0;
  const isInQueue = event.queue_position && event.queue_position > 0;

  const handleReject = () => {
    if (rejectionReason.trim() && onReject) {
      onReject(event.id, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason('');
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6 flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {event.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}>
                  <StatusIcon className="h-3 w-3" />
                  {event.status.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other}`}>
                  {event.event_type.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{event.description}</p>
            </div>

            {/* Conflict Warning */}
            {isConflicted && (
              <div className="p-4 border-2 border-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-800 dark:text-red-400 mb-1">Event Conflict Detected</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      This event conflicts with other approved events on the same date.
                    </p>
                    {event.conflict_with && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-400">Conflicts with:</p>
                        <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside mt-1">
                          {event.conflict_with.map((conflictEvent, index) => (
                            <li key={index}>{conflictEvent}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Queue Position */}
            {isInQueue && (
              <div className="p-4 border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-400">In Queue</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Position #{event.queue_position} - You'll be notified when your requested date becomes available.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(event.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Time</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{event.start_time} - {event.end_time}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                  <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Venue</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{event.venue}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                  <User className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Department</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{event.department_name}</p>
                  </div>
                </div>
                
                {event.max_participants && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                    <Users className="h-5 w-5 text-pink-600 dark:text-pink-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Participants</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {event.current_participants || 0} / {event.max_participants}
                      </p>
                    </div>
                  </div>
                )}
                
                {event.created_by_name && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Created By</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{event.created_by_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            {(event.contact_person || event.contact_email || event.contact_phone) && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Contact Information</h3>
                <div className="space-y-2">
                  {event.contact_person && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Person:</span> {event.contact_person}
                    </p>
                  )}
                  {event.contact_email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Email:</span> {event.contact_email}
                    </p>
                  )}
                  {event.contact_phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Phone:</span> {event.contact_phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Rejection Form */}
            {showRejectForm && (
              <div className="p-4 border-2 border-red-300 dark:border-red-700 rounded-xl">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Rejection Reason</h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                  placeholder="Enter reason for rejection..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-6 flex items-center justify-end gap-3">
            {canRegister && !isRegistered && onRegister && (
              <button
                onClick={() => {
                  onRegister(event.id);
                  setIsRegistered(true);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-md font-semibold"
              >
                <UserPlus className="h-4 w-4" />
                Register
              </button>
            )}
            
            {canRegister && isRegistered && onUnregister && (
              <button
                onClick={() => {
                  onUnregister(event.id);
                  setIsRegistered(false);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 shadow-md font-semibold"
              >
                <X className="h-4 w-4" />
                Unregister
              </button>
            )}
            
            {canEdit && onEdit && (
              <button
                onClick={() => {
                  onEdit(event);
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md font-semibold"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
            
            {canApprove && event.status === 'pending' && onApprove && (
              <button
                onClick={() => {
                  onApprove(event.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-md font-semibold"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            )}
            
            {canApprove && event.status === 'pending' && onReject && (
              <>
                {!showRejectForm ? (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-md font-semibold"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                ) : (
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 transform hover:scale-105 shadow-md font-semibold"
                  >
                    <XCircle className="h-4 w-4" />
                    Confirm Reject
                  </button>
                )}
              </>
            )}
            
            {canDelete && onDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this event?')) {
                    onDelete(event.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300 transform hover:scale-105 shadow-md font-semibold"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-300 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
