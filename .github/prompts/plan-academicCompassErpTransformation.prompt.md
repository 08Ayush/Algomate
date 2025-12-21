# Academic Compass → Enterprise ERP Platform Transformation

## 🎯 Project Vision

Transform Academic Compass from a SIH-specific timetable scheduler into a **generalized, modular ERP platform** for colleges of all streams (B.Sc, B.Com, B.Tech, etc.). The platform will be customizable per college's unique requirements and constraints.

---

## 👥 COMPLETE TEAM (6 MEMBERS)

| Name | Role | Expertise Points |
|------|------|------------------|
| **Paritosh Magare** | Database/Backend/Deployment Lead | 36 pts |
| **Ayush Kshirsagar** | DevOps/Database/Deployment Lead | 37 pts |
| **Mayur Aglawe** | Hybrid Algorithm/Backend | 38 pts |
| **Gargi Gundawar** | UI/Research | 22 pts |
| **Radhika Salodkar** | UI/UX | 32 pts |
| **Yogeshwar Chaudhary** | AI/ML | 28 pts |

### 🎯 Member Expertise Mapping

| Task Category | Primary Members |
|---------------|-----------------|
| DATABASE TASKS | Paritosh Magare, Ayush Kshirsagar |
| AWS/DEPLOYMENT | Ayush Kshirsagar, Paritosh Magare |
| ALGORITHM/BACKEND | Mayur Aglawe |
| UI/RESEARCH | Gargi Gundawar |
| UI/UX/FRONTEND | Radhika Salodkar |
| AI/ML/ANALYTICS | Yogeshwar Chaudhary |

---

## 📊 Current State Analysis

### Existing Features ✅
- Multi-college architecture with 25+ database tables
- AI-powered timetable scheduling (CP-SAT + Genetic Algorithm + RL)
- NEP 2020 compliance with MAJOR/MINOR bucket system
- Multi-role dashboards (Super Admin, Admin, Faculty, Student)
- Notification system with email integration
- Workflow approval process

### Technical Debt & Gaps ⚠️
- **UI Components**: Only 3 basic components (need full ERP set)
- **Authentication**: Base64 JWT (needs production security)
- **Large Components**: Dashboards are 2000-3000 lines (need refactoring)
- **No State Management**: Missing Zustand/Redux
- **No API Validation**: Missing Zod schemas
- **No Testing**: No test files
- **No CI/CD**: Missing GitHub Actions

---

## 🚀 Priority Tasks

### Priority 1: Professional UI Redesign (CRITICAL)
Transform current UI into enterprise-grade ERP interface matching industry standards (Zoho, SAP style).

### Priority 2: Platform Generalization
Make the system stream-agnostic (B.Sc, B.Com, B.Tech) with configurable modules per college.

### Priority 3: Smart Classroom Features
Add assignment submission, attendance tracking, gate pass, grade book systems.

### Priority 4: AWS Lightsail Deployment
Deploy frontend and backend on AWS Lightsail with Supabase DB connection.

---

## 📅 12-Week Sprint Roadmap

---

## Sprint 1-2: UI Foundation (Weeks 1-2)

### Goals
- Install complete shadcn/ui component library
- Implement TanStack Table for data grids
- Add React Hook Form + Zod validation
- Create unified ERP navigation structure

### Task Assignments

| Member | Tasks | Deliverables |
|--------|-------|--------------|
| **Radhika Salodkar** | Design ERP color palette, create Figma mockups, define component library requirements | `DESIGN_SYSTEM.md`, Figma file |
| **Gargi Gundawar** | Research top ERP UIs (Zoho, SAP, Odoo), document design patterns, create style guide | `ERP_RESEARCH.md`, Style guide |
| **Paritosh Magare** | Set up shadcn/ui CLI, implement base components (Button, Input, Select, Dialog, Card, Badge) | `src/components/ui/*.tsx` |
| **Ayush Kshirsagar** | Configure TanStack Table, implement data grid component with pagination/sorting/filtering | `src/components/ui/data-table.tsx` |
| **Mayur Aglawe** | Integrate React Hook Form + Zod, create form validation schemas for all entities | `src/lib/validations/*.ts` |
| **Yogeshwar Chaudhary** | Build analytics chart components with Recharts for dashboard widgets | `src/components/charts/*.tsx` |

### Technical Requirements
```bash
# New dependencies to install
npm install @tanstack/react-table react-hook-form @hookform/resolvers zod recharts
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input select dialog card badge table tabs accordion dropdown-menu toast
```

---

## Sprint 3-4: Dashboard Redesign (Weeks 3-4)

### Goals
- Refactor all role dashboards into modular widget-based layouts
- Replace styling with professional ERP color palette
- Add dark mode refinement
- Implement global search and keyboard shortcuts

### Task Assignments

| Member | Tasks | Deliverables |
|--------|-------|--------------|
| **Radhika Salodkar** | Redesign admin dashboard layout, create widget-based modular grid system | `src/app/admin/dashboard/page.tsx` refactored |
| **Gargi Gundawar** | Redesign student dashboard, implement card-based timetable view with hover details | `src/app/student/dashboard/page.tsx` refactored |
| **Paritosh Magare** | Refactor sidebar navigation (unified component), add breadcrumb system | `src/components/Sidebar.tsx`, `src/components/Breadcrumb.tsx` |
| **Ayush Kshirsagar** | Implement global search functionality, add keyboard shortcut navigation (Cmd+K) | `src/components/GlobalSearch.tsx` |
| **Mayur Aglawe** | Redesign faculty dashboard, add quick action floating buttons | `src/app/faculty/dashboard/page.tsx` refactored |
| **Yogeshwar Chaudhary** | Build analytics widgets (attendance %, assignment stats, grade distribution charts) | `src/components/widgets/*.tsx` |

### Component Breakdown (Target: Split 3000-line files into <300 lines each)
```
src/app/admin/dashboard/
├── page.tsx (main layout - 200 lines)
├── components/
│   ├── StatsCards.tsx
│   ├── RecentActivity.tsx
│   ├── QuickActions.tsx
│   ├── DepartmentOverview.tsx
│   └── PendingApprovals.tsx
└── widgets/
    ├── FacultyWorkload.tsx
    ├── ClassroomUtilization.tsx
    └── UpcomingEvents.tsx
```

---

## Sprint 5-6: Database Generalization (Weeks 5-6)

### Goals
- Add new tables for assignments, attendance, gate passes, grades
- Create migration scripts for multi-stream support
- Add configurable constraint system per college
- Update RLS policies

### New Database Schema

```sql
-- Assignments Table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id),
    batch_id UUID REFERENCES batches(id),
    faculty_id UUID REFERENCES users(id),
    due_date TIMESTAMPTZ NOT NULL,
    max_marks INTEGER DEFAULT 100,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment Submissions
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id),
    student_id UUID REFERENCES users(id),
    submission_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    marks_obtained INTEGER,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES users(id),
    plagiarism_score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'pending' -- pending, submitted, graded, late
);

-- Attendance Records
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_class_id UUID REFERENCES scheduled_classes(id),
    student_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL, -- present, absent, late, excused
    marked_by UUID REFERENCES users(id),
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    qr_verified BOOLEAN DEFAULT FALSE,
    remarks TEXT
);

-- Gate Pass / Leave Management
CREATE TABLE gate_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id),
    pass_type VARCHAR(20) NOT NULL, -- gate_pass, leave, medical
    from_datetime TIMESTAMPTZ NOT NULL,
    to_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    parent_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grade Book
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id),
    subject_id UUID REFERENCES subjects(id),
    semester INTEGER NOT NULL,
    academic_year VARCHAR(20),
    internal_marks DECIMAL(5,2),
    external_marks DECIMAL(5,2),
    total_marks DECIMAL(5,2),
    grade VARCHAR(5),
    grade_points DECIMAL(3,2),
    credits INTEGER,
    result VARCHAR(20) -- pass, fail, absent
);

-- Academic Calendar
CREATE TABLE academic_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id),
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50), -- holiday, exam, event, deadline
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    is_working_day BOOLEAN DEFAULT TRUE
);

-- College Configuration (for generalization)
CREATE TABLE college_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id),
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    UNIQUE(college_id, config_key)
);
```

### Task Assignments

| Member | Tasks | Deliverables |
|--------|-------|--------------|
| **Paritosh Magare** | Design new schema for assignments, attendance, gate_pass, grades tables | `database/smart_classroom_schema.sql` |
| **Ayush Kshirsagar** | Create migration scripts, update RLS policies, add indexes for performance | `database/migrations/*.sql` |
| **Mayur Aglawe** | Update backend APIs for new tables, add Zod validation middleware | `src/app/api/assignments/`, `src/app/api/attendance/` |
| **Gargi Gundawar** | Research multi-stream requirements (B.Sc, B.Com), document configurable fields | `MULTI_STREAM_CONFIG.md` |
| **Radhika Salodkar** | Create UI forms for new module administration (assignments, attendance config) | `src/app/admin/assignments/`, `src/app/admin/attendance/` |
| **Yogeshwar Chaudhary** | Design grade analytics schema, add computed columns for GPA/CGPA calculation | `database/grade_analytics.sql` |

---

## Sprint 7-9: Smart Classroom Features (Weeks 7-9)

### Goals
- Build assignment submission module with file upload
- Implement attendance tracking (manual + QR-based)
- Create gate pass/leave management system
- Integrate grade book with analytics

### Week 7: Assignment Module

| Member | Tasks |
|--------|-------|
| **Mayur Aglawe** | Build assignment CRUD APIs, file upload with Supabase Storage, deadline enforcement |
| **Paritosh Magare** | Build submission APIs, plagiarism indicator integration hooks |
| **Ayush Kshirsagar** | Configure Supabase Storage buckets, set up file type/size validation |
| **Radhika Salodkar** | Create assignment creation form (faculty), submission UI (student) |
| **Gargi Gundawar** | Create assignment list views, deadline countdown display, status badges |
| **Yogeshwar Chaudhary** | Build assignment analytics (submission rate, grade distribution per assignment) |

### Week 8: Attendance Module

| Member | Tasks |
|--------|-------|
| **Paritosh Magare** | Build attendance marking APIs, bulk attendance update endpoint |
| **Ayush Kshirsagar** | Implement QR code generation/scanning logic with unique session tokens |
| **Mayur Aglawe** | Build attendance report APIs, monthly/semester summary endpoints |
| **Radhika Salodkar** | Create faculty attendance marking UI (class list with checkboxes) |
| **Gargi Gundawar** | Create student attendance view (calendar view, percentage display) |
| **Yogeshwar Chaudhary** | Build attendance prediction model (identify at-risk students) |

### Week 9: Gate Pass & Grade Book

| Member | Tasks |
|--------|-------|
| **Ayush Kshirsagar** | Build gate pass APIs, approval workflow, parent notification triggers |
| **Paritosh Magare** | Build grade book APIs, GPA/CGPA calculation, transcript generation |
| **Mayur Aglawe** | Integrate all modules, ensure cross-module data consistency |
| **Radhika Salodkar** | Create gate pass request form, approval dashboard for admins |
| **Gargi Gundawar** | Create grade book view for students, semester-wise breakdown |
| **Yogeshwar Chaudhary** | Build grade forecasting model, performance trend analysis |

---

## Sprint 10-11: AWS Lightsail Deployment (Weeks 10-11)

### Goals
- Configure AWS Lightsail instances
- Set up Docker containerization
- Create CI/CD pipeline with GitHub Actions
- Configure production environment

### AWS Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lightsail                            │
│  ┌─────────────────┐      ┌─────────────────┐              │
│  │  Instance 1     │      │  Instance 2     │              │
│  │  Next.js App    │◄────►│  Python ML      │              │
│  │  (Frontend +    │      │  Services       │              │
│  │   API Routes)   │      │  (Optional)     │              │
│  │  Docker         │      │  Docker         │              │
│  └────────┬────────┘      └─────────────────┘              │
│           │                                                 │
│           │ HTTPS (SSL/TLS)                                │
│           │                                                 │
│  ┌────────▼────────┐                                       │
│  │  Lightsail      │                                       │
│  │  Load Balancer  │                                       │
│  │  (Optional)     │                                       │
│  └────────┬────────┘                                       │
└───────────┼─────────────────────────────────────────────────┘
            │
            │ Internet
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  PostgreSQL     │  │  Storage        │                  │
│  │  Database       │  │  (Files)        │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Task Assignments

| Member | Tasks | Deliverables |
|--------|-------|--------------|
| **Ayush Kshirsagar** | Configure AWS Lightsail instances, set up domains, SSL certificates | AWS setup docs |
| **Paritosh Magare** | Create Dockerfiles for Next.js and Python services, docker-compose.yml | `Dockerfile`, `docker-compose.yml` |
| **Mayur Aglawe** | Set up GitHub Actions CI/CD pipeline, automated testing on PR | `.github/workflows/deploy.yml` |
| **Gargi Gundawar** | Configure environment secrets, set up Supabase production connection | `.env.production` template |
| **Radhika Salodkar** | Performance optimization, lazy loading, bundle size reduction (target: <500KB) | Lighthouse audit report |
| **Yogeshwar Chaudhary** | Implement rate limiting (express-rate-limit), add Winston structured logging | `src/lib/logger.ts` |

### Dockerfile (Next.js)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS Lightsail

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Lightsail
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          # SSH into Lightsail and pull latest
          ssh -o StrictHostKeyChecking=no ${{ secrets.LIGHTSAIL_USER }}@${{ secrets.LIGHTSAIL_HOST }} << 'EOF'
            cd /home/ubuntu/academic-compass
            git pull origin main
            docker-compose down
            docker-compose up -d --build
          EOF
```

---

## Sprint 12: Testing & Documentation (Week 12)

### Goals
- Write unit tests for all modules
- Create comprehensive API documentation
- Finalize deployment guides
- Load testing and optimization

### Task Assignments

| Member | Tasks | Deliverables |
|--------|-------|--------------|
| **Paritosh Magare** | Create database documentation, ER diagrams with draw.io | `docs/DATABASE.md`, ER diagram images |
| **Ayush Kshirsagar** | Write deployment runbook, AWS architecture diagram, troubleshooting guide | `docs/DEPLOYMENT.md` |
| **Mayur Aglawe** | Create OpenAPI/Swagger documentation for all APIs using next-swagger-doc | `src/app/api/docs/` |
| **Radhika Salodkar** | Create user guide with screenshots for each role (Admin, Faculty, Student) | `docs/USER_GUIDE.md` |
| **Gargi Gundawar** | Create admin configuration guide for colleges (how to customize per college) | `docs/ADMIN_CONFIG.md` |
| **Yogeshwar Chaudhary** | Document AI/ML pipeline, algorithm configuration guide, model training docs | `docs/AI_ALGORITHMS.md` |

### Testing Strategy

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react

# Test file structure
__tests__/
├── components/
│   ├── ui/
│   │   ├── Button.test.tsx
│   │   ├── DataTable.test.tsx
│   │   └── Dialog.test.tsx
│   └── widgets/
│       └── StatsCard.test.tsx
├── api/
│   ├── assignments.test.ts
│   ├── attendance.test.ts
│   └── gate-passes.test.ts
└── utils/
    ├── validators.test.ts
    └── formatters.test.ts
```

---

## 💰 Pricing Model Considerations

### Option 1: SaaS (Per-Student)
- ₹50-100/student/month
- Includes hosting, updates, support
- Multi-tenancy database design required

### Option 2: One-Time License
- ₹2-5 lakhs per college (based on size)
- Self-hosted by college
- Annual maintenance contract (20% of license)

### Option 3: Freemium
- Free tier: Up to 500 students, basic features
- Pro tier: Unlimited students, all features, priority support
- Enterprise: Custom features, dedicated support, on-premise option

**Recommended**: Start with **One-Time License** for initial sales, then build SaaS infrastructure for recurring revenue.

---

## 📋 Weekly Standup Template

```markdown
## Week X Standup - [Date]

### Progress Update (Each Member)

**Paritosh Magare**
- ✅ Completed:
- 🔄 In Progress:
- ❌ Blockers:

**Ayush Kshirsagar**
- ✅ Completed:
- 🔄 In Progress:
- ❌ Blockers:

**Mayur Aglawe**
- ✅ Completed:
- 🔄 In Progress:
- ❌ Blockers:

**Gargi Gundawar**
- ✅ Completed:
- 🔄 In Progress:
- ❌ Blockers:

**Radhika Salodkar**
- ✅ Completed:
- 🔄 In Progress:
- ❌ Blockers:

**Yogeshwar Chaudhary**
- ✅ Completed:
- 🔄 In Progress:
- ❌ Blockers:

### Sprint Health
- 🟢 On Track / 🟡 At Risk / 🔴 Delayed
```

---

## 🔧 Technical Decisions Required

### 1. Authentication System
- **Current**: Base64 JWT (insecure)
- **Options**: NextAuth.js (self-hosted) vs Clerk (managed) vs Supabase Auth
- **Recommendation**: **NextAuth.js** for full control

### 2. State Management
- **Current**: React Context only
- **Options**: Zustand vs Redux Toolkit vs Jotai
- **Recommendation**: **Zustand** for simplicity

### 3. File Storage
- **Current**: None
- **Options**: Supabase Storage vs AWS S3 vs Cloudinary
- **Recommendation**: **Supabase Storage** for unified architecture

### 4. Email Service
- **Current**: Nodemailer + Gmail SMTP
- **Options**: Resend vs SendGrid vs Amazon SES
- **Recommendation**: **Resend** for better deliverability (switch later)

### 5. Analytics/Monitoring
- **Options**: Vercel Analytics vs Plausible vs PostHog
- **Recommendation**: **PostHog** for product analytics + session replay

---

## ✅ Definition of Done

A feature is considered DONE when:
1. ✅ Code is written and follows project conventions
2. ✅ TypeScript has no errors
3. ✅ Component is responsive (mobile + desktop)
4. ✅ Dark mode works correctly
5. ✅ API has Zod validation
6. ✅ Unit tests pass (if applicable)
7. ✅ Code reviewed by at least 1 team member
8. ✅ Documentation updated

---

## 📞 Escalation Matrix

| Issue Type | First Contact | Escalation |
|------------|---------------|------------|
| UI/UX Issues | Radhika Salodkar | Gargi Gundawar |
| Backend/API Issues | Mayur Aglawe | Paritosh Magare |
| Database Issues | Paritosh Magare | Ayush Kshirsagar |
| Deployment Issues | Ayush Kshirsagar | Paritosh Magare |
| AI/ML Issues | Yogeshwar Chaudhary | Mayur Aglawe |

---

## 🏁 Success Metrics

| Metric | Target |
|--------|--------|
| Page Load Time | < 2 seconds |
| Lighthouse Score | > 90 (all categories) |
| API Response Time | < 200ms (p95) |
| Test Coverage | > 70% |
| Bundle Size | < 500KB (gzipped) |
| Uptime | 99.9% |
| User Satisfaction | > 4.5/5 rating |
