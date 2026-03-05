# 🎓 Academic Campass 2025

> **Smart Institutional Timetable & Campus Management System** — built for the **Smart India Hackathon (SIH)**  
> A full-stack, multi-role, multi-college academic platform powered by Next.js 15, Supabase, Redis, and an AI-driven hybrid scheduling engine.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-red?logo=redis)](https://upstash.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [Architecture](#-architecture)
5. [Modules](#-modules)
6. [User Roles & Dashboards](#-user-roles--dashboards)
7. [API Reference](#-api-reference)
8. [Project Structure](#-project-structure)
9. [Database Schema](#-database-schema)
10. [Quick Start](#-quick-start)
11. [Environment Variables](#-environment-variables)
12. [Testing](#-testing)
13. [Performance](#-performance)
14. [Documentation](#-documentation)
15. [Contributing](#-contributing)

---

## 🚀 Project Overview

**Algomate** is a comprehensive, enterprise-grade campus management system designed to solve the complex challenge of automated timetable generation for Indian higher-education institutions under the **National Education Policy (NEP) 2020** framework.

The system supports:
- 🏫 **Multiple colleges** under a single super-admin umbrella
- 👥 **5 distinct user roles** with isolated dashboards
- 🗓️ **AI + constraint-based hybrid timetable scheduling**
- 📚 **NEP-compliant elective allocation** with student self-selection
- 📊 **Real-time analytics**, notifications, and assignment management
- 🔐 **Centralized JWT-based authentication** with Redis session caching

---

## ✨ Key Features

### 🗓️ Timetable Engine
| Feature | Details |
|---|---|
| **Hybrid Scheduler** | Combines Python CP-SAT (Google OR-Tools) + manual override |
| **AI Timetable Creator** | Constraint-aware auto-generation for entire semester |
| **Manual Scheduling** | Drag-and-drop fallback with conflict detection |
| **Review Queue** | Faculty-based review & approval workflow |
| **Cross-dept Conflict Check** | Shared classroom & faculty conflict resolution |
| **Master Timetable Registry** | Centralized published timetable records |
| **Resource Utilization** | Classroom & faculty load analytics |

### 📚 NEP 2020 Elective System
- Students self-select **MAJOR / MINOR / CORE / ELECTIVE** subjects
- Bucket-based grouping of elective subjects per semester
- Admin can lock/unlock student selections
- Allocation tracking with subject-wise enrollment caps

### 🏫 Multi-College Management (Super Admin)
- Onboard & manage multiple colleges
- Register college admins with secure tokens
- Platform-wide analytics & demo request management
- Calendar & academic year configuration

### 📝 Assignment & Exam Management
- Faculty creates time-limited online assignments
- Auto-grading for MCQ/True-False questions
- Manual grading for essays & coding questions
- Proctoring mode with submission tracking
- Per-student score, percentage & pass/fail reporting

### 🔔 Notification System
- Role-aware notifications (student / faculty / admin)
- Urgent broadcast to all users (admin-only)
- Email notifications via Nodemailer + Handlebars templates
- Real-time unread count badge

### 📊 Analytics & Observability
- Prometheus metrics at `/api/metrics`
- Algorithm performance metrics (scheduling quality scores)
- Structured JSON logging via Pino
- Health check at `/api/health` and `/api/ready`
- Full audit log of user actions

---

## 🔧 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router + Turbopack) | 15.5.4 |
| **UI** | React | 19.1.0 |
| **Language** | TypeScript | 5.9 |
| **Styling** | Tailwind CSS + Framer Motion | 3.4 / 12 |
| **Database** | Supabase (PostgreSQL + RLS) | 2.98 |
| **Auth** | JWT + Middleware Session Cache | — |
| **Caching** | Upstash Redis + IORedis | 1.36 / 5.9 |
| **Validation** | Zod | 4.3 |
| **Email** | Nodemailer + Handlebars | 7.0 |
| **PDF Export** | jsPDF + jsPDF-AutoTable | 3.0 |
| **Drag & Drop** | @dnd-kit | 6.3 |
| **UI Primitives** | Radix UI | 1.1 |
| **Icons** | Lucide React | 0.545 |
| **Logging** | Pino | 10.2 |
| **Metrics** | prom-client (Prometheus) | 15.1 |
| **API Docs** | Swagger UI + swagger-jsdoc | 5.31 / 6.2 |
| **Testing (unit)** | Vitest + happy-dom | 4.0 |
| **Testing (e2e)** | Playwright | 1.58 |
| **Password** | bcryptjs | 3.0 |

---

## 🏗️ Architecture

The project follows a **Modular Monolithic** architecture with **Domain-Driven Design (DDD)** principles and **Clean Architecture** layering.

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App Router                      │
│          (src/app — pages + API route handlers)              │
└────────────────────┬────────────────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────────────────┐
│                    Domain Modules (src/modules)               │
│   ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐   │
│   │timetable │ │elective │ │   nep-   │ │ notifications│   │
│   │          │ │         │ │curriculum│ │              │   │
│   └──────────┘ └─────────┘ └──────────┘ └──────────────┘   │
│   ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐   │
│   │  faculty │ │ student │ │  batch   │ │  department  │   │
│   └──────────┘ └─────────┘ └──────────┘ └──────────────┘   │
│   ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐   │
│   │classroom │ │ course  │ │  events  │ │    college   │   │
│   └──────────┘ └─────────┘ └──────────┘ └──────────────┘   │
│   ┌──────────┐ ┌─────────┐                                  │
│   │   auth   │ │dashboard│                                  │
│   └──────────┘ └─────────┘                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ uses
┌────────────────────▼────────────────────────────────────────┐
│                   Shared Infrastructure (src/shared)          │
│  cache • database • middleware • logging • metrics           │
│  rate-limit • events (event-bus) • types • utils • config   │
└────────────────────┬────────────────────────────────────────┘
                     │ persists to
┌────────────────────▼────────────────────────────────────────┐
│              Supabase PostgreSQL + Redis Cache               │
└─────────────────────────────────────────────────────────────┘
```

### Each Module Follows Clean Architecture Layers

```
src/modules/<module>/
├── domain/
│   ├── entities/          # Core business objects (plain TS classes)
│   └── repositories/      # Interface contracts (IXxxRepository)
├── application/
│   ├── use-cases/         # Business logic (GenerateTimetableUseCase, etc.)
│   └── dto/               # Zod-validated input/output schemas
└── infrastructure/
    └── persistence/       # Supabase repository implementations
```

### Authentication Flow

```
Request → Next.js Middleware → requireAuth(request)
                                  ↓
                        Extract JWT from header
                                  ↓
                     Check Redis session cache (5 min TTL)
                         ↓ hit            ↓ miss
                   Return AuthUser    Query Supabase DB
                                      → Cache result
                                      → Return AuthUser
```

- **50–200 ms faster** than per-route DB calls  
- **90% fewer DB queries** on authenticated endpoints  
- Role checks via `requireRoles(request, ['admin', 'super_admin'])`

---

## 📦 Modules

| Module | Domain | Key Entities | Key Use Cases |
|---|---|---|---|
| `timetable` | Scheduling | `Timetable`, `ScheduledClass` | Generate, Publish, Review, ManualSchedule |
| `nep-curriculum` | NEP Electives | `StudentCourseSelection` | SaveStudentSelection, GetCurriculum |
| `elective` | Elective Buckets | `ElectiveBucket` | CreateBucket, UpdateBucket, AllocateSubjects |
| `faculty` | Faculty | `Faculty`, `Qualification` | GetQualifications, UpdateSettings |
| `student` | Students | `Student`, `Batch` | Enroll, PromoteBatch |
| `batch` | Batches | `Batch` | CreateBatch, PromoteBatch |
| `department` | Departments | `Department` | CRUD, CountByCollege |
| `classroom` | Classrooms | `Classroom` | CRUD, AvailabilityCheck |
| `course` | Courses | `Course` | CRUD |
| `college` | Colleges | `College` | Register, Manage |
| `events` | Campus Events | `Event`, `EventRegistration` | CreateEvent, Register, Cancel |
| `notifications` | Alerts | `Notification` | Send, MarkRead, UrgentBroadcast |
| `auth` | Authentication | `AuthUser` | Login, Logout, SessionCache |
| `dashboard` | Analytics | — | Aggregated stats per role |

---

## 👥 User Roles & Dashboards

### 🔵 Super Admin
**Scope:** Platform-wide management across all colleges  
**Pages:** `Dashboard → Colleges → College Admins → Demo Requests → Analytics → Registration Tokens → Calendars → Settings`

### 🟢 College Admin (Admin)
**Scope:** Full control over one college  
**Pages:** `Dashboard → Departments → Faculty → Students → Batches → Classrooms → Subjects → Courses → NEP Curriculum → Bucket Creator → Constraints → Communication`

### 🟡 Faculty
**Scope:** Subject delivery, timetable, and assignments for assigned batches  
**Pages:** `Dashboard → Timetables (View/Manual/AI/Hybrid) → Review Queue → My Subjects → Qualifications → Assignments → Events → NEP Curriculum → Notifications → Settings → Preferences`

### 🔴 Student
**Scope:** Academic monitoring — timetable, assignments, elective selection  
**Pages:** `Dashboard → Timetable → NEP Subject Selection → Assignments → Subjects → Profile`

### ⚪ Publisher / Creator (Faculty sub-roles)
- **Creator** — creates and edits timetable drafts
- **Publisher** — approves and publishes timetables; can send urgent notifications

---

## 🌐 API Reference

All routes are under `/api/`. Authentication required unless noted.

### Auth
| Method | Route | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login & receive JWT |
| POST | `/api/auth/logout` | Any | Invalidate session |

### Admin (College)
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/admin/faculty` | List / create faculty |
| PUT/DELETE | `/api/admin/faculty/[id]` | Update / delete faculty |
| GET/POST | `/api/admin/students` | List / enroll student |
| GET/POST | `/api/admin/departments` | Departments CRUD |
| GET/POST | `/api/admin/classrooms` | Classrooms CRUD |
| PUT/DELETE | `/api/admin/classrooms/[id]` | Update / delete classroom |
| GET/POST | `/api/admin/subjects` | Subjects CRUD |
| GET/POST | `/api/admin/courses` | Courses CRUD |
| PUT/DELETE | `/api/admin/courses/[id]` | Update / delete course |
| GET/POST | `/api/admin/batches` | Batch management |
| POST | `/api/admin/constraints` | Scheduling constraint rules |
| GET/POST | `/api/admin/buckets` | Elective bucket CRUD |
| GET/POST | `/api/admin/nep-curriculum` | NEP curriculum setup |

### Timetable
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/timetables` | List / create timetable |
| GET | `/api/timetables/[id]` | Get timetable by ID |
| POST | `/api/timetables/generate` | AI auto-generate |
| POST | `/api/timetables/publish` | Publish timetable |
| GET | `/api/timetables/review-queue` | Faculty review queue |
| GET | `/api/timetables/my-timetable` | Current user's timetable |
| POST | `/api/hybrid-timetable/generate` | Hybrid CP-SAT scheduler |
| GET | `/api/hybrid-timetable/status` | Scheduler job status |
| GET | `/api/master-timetables` | Published master registry |
| GET | `/api/cross-department-conflicts` | Conflict detection |
| GET | `/api/resource-utilization` | Load analytics |

### Faculty
| Method | Route | Description |
|---|---|---|
| GET/PUT | `/api/faculty/qualifications` | View / update qualifications |
| GET/PATCH | `/api/faculty/settings` | Profile settings |
| GET/POST | `/api/faculty/availability` | Availability slots |
| GET | `/api/faculty/assignment/[id]/submissions` | Assignment submissions |

### NEP / Electives
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/nep/curriculum` | NEP curriculum |
| GET/POST | `/api/nep/selections` | Student elective selections |
| GET/PUT/DELETE | `/api/nep/buckets/[id]` | Elective bucket management |
| GET | `/api/elective-buckets` | Available buckets |

### Student
| Method | Route | Description |
|---|---|---|
| GET | `/api/student/timetable` | Student timetable |
| GET | `/api/student/assignments` | Assigned assessments |
| GET | `/api/student/assignment/[id]` | Assignment details |
| POST | `/api/student/nep-selection` | Submit elective choice |
| GET | `/api/student/subjects` | Enrolled subjects |

### Super Admin
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/super-admin/colleges` | Manage colleges |
| GET/PATCH/DELETE | `/api/super-admin/colleges/[id]` | College CRUD |
| GET/POST | `/api/super-admin/college-admins` | Manage admins |
| PATCH/DELETE | `/api/super-admin/college-admins/[id]` | Update / remove admin |
| GET/PATCH | `/api/super-admin/demo-requests/[id]` | Demo request management |
| GET/POST | `/api/super-admin/registration-tokens` | Onboarding tokens |

### Notifications & Communication
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/notifications` | List / create notifications |
| PATCH | `/api/notifications/[id]/read` | Mark read |
| POST | `/api/notifications/urgent-update` | Urgent broadcast (publisher) |
| GET/POST | `/api/announcements` | College announcements |
| POST | `/api/email` | Send email notification |

### System
| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/ready` | Readiness check |
| GET | `/api/metrics` | Prometheus metrics |
| GET | `/api-docs` | Swagger UI |
| GET | `/api/openapi` | OpenAPI JSON spec |

---

## 📁 Project Structure

```
academic_campass_2025/
│
├── src/
│   ├── app/                          # Next.js App Router (pages + API)
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   ├── login/                    # Auth pages
│   │   ├── register/
│   │   ├── forgot-password/
│   │   │
│   │   ├── admin/                    # College Admin dashboard
│   │   │   ├── dashboard/
│   │   │   ├── faculty/
│   │   │   ├── students/
│   │   │   ├── departments/
│   │   │   ├── classrooms/
│   │   │   ├── courses/
│   │   │   ├── subjects/
│   │   │   ├── batches/
│   │   │   ├── constraints/
│   │   │   ├── buckets/
│   │   │   ├── bucket_creator/
│   │   │   ├── nep-curriculum/
│   │   │   ├── Allotment/
│   │   │   ├── subject-allotment/
│   │   │   └── communication/
│   │   │
│   │   ├── faculty/                  # Faculty dashboard
│   │   │   ├── dashboard/
│   │   │   ├── timetables/           # View / create / manage
│   │   │   ├── ai-timetable-creator/
│   │   │   ├── hybrid-scheduler/
│   │   │   ├── manual-scheduling/
│   │   │   ├── review-queue/
│   │   │   ├── my-subjects/
│   │   │   ├── qualifications/
│   │   │   ├── assignments/          # Create & grade
│   │   │   ├── events/
│   │   │   ├── nep-curriculum/
│   │   │   ├── notifications/
│   │   │   ├── preferences/
│   │   │   └── settings/
│   │   │
│   │   ├── student/                  # Student dashboard
│   │   │   ├── dashboard/
│   │   │   ├── timetable/
│   │   │   ├── assignments/
│   │   │   ├── nep-selection/
│   │   │   ├── subjects/
│   │   │   └── profile/
│   │   │
│   │   ├── super-admin/              # Platform-level admin
│   │   │   ├── dashboard/
│   │   │   ├── colleges/
│   │   │   ├── college-admins/
│   │   │   ├── demo-requests/
│   │   │   ├── analytics/
│   │   │   ├── registration-tokens/
│   │   │   ├── calendars/
│   │   │   └── settings/
│   │   │
│   │   ├── nep-curriculum/           # Shared NEP curriculum viewer
│   │   ├── notifications/
│   │   ├── college/
│   │   ├── demo/
│   │   └── api/                      # ~41 API namespace folders
│   │       ├── admin/  (15 sub-routes)
│   │       ├── faculty/
│   │       ├── student/
│   │       ├── super-admin/
│   │       ├── timetables/
│   │       ├── hybrid-timetable/
│   │       ├── nep/
│   │       ├── assignments/
│   │       ├── notifications/
│   │       ├── announcements/
│   │       ├── events/
│   │       ├── health/
│   │       ├── metrics/
│   │       └── ...
│   │
│   ├── modules/                      # Business Domain Modules (DDD)
│   │   ├── timetable/                # Core scheduling engine
│   │   │   ├── domain/entities/
│   │   │   ├── domain/repositories/
│   │   │   ├── application/use-cases/
│   │   │   ├── application/dto/
│   │   │   └── infrastructure/persistence/
│   │   ├── nep-curriculum/           # NEP elective management
│   │   ├── elective/                 # Elective bucket grouping
│   │   ├── faculty/                  # Faculty profiles & qualifications
│   │   ├── student/                  # Student enrollment & batches
│   │   ├── batch/                    # Batch promotion & tracking
│   │   ├── department/
│   │   ├── classroom/
│   │   ├── course/
│   │   ├── college/
│   │   ├── events/                   # Campus events + registrations
│   │   ├── notifications/
│   │   ├── auth/
│   │   └── dashboard/
│   │
│   ├── shared/                       # Cross-module infrastructure
│   │   ├── cache/                    # Redis + in-memory cache
│   │   ├── database/                 # Supabase client + types
│   │   ├── middleware/               # auth, error-handler, validation
│   │   ├── logging/                  # Pino structured logger
│   │   ├── metrics/                  # Prometheus counters / histograms
│   │   ├── rate-limit/               # IP-based rate limiter
│   │   ├── events/                   # In-process event bus
│   │   ├── constants/                # routes.ts, roles.ts, config
│   │   ├── types/                    # Global TypeScript types
│   │   └── utils/                    # date, crypto, pagination, response
│   │
│   └── lib/                          # Server-only service libraries
│       ├── auth/                     # requireAuth / requireRoles helpers
│       ├── constraintRules.ts        # Scheduling constraint engine
│       ├── crossDepartmentConflicts.ts
│       ├── facultyAvailability.ts
│       ├── masterTimetableRegistry.ts
│       ├── notificationService.ts    # Email + DB notification dispatch
│       ├── resourceUtilization.ts
│       ├── algorithmMetrics.ts
│       ├── auditLog.ts
│       ├── eventRegistrations.ts
│       └── storage/                  # Supabase file storage helpers
│
├── database/                         # SQL migrations & schema files
│   ├── new_schema.sql                # Master schema (~166 KB)
│   ├── complete_schema_with_permissions.sql
│   ├── assignment_system_schema.sql
│   ├── hybrid_scheduler_schema.sql
│   ├── events_schema.sql
│   └── ... (100+ migration/fix scripts)
│
├── services/                         # External Python scheduling service
│
├── python/                           # Python helper scripts
│
├── scripts/                          # JS debug & verification scripts
│
├── docs/                             # All project documentation
│   ├── architecture/
│   ├── migration/
│   ├── database/
│   ├── api/
│   ├── team-tasks/
│   └── legacy-fixes/
│
├── __tests__/                        # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── public/                           # Static assets
├── tailwind.config.js
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## 🗄️ Database Schema

The Supabase PostgreSQL database contains **30+ tables** with Row Level Security (RLS) enabled on all sensitive tables.

### Core Tables

| Table | Purpose |
|---|---|
| `users` | All users (super_admin, college_admin, admin, faculty, student) |
| `colleges` | College records |
| `departments` | Departments within a college |
| `batches` | Student cohorts (year + semester + section) |
| `subjects` | Subject catalogue |
| `courses` | Degree programmes |
| `classrooms` | Physical room inventory |
| `timetables` | Timetable records (draft / published) |
| `scheduled_classes` | Individual class slots in a timetable |
| `time_slots` | Master time-slot definitions (day + start + end + duration) |
| `faculty_qualified_subjects` | Many-to-many faculty ↔ subject qualification |
| `faculty_availability` | Faculty unavailability blocks |
| `batch_subjects` | Subject-to-batch assignments |
| `elective_buckets` | NEP elective groupings |
| `student_course_selections` | Student elective choices |
| `assignments` | Online assessments |
| `assignment_questions` | Questions per assignment |
| `assignment_submissions` | Student submissions |
| `submission_answers` | Per-question answers |
| `events` | Campus events |
| `event_registrations` | Student event sign-ups |
| `notifications` | System notifications |
| `announcements` | College-wide announcements |
| `audit_logs` | Admin action trail |
| `demo_requests` | Platform demo sign-ups |
| `registration_tokens` | Secure college onboarding tokens |
| `algorithm_metrics` | Timetable generation quality scores |
| `constraint_rules` | Scheduling hard/soft constraints |
| `master_timetable_registry` | Published timetable index |

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Supabase** project (free tier works)
- **Upstash Redis** account (optional — falls back to in-memory cache)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/academic_campass_2025.git
cd academic_campass_2025
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# then fill in the values (see Environment Variables section below)
```

### 3. Set Up Database

Run the master schema in your Supabase SQL editor:

```bash
# Apply core schema
database/new_schema.sql

# Apply permissions
database/complete_schema_with_permissions.sql

# Apply assignment system
database/assignment_system_schema.sql

# Apply hybrid scheduler schema
database/hybrid_scheduler_schema.sql
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the landing page will redirect based on role.

### 5. Create First Super Admin

Use the Supabase dashboard to insert a row in `users` with `role = 'super_admin'`, then use `/api/admin/login` to authenticate.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
# ─── Supabase ───────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── Redis (Upstash) ─────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# ─── App ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-strong-jwt-secret-min-32-chars

# ─── Email (Nodemailer) ──────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Academic Campass <no-reply@your-domain.com>

# ─── Python Scheduler Service (optional) ─────────────────────
PYTHON_SCHEDULER_URL=http://localhost:8000
```

---

## 🧪 Testing

```bash
# Run all unit & integration tests (Vitest)
npm test

# Run with UI
npx vitest --ui

# Coverage report
npx vitest run --coverage

# End-to-end tests (Playwright)
npx playwright test

# Playwright UI mode
npx playwright test --ui
```

**Test locations:**
- Unit tests: `__tests__/unit/`
- Integration tests: `__tests__/integration/`
- E2E tests: `__tests__/e2e/`

---

## 📈 Performance

| Metric | Before | After |
|---|---|---|
| Auth latency (per request) | 150–300 ms | 50–150 ms |
| DB queries (auth, per day) | ~100k | ~10k (−90%) |
| Session cache TTL | — | 5 minutes |
| Timetable generation (small) | Manual / hours | < 5 seconds |
| API response (cached) | ~200 ms | ~30–60 ms |

**Caching strategy:** Cache-aside pattern (Redis primary, in-memory fallback) with selective invalidation on writes.

---

## 📚 Documentation

| Document | Location |
|---|---|
| Architecture Overview | [`docs/architecture/`](./docs/architecture/) |
| API OpenAPI Spec | [`docs/api/`](./docs/api/) |
| Interactive Swagger UI | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |
| Database Schema Analysis | [`database/SCHEMA_ANALYSIS.md`](./database/SCHEMA_ANALYSIS.md) |
| Migration Guide | [`docs/migration/`](./docs/migration/) |
| Auth System Docs | [`src/lib/auth/`](./src/lib/auth/) |
| Admin Dashboard Guide | [`src/app/admin/README.md`](./src/app/admin/README.md) |
| Faculty Dashboard Guide | [`src/app/faculty/README.md`](./src/app/faculty/README.md) |
| Super Admin Guide | [`src/app/super-admin/README.md`](./src/app/super-admin/README.md) |
| Setup & Deployment | [`docs/SETUP_AND_RUN.md`](./docs/SETUP_AND_RUN.md) |
| Security Audit Report | [`docs/SECURITY_AUDIT_REPORT.md`](./docs/SECURITY_AUDIT_REPORT.md) |

---

## 🤝 Contributing

1. **Read** the [Architecture docs](./docs/architecture/) first
2. **Follow** the module structure (`domain → application → infrastructure`)
3. **Write** Zod DTOs for all new API inputs
4. **Add** `requireAuth` / `requireRoles` to every API route
5. **Use** `(this.db as any)` casts only when Supabase types are out of sync — prefer updating generated types
6. **Test** with Vitest before submitting a PR
7. **Document** any new API route in the OpenAPI spec

### Branch Naming
```
feature/timetable-conflict-detection
fix/auth-session-cache-ttl
docs/update-api-reference
```

---

## 📄 License

This project was built for the **Smart India Hackathon 2024–25** and is released under the [MIT License](LICENSE).

---

## 👨‍💻 Team

Built with ❤️ by the **Academic Campass Team** — SIH 2025

> *Empowering institutions with intelligent scheduling, NEP-compliant curriculum management, and real-time campus operations.*
