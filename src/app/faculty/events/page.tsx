'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Calendar, Plus, Edit, Trash2, X, Search, RefreshCw, Clock, MapPin, Users,
  ChevronLeft, ChevronRight, List, CheckCircle, AlertCircle, FileText, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import FacultyCreatorLayout from '@/components/faculty/FacultyCreatorLayout';

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  venue?: string;
  is_recurring: boolean;
  status?: string;
  created_at: string;
  created_by?: string;
  creator_name?: string;
  department_name?: string;
}

const EventsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchEvents(parsedUser);
  }, [router]);

  const isCreatorOrPublisher = user?.faculty_type === 'creator' || user?.faculty_type === 'publisher';
  const isGeneral = !isCreatorOrPublisher;

  const getAuthHeaders = () => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/login'); return null; }
    return { 'Authorization': `Bearer ${Buffer.from(userData).toString('base64')}`, 'Content-Type': 'application/json' };
  };

  const fetchEvents = async (userData?: any) => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch('/api/events', { headers });
      if (res.ok) {
        const data = await res.json();
        let eventsList = data.events || data.data || [];

        if (userData?.faculty_type !== 'creator' && userData?.faculty_type !== 'publisher') {
          eventsList = eventsList.filter((e: Event) =>
            e.status === 'published' || e.status === 'active' || !e.status
          );
        }

        setEvents(eventsList);
      }
    } catch { toast.error('Error loading events'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (res.ok) {
        toast.success('Event deleted');
        setEvents(prev => prev.filter(e => e.id !== id));
        setSelectedEvent(null);
      } else {
        toast.error(data.error || 'Failed to delete event');
        console.error('Delete error:', data);
      }
    } catch (error) {
      console.error('Delete exception:', error);
      toast.error('Error deleting event');
    }
  };

  // Stats
  const stats = {
    total: events.length,
    draft: events.filter(e => e.status === 'draft').length,
    published: events.filter(e => e.status === 'published' || !e.status).length,
    pending: events.filter(e => e.status === 'pending' || e.status === 'pending_approval').length,
    approved: events.filter(e => e.status === 'approved').length,
    conflicts: events.filter(e => e.status === 'conflict').length,
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => {
      const startDate = e.start_date?.split('T')[0];
      const endDate = e.end_date?.split('T')[0];
      return startDate === dateStr || (startDate && endDate && dateStr >= startDate && dateStr <= endDate);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter || (!e.status && statusFilter === 'published');
    return matchesSearch && matchesStatus;
  });

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'lecture': 'bg-blue-500',
      'exam': 'bg-red-500',
      'holiday': 'bg-green-500',
      'meeting': 'bg-purple-500',
      'workshop': 'bg-orange-500',
      'seminar': 'bg-teal-500',
      'cultural': 'bg-pink-500',
      'sports': 'bg-yellow-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'published': 'bg-green-100 text-green-700',
      'draft': 'bg-gray-100 text-gray-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-blue-100 text-blue-700',
      'conflict': 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-green-100 text-green-700';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <FacultyCreatorLayout activeTab="events">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Events</h1>
            <p className="text-gray-600">
              {isGeneral ? 'View upcoming academic events and schedules' : 'Manage academic events, lectures, and schedules'}
            </p>
          </div>
          <button onClick={fetchEvents} className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 bg-white">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100"><Calendar size={20} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500">Total Events</p></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gray-100"><Clock size={20} className="text-gray-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.draft}</p><p className="text-xs text-gray-500">Draft</p></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-100"><CheckCircle size={20} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.published}</p><p className="text-xs text-gray-500">Published</p></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-100"><AlertCircle size={20} className="text-yellow-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.pending}</p><p className="text-xs text-gray-500">Pending</p></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100"><CheckCircle size={20} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.approved}</p><p className="text-xs text-gray-500">Approved</p></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl shadow-lg p-5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100"><AlertCircle size={20} className="text-red-600" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{stats.conflicts}</p><p className="text-xs text-gray-500">Conflicts</p></div>
          </motion.div>
        </div>

        {/* View Toggle & Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${viewMode === 'calendar' ? 'bg-[#4D869C] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Calendar size={16} /> Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${viewMode === 'list' ? 'bg-[#4D869C] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <List size={16} /> List
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl min-w-[130px]"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>

            {isCreatorOrPublisher && (
              <button
                type="button"
                onClick={() => router.push('/faculty/events/create')}
                className="flex items-center gap-2 px-4 py-2 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg"
              >
                <Plus size={16} /> New Event
              </button>
            )}
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar size={24} className="text-[#4D869C]" />
                <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 rounded-xl hover:bg-gray-100 border border-gray-200"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 rounded-xl hover:bg-gray-100 border border-gray-200"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
                {isCreatorOrPublisher && (
                  <button
                    type="button"
                    onClick={() => router.push('/faculty/events/create')}
                    className="ml-2 flex items-center gap-2 px-4 py-2 bg-[#4D869C] text-white rounded-xl font-medium hover:shadow-lg"
                  >
                    <Plus size={16} /> New Event
                  </button>
                )}
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center py-2 text-sm font-semibold text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square p-1"></div>
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDate(day);
                const isToday = new Date().getDate() === day &&
                  new Date().getMonth() === currentDate.getMonth() &&
                  new Date().getFullYear() === currentDate.getFullYear();

                return (
                  <div
                    key={day}
                    className={`aspect-square p-1 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</div>
                    <div className="space-y-0.5 overflow-hidden max-h-[60px]">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`text-[10px] text-white px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${getEventTypeColor(event.event_type)}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="p-4 border-b">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4D869C] outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4D869C] border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
                <p>No events match your search criteria.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedEvent(event)}
                    className="p-5 hover:bg-gray-50 cursor-pointer transition-all flex items-center gap-4"
                  >
                    <div className={`w-2 h-16 rounded-full ${getEventTypeColor(event.event_type)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(event.status || 'published')}`}>
                          {event.status || 'Published'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 uppercase">
                          {event.event_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{event.description || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(event.start_date)}
                        </span>
                        {event.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {event.venue}
                          </span>
                        )}
                      </div>
                    </div>
                    {isCreatorOrPublisher && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/faculty/events/edit/${event.id}`); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Event Detail Modal */}
        <AnimatePresence>
          {selectedEvent && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                      <div className="flex gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedEvent.status || 'published')}`}>
                          <CheckCircle size={12} /> {selectedEvent.status?.toUpperCase() || 'PUBLISHED'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 uppercase">
                          {selectedEvent.event_type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>

                  {selectedEvent.description && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-500 mb-1">DESCRIPTION</p>
                      <p className="text-gray-700">{selectedEvent.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Calendar size={14} />
                        <span className="text-xs font-semibold">DATE</span>
                      </div>
                      <p className="text-gray-900 font-medium">{formatDate(selectedEvent.start_date)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Building2 size={14} />
                        <span className="text-xs font-semibold">DEPARTMENT</span>
                      </div>
                      <p className="text-gray-900 font-medium">{selectedEvent.department_name || 'General'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Clock size={14} />
                        <span className="text-xs font-semibold">TIME</span>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {selectedEvent.start_time || '00:00'} - {selectedEvent.end_time || '00:00'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Users size={14} />
                        <span className="text-xs font-semibold">CREATED BY</span>
                      </div>
                      <p className="text-gray-900 font-medium">{selectedEvent.creator_name || 'Unknown'}</p>
                    </div>
                  </div>

                  {(selectedEvent.venue || selectedEvent.location) && (
                    <div className="bg-gray-50 p-4 rounded-xl mb-6">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <MapPin size={14} />
                        <span className="text-xs font-semibold">VENUE</span>
                      </div>
                      <p className="text-gray-900 font-medium">{selectedEvent.venue || selectedEvent.location}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    {isCreatorOrPublisher && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(selectedEvent.id);
                          }}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedEvent(null);
                            router.push(`/faculty/events/edit/${selectedEvent.id}`);
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                        >
                          Edit
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedEvent(null);
                      }}
                      className="px-6 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </FacultyCreatorLayout >
  );
};

export default EventsPage;
