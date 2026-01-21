# 🎨 AI Timetable Creator - Visual Guide

## Page Overview

### Main Interface
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Header (Academic Compass)                                          ┃
┣━━━━━━━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃         │                                                          ┃
┃  Left   │  ╔═══════════════════════════════════════════════════╗  ┃
┃ Sidebar │  ║  Timetable Creator                               ║  ┃
┃         │  ║  ┌────────────────────────────────────────────┐  ║  ┃
┃ - Home  │  ║  │ 🤖 AI Guided  │  📅 Manual  │  CSE Dept   │  ║  ┃
┃ - AI TT │  ║  └────────────────────────────────────────────┘  ║  ┃
┃ - Manual│  ╠═══════════════════════════════════════════════════╣  ┃
┃ - Subs  │  ║                                                   ║  ┃
┃ - Faculty│  ║  [Content Area - AI or Manual Mode]             ║  ┃
┃ - Rooms │  ║                                                   ║  ┃
┃ - Batch │  ║                                                   ║  ┃
┃         │  ║                                                   ║  ┃
┃         │  ╚═══════════════════════════════════════════════════╝  ┃
┗━━━━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Mode Toggle

### Toggle Button Design
```
┌────────────────────────────────────────┐
│  ┌─────────────┬─────────────┐        │
│  │ 🤖 AI Guided │ 📅 Manual   │  CSE   │
│  │  (Active)   │  (Inactive) │        │
│  └─────────────┴─────────────┘        │
└────────────────────────────────────────┘
```

When Active (AI Mode):
```
┌──────────────────┬─────────────┐
│ 🤖 AI Guided     │ 📅 Manual   │
│ [Blue BG]        │ [Gray BG]   │
│ [White Shadow]   │ [No Shadow] │
└──────────────────┴─────────────┘
```

When Active (Manual Mode):
```
┌─────────────┬──────────────────┐
│ 🤖 AI Guided│ 📅 Manual        │
│ [Gray BG]   │ [Blue BG]        │
│ [No Shadow] │ [White Shadow]   │
└─────────────┴──────────────────┘
```

---

## AI Mode Layout

### Full View (3-Column Layout)
```
┌────────────────────────────────────────────────────────────────────┐
│  Mode Toggle: [🤖 AI Guided] [📅 Manual]         CSE Department   │
├─────────────────────────────────┬──────────────────────────────────┤
│                                 │                                  │
│  ┌───────────────────────────┐  │  ┌────────────────────────────┐ │
│  │ AI Chat Interface         │  │  │ 🪄 Quick Actions           │ │
│  │ ┌───────────────────────┐ │  │  │ ┌────────────────────────┐ │ │
│  │ │🤖: Hello! I can help  │ │  │  │ │Create Semester 3 TT    │ │ │
│  │ │    with timetables... │ │  │  │ │Generate for 60 students│ │ │
│  │ │                       │ │  │  │ │Assign qualified faculty│ │ │
│  │ │👤: Create Semester 3  │ │  │  │ │Check for conflicts     │ │ │
│  │ │                       │ │  │  │ │Optimize schedule       │ │ │
│  │ │🤖: Perfect! I'll gen..│ │  │  │ └────────────────────────┘ │ │
│  │ │    Based on database: │ │  │  │                            │ │
│  │ │    - 74 Subjects      │ │  │  │  📊 Database Overview      │ │
│  │ │    - 15+ Faculty      │ │  │  │  ┌──────────────────────┐ │ │
│  │ │    - 20+ Classrooms   │ │  │  │  │Faculty: 15+          │ │ │
│  │ │                       │ │  │  │  │Subjects: 74          │ │ │
│  │ │... (chat continues)   │ │  │  │  │Classrooms: 20+       │ │ │
│  │ └───────────────────────┘ │  │  │  │Batches: 8 Sems       │ │ │
│  │                           │  │  │  └──────────────────────┘ │ │
│  │ ┌───────────────────────┐ │  │  │                            │ │
│  │ │💬 Type message...  📤│ │  │  │  💡 Pro Tips               │ │
│  │ └───────────────────────┘ │  │  │  • AI uses real data       │ │
│  │                           │  │  │  • Auto-matched faculty    │ │
│  └───────────────────────────┘  │  │  • Conflicts detected      │ │
│                                 │  │  • Switch to Manual        │ │
│  2/3 Width                      │  └────────────────────────────┘ │
│                                 │  1/3 Width                       │
└─────────────────────────────────┴──────────────────────────────────┘
```

### Chat Message Styles

#### AI Message (Left-aligned)
```
┌──────────────────────────────────────┐
│ 🤖  ┌──────────────────────────────┐ │
│     │ Hello! I'm your AI assistant│ │
│     │ for timetable creation.     │ │
│     │                             │ │
│     │ I can help you:             │ │
│     │ • Generate schedules        │ │
│     │ • Assign faculty            │ │
│     │ • Detect conflicts          │ │
│     └──────────────────────────────┘ │
│     [White BG, Rounded corners]      │
└──────────────────────────────────────┘
```

#### User Message (Right-aligned)
```
┌──────────────────────────────────────┐
│         ┌────────────────────────┐   │
│         │ Create timetable for   │   │
│         │ Semester 3 please      │   │
│         └────────────────────────┘   │
│         [Blue BG, White text]        │
└──────────────────────────────────────┘
```

#### Loading State
```
┌──────────────────────────────────────┐
│ 🤖  ┌──────────────────────────────┐ │
│     │ ● ● ●                        │ │
│     │ (Animated dots bouncing)     │ │
│     └──────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## Manual Mode Layout

### Full View (Embedded Component)
```
┌─────────────────────────────────────────────────────────────────┐
│  Mode Toggle: [🤖 AI Guided] [📅 Manual]      CSE Department    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Manual Scheduling Component                              │  │
│  │                                                          │  │
│  │  Semester: [Dropdown: 1 2 3 4 5 6 7 8]                  │  │
│  │                                                          │  │
│  │  ┌─────────────┬────────────────────────────────────┐   │  │
│  │  │ Faculty     │   Timetable Grid                   │   │  │
│  │  │ ─────────── │                                    │   │  │
│  │  │ [Draggable] │   Mon  Tue  Wed  Thu  Fri  Sat    │   │  │
│  │  │ Prof A      │   ┌──┬──┬──┬──┬──┬──┐             │   │  │
│  │  │ Prof B      │ 9 │  │  │  │  │  │  │             │   │  │
│  │  │ Prof C      │   ├──┼──┼──┼──┼──┼──┤             │   │  │
│  │  │             │10 │  │  │  │  │  │  │             │   │  │
│  │  │ Subjects    │   ├──┼──┼──┼──┼──┼──┤             │   │  │
│  │  │ ─────────── │11 │  │BR│  │  │  │  │             │   │  │
│  │  │ [Draggable] │   ├──┼──┼──┼──┼──┼──┤             │   │  │
│  │  │ DSA         │12 │  │  │  │  │  │  │             │   │  │
│  │  │ DBMS        │   └──┴──┴──┴──┴──┴──┘             │   │  │
│  │  │ OS          │                                    │   │  │
│  │  └─────────────┴────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │  [Save Draft] [Submit to HOD]                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme

### Primary Colors
- **Blue**: `#2563EB` (Blue-600)
- **Indigo**: `#4F46E5` (Indigo-600)
- **Gradient**: `from-blue-600 to-indigo-600`

### State Colors
- **Active**: Blue background with white shadow
- **Inactive**: Gray background
- **Hover**: Slightly darker blue
- **Disabled**: 50% opacity

### Chat Colors
- **AI Messages**: White background, gray text
- **User Messages**: Blue background, white text
- **Loading**: Blue animated dots

---

## Responsive Breakpoints

### Desktop (lg: 1024px+)
- Chat: 2/3 width (66%)
- Sidebar: 1/3 width (33%)
- Grid layout: 3 columns

### Tablet (md: 768px)
- Chat: Full width
- Sidebar: Stacked below
- Grid layout: 2 columns

### Mobile (sm: 640px)
- All elements: Full width
- Stacked vertically
- Grid layout: 1 column

---

## Icons Used

### Lucide React Icons
- `Bot` - AI assistant
- `Calendar` - Manual mode
- `Sparkles` - AI magic
- `Send` - Send message
- `Grid3x3` - Manual grid
- `MessageCircle` - Tips/help
- `Wand2` - Quick actions

---

## Interactions

### Click Actions
1. **Mode Toggle**
   - Click "AI Guided" → Show AI interface
   - Click "Manual" → Show manual grid

2. **Quick Actions**
   - Click any button → Populates input & sends

3. **Send Message**
   - Click send button OR
   - Press Enter key

4. **Drag & Drop** (Manual Mode)
   - Drag faculty/subject → Drop on grid slot

---

## Animation & Transitions

### Smooth Transitions
```css
transition-all duration-300
```

### Hover Effects
```css
hover:scale-[1.02]  /* Slight scale on hover */
hover:shadow-xl     /* Increased shadow */
```

### Loading Animation
```css
animate-bounce      /* Dot bouncing */
animate-pulse       /* Status indicator */
```

---

## Accessibility

### Keyboard Navigation
- ✅ Tab through elements
- ✅ Enter to send message
- ✅ Escape to close modals

### Screen Readers
- ✅ Semantic HTML
- ✅ ARIA labels where needed
- ✅ Alt text for icons

### Contrast
- ✅ WCAG AA compliant
- ✅ High contrast colors
- ✅ Dark mode support

---

## Dark Mode Support

### Light Mode
- Background: White/Gray-50
- Text: Gray-900
- Borders: Gray-200

### Dark Mode
- Background: Slate-800/900
- Text: White
- Borders: Slate-700

```css
dark:bg-slate-800
dark:text-white
dark:border-slate-700
```

---

**Created**: October 2025  
**For**: Academic Compass System  
**Component**: AI Timetable Creator with Manual Scheduler
