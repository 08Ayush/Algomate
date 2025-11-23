'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import LeftSidebar from '@/components/LeftSidebar';
import EventCalendar from '@/components/events/EventCalendar';
import EventDetailModal from '@/components/events/EventDetailModal';
import { Calendar, Plus, List, TrendingUp, Clock, CheckCircle, AlertCircle, Users } from 'lucide-react';

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
  status: 'draft' | 'pending' | 'published' | 'approved' | 'rejected';
  created_by: string;
  created_by_name?: string;
  max_participants?: number;
  current_participants?: number;
  queue_position?: number;
  conflict_with?: string[];
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  start_date: string;
  end_date: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      
      if (parsedUser.role !== 'faculty') {
        router.push('/login');
        return;
      }
      
      const facultyType = parsedUser.faculty_type;
      if (facultyType !== 'creator' && facultyType !== 'publisher') {
        router.push('/student/dashboard');
        return;
      }
      
      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  // Fetch events when user is loaded
  useEffect(() => {
    if (user && user.department_id) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      // Filter events by user's department
      const departmentParam = user?.department_id ? `?department_id=${user.department_id}` : '';
      const response = await fetch(`/api/events${departmentParam}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setEvents(result.data);
        setFilteredEvents(result.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      alert('Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    let filtered = events;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }
    
    setFilteredEvents(filtered);
  }, [events, statusFilter]);

  const handleEventClick = (event: EventData) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleCreateEvent = () => {
    router.push('/faculty/events/create');
  };

  const handleEdit = (event: EventData) => {
    router.push(`/faculty/events/edit/${event.id}`);
  };

  const handleDelete = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Event deleted successfully');
        fetchEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        alert('Event approved successfully');
        fetchEvents();
      }
    } catch (error) {
      console.error('Error approving event:', error);
      alert('Failed to approve event');
    }
  };

  const handleReject = async (eventId: string, reason: string) => {
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          status: 'rejected',
          rejection_reason: reason,
          rejected_by: user?.id,
          rejected_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        alert('Event rejected');
        fetchEvents();
      }
    } catch (error) {
      console.error('Error rejecting event:', error);
      alert('Failed to reject event');
    }
  };

  const handlePublish = async (eventId: string) => {
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          status: 'published',
          published_by: user?.id,
          published_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        alert('Event published successfully! Students can now see this event.');
        fetchEvents();
        setIsDetailModalOpen(false);
      } else {
        const result = await response.json();
        alert(`Failed to publish event: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      alert('Failed to publish event');
    }
  };

  // Calculate statistics
  const totalEvents = events.length;
  const draftEvents = events.filter(e => e.status === 'draft').length;
  const publishedEvents = events.filter(e => e.status === 'published').length;
  const pendingEvents = events.filter(e => e.status === 'pending').length;
  const approvedEvents = events.filter(e => e.status === 'approved').length;
  const conflictEvents = events.filter(e => e.conflict_with && e.conflict_with.length > 0).length;
  const queuedEvents = events.filter(e => e.queue_position && e.queue_position > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">Event Management</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">Manage college events with conflict detection and queue system</p>
              </div>
              <button 
                onClick={handleCreateEvent}
                className="group flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                Create Event
              </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl border border-gray-200 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{totalEvents}</span>
                  <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl border border-gray-200 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-gray-600 dark:text-gray-400">{draftEvents}</span>
                  <Clock className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Draft</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl border border-gray-200 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{publishedEvents}</span>
                  <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Published</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl border border-gray-200 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">{pendingEvents}</span>
                  <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl border border-gray-200 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-green-600 dark:text-green-400">{approvedEvents}</span>
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-md hover:shadow-xl border border-gray-200 dark:border-slate-700 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-red-600 dark:text-red-400">{conflictEvents}</span>
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conflicts</p>
              </div>
            </div>

            {/* Conflict Warning Banner */}
            {conflictEvents > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-l-4 border-yellow-500 dark:border-yellow-400 p-4 rounded-xl shadow-md">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-yellow-900 dark:text-yellow-200">Conflict Resolution</h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Events with date conflicts are automatically queued using first-come-first-serve. You'll receive notifications when your requested date becomes available.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* View Toggle & Filters */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md border border-gray-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView('calendar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    activeView === 'calendar'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                </button>
                <button
                  onClick={() => setActiveView('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    activeView === 'list'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="published">Published</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Calendar or List View */}
            {loadingEvents ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              </div>
            ) : activeView === 'calendar' ? (
              <EventCalendar
                events={filteredEvents}
                onEventClick={handleEventClick}
                onDateClick={(date) => console.log('Date clicked:', date)}
                onCreateEvent={handleCreateEvent}
              />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-gray-200 dark:border-slate-700 p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Event List</h3>
                <div className="space-y-4">
                  {filteredEvents.length === 0 ? (
                    <p className="text-center py-12 text-gray-500 dark:text-gray-400">No events found</p>
                  ) : (
                    filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="p-5 border border-gray-200 dark:border-slate-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-bold text-lg text-gray-900 dark:text-white">{event.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            event.status === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' :
                            event.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            event.status === 'published' || event.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {event.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{event.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{event.date}</span>
                          <span>{event.start_time} - {event.end_time}</span>
                          <span>{event.venue}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onReject={handleReject}
        onPublish={handlePublish}
        currentUserId={user?.id}
        userRole={user?.role}
        userFacultyType={user?.faculty_type}
      />
    </>
  );
}
