# Faculty Section

This folder contains all pages and components related to the Faculty role.

## 📁 Folder Structure

```
faculty/
├── dashboard/              # Main faculty dashboard
├── ai-timetable-creator/   # AI-powered timetable generation
├── batches/                # View and manage assigned batches
├── classrooms/             # View available classrooms
├── events/                 # Academic events management
├── faculty-list/           # View other faculty members
├── hybrid-scheduler/       # Hybrid scheduling tools
├── manual-scheduling/      # Manual timetable scheduling
├── nep-curriculum/         # NEP curriculum access
├── notifications/          # Notifications center
├── qualifications/         # Faculty qualifications management
├── review-queue/           # Review pending items
├── settings/               # Faculty settings
├── subjects/               # View and manage subjects
├── timetables/             # View and manage timetables
└── README.md              # This file
```

## 🎯 Role-Based Access

Faculty members have different access levels based on their `faculty_type`:

### 1. **Creator Faculty** (`faculty_type: 'creator'`)
- Full access to curriculum creation
- Can create NEP buckets
- Access to AI timetable creator
- Can create and publish timetables

### 2. **Publisher Faculty** (`faculty_type: 'publisher'`)
- Can review and publish timetables
- Access to review queue
- Limited editing capabilities

### 3. **General Faculty** (`faculty_type: 'general'`)
- View timetables
- Manage personal settings
- View assigned subjects and batches
- Basic scheduling access

### 4. **Guest Faculty** (`faculty_type: 'guest'`)
- Read-only access
- View timetables and schedules
- Limited to assigned subjects

## 📄 Key Pages

### Dashboard (`/faculty/dashboard`)
Main entry point with overview of:
- Assigned subjects
- Current timetable
- Upcoming classes
- Quick actions

### AI Timetable Creator (`/faculty/ai-timetable-creator`)
**Access:** Creator Faculty only
- AI-powered timetable generation
- Genetic algorithm optimization
- Constraint management

### Manual Scheduling (`/faculty/manual-scheduling`)
**Access:** Creator, Publisher Faculty
- Drag-and-drop scheduling
- Manual slot assignment
- Conflict detection

### NEP Curriculum (`/faculty/nep-curriculum`)
**Access:** Creator Faculty
- NEP curriculum builder
- Subject bucket management
- Credit allocation

### Qualifications (`/faculty/qualifications`)
- Manage faculty qualifications
- Subject expertise tracking
- Certification records

### Timetables (`/faculty/timetables`)
- View personal timetable
- Download/print options
- Schedule conflict alerts

## 🔑 Key Features

### Department-Scoped Access
- Faculty see only their department's data (unless assigned to multiple)
- Automatic filtering by department_id
- Cross-department visibility for admins

### Timetable Management
- Multiple scheduling methods (AI, Hybrid, Manual)
- Real-time conflict detection
- Resource optimization
- Constraint enforcement

### Notifications
- Schedule changes
- Assignment updates
- System alerts

## 🛡️ Security

- Role-based access control by `faculty_type`
- Department-level data isolation
- College-level restrictions
- Creator/Publisher privileges validated

## 🎨 UI/UX

- Faculty-focused interface
- Quick access to common tasks
- Calendar views for schedules
- Mobile-responsive design
- Real-time updates

## 📊 Faculty Types Comparison

| Feature | Creator | Publisher | General | Guest |
|---------|---------|-----------|---------|-------|
| View Timetables | ✅ | ✅ | ✅ | ✅ |
| Create Timetables | ✅ | ❌ | ❌ | ❌ |
| Publish Timetables | ✅ | ✅ | ❌ | ❌ |
| NEP Bucket Creation | ✅ | ❌ | ❌ | ❌ |
| AI Timetable Creator | ✅ | ❌ | ❌ | ❌ |
| Manual Scheduling | ✅ | ✅ | Limited | ❌ |
| Qualifications Mgmt | ✅ | ✅ | ✅ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ |
