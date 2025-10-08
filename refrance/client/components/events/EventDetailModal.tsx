import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Clock, 
  MapPin, 
  Users, 
  User, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
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
}

interface EventDetailModalProps {
  event: EventData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (event: EventData) => void;
  onDelete?: (eventId: string) => void;
  onApprove?: (eventId: string) => void;
  onReject?: (eventId: string) => void;
  onRegister?: (eventId: string) => void;
  onUnregister?: (eventId: string) => void;
}

const EVENT_TYPE_COLORS = {
  seminar: 'bg-blue-100 text-blue-800',
  workshop: 'bg-green-100 text-green-800',
  conference: 'bg-purple-100 text-purple-800',
  cultural: 'bg-pink-100 text-pink-800',
  sports: 'bg-orange-100 text-orange-800',
  fest: 'bg-red-100 text-red-800',
  exhibition: 'bg-indigo-100 text-indigo-800',
  guest_lecture: 'bg-yellow-100 text-yellow-800',
  competition: 'bg-cyan-100 text-cyan-800',
  other: 'bg-gray-100 text-gray-800'
};

const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
  approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
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
  onUnregister
}: EventDetailModalProps) {
  const { user, hasPermission } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false); // This would come from API

  if (!event) return null;

  const statusConfig = STATUS_COLORS[event.status];
  const StatusIcon = statusConfig.icon;

  const canEdit = hasPermission('edit_events') && event.created_by === user?.id;
  const canDelete = hasPermission('delete_events') && event.created_by === user?.id;
  const canApprove = hasPermission('approve_events');
  const canRegister = hasPermission('register_for_events') && event.status === 'approved';

  const isConflicted = event.conflict_with && event.conflict_with.length > 0;
  const isInQueue = event.queue_position && event.queue_position > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl font-bold pr-4">
              {event.title}
            </DialogTitle>
            <Badge className={cn(statusConfig.bg, statusConfig.text)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {event.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Description */}
          <div>
            <p className="text-muted-foreground">{event.description}</p>
          </div>

          {/* Conflict Warning */}
          {isConflicted && (
            <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive">Event Conflict Detected</h4>
                  <p className="text-sm text-muted-foreground">
                    This event conflicts with other approved events on the same date.
                  </p>
                  {event.conflict_with && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Conflicts with:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
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

          {/* Queue Information */}
          {isInQueue && (
            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">In Queue</h4>
                  <p className="text-sm text-yellow-700">
                    This event is position #{event.queue_position} in the queue for this date.
                    It will be automatically approved if higher priority events are cancelled.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {event.start_time} - {event.end_time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Venue</p>
                  <p className="text-sm text-muted-foreground">{event.venue}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Organized by</p>
                  <p className="text-sm text-muted-foreground">
                    {event.created_by_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">{event.department_name}</p>
                </div>
              </div>

              {event.max_participants && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Participants</p>
                    <p className="text-sm text-muted-foreground">
                      {event.current_participants || 0} / {event.max_participants}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="font-medium mb-2">Event Type</p>
                <Badge 
                  className={EVENT_TYPE_COLORS[event.event_type as keyof typeof EVENT_TYPE_COLORS]}
                >
                  {event.event_type.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex flex-wrap gap-2 justify-end">
              {/* Student Registration */}
              {canRegister && event.max_participants && (
                <>
                  {isRegistered ? (
                    <Button 
                      variant="outline" 
                      onClick={() => onUnregister?.(event.id)}
                      disabled={event.status !== 'approved'}
                    >
                      Unregister
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => onRegister?.(event.id)}
                      disabled={
                        event.status !== 'approved' || 
                        (event.current_participants || 0) >= event.max_participants
                      }
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register
                    </Button>
                  )}
                </>
              )}

              {/* Mentor/Admin Actions */}
              {canEdit && (
                <Button variant="outline" onClick={() => onEdit?.(event)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}

              {canDelete && (
                <Button 
                  variant="outline" 
                  onClick={() => onDelete?.(event.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}

              {/* Admin Approval Actions */}
              {canApprove && event.status === 'pending' && (
                <>
                  <Button onClick={() => onApprove?.(event.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onReject?.(event.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}

              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}