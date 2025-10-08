import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, MapPin, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
  max_participants?: number;
  current_participants?: number;
}

interface EventCalendarProps {
  events: EventData[];
  onEventClick?: (event: EventData) => void;
  onDateClick?: (date: Date) => void;
  onCreateEvent?: () => void;
}

const EVENT_TYPE_COLORS = {
  seminar: 'bg-blue-100 text-blue-800 border-blue-200',
  workshop: 'bg-green-100 text-green-800 border-green-200',
  conference: 'bg-purple-100 text-purple-800 border-purple-200',
  cultural: 'bg-pink-100 text-pink-800 border-pink-200',
  sports: 'bg-orange-100 text-orange-800 border-orange-200',
  fest: 'bg-red-100 text-red-800 border-red-200',
  exhibition: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  guest_lecture: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  competition: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200'
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

export default function EventCalendar({ events, onEventClick, onDateClick, onCreateEvent }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { hasPermission } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EventData[]> = {};
    events.forEach(event => {
      const dateKey = format(new Date(event.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const selectedDateEvents = selectedDate ? 
    eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || [] : [];

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const getDayEvents = (date: Date) => {
    return eventsByDate[format(date, 'yyyy-MM-dd')] || [];
  };

  const hasConflict = (date: Date) => {
    const dayEvents = getDayEvents(date);
    return dayEvents.filter(event => event.status === 'approved').length > 1;
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CalendarIcon className="h-6 w-6" />
              <CardTitle>
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {hasPermission('create_events') && (
                <Button onClick={onCreateEvent} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dayEvents = getDayEvents(date);
              const approvedEvents = dayEvents.filter(event => event.status === 'approved');
              const pendingEvents = dayEvents.filter(event => event.status === 'pending');
              const hasConflictToday = hasConflict(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    "min-h-[120px] p-2 border border-border rounded-lg cursor-pointer transition-colors",
                    "hover:bg-accent/50",
                    !isSameMonth(date, currentDate) && "text-muted-foreground bg-muted/20",
                    isToday(date) && "bg-primary/10 border-primary",
                    isSelected && "bg-accent border-accent-foreground",
                    hasConflictToday && "border-destructive bg-destructive/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-sm font-medium",
                      isToday(date) && "font-bold text-primary"
                    )}>
                      {format(date, 'd')}
                    </span>
                    {hasConflictToday && (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                  </div>

                  <div className="space-y-1">
                    {approvedEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className={cn(
                          "text-xs p-1 rounded border truncate",
                          EVENT_TYPE_COLORS[event.event_type as keyof typeof EVENT_TYPE_COLORS] || EVENT_TYPE_COLORS.other
                        )}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    
                    {pendingEvents.slice(0, 1).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className="text-xs p-1 rounded border truncate bg-yellow-50 text-yellow-700 border-yellow-200"
                        title={`${event.title} (Pending)`}
                      >
                        {event.title} (Pending)
                      </div>
                    ))}

                    {(approvedEvents.length + pendingEvents.length) > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{(approvedEvents.length + pendingEvents.length) - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Events for {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events scheduled for this date</p>
                {hasPermission('create_events') && (
                  <Button className="mt-4" onClick={onCreateEvent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{event.title}</h4>
                      <Badge className={STATUS_COLORS[event.status]}>
                        {event.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {event.description}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {event.start_time} - {event.end_time}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.venue}
                      </div>
                      {event.max_participants && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {event.current_participants || 0}/{event.max_participants}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Badge 
                        variant="outline" 
                        className={EVENT_TYPE_COLORS[event.event_type as keyof typeof EVENT_TYPE_COLORS]}
                      >
                        {event.event_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {event.department_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}