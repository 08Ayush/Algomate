# Event Management System

## Overview
Complete event management system with calendar view, conflict detection, and automated queue system for the Academic Compass platform.

## ✨ Features

### 1. **Event Calendar**
- Interactive monthly calendar with event display
- Color-coded events by type (workshop, seminar, conference, cultural, sports, etc.)
- Conflict detection indicators
- Date selection and event creation
- Responsive grid layout
- Dark mode support

### 2. **Event Detail Modal**
- Complete event information display
- Registration system for participants
- Approval/rejection workflow
- Edit and delete capabilities
- Conflict warnings with queue position
- Contact information display

### 3. **Conflict Resolution & Queue System**
- Automatic conflict detection for same venue and overlapping dates
- First-come-first-serve queue system
- Priority levels (1-5)
- Estimated approval dates
- Real-time notifications

### 4. **Statistics Dashboard**
- Total events count
- Pending approvals
- Approved events
- Conflicts detected
- Events in queue

### 5. **Calendar & List Views**
- Toggle between calendar and list display
- Status filtering (all, pending, approved, rejected)
- Department filtering
- Search functionality

## 📦 Components

### `EventCalendar.tsx`
Interactive calendar component with:
- Month navigation
- Event display on dates
- Conflict indicators
- Selected date events panel
- Create event button

### `EventDetailModal.tsx`
Modal for event details featuring:
- Full event information
- Status badges
- Conflict warnings
- Action buttons (edit, delete, approve, reject)
- Registration controls
- Contact information

### `ConflictResolution.tsx` (Reference)
Queue management system with:
- Priority-based queue
- Move up/down controls
- Notification system
- Estimated dates

## 🔌 API Endpoints

### GET `/api/events`
Fetch all events with optional filters
```typescript
Query Params:
- status?: string ('all' | 'pending' | 'approved' | 'rejected')
- department_id?: string

Response:
{
  success: true,
  data: EventData[]
}
```

### POST `/api/events`
Create a new event
```typescript
Body:
{
  title: string
  description: string
  event_type: string
  department_id: string
  created_by: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  venue: string
  ...
}

Response:
{
  success: true,
  data: EventData,
  hasConflict: boolean,
  message: string
}
```

### PUT `/api/events`
Update an existing event
```typescript
Body:
{
  id: string
  ...updateFields
}

Response:
{
  success: true,
  data: EventData
}
```

### DELETE `/api/events`
Delete an event
```typescript
Query Params:
- id: string

Response:
{
  success: true,
  message: string
}
```

## 🗄️ Database Schema

### Events Table
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type event_type NOT NULL,
    department_id UUID NOT NULL,
    created_by UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue VARCHAR(255) NOT NULL,
    classroom_id UUID,
    expected_participants INTEGER,
    max_registrations INTEGER,
    current_participants INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT FALSE,
    budget_allocated DECIMAL(15,2),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    status event_status DEFAULT 'pending',
    priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 5),
    is_public BOOLEAN DEFAULT TRUE,
    has_conflict BOOLEAN DEFAULT FALSE,
    conflicting_events UUID[],
    queue_position INTEGER,
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Event Registrations Table
```sql
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    registration_date TIMESTAMP DEFAULT NOW(),
    attendance_status VARCHAR(50) DEFAULT 'registered',
    feedback TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    UNIQUE(event_id, user_id)
);
```

### Event Notifications Table
```sql
CREATE TABLE event_notifications (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Setup Instructions

### 1. Database Setup
```bash
# Run the events schema SQL file
psql -U your_user -d your_database -f database/events_schema.sql
```

### 2. Environment Variables
Ensure these are set in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies
All required dependencies are already in package.json:
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

## 🎯 Usage

### Creating an Event
1. Navigate to Events page
2. Click "Create Event" button
3. Fill in event details
4. System automatically checks for conflicts
5. Event is approved if no conflicts, otherwise queued

### Viewing Events
1. **Calendar View**: See all events in monthly calendar
2. **List View**: See all events in detailed list format
3. Click any event to view full details

### Managing Conflicts
1. Conflicting events are automatically queued
2. Events marked with red conflict indicator
3. Queue position shown in event details
4. Notifications sent when date becomes available

### Approving/Rejecting Events
1. Open event detail modal
2. Review event information
3. Click "Approve" or "Reject" button
4. For rejection, provide reason
5. Creator receives notification

## 🎨 UI Features

### Modern Design
- Gradient backgrounds
- Glass morphism effects
- Smooth animations
- Hover zoom effects
- Shadow elevations
- Responsive layouts

### Dark Mode
- Automatic dark mode support
- Proper color contrasts
- Consistent theming

### Responsive Design
- Mobile-friendly calendar
- Adaptive grid layouts
- Touch-friendly controls
- Collapsible sidebars

## 🔐 Permissions

### Faculty (Creator/Publisher)
- Create events for their department
- View all public events
- Edit/delete their own events
- Register for events

### HOD/Admin
- Approve/reject events
- View all events
- Edit any event
- Manage queue system

### Students
- View approved public events
- Register for events
- View their registrations

## 📊 Statistics

The dashboard provides real-time statistics:
- **Total Events**: All events in system
- **Pending**: Events awaiting approval
- **Approved**: Active approved events
- **Conflicts**: Events with date conflicts
- **In Queue**: Events waiting for date availability

## 🔔 Notifications

Users receive notifications for:
- Event approval
- Event rejection (with reason)
- Queue position updates
- Date availability
- Registration confirmation
- Event cancellation

## 🛠️ Troubleshooting

### Events not loading
- Check Supabase connection
- Verify API endpoint is running
- Check browser console for errors

### Conflicts not detected
- Verify trigger functions are created
- Check venue and date fields
- Review conflict detection logic

### Registration not working
- Check user authentication
- Verify max_registrations limit
- Check registration_required flag

## 📝 Future Enhancements

- [ ] Email notifications
- [ ] iCal/Google Calendar export
- [ ] Recurring events support
- [ ] Event templates
- [ ] Bulk event creation
- [ ] Analytics dashboard
- [ ] Resource booking integration
- [ ] Attendance tracking
- [ ] Event feedback system

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

Part of Academic Compass - Smart Timetable Scheduler
