import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, Calendar as CalendarIcon, Clock, MapPin, Users, AlertTriangle, 
  CheckCircle, XCircle, Timer, Bell, Filter, Search, Eye, Edit, Trash2, List 
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import EventCalendar from '@/components/events/EventCalendar';
import EventDetailModal from '@/components/events/EventDetailModal';

// Event types and statuses
const eventTypes = [
  { value: 'workshop', label: 'Workshop', color: 'bg-blue-100 text-blue-800' },
  { value: 'seminar', label: 'Seminar', color: 'bg-green-100 text-green-800' },
  { value: 'conference', label: 'Conference', color: 'bg-purple-100 text-purple-800' },
  { value: 'cultural', label: 'Cultural', color: 'bg-pink-100 text-pink-800' },
  { value: 'sports', label: 'Sports', color: 'bg-orange-100 text-orange-800' },
  { value: 'technical', label: 'Technical', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'orientation', label: 'Orientation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'examination', label: 'Examination', color: 'bg-red-100 text-red-800' },
  { value: 'meeting', label: 'Meeting', color: 'bg-gray-100 text-gray-800' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-800' }
];

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

// Mock data
const mockDepartments = [
  { id: '1', name: 'Computer Engineering', code: 'COMP' },
  { id: '2', name: 'Mechanical Engineering', code: 'MECH' },
  { id: '3', name: 'Civil Engineering', code: 'CIVIL' },
  { id: '4', name: 'Electrical Engineering', code: 'ELEC' },
  { id: '5', name: 'Electronics & Telecommunication', code: 'E&TC' }
];

const mockClassrooms = [
  { id: '1', name: 'Auditorium', capacity: 500 },
  { id: '2', name: 'Seminar Hall 1', capacity: 100 },
  { id: '3', name: 'Conference Room A', capacity: 50 },
  { id: '4', name: 'Lab Complex', capacity: 80 }
];

const mockEvents = [
  {
    id: '1',
    title: 'AI/ML Workshop',
    description: 'Hands-on workshop on Machine Learning fundamentals',
    event_type: 'workshop',
    department_id: '1',
    department: { name: 'Computer Science & Engineering', code: 'CSE' },
    created_by: '1',
    creator: { first_name: 'Dr. John', last_name: 'Smith' },
    start_date: '2025-09-20',
    end_date: '2025-09-20',
    start_time: '09:00',
    end_time: '17:00',
    venue: 'Auditorium',
    classroom_id: '1',
    expected_participants: 200,
    status: 'approved',
    priority_level: 2,
    is_public: true,
    registration_required: true,
    max_registrations: 250,
    contact_person: 'Dr. John Smith',
    contact_email: 'john.smith@college.edu',
    created_at: '2025-09-10T10:00:00Z',
    conflict_info: { has_conflict: false, conflicting_events: [], queue_position: null }
  },
  {
    id: '2',
    title: 'Electronics Expo',
    description: 'Annual electronics exhibition by ECE department',
    event_type: 'technical',
    department_id: '2',
    department: { name: 'Electronics & Communication', code: 'ECE' },
    created_by: '2',
    creator: { first_name: 'Dr. Sarah', last_name: 'Johnson' },
    start_date: '2025-09-22',
    end_date: '2025-09-23',
    start_time: '10:00',
    end_time: '16:00',
    venue: 'Lab Complex',
    classroom_id: '4',
    expected_participants: 150,
    status: 'pending',
    priority_level: 3,
    is_public: true,
    registration_required: false,
    contact_person: 'Dr. Sarah Johnson',
    contact_email: 'sarah.johnson@college.edu',
    created_at: '2025-09-12T14:00:00Z',
    conflict_info: { has_conflict: false, conflicting_events: [], queue_position: null }
  },
  {
    id: '3',
    title: 'Cultural Night',
    description: 'Annual cultural festival',
    event_type: 'cultural',
    department_id: '1',
    department: { name: 'Computer Science & Engineering', code: 'CSE' },
    created_by: '3',
    creator: { first_name: 'Prof. Mike', last_name: 'Brown' },
    start_date: '2025-09-20',
    end_date: '2025-09-20',
    start_time: '18:00',
    end_time: '22:00',
    venue: 'Auditorium',
    classroom_id: '1',
    expected_participants: 400,
    status: 'pending',
    priority_level: 1,
    is_public: true,
    registration_required: false,
    contact_person: 'Prof. Mike Brown',
    contact_email: 'mike.brown@college.edu',
    created_at: '2025-09-13T09:00:00Z',
    conflict_info: { 
      has_conflict: true, 
      conflicting_events: ['1'], 
      queue_position: 2 
    }
  }
];

interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  department_id: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
  start_time: string;
  end_time: string;
  venue: string;
  classroom_id: string;
  expected_participants: number;
  budget_allocated: number;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  priority_level: number;
  is_public: boolean;
  registration_required: boolean;
  max_registrations: number;
  registration_deadline: Date | undefined;
}

export default function Events() {
  const { hasPermission, user } = useAuth();
  const [events, setEvents] = useState(mockEvents);
  const [filteredEvents, setFilteredEvents] = useState(mockEvents);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_type: '',
    department_id: '',
    start_date: undefined,
    end_date: undefined,
    start_time: '',
    end_time: '',
    venue: '',
    classroom_id: '',
    expected_participants: 0,
    budget_allocated: 0,
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    priority_level: 1,
    is_public: true,
    registration_required: false,
    max_registrations: 0,
    registration_deadline: undefined
  });

  // Department-based data segregation
  const getVisibleEvents = () => {
    let visibleEvents = events;

    // Data segregation: Users only see events from their department (except admins)
    if (user && user.role !== 'admin') {
      visibleEvents = events.filter(event => {
        // Show public events from all departments OR events from user's department
        return event.is_public || user.departments.some(dept => dept.id === event.department_id);
      });
    }

    return visibleEvents;
  };

  // Filter events based on search and filters
  useEffect(() => {
    let filtered = getVisibleEvents();

    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.department.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(event => event.department_id === departmentFilter);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, statusFilter, departmentFilter, user]);

  // Check for date conflicts
  const checkDateConflicts = (startDate: string, endDate: string, venue: string, excludeEventId?: string) => {
    const conflicts = events.filter(event => {
      if (excludeEventId && event.id === excludeEventId) return false;
      if (event.venue !== venue && event.classroom_id !== formData.classroom_id) return false;
      
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      
      return (newStart <= eventEnd && newEnd >= eventStart);
    });
    
    return {
      has_conflict: conflicts.length > 0,
      conflicting_events: conflicts.map(e => e.id),
      conflicting_event_details: conflicts
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.start_date || !formData.end_date) {
      alert('Please select start and end dates');
      return;
    }

    const startDateStr = format(formData.start_date, 'yyyy-MM-dd');
    const endDateStr = format(formData.end_date, 'yyyy-MM-dd');
    const venue = formData.venue || mockClassrooms.find(c => c.id === formData.classroom_id)?.name || '';
    
    // Check for conflicts
    const conflictCheck = checkDateConflicts(startDateStr, endDateStr, venue, selectedEvent?.id);
    
    const eventData = {
      ...formData,
      start_date: startDateStr,
      end_date: endDateStr,
      venue,
      created_by: '1', // Current user
      creator: { first_name: 'Current', last_name: 'User' },
      department: mockDepartments.find(d => d.id === formData.department_id),
      status: conflictCheck.has_conflict ? 'pending' : 'approved',
      created_at: new Date().toISOString(),
      conflict_info: {
        has_conflict: conflictCheck.has_conflict,
        conflicting_events: conflictCheck.conflicting_events,
        queue_position: conflictCheck.has_conflict ? conflictCheck.conflicting_events.length + 1 : null
      }
    };

    if (selectedEvent) {
      // Update existing event
      const updatedEvent = { ...selectedEvent, ...eventData };
      setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e));
      setIsEditDialogOpen(false);
    } else {
      // Add new event
      const newEvent = {
        id: Date.now().toString(),
        ...eventData
      };
      setEvents([...events, newEvent]);
      setIsAddDialogOpen(false);
    }
    
    resetForm();

    // Show conflict notification if needed
    if (conflictCheck.has_conflict) {
      alert(`⚠️ Date conflict detected! Your event has been added to the queue at position ${conflictCheck.conflicting_events.length + 1}. You will be notified when the date becomes available.`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: '',
      department_id: user && user.role !== 'admin' ? (user.departments[0]?.id || '') : '',
      start_date: undefined,
      end_date: undefined,
      start_time: '',
      end_time: '',
      venue: '',
      classroom_id: '',
      expected_participants: 0,
      budget_allocated: 0,
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      priority_level: 1,
      is_public: true,
      registration_required: false,
      max_registrations: 0,
      registration_deadline: undefined
    });
    setSelectedEvent(null);
  };

  const handleEdit = (event: any) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      department_id: event.department_id,
      start_date: new Date(event.start_date),
      end_date: new Date(event.end_date),
      start_time: event.start_time,
      end_time: event.end_time,
      venue: event.venue,
      classroom_id: event.classroom_id || '',
      expected_participants: event.expected_participants || 0,
      budget_allocated: event.budget_allocated || 0,
      contact_person: event.contact_person,
      contact_email: event.contact_email,
      contact_phone: event.contact_phone || '',
      priority_level: event.priority_level,
      is_public: event.is_public,
      registration_required: event.registration_required,
      max_registrations: event.max_registrations || 0,
      registration_deadline: event.registration_deadline ? new Date(event.registration_deadline) : undefined
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(e => e.id !== eventId));
    }
  };

  const handleApprove = (eventId: string) => {
    setEvents(events.map(e => 
      e.id === eventId ? { ...e, status: 'approved', approved_at: new Date().toISOString() } : e
    ));
  };

  const handleReject = (eventId: string, reason: string) => {
    setEvents(events.map(e => 
      e.id === eventId ? { ...e, status: 'rejected', rejection_reason: reason } : e
    ));
  };

  // Calendar event handlers
  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    if (hasPermission('create_events')) {
      setFormData({
        ...formData,
        start_date: date,
        end_date: date
      });
      setIsAddDialogOpen(true);
    }
  };

  const handleCreateEvent = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  // Transform events for calendar component
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.start_date,
    start_time: event.start_time,
    end_time: event.end_time,
    event_type: event.event_type,
    venue: event.venue,
    department_id: event.department_id,
    department_name: event.department?.name || '',
    status: event.status as 'pending' | 'approved' | 'rejected',
    created_by: event.created_by,
    created_by_name: `${event.creator?.first_name} ${event.creator?.last_name}`,
    max_participants: event.max_registrations,
    current_participants: 0,
    queue_position: event.conflict_info?.queue_position,
    conflict_with: event.conflict_info?.conflicting_events?.map(id => 
      events.find(e => e.id === id)?.title || 'Unknown Event'
    )
  }));

  const getEventTypeInfo = (type: string) => {
    return eventTypes.find(t => t.value === type) || eventTypes[eventTypes.length - 1];
  };

  const EventForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="AI/ML Workshop"
            required
          />
        </div>
        <div>
          <Label htmlFor="event_type">Event Type</Label>
          <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the event..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="department">Department</Label>
          <Select 
            value={formData.department_id} 
            onValueChange={(value) => setFormData({ ...formData, department_id: value })}
            disabled={user && user.role !== 'admin'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {(user && user.role !== 'admin' 
                ? mockDepartments.filter(dept => user.departments.some(userDept => userDept.id === dept.id))
                : mockDepartments
              ).map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user && user.role !== 'admin' && (
            <p className="text-xs text-muted-foreground mt-1">
              You can only create events for your department
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="priority">Priority Level</Label>
          <Select value={formData.priority_level.toString()} onValueChange={(value) => setFormData({ ...formData, priority_level: parseInt(value) })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">High Priority</SelectItem>
              <SelectItem value="2">Medium Priority</SelectItem>
              <SelectItem value="3">Low Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.start_date ? format(formData.start_date, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.start_date}
                onSelect={(date) => setFormData({ ...formData, start_date: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.end_date ? format(formData.end_date, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.end_date}
                onSelect={(date) => setFormData({ ...formData, end_date: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="classroom">Venue/Classroom</Label>
          <Select value={formData.classroom_id} onValueChange={(value) => setFormData({ ...formData, classroom_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              {mockClassrooms.map(room => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name} (Capacity: {room.capacity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="participants">Expected Participants</Label>
          <Input
            id="participants"
            type="number"
            value={formData.expected_participants}
            onChange={(e) => setFormData({ ...formData, expected_participants: parseInt(e.target.value) || 0 })}
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="contact_person">Contact Person</Label>
          <Input
            id="contact_person"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            placeholder="Dr. John Smith"
          />
        </div>
        <div>
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input
            id="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            placeholder="john.smith@college.edu"
          />
        </div>
        <div>
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            placeholder="+1-234-567-8900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_public"
            checked={formData.is_public}
            onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
          />
          <Label htmlFor="is_public">Public Event</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="registration_required"
            checked={formData.registration_required}
            onCheckedChange={(checked) => setFormData({ ...formData, registration_required: checked })}
          />
          <Label htmlFor="registration_required">Registration Required</Label>
        </div>
      </div>

      {formData.registration_required && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="max_registrations">Max Registrations</Label>
            <Input
              id="max_registrations"
              type="number"
              value={formData.max_registrations}
              onChange={(e) => setFormData({ ...formData, max_registrations: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>
          <div>
            <Label>Registration Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.registration_deadline ? format(formData.registration_deadline, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.registration_deadline}
                  onSelect={(date) => setFormData({ ...formData, registration_deadline: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }}>
          Cancel
        </Button>
        <Button type="submit">
          {selectedEvent ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600 mt-1">Manage college events with conflict detection and queue system</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'calendar' | 'list')}>
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {hasPermission('create_events') && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Create a new college event. The system will automatically detect conflicts and manage queue.
                  </DialogDescription>
                </DialogHeader>
                <EventForm />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{events.filter(e => e.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{events.filter(e => e.status === 'approved').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conflicts</p>
                <p className="text-2xl font-bold text-red-600">{events.filter(e => e.conflict_info?.has_conflict).length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Queue</p>
                <p className="text-2xl font-bold text-purple-600">{events.filter(e => e.conflict_info?.queue_position).length}</p>
              </div>
              <Timer className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Conflict Resolution:</strong> Events with date conflicts are automatically queued using first-come-first-serve. 
          You'll receive notifications when your requested date becomes available.
        </AlertDescription>
      </Alert>

      {/* Filters and Search - Only show for list view */}
      {activeView === 'list' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              {user && user.role === 'admin' && (
                <SelectItem value="all">All Departments</SelectItem>
              )}
              {(user && user.role !== 'admin' 
                ? mockDepartments.filter(dept => user.departments.some(userDept => userDept.id === dept.id))
                : mockDepartments
              ).map(dept => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Calendar or List View */}
      {activeView === 'calendar' ? (
        <EventCalendar
          events={calendarEvents}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onCreateEvent={handleCreateEvent}
        />
      ) : (
        /* Events List */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEvents.map((event) => {
          const eventTypeInfo = getEventTypeInfo(event.event_type);
          
          return (
            <Card key={event.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={eventTypeInfo.color}>
                        {eventTypeInfo.label}
                      </Badge>
                      <Badge className={statusColors[event.status as keyof typeof statusColors]}>
                        {event.status}
                      </Badge>
                      {event.conflict_info?.has_conflict && (
                        <Badge variant="destructive">
                          <Timer className="h-3 w-3 mr-1" />
                          Queue #{event.conflict_info.queue_position}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription>
                      {event.department?.name} ({event.department?.code})
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(event)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Details */}
                <p className="text-sm text-gray-600 line-clamp-2">
                  {event.description}
                </p>

                {/* Date and Time */}
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {event.start_date === event.end_date ? (
                    <span>{format(new Date(event.start_date), 'PPP')}</span>
                  ) : (
                    <span>{format(new Date(event.start_date), 'PPP')} - {format(new Date(event.end_date), 'PPP')}</span>
                  )}
                  {event.start_time && (
                    <span className="ml-2">
                      {event.start_time} - {event.end_time}
                    </span>
                  )}
                </div>

                {/* Venue */}
                {event.venue && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.venue}
                  </div>
                )}

                {/* Participants */}
                {event.expected_participants && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Expected: {event.expected_participants} participants
                  </div>
                )}

                {/* Contact */}
                <div className="text-sm text-gray-600">
                  <strong>Contact:</strong> {event.contact_person}
                  {event.contact_email && (
                    <span className="block">{event.contact_email}</span>
                  )}
                </div>

                {/* Conflict Information */}
                {event.conflict_info?.has_conflict && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Date Conflict:</strong> This event conflicts with {event.conflict_info.conflicting_events.length} other event(s). 
                      Currently in queue position #{event.conflict_info.queue_position}.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                {event.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(event.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt('Rejection reason:');
                        if (reason) handleReject(event.id, reason);
                      }}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {activeView === 'list' && filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">Try adjusting your search or filters, or create a new event.</p>
        </div>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={(event) => {
          setIsDetailModalOpen(false);
          handleEdit(event);
        }}
        onDelete={(eventId) => {
          setIsDetailModalOpen(false);
          handleDelete(eventId);
        }}
        onApprove={(eventId) => {
          handleApprove(eventId);
          setIsDetailModalOpen(false);
        }}
        onReject={(eventId) => {
          const reason = prompt('Rejection reason:');
          if (reason) {
            handleReject(eventId, reason);
            setIsDetailModalOpen(false);
          }
        }}
      />      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details. The system will check for conflicts automatically.
            </DialogDescription>
          </DialogHeader>
          <EventForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}