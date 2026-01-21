# Faculty Dashboard Navigation Guide

## 🎯 Quick Reference

### Main Dashboard (`/faculty/dashboard`)
```
┌─────────────────────────────────────────────────────────┐
│ Header (Logo | Dark Mode | Notifications | Profile)     │
├──────────┬──────────────────────────────────────────────┤
│          │  🌟 AI-Powered                                │
│ Sidebar  │  The Academic Compass                         │
│          │  [AI Creator] [Hybrid] [View Timetables]     │
│ ├─ Home  │                                               │
│ ├─ Event │  📊 Stats: 8 Timetables | 94% Quality        │
│ ├─ Queue │           3 Reviews | 156 Faculty            │
│ ├─ Faculty                                              │
│ ├─ Subjects    🎬 Recent Activity                        │
│ ├─ Rooms      • CS Sem 3 published (2h ago)            │
│ ├─ Batches    • Prof. Sarah requested change (5h)      │
│ └─ Schedule   • AI optimization completed (1d)          │
│          │                                               │
│ Quick    │  ⚡ Quick Actions                             │
│ Actions  │  [AI Creator] [Hybrid] [Manual] [View All]  │
│ ├─ AI    │                                               │
│ ├─ Hybrid│                                               │
│ ├─ Manual│                                               │
│ └─ View  │                                               │
│          │                                               │
│ Settings │                                               │
└──────────┴──────────────────────────────────────────────┘
```

## 📋 Page Layout Reference

### Sidebar Navigation
```
╔═══════════════════════╗
║ 📊 MAIN NAVIGATION    ║
╠═══════════════════════╣
║ 🏠 Dashboard          ║
║ 📅 Events             ║
║ ⚠️  Conflicts    [3]  ║
║ 👥 Faculty            ║
║ 📚 Subjects           ║
║ 🏫 Classrooms         ║
║ 📋 Batches            ║
║ 📆 Timetables         ║
╠═══════════════════════╣
║ ⚡ QUICK ACTIONS      ║
╠═══════════════════════╣
║ 🤖 AI Creator         ║ (Creator only)
║ ⚡ Hybrid Scheduler   ║ (Creator only)
║ 📝 Manual Scheduler   ║
║ 👁️  Review Queue [5]  ║ (Publisher only)
║ 🔔 Notifications [12] ║
╠═══════════════════════╣
║ ⚙️  Settings          ║
╚═══════════════════════╝
```

## 🎨 Page Templates

### List Page Template
```
┌─────────────────────────────────────┐
│ Title                    [+ Add]    │
│ Description                          │
├─────────────────────────────────────┤
│ [🔍 Search box]                     │
├─────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐  │
│ │ Card 1 │ │ Card 2 │ │ Card 3 │  │
│ │ Icon   │ │ Icon   │ │ Icon   │  │
│ │ Title  │ │ Title  │ │ Title  │  │
│ │ Info   │ │ Info   │ │ Info   │  │
│ │ [View] │ │ [View] │ │ [View] │  │
│ └────────┘ └────────┘ └────────┘  │
│                                     │
│ ┌────────┐ ┌────────┐ ┌────────┐  │
│ │ Card 4 │ │ Card 5 │ │ Card 6 │  │
│ └────────┘ └────────┘ └────────┘  │
└─────────────────────────────────────┘
```

### Stats Page Template
```
┌─────────────────────────────────────┐
│ Title                                │
│ Description                          │
├─────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│ │ 📊   │ │ ✅   │ │ ⚠️   │ │ 👥  ││
│ │  8   │ │ 94%  │ │  3   │ │ 156 ││
│ │Active│ │Score │ │Review│ │Staff││
│ └──────┘ └──────┘ └──────┘ └──────┘│
├─────────────────────────────────────┤
│ Main Content Area                    │
│ • Lists                              │
│ • Tables                             │
│ • Charts                             │
└─────────────────────────────────────┘
```

## 🎯 Role Access Matrix

| Page                   | Creator | Publisher | General |
|------------------------|---------|-----------|---------|
| Dashboard              | ✅      | ✅        | ❌      |
| Events                 | ✅      | ✅        | ❌      |
| Conflict Resolution    | ✅      | ✅        | ❌      |
| Faculty List           | ✅      | ✅        | ❌      |
| Subjects               | ✅      | ✅        | ❌      |
| Classrooms             | ✅      | ✅        | ❌      |
| Batches                | ✅      | ✅        | ❌      |
| Timetables             | ✅      | ✅        | ❌      |
| AI Creator             | ✅      | ❌        | ❌      |
| Hybrid Scheduler       | ✅      | ❌        | ❌      |
| Manual Scheduler       | ✅      | ✅        | ❌      |
| Review Queue           | ❌      | ✅        | ❌      |
| Notifications          | ✅      | ✅        | ❌      |
| Settings               | ✅      | ✅        | ❌      |

Note: General/Guest faculty are redirected to Student Dashboard (view-only)

## 🎨 Color Coding

### Status Badges
- 🟢 **Green**: Active, Approved, Available, Success
- 🔵 **Blue**: Published, In Progress, Info
- 🟡 **Yellow**: Pending, Warning, Draft
- 🔴 **Red**: Rejected, Error, Conflict, High Priority
- ⚫ **Gray**: Inactive, Disabled, Neutral

### Department Colors
- 💙 **Blue**: Computer Science
- 💜 **Purple**: Data Science
- 💚 **Green**: Information Technology
- 🧡 **Orange**: Electronics
- 💖 **Pink**: Management

## 📱 Responsive Breakpoints

| Screen Size | Sidebar    | Grid Columns | Card Layout |
|-------------|------------|--------------|-------------|
| Mobile (<768px) | Drawer | 1 column | Stacked |
| Tablet (768-1024px) | Drawer | 2 columns | 2-up |
| Desktop (>1024px) | Fixed | 3-4 columns | Grid |

## 🔔 Notification Types

| Icon | Type | Color | Example |
|------|------|-------|---------|
| ✅ | Success | Green | "Timetable published" |
| 📢 | Info | Blue | "New schedule available" |
| ⚠️ | Warning | Yellow | "Conflict detected" |
| ❌ | Error | Red | "Generation failed" |
| 👤 | User Action | Purple | "Prof. X requested change" |

## 🚀 Navigation Flow

```
Login → Faculty Type Check
   ↓
Creator/Publisher → Faculty Dashboard
   ↓
├─ View Events
├─ Resolve Conflicts  
├─ Manage Faculty
├─ Manage Subjects
├─ Manage Classrooms
├─ Manage Batches
├─ View Timetables
│
├─ [Creator Only]
│  ├─ AI Timetable Creator
│  └─ Hybrid Scheduler
│
├─ [Publisher Only]
│  └─ Review Queue
│
├─ Manual Scheduler
├─ Notifications
└─ Settings
```

## 💡 Quick Tips

1. **Toggle Sidebar**: Click hamburger icon (☰) or sidebar edge
2. **Dark Mode**: Click moon/sun icon in header
3. **Search**: Use Ctrl/Cmd + K in any list page
4. **Notifications**: Badge shows unread count
5. **Quick Actions**: Pinned in sidebar for easy access
6. **Mobile**: Swipe from left to open sidebar
7. **Conflicts**: Red badge indicates attention needed
8. **Review Queue**: Yellow badge shows pending items

## 🎯 Keyboard Shortcuts (Future)

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + K` | Search |
| `Ctrl/Cmd + B` | Toggle Sidebar |
| `Ctrl/Cmd + D` | Dashboard |
| `Ctrl/Cmd + N` | Notifications |
| `Ctrl/Cmd + S` | Settings |
| `Esc` | Close Modals |

---

**Pro Tip**: Bookmark frequently used pages for quick access!
