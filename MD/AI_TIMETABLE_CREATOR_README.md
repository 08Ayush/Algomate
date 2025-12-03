# AI Timetable Creator with Manual Scheduler Integration

## Overview
This integrated timetable creation system provides both **AI-guided** and **manual** scheduling modes in one interface, allowing faculty to switch seamlessly between automated and manual timetable creation.

## Features

### 🤖 AI-Guided Mode
- **Natural Language Interface**: Chat with AI to create timetables using simple commands
- **Database Integration**: AI automatically uses data from your Supabase database:
  - Faculty qualifications and availability
  - Subject requirements and credits
  - Classroom capacity and features
  - Batch information
- **Smart Generation**: AI suggests optimal schedules based on:
  - Faculty-subject qualifications
  - Conflict detection
  - Workload balancing
  - Room allocation

#### AI Commands
```
"Create timetable for Semester 3"
"Generate schedule for 60 students"
"Assign DSA to available faculty"
"Who can teach Operating Systems?"
"Optimize Monday schedule"
"Check for conflicts"
```

### 🎯 Manual Mode
- **Drag-and-Drop Interface**: Visual timetable grid
- **Full Control**: Manually assign faculty, subjects, and time slots
- **Real-time Conflict Detection**: Immediate feedback on scheduling issues
- **Lab Session Support**: Create 2-hour lab sessions
- **Semester Filtering**: View and edit specific semesters

### 🔄 Seamless Switching
Toggle between AI and Manual modes using the mode selector at the top:
- **AI Guided** 🤖: Let AI suggest and create schedules
- **Manual** 📅: Take full control with drag-and-drop

## File Structure

```
src/
├── app/faculty/ai-timetable-creator/
│   └── page.tsx                          # Main page wrapper
├── components/
│   ├── TimetableCreatorIntegrated.tsx    # NEW: Integrated component
│   └── ManualSchedulingComponent.tsx     # Existing manual scheduler
```

## Usage

### For Faculty (Creator Role)

1. **Navigate to AI Timetable Creator**
   - From sidebar: "AI Timetable Creator"

2. **Choose Your Mode**
   - Click **AI Guided** for automated scheduling
   - Click **Manual** for drag-and-drop control

3. **AI Mode Usage**
   ```
   - Type natural language commands
   - Use Quick Actions for common tasks
   - View database stats in the sidebar
   - Switch to Manual mode anytime for fine-tuning
   ```

4. **Manual Mode Usage**
   ```
   - Select semester from dropdown
   - Drag faculty from left panel to grid
   - Drag subjects from left panel to grid
   - Save and submit when complete
   ```

## Database Integration

### Tables Used
- **users**: Faculty information and qualifications
- **subjects**: Subject details, credits, semester
- **classrooms**: Room capacity and features
- **batches**: Student batch information
- **faculty_qualified_subjects**: Faculty-subject mappings

### Permissions Required
Ensure the following permissions are set in Supabase:
```sql
GRANT SELECT ON users TO anon;
GRANT SELECT ON subjects TO anon;
GRANT SELECT ON classrooms TO anon;
GRANT SELECT ON batches TO anon;
GRANT SELECT ON faculty_qualified_subjects TO anon;
```

## AI Response System

The AI assistant provides context-aware responses based on:

1. **Semester Creation Requests**
   - Detects semester number
   - Lists available subjects
   - Shows qualified faculty
   - Suggests next steps

2. **Faculty Assignment**
   - Matches faculty qualifications
   - Shows subject expertise
   - Recommends assignments

3. **Optimization Requests**
   - Analyzes current schedule
   - Suggests improvements
   - Detects conflicts

4. **Help & Guidance**
   - Provides examples
   - Explains features
   - Guides workflow

## Quick Actions

Pre-configured commands for common tasks:
- Create Semester 3 timetable
- Generate for 60 students
- Assign qualified faculty
- Check for conflicts
- Optimize schedule

## Database Stats Panel

Real-time overview showing:
- Faculty Members count
- Available Subjects
- Classrooms
- Batch/Semester information

## Tips & Best Practices

### When to Use AI Mode
✅ Starting a new timetable from scratch
✅ Need conflict-free schedule quickly
✅ Want optimal faculty assignments
✅ Unsure about best scheduling approach

### When to Use Manual Mode
✅ Need specific customizations
✅ Have particular constraints
✅ Want visual control
✅ Making minor adjustments to AI-generated schedule

### Hybrid Approach
1. **Start with AI**: Generate initial schedule using AI commands
2. **Switch to Manual**: Fine-tune using drag-and-drop
3. **Validate**: Check for conflicts
4. **Save**: Submit to HOD for approval

## Future Enhancements

### Planned Features
- [ ] **AI Integration with OpenAI API**: Real GPT-powered responses
- [ ] **Auto-save AI conversations**: Store chat history
- [ ] **AI Schedule Preview**: Visual preview in AI mode
- [ ] **Export to PDF**: Download timetables from either mode
- [ ] **Undo/Redo**: In manual mode
- [ ] **Conflict Resolution Suggestions**: AI-powered fixes
- [ ] **Faculty Workload Analysis**: Visual charts
- [ ] **Batch Comparison**: Compare schedules across semesters

### Advanced AI Features (Coming Soon)
- Multi-turn conversation with context
- Learn from manual adjustments
- Suggest alternative schedules
- Predict potential issues
- Automated optimization runs

## Troubleshooting

### AI Mode Issues
**Problem**: AI not responding
- **Solution**: Check internet connection, refresh page

**Problem**: AI suggests incorrect faculty
- **Solution**: Update faculty_qualified_subjects table in database

### Manual Mode Issues
**Problem**: Drag-and-drop not working
- **Solution**: Ensure semester is selected, check browser compatibility

**Problem**: Can't see all subjects
- **Solution**: Check semester filter, verify subject data in database

### Database Issues
**Problem**: "Permission denied" errors
- **Solution**: Run the permissions fix SQL script provided

**Problem**: No faculty/subjects loading
- **Solution**: Verify user has department_id set correctly

## Component Props

### TimetableCreatorIntegrated
```typescript
interface TimetableCreatorIntegratedProps {
  user: {
    id: string;
    role: string;
    faculty_type: string;
    department_id: string;
    department_code: string;
    // ... other user fields
  };
}
```

### ManualSchedulingComponent
```typescript
interface ManualSchedulingComponentProps {
  user: {
    id: string;
    department_id: string;
    // ... other user fields
  };
}
```

## API Integration Points

### Future API Endpoints
```typescript
// AI Chat API (to be implemented)
POST /api/ai/chat
Body: { message: string, context: any }
Response: { reply: string, actions: any[] }

// Generate Timetable API
POST /api/timetable/generate
Body: { semester: number, constraints: any }
Response: { schedule: any[], conflicts: any[] }

// Save Timetable API
POST /api/timetable/save
Body: { assignments: Assignment[], metadata: any }
Response: { success: boolean, timetable_id: string }
```

## Support

For issues or questions:
1. Check this README
2. Review database permissions
3. Check browser console for errors
4. Contact system administrator

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Maintained by**: Academic Compass Development Team
