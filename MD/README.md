# Academic Compass - Smart Timetable Scheduler 🎓

<div align="center">

![Academic Compass](https://img.shields.io/badge/SIH%202025-Grand%20Finale-orange?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11-yellow?style=for-the-badge&logo=python)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)

### Smart India Hackathon 2025 - Grand Finale Submission

**Problem Statement**: SIH 1726 - Intelligent Timetable Scheduling System for Educational Institutions

**Team PyGram** 🏆

</div>

---

## 👥 Team Members

| Name | Role |
|------|------|
| **Paritosh Magare** | Team Lead |
| **Mayur Aglawe** | Core Developer |
| **Ayush Kshirsagar** | Core Developer |
| **Yogeshvar Chaudhari** | Core Developer |
| **Radhika Salodkar** | Developer |
| **Gargi Gundawar** | Developer |

### 👩‍🏫 Mentors
- **Prof. Yogita Nikhare**
- **Prof. Kavita Meshram**

---

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Installation Guide](#installation-guide)
- [Usage Guide](#usage-guide)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## 🎯 About the Project

**Academic Compass** is an intelligent, AI-powered timetable scheduling system designed to revolutionize how educational institutions manage their academic schedules. Built for SIH 2025, our solution addresses the complex challenge of creating conflict-free, optimized timetables for multi-college environments.

### 🌟 Problem Statement

Educational institutions face significant challenges in:
- Creating conflict-free timetables manually
- Managing multiple departments, courses, and batches
- Accommodating faculty preferences and availability
- Implementing NEP 2020 curriculum guidelines
- Handling resource allocation (classrooms, labs)
- Adapting to last-minute changes and constraints

### 💡 Our Solution

Academic Compass uses a hybrid AI approach combining:
- **CP-SAT Solver** for hard constraint satisfaction
- **Genetic Algorithm** for optimization
- **Reinforcement Learning** for continuous improvement
- **NEP 2020 Compliance** with MAJOR/MINOR subject locking
- **Multi-College Support** with department-based isolation
- **Real-time Conflict Detection** and resolution

---

## ✨ Key Features

### 🤖 AI-Powered Scheduling
- **Hybrid Algorithm**: CP-SAT + Genetic Algorithm + Reinforcement Learning
- **Constraint Handling**: Hard and soft constraint satisfaction
- **Smart Optimization**: Fitness scoring with multiple parameters
- **Conflict Resolution**: Automatic detection and resolution

### 📚 NEP 2020 Compliance
- **Bucket-Based System**: Create elective buckets for flexible curriculum
- **MAJOR Subject Locking**: Once selected in Semester 3, locked permanently
- **MINOR Flexibility**: Students can change MINOR subjects anytime
- **Domain Progression**: Automatic mapping of subject continuations

### 👥 Multi-Role Support
- **Super Admin**: Multi-college management
- **College Admin**: College-wide operations
- **Admin/HOD**: Department management
- **Creator Faculty**: Timetable generation and NEP bucket creation
- **Publisher Faculty**: Timetable approval and publishing
- **Students**: View timetables, select subjects, track schedules

### 📊 Advanced Features
- **Department Isolation**: Each department sees only their data
- **Event Management**: Schedule workshops, seminars with conflict detection
- **Notification System**: Email alerts for timetable changes
- **Workflow Approval**: Multi-step approval process
- **Audit Logging**: Complete activity tracking
- **Export Options**: PDF, Excel, CSV formats

### 📱 Modern UI/UX
- **Responsive Design**: Works on all devices
- **Dark Mode**: Eye-friendly interface
- **Real-time Updates**: Live data synchronization
- **Interactive Dashboards**: Role-based personalized views

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.4 (App Router)
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI, Lucide Icons
- **State Management**: React Hooks, Context API

### Backend
- **API**: Next.js API Routes (Serverless)
- **Language**: TypeScript + Python 3.11
- **Authentication**: JWT with Base64 encoding
- **Email**: Nodemailer with Gmail SMTP

### Database
- **Primary Database**: Supabase (PostgreSQL)
- **ORM**: Supabase Client
- **Caching**: Row Level Security (RLS)
- **Migrations**: SQL Scripts

### AI/ML Components
- **CP-SAT Solver**: Google OR-Tools
- **Genetic Algorithm**: DEAP (Python)
- **Reinforcement Learning**: Stable Baselines3
- **Integration**: Python subprocess calls

### DevOps
- **Version Control**: Git, GitHub
- **Package Manager**: npm, pip
- **Build Tool**: Turbopack (Next.js)
- **Deployment**: Vercel (Frontend), Supabase (Backend)

---

## 📦 Installation Guide

### Prerequisites

Ensure you have the following installed:
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Python** >= 3.11
- **Git**
- **Supabase Account** (for database)

### Step 1: Clone the Repository

```bash
git clone https://github.com/08Ayush/academic_campass_2025.git
cd academic_campass_2025
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Set Up Python Environment

#### Windows (PowerShell)

```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt
```

#### Linux/macOS (Bash)

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 4: Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Step 5: Database Setup

#### Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Navigate to **SQL Editor**
4. Run the migration script:

```sql
-- Main Schema with sample data
\i database/new_schema.sql

-- MAJOR Subject Lock Constraints
\i database/major_subject_lock_constraint.sql
```

### Step 6: Run the Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

---

## 🚀 Usage Guide

### Default Login Credentials

After running the database migrations, you can use these accounts:

#### SVPCET College
- **Admin**: `admin@svpcet.edu.in` / `admin123`
- **Faculty (Creator)**: `faculty@svpcet.edu.in` / `faculty123`
- **Student**: `student@svpcet.edu.in` / `student123`

#### GCOEJ College
- **Admin**: `rajesh@gcoej.edu.in` / `admin123`
- **Faculty**: `priya@gcoej.edu.in` / `faculty123`
- **Student**: `aarav@gcoej.edu.in` / `student123`

> **Note**: Change these passwords immediately in production!

### For Admins

1. **Login** → Navigate to Admin Dashboard
2. **Create Departments** → Add departments for your college
3. **Add Faculty** → Create faculty accounts with roles (Creator/Publisher)
4. **Create Batches** → Set up batches for each semester
5. **Add Subjects** → Create subjects with NEP categories
6. **Set Up Classrooms** → Add available rooms and labs

### For Creator Faculty

1. **Subject Management** → Add/edit subjects for your department
2. **NEP Bucket Builder** → Create elective buckets for NEP 2020
   - Select Course, Department, Semester
   - Create bucket (e.g., "SEM 3 Major")
   - Add subjects to bucket
3. **Faculty Qualifications** → Link faculty to subjects they can teach
4. **Generate Timetable**:
   - Go to AI Timetable Generator
   - Select batch and constraints
   - Click "Generate"
   - Review and publish

### For Publisher Faculty

1. **View Generated Timetables** → Review creator-generated schedules
2. **Approve/Reject** → Workflow approval
3. **Publish Timetables** → Make visible to students
4. **Manage Notifications** → Send updates to students

### For Students

1. **View Dashboard** → See your course and batch info
2. **Select Subjects** → (Semester 3+)
   - Click "NEP 2020 Bucket Builder"
   - Choose MAJOR (locked after selection)
   - Choose MINOR (changeable anytime)
3. **View Timetable** → Check your weekly schedule
4. **Export Schedule** → Download PDF/Excel

---

## 🗄️ Database Schema

### Core Tables

- **colleges**: Multi-college support
- **departments**: Department management
- **users**: All user accounts (multi-role)
- **courses**: B.Tech, B.Ed, ITEP, etc.
- **batches**: Student batches with semester info
- **subjects**: Courses with NEP categories

### NEP 2020 Tables

- **elective_buckets**: Subject grouping (Major/Minor pools)
- **student_course_selections**: Student subject choices with lock tracking
- **batch_subjects**: Batch-subject mappings

### Timetable Tables

- **generated_timetables**: Generated schedules
- **scheduled_classes**: Individual class slots
- **time_slots**: Time period definitions
- **faculty_qualified_subjects**: Faculty-subject mappings
- **constraint_rules**: Hard/soft constraints

---

## 🔌 API Documentation

### Authentication

All API routes require authentication via Bearer token:

```typescript
Authorization: Bearer <base64_encoded_user_json>
```

### Key Endpoints

#### Student APIs

```typescript
GET  /api/student/dashboard?userId={id}&role=student
GET  /api/student/selections?studentId={id}&semester={sem}
POST /api/student/selections
DELETE /api/student/selections
GET  /api/student/available-subjects?studentId={id}&semester={sem}
```

#### Faculty APIs

```typescript
GET  /api/faculty?department_id={id}
POST /api/faculty/qualifications
GET  /api/admin/subjects?department_id={id}
POST /api/admin/subjects
```

#### Timetable APIs

```typescript
POST /api/timetable/generate
GET  /api/timetables?department_id={id}
POST /api/timetables/publish
```

---

## 📁 Project Structure

```
academic_campass_2025/
├── .github/                    # GitHub configuration
├── database/                   # SQL migrations and schema
│   ├── new_schema.sql         # Main database schema
│   └── major_subject_lock_constraint.sql
├── logs/                       # AI training logs
├── models/                     # Trained ML models
├── public/                     # Static assets
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # API routes
│   │   │   ├── admin/        # Admin endpoints
│   │   │   ├── faculty/      # Faculty endpoints
│   │   │   └── student/      # Student endpoints
│   │   ├── admin/            # Admin pages
│   │   ├── faculty/          # Faculty pages
│   ├── student/              # Student pages
│   ├── login/                # Login page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout component
│   └── page.tsx              # Landing page
├── components/               # Reusable React components
│   ├── Header.tsx           # Navigation header with auth
│   └── ...
├── contexts/                # React Context providers
│   └── ThemeContext.tsx     # Dark mode theme provider
└── lib/                     # Utility libraries
    └── supabase.ts          # Supabase client & types

database/                    # 🗄️ SQL Scripts & Schema
├── schema.sql              # Original database schema
├── new_schema.sql          # Enhanced schema
├── fix-*.sql               # Database fix scripts
├── insert-*.sql            # Data insertion scripts
├── verify-*.sql            # Verification scripts
├── README.md               # Database documentation
└── README-SQL-SCRIPTS.md   # SQL scripts guide

scripts/                    # 🔧 Utility JavaScript Scripts
├── check-*.js             # Verification scripts
├── debug-*.js             # Debugging tools
├── fix-*.js               # Database fix scripts
├── setup-*.js             # Setup & initialization
├── test-*.js              # Testing scripts
└── README.md              # Scripts documentation

refrance/                  # Reference implementations
public/                    # Static assets
```

## 🔌 API Endpoints

### Students API (`/api/students`)
- `GET /api/students` - Retrieve students with optional filtering
- `POST /api/students` - Create a new student profile

### Recommendations API (`/api/recommendations`)
- `POST /api/recommendations` - Generate personalized course and career recommendations

## 🎨 Design Features

- **Gradient Backgrounds**: Beautiful blue-to-purple gradients throughout
- **Glassmorphism Effects**: Modern backdrop blur effects
- **Smooth Animations**: Hover effects and transitions
- **Responsive Grid Layouts**: Adaptive layouts for all screen sizes
- **Professional Typography**: Clean, readable font choices
- **Interactive Components**: Engaging user interface elements

## 🚀 Deployment

### Build the project:

```bash
npm run build
```

### Start the production server:

```bash
npm start
```

The project is optimized for deployment on Vercel, Netlify, or any other modern hosting platform.

## � Organized Folders

### 🗄️ `database/` - SQL Scripts & Schema
All SQL files for database management are organized here:
- Schema definitions (`schema.sql`, `new_schema.sql`)
- Setup scripts (`setup-*.sql`)
- Fix scripts (`fix-*.sql`)
- Data insertion (`insert-*.sql`)
- Verification scripts (`verify-*.sql`)

📖 **See**: `database/README-SQL-SCRIPTS.md` for detailed documentation

### 🔧 `scripts/` - Utility Scripts
All JavaScript utility scripts are organized here:
- Authentication scripts (`check-admin-role.js`, `create-admin.js`)
- Debugging tools (`debug-*.js`)
- Database management (`fix-*.js`, `deploy-schema.js`)
- Testing utilities (`test-*.js`)
- Setup scripts (`setup-*.js`)

📖 **See**: `scripts/README.md` for detailed documentation

### 🎨 `refrance/` - Reference Files
Reference implementations and examples from previous versions.

## 🗄️ Database Setup

1. **Create Supabase Project**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Run Schema**: Execute `database/new_schema.sql` in SQL Editor
3. **Setup Permissions**: Run `database/complete_schema_with_permissions.sql`
4. **Insert Data**: Run `database/insert_full_cse_curriculum.sql`
5. **Configure Environment**: Add Supabase credentials to `.env.local`

For detailed instructions, see `database/README.md`

## 🔧 Utility Scripts

Run scripts from the project root:

```bash
# Check admin role
node scripts/check-admin-role.js

# Show system summary
node scripts/show-system-summary.js

# Fix admin access
node scripts/fix-admin-access-level.js
```

**Note**: Scripts require Supabase credentials in `.env.local`

## �📝 Customization

The landing page is fully customizable:

1. **Branding**: Update colors, fonts, and logo in the components
2. **Content**: Modify text content in each component
3. **API**: Extend the API routes for additional functionality
4. **Styling**: Customize Tailwind CSS classes or add custom CSS

## 🔧 Development

- **Hot Reloading**: Turbopack provides instant updates during development
- **Type Safety**: Full TypeScript support with strict type checking
- **Code Quality**: ESLint configuration for consistent code style
- **Modern Features**: Latest React and Next.js features

## 📄 License

This project is created for educational and demonstration purposes.
