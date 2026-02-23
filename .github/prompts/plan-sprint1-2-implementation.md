# Sprint 1-2: UI Foundation Implementation Plan

## 📅 Duration: Weeks 1-2 (14 Days)
## 🎯 Goal: Transform UI into Enterprise-Grade ERP Interface

---

## 🚀 Sprint Overview

### Objectives
1. Install complete shadcn/ui component library (15+ components)
2. Implement TanStack Table for professional data grids
3. Add React Hook Form + Zod validation layer
4. Create unified ERP navigation structure
5. Build Recharts analytics components
6. Establish design system with ERP color palette

### Dependencies to Install
```bash
# Core UI dependencies
npm install @tanstack/react-table react-hook-form @hookform/resolvers zod recharts

# shadcn/ui components
npx shadcn-ui@latest add button input select dialog card badge table tabs accordion dropdown-menu toast alert avatar calendar checkbox command label popover separator sheet skeleton slider switch textarea tooltip
```

---

## 👥 Team Member Assignments

---

## 🎨 Radhika Salodkar (UI/UX Lead)

### Week 1: Design System Foundation

#### Day 1-2: ERP Color Palette Research
- [ ] Analyze Zoho, SAP, Odoo color schemes
- [ ] Create Academic Compass ERP color palette
- [ ] Define primary, secondary, accent, semantic colors
- [ ] Document color usage guidelines

**Deliverable**: `DESIGN_SYSTEM.md` with color palette

```css
/* src/app/globals.css - New ERP Color Palette */
:root {
  /* Primary - Professional Blue */
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  
  /* Secondary - Slate Gray */
  --secondary: 215 20% 65%;
  --secondary-foreground: 0 0% 100%;
  
  /* Accent - Emerald Success */
  --accent: 160 84% 39%;
  --accent-foreground: 0 0% 100%;
  
  /* Semantic Colors */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --error: 0 84% 60%;
  --info: 199 89% 48%;
  
  /* ERP Sidebar */
  --sidebar-bg: 222 47% 11%;
  --sidebar-text: 213 31% 91%;
  --sidebar-hover: 217 33% 17%;
  --sidebar-active: 217 91% 60%;
}

.dark {
  --primary: 217 91% 65%;
  --secondary: 215 20% 45%;
  --sidebar-bg: 0 0% 3%;
  --sidebar-text: 0 0% 95%;
}
```

#### Day 3-4: Figma Mockups
- [ ] Create Admin Dashboard mockup (widget-based grid)
- [ ] Create Student Dashboard mockup (card-based timetable)
- [ ] Create Faculty Dashboard mockup (quick actions focus)
- [ ] Design mobile responsive variants

**Deliverable**: Figma file link in `DESIGN_SYSTEM.md`

#### Day 5-7: Component Library Requirements
- [ ] List all required shadcn/ui components
- [ ] Define custom component specifications
- [ ] Create component usage examples
- [ ] Document accessibility requirements

**Deliverable**: Component specification in `DESIGN_SYSTEM.md`

### Week 2: Design Implementation Review

#### Day 8-10: Design QA
- [ ] Review implemented components against Figma
- [ ] Provide feedback on color application
- [ ] Verify responsive behavior
- [ ] Test dark mode consistency

#### Day 11-14: Documentation
- [ ] Create visual style guide with examples
- [ ] Document spacing, typography, shadows
- [ ] Create component usage do's and don'ts
- [ ] Finalize `DESIGN_SYSTEM.md`

---

## 📚 Gargi Gundawar (Research Lead)

### Week 1: ERP Research & Documentation

#### Day 1-3: Competitor Analysis
- [ ] Deep dive into Zoho People UI patterns
- [ ] Analyze SAP SuccessFactors dashboard layouts
- [ ] Study Odoo ERP navigation structure
- [ ] Document common ERP UI patterns

**Deliverable**: `ERP_RESEARCH.md`

```markdown
# ERP UI Research Document

## Analyzed Platforms
1. **Zoho People** - HR focus, clean sidebar, widget dashboard
2. **SAP SuccessFactors** - Enterprise, data-dense, keyboard shortcuts
3. **Odoo** - Modular, kanban views, action buttons
4. **Workday** - Modern, card-based, contextual actions

## Common Patterns Identified
- Collapsible sidebar navigation
- Breadcrumb trails for deep navigation
- Global search (Cmd+K / Ctrl+K)
- Quick action floating buttons
- Notification center in header
- User profile dropdown
- Widget-based dashboard layouts
- Data tables with inline actions
```

#### Day 4-5: Navigation Patterns
- [ ] Document sidebar navigation best practices
- [ ] Research breadcrumb implementations
- [ ] Study global search patterns (Command palette)
- [ ] Analyze notification center designs

#### Day 6-7: Style Guide Creation
- [ ] Create typography scale documentation
- [ ] Document icon usage guidelines
- [ ] Define button styles and variants
- [ ] Create form element specifications

**Deliverable**: `STYLE_GUIDE.md`

### Week 2: Implementation Support

#### Day 8-10: Component Testing
- [ ] Test implemented components for usability
- [ ] Verify against research findings
- [ ] Document improvement suggestions
- [ ] Create user flow diagrams

#### Day 11-14: Documentation Finalization
- [ ] Merge research into main docs
- [ ] Create quick reference cards
- [ ] Document keyboard shortcut standards
- [ ] Finalize all research documents

---

## 🔧 Paritosh Magare (Component Lead)

### Week 1: shadcn/ui Component Installation

#### Day 1: Project Setup
- [ ] Initialize shadcn/ui in project
- [ ] Configure `components.json`
- [ ] Set up component directory structure
- [ ] Install base dependencies

```bash
npx shadcn-ui@latest init

# Select options:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - Tailwind config: tailwind.config.js
# - Components: src/components/ui
# - Utils: src/lib/utils
```

#### Day 2-3: Form Components
- [ ] Install: `button`, `input`, `textarea`, `select`
- [ ] Install: `checkbox`, `switch`, `slider`, `radio-group`
- [ ] Install: `label`, `form` (React Hook Form integration)
- [ ] Test all form components

```bash
npx shadcn-ui@latest add button input textarea select checkbox switch slider radio-group label form
```

#### Day 4-5: Layout Components
- [ ] Install: `card`, `separator`, `tabs`, `accordion`
- [ ] Install: `sheet`, `dialog`, `drawer`, `popover`
- [ ] Install: `dropdown-menu`, `context-menu`, `menubar`
- [ ] Test all layout components

```bash
npx shadcn-ui@latest add card separator tabs accordion sheet dialog drawer popover dropdown-menu context-menu menubar
```

#### Day 6-7: Feedback Components
- [ ] Install: `alert`, `toast`, `sonner`, `badge`
- [ ] Install: `avatar`, `skeleton`, `progress`
- [ ] Install: `tooltip`, `hover-card`
- [ ] Configure toast/sonner provider

```bash
npx shadcn-ui@latest add alert toast sonner badge avatar skeleton progress tooltip hover-card
```

### Week 2: Custom Component Creation

#### Day 8-10: Navigation Components
- [ ] Create `Sidebar.tsx` - Collapsible ERP sidebar
- [ ] Create `Breadcrumb.tsx` - Navigation breadcrumbs
- [ ] Create `Header.tsx` - Top navigation bar
- [ ] Create `NavLink.tsx` - Sidebar navigation links

**Deliverable**: `src/components/navigation/*.tsx`

```tsx
// src/components/navigation/Sidebar.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar,
  Settings,
  LogOut
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Users, label: "Faculty", href: "/admin/faculty" },
    { icon: BookOpen, label: "Subjects", href: "/admin/subjects" },
    { icon: Calendar, label: "Timetable", href: "/admin/timetable" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar-bg text-sidebar-text transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-hover">
        {!collapsed && (
          <span className="text-xl font-bold">Academic Compass</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-text hover:bg-sidebar-hover"
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              "hover:bg-sidebar-hover text-sidebar-text",
              collapsed && "justify-center"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-hover">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-sidebar-text hover:bg-sidebar-hover",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
```

#### Day 11-12: Utility Components
- [ ] Create `LoadingSpinner.tsx`
- [ ] Create `EmptyState.tsx`
- [ ] Create `ErrorBoundary.tsx`
- [ ] Create `ConfirmDialog.tsx`

#### Day 13-14: Testing & Documentation
- [ ] Test all components in isolation
- [ ] Create Storybook stories (optional)
- [ ] Document component props
- [ ] Create usage examples

---

## 📊 Ayush Kshirsagar (Data Table Lead)

### Week 1: TanStack Table Setup

#### Day 1-2: Installation & Configuration
- [ ] Install TanStack Table dependencies
- [ ] Create base DataTable component
- [ ] Configure column definitions
- [ ] Set up table state management

```bash
npm install @tanstack/react-table
```

#### Day 3-4: Core Features
- [ ] Implement column sorting (asc/desc)
- [ ] Implement pagination (page size, navigation)
- [ ] Implement row selection (single/multi)
- [ ] Add column visibility toggle

**Deliverable**: `src/components/ui/data-table.tsx`

```tsx
// src/components/ui/data-table.tsx
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### Day 5-7: Advanced Features
- [ ] Implement global search/filter
- [ ] Add column resizing
- [ ] Implement row actions dropdown
- [ ] Add export functionality (CSV/Excel)

### Week 2: Entity-Specific Tables

#### Day 8-9: Faculty Table
- [ ] Create faculty columns definition
- [ ] Add inline edit capability
- [ ] Implement delete confirmation
- [ ] Add status toggle

```tsx
// src/app/admin/faculty/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Faculty = {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: "active" | "inactive";
};

export const columns: ColumnDef<Faculty>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "department",
    header: "Department",
  },
  {
    accessorKey: "designation",
    header: "Designation",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "active" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const faculty = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Profile</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
```

#### Day 10-11: Subject & Classroom Tables
- [ ] Create subject columns definition
- [ ] Create classroom columns definition
- [ ] Add batch filter for subjects
- [ ] Add capacity display for classrooms

#### Day 12-14: Testing & Optimization
- [ ] Test with large datasets (1000+ rows)
- [ ] Implement virtual scrolling for performance
- [ ] Add loading states
- [ ] Document usage patterns

---

## ✅ Mayur Aglawe (Validation Lead)

### Week 1: Zod Schema Implementation

#### Day 1-2: Setup & Auth Schemas
- [ ] Install React Hook Form + Zod
- [ ] Create authentication schemas
- [ ] Create user management schemas
- [ ] Set up form utilities

```bash
npm install react-hook-form @hookform/resolvers zod
```

**Deliverable**: `src/lib/validations/auth.ts`

```typescript
// src/lib/validations/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  role: z.enum(["student", "faculty", "admin"], {
    required_error: "Please select a role",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

#### Day 3-4: Entity Schemas
- [ ] Create faculty schema
- [ ] Create subject schema
- [ ] Create classroom schema
- [ ] Create department schema

**Deliverable**: `src/lib/validations/entities.ts`

```typescript
// src/lib/validations/faculty.ts
import { z } from "zod";

export const facultySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[6-9]\d{9}$/.test(val),
      "Invalid Indian phone number"
    ),
  departmentId: z.string().uuid("Please select a department"),
  designation: z.enum([
    "professor",
    "associate_professor",
    "assistant_professor",
    "lecturer",
    "visiting_faculty",
  ], {
    required_error: "Please select a designation",
  }),
  specialization: z.string().optional(),
  maxHoursPerDay: z
    .number()
    .min(1, "Minimum 1 hour required")
    .max(8, "Maximum 8 hours allowed")
    .default(6),
  maxHoursPerWeek: z
    .number()
    .min(1, "Minimum 1 hour required")
    .max(40, "Maximum 40 hours allowed")
    .default(25),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
});

export type FacultyInput = z.infer<typeof facultySchema>;

// src/lib/validations/subject.ts
export const subjectSchema = z.object({
  code: z
    .string()
    .min(1, "Subject code is required")
    .max(20, "Subject code too long")
    .regex(/^[A-Z]{2,4}\d{3,4}$/, "Invalid subject code format (e.g., CS101)"),
  name: z
    .string()
    .min(1, "Subject name is required")
    .max(150, "Subject name too long"),
  credits: z
    .number()
    .min(1, "Minimum 1 credit required")
    .max(6, "Maximum 6 credits allowed"),
  lectureHours: z.number().min(0).max(5).default(3),
  tutorialHours: z.number().min(0).max(2).default(1),
  practicalHours: z.number().min(0).max(4).default(2),
  semester: z.number().min(1).max(8),
  departmentId: z.string().uuid("Please select a department"),
  subjectType: z.enum(["theory", "practical", "project", "seminar"]),
  isElective: z.boolean().default(false),
  nepCategory: z.enum(["major", "minor", "open_elective", "sec", "vac", "aec"]).optional(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

// src/lib/validations/classroom.ts
export const classroomSchema = z.object({
  name: z
    .string()
    .min(1, "Classroom name is required")
    .max(50, "Classroom name too long"),
  building: z.string().min(1, "Building is required"),
  floor: z.number().min(0, "Floor must be 0 or higher"),
  capacity: z
    .number()
    .min(10, "Minimum capacity is 10")
    .max(500, "Maximum capacity is 500"),
  roomType: z.enum([
    "classroom",
    "lab",
    "seminar_hall",
    "auditorium",
    "conference_room",
  ]),
  hasProjector: z.boolean().default(true),
  hasAC: z.boolean().default(false),
  hasComputers: z.boolean().default(false),
  computerCount: z.number().min(0).optional(),
  status: z.enum(["available", "under_maintenance", "reserved"]).default("available"),
});

export type ClassroomInput = z.infer<typeof classroomSchema>;
```

#### Day 5-7: Form Integration
- [ ] Create reusable Form component with RHF
- [ ] Create FormField wrapper components
- [ ] Add error display utilities
- [ ] Create submit handlers

**Deliverable**: `src/components/ui/form.tsx`

```tsx
// src/components/ui/form.tsx (extended)
"use client";

import * as React from "react";
import { useFormContext, Controller, ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form Context
const Form = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ className, ...props }, ref) => (
  <form ref={ref} className={cn("space-y-6", className)} {...props} />
));
Form.displayName = "Form";

// Form Field Context
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// Form Item
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
));
FormItem.displayName = "FormItem";

// Form Label
const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  const { name } = React.useContext(FormFieldContext);
  return <Label ref={ref} htmlFor={name} className={className} {...props} />;
});
FormLabel.displayName = "FormLabel";

// Form Message (Error)
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) return null;
  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export { Form, FormField, FormItem, FormLabel, FormMessage };
```

### Week 2: API Validation & Testing

#### Day 8-10: API Route Validation
- [ ] Create API validation middleware
- [ ] Apply validation to existing endpoints
- [ ] Add error response formatting
- [ ] Create validation utilities

```typescript
// src/lib/api-validation.ts
import { NextRequest, NextResponse } from "next/server";
import { z, ZodSchema } from "zod";

export function validateRequest<T>(schema: ZodSchema<T>) {
  return async (request: NextRequest): Promise<{ data: T } | { error: NextResponse }> => {
    try {
      const body = await request.json();
      const data = schema.parse(body);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          error: NextResponse.json(
            {
              success: false,
              message: "Validation failed",
              errors: error.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
              })),
            },
            { status: 400 }
          ),
        };
      }
      return {
        error: NextResponse.json(
          { success: false, message: "Invalid request body" },
          { status: 400 }
        ),
      };
    }
  };
}

// Usage in API route:
// const result = await validateRequest(facultySchema)(request);
// if ("error" in result) return result.error;
// const { data } = result;
```

#### Day 11-14: Testing & Documentation
- [ ] Test all schemas with edge cases
- [ ] Create validation error examples
- [ ] Document schema usage patterns
- [ ] Create validation cheat sheet

---

## 📈 Yogeshwar Chaudhary (Charts Lead)

### Week 1: Recharts Setup

#### Day 1-2: Installation & Base Components
- [ ] Install Recharts
- [ ] Create chart wrapper components
- [ ] Set up chart theming (dark mode support)
- [ ] Create responsive container utility

```bash
npm install recharts
```

#### Day 3-5: Core Chart Components
- [ ] Create BarChart component
- [ ] Create LineChart component
- [ ] Create PieChart component
- [ ] Create AreaChart component

**Deliverable**: `src/components/charts/*.tsx`

```tsx
// src/components/charts/BarChart.tsx
"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BarChartProps {
  title?: string;
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
}

export function BarChart({
  title,
  data,
  dataKey,
  xAxisKey,
  color = "hsl(var(--primary))",
  height = 300,
}: BarChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// src/components/charts/LineChart.tsx
"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LineChartProps {
  title?: string;
  data: Array<Record<string, unknown>>;
  lines: Array<{ dataKey: string; color: string; name?: string }>;
  xAxisKey: string;
  height?: number;
}

export function LineChart({
  title,
  data,
  lines,
  xAxisKey,
  height = 300,
}: LineChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                name={line.name || line.dataKey}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// src/components/charts/PieChart.tsx
"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PieChartProps {
  title?: string;
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(199 89% 48%)",
];

export function PieChart({ title, data, height = 300 }: PieChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

#### Day 6-7: Chart Theming
- [ ] Create chart color palette
- [ ] Add dark mode support
- [ ] Create chart animation configs
- [ ] Add loading states for charts

### Week 2: Dashboard Widgets

#### Day 8-10: Stats Cards
- [ ] Create StatsCard component (number + trend)
- [ ] Create progress indicator widget
- [ ] Create mini sparkline widget
- [ ] Add animation/transitions

**Deliverable**: `src/components/widgets/StatsCard.tsx`

```tsx
// src/components/widgets/StatsCard.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = "from last month",
  icon,
  className,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (change > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    }
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {getTrendIcon()}
            <span className={cn("text-xs", getTrendColor())}>
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### Day 11-12: Analytics Widgets
- [ ] Create attendance summary widget
- [ ] Create assignment progress widget
- [ ] Create grade distribution widget
- [ ] Create upcoming deadlines widget

#### Day 13-14: Testing & Documentation
- [ ] Test all charts with real data
- [ ] Verify dark mode compatibility
- [ ] Create chart usage guide
- [ ] Document customization options

---

## 📋 Sprint Acceptance Criteria

### Week 1 Checklist
- [ ] All shadcn/ui components installed (15+ components)
- [ ] TanStack Table base implementation complete
- [ ] Zod schemas for all core entities created
- [ ] Recharts wrapper components created
- [ ] Design system documentation started
- [ ] ERP research document complete

### Week 2 Checklist
- [ ] DataTable working with pagination, sorting, filtering
- [ ] Form validation integrated with React Hook Form
- [ ] Navigation components created (Sidebar, Breadcrumb)
- [ ] Stats cards and chart widgets complete
- [ ] All components tested in dark mode
- [ ] Documentation finalized

---

## 🎯 Definition of Done

Each component/feature is DONE when:
1. ✅ Code is written in TypeScript with proper types
2. ✅ Component is responsive (mobile + desktop)
3. ✅ Dark mode works correctly
4. ✅ Component has proper accessibility attributes
5. ✅ Code follows project conventions
6. ✅ Component is tested manually
7. ✅ Usage is documented

---

## 📞 Daily Standup Questions

1. What did you complete yesterday?
2. What will you work on today?
3. Are there any blockers?
4. Do you need help from anyone?

---

## 🔗 Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
