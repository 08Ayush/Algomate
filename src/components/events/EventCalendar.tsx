'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Users, MapPin, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

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
  max_participants?: number;
  current_participants?: number;
}

interface EventCalendarProps {
  events: EventData[];
  onEventClick?: (event: EventData) => void;
  onDateClick?: (date: Date) => void;
  onCreateEvent?: () => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  seminar: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  workshop: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  conference: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
  cultural: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400',
  sports: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  technical: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400',
  examination: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  meeting: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300',
  other: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-700 dark:text-slate-300'
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
};

export default function EventCalendar({ events, onEventClick, onDateClick, onCreateEvent }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get month information
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Generate calendar days
  const calendarDays: (Date | null)[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add all days in month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EventData[]> = {};
    events.forEach(event => {
      const eventDate = new Date(event.date);
      const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const selectedDateEvents = selectedDate ? (eventsByDate[getDateKey(selectedDate)] || []) : [];

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const getDayEvents = (date: Date) => {
    return eventsByDate[getDateKey(date)] || [];
  };

  const hasConflict = (date: Date) => {
    const dayEvents = getDayEvents(date);
    return dayEvents.filter(event => event.status === 'approved').length > 1;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {monthNames[month]} {year}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePreviousMonth}
              className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
            {onCreateEvent && (
              <button 
                onClick={onCreateEvent}
                className="ml-2 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">New Event</span>
              </button>
            )}
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="min-h-[120px]" />;
            }

            const dayEvents = getDayEvents(date);
            const approvedEvents = dayEvents.filter(event => event.status === 'approved');
            const pendingEvents = dayEvents.filter(event => event.status === 'pending');
            const hasConflictToday = hasConflict(date);
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);

            return (
              <div
                key={index}
                onClick={() => handleDateClick(date)}
                className={`min-h-[120px] p-3 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg
                  ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-gray-200 dark:border-slate-700'}
                  ${isTodayDate ? 'bg-blue-100/50 dark:bg-blue-900/30 border-blue-400' : 'bg-white dark:bg-slate-800'}
                  ${hasConflictToday ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10' : ''}
                  hover:bg-gray-50 dark:hover:bg-slate-700`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${isTodayDate ? 'text-blue-600 dark:text-blue-400 text-lg' : 'text-gray-700 dark:text-gray-300'}`}>
                    {date.getDate()}
                  </span>
                  {hasConflictToday && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
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
                      className={`text-xs p-1.5 rounded-lg border truncate font-medium transition-transform hover:scale-105 ${EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other}`}
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
                      className="text-xs p-1.5 rounded-lg border truncate font-medium bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 transition-transform hover:scale-105"
                      title={`${event.title} (Pending)`}
                    >
                      {event.title} (Pending)
                    </div>
                  ))}

                  {(approvedEvents.length + pendingEvents.length) > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      +{(approvedEvents.length + pendingEvents.length) - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Events for {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
          </h3>
          
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">No events scheduled for this date</p>
              {onCreateEvent && (
                <button 
                  onClick={onCreateEvent}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md font-medium"
                >
                  <Plus className="h-5 w-5" />
                  Create Event
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="p-5 border border-gray-200 dark:border-slate-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{event.title}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[event.status]}`}>
                      {event.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {event.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium">{event.start_time} - {event.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium">{event.venue}</span>
                    </div>
                    {event.max_participants && (
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-medium">{event.current_participants || 0}/{event.max_participants}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${EVENT_TYPE_COLORS[event.event_type] || EVENT_TYPE_COLORS.other}`}>
                      {event.event_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {event.department_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
