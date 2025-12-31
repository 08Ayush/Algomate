# Academic Compass ERP - Enterprise Registration Flow

## Overview

Academic Compass is an **enterprise ERP platform** designed exclusively for educational institutions. Unlike consumer applications, individual users **cannot self-register**. This document outlines the complete registration and user onboarding flow.

---

## 🏛️ Registration Flow Diagram 

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ACADEMIC COMPASS REGISTRATION FLOW                       │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────────┐
                            │   Landing Page   │
                            │  (Public Access) │
                            └────────┬─────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │  /demo       │  │  /login      │  │  /register   │
           │ Request Demo │  │ Institution  │  │ (Redirects   │
           │    Form      │  │   Login      │  │  to info)    │
           └──────┬───────┘  └──────────────┘  └──────────────┘
                  │
                  │ Submit Demo Request
                  ▼
        ┌───────────────────┐
        │  Demo Requests DB │
        │  (status=pending) │
        └─────────┬─────────┘
                  │
                  │ Super Admin Reviews
                  ▼
        ┌───────────────────┐
        │  Schedule Demo    │
        │  Conduct Meeting  │
        └─────────┬─────────┘
                  │
                  │ If Approved
                  ▼
    ┌─────────────────────────────┐
    │  Super Admin Generates      │
    │  Registration Token         │
    │  (Unique URL sent via email)│
    └─────────────┬───────────────┘
                  │
                  │ Institution receives email with unique link
                  ▼
    ┌─────────────────────────────┐
    │  /college/register?token=   │
    │  (Private Registration)     │
    │  - College Details          │
    │  - Principal Info           │
    │  - Admin Account Setup      │
    │  - Academic Configuration   │
    └─────────────┬───────────────┘
                  │
                  │ Registration Complete
                  ▼
    ┌─────────────────────────────┐
    │  College Created in DB      │
    │  College Admin Account      │
    │  (role: college_admin)      │
    └─────────────┬───────────────┘
                  │
                  │ College Admin logs in
                  ▼
    ┌─────────────────────────────┐
    │  Admin Dashboard            │
    │  - Create Departments       │
    │  - Add Courses              │
    │  - Create User Accounts     │
    └─────────────────────────────┘
```

---

## 📋 Step-by-Step Process

### Phase 1: Demo Request (Public)

**URL:** `/demo`

1. Institution representative visits the demo request page
2. Fills out the comprehensive form:
   - **Institution Details**: Name, Type, Student Count, Website
   - **Contact Information**: Name, Email, Phone, Location
   - **Requirements**: Current System, Challenges, Preferred Demo Date

3. Form submission triggers:
   - Database record creation (`demo_requests` table)
   - Email notification to admin team
   - Confirmation email to the requester

### Phase 2: Demo & Approval (Internal)

**Admin Actions:**

1. Super Admin reviews demo requests in the admin panel
2. Contacts the institution to schedule a demo
3. Conducts the demo meeting
4. If approved, generates a registration token

**Generate Token:**
```bash
# API Call (by Super Admin)
POST /api/college/validate-token
{
  "demoRequestId": "uuid-of-request",
  "email": "admin@college.edu",
  "institutionName": "XYZ College",
  "expiresInDays": 7
}

# Response
{
  "token": "abc123...xyz",
  "registrationUrl": "https://app.academiccompass.com/college/register?token=abc123...xyz",
  "expiresAt": "2025-01-05T00:00:00Z"
}
```

### Phase 3: College Registration (Private)

**URL:** `/college/register?token=<unique-token>`

**Step 1: Institution Information**
- College Name & Code
- Address (City, State, PIN)
- Website, Established Year
- Affiliated University, Accreditation

**Step 2: Leadership Details**
- Principal/Head Name
- Principal Email & Phone

**Step 3: System Administrator Setup**
- Admin First & Last Name
- Admin Email & Phone
- Designation
- Password Creation (Strong password requirements)

**Step 4: Academic Configuration**
- Academic Year
- Working Days Selection
- College Start/End Time
- Terms Agreement

**On Submit:**
- College record created in `colleges` table
- Admin user created with role `college_admin`
- Registration token marked as used
- Welcome email sent to admin

### Phase 4: User Management (Post-Registration)

**Who can create users?**

| Role | Can Create | For |
|------|------------|-----|
| Super Admin | College Admin | New Institutions |
| College Admin | HODs, Faculty, Students | Their College |
| HOD | Faculty in their Department | Their Department |

**User Creation Flow:**

```
College Admin → Admin Dashboard → Users Tab → Add User

Required Fields:
- First Name, Last Name
- Email (becomes login identifier)
- Role (HOD / Faculty / Student)
- Department (for non-admin roles)
- Auto-generated College UID

System generates:
- College UID: {COLLEGE_CODE}-{ROLE_PREFIX}-{TIMESTAMP}
  Example: SVPCET-FAC-ABC123, GCOEJ-STU-XYZ789
- Temporary Password (or password set by admin)

User receives:
- Email with login credentials
- Instructions to log in and change password
```

---

## 🔐 Access Control Matrix

| Page | Public | Logged Out | Student | Faculty | Admin | Super Admin |
|------|--------|------------|---------|---------|-------|-------------|
| `/` (Landing) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/demo` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/register` | ✅ | ✅ (Info only) | ❌ | ❌ | ❌ | ❌ |
| `/college/register` | 🔑 Token Required | 🔑 | ❌ | ❌ | ❌ | ❌ |
| `/student/*` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/faculty/*` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/admin/*` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/super-admin/*` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 📁 Database Schema

### New Tables

```sql
-- Demo Requests
demo_requests (
    id UUID PRIMARY KEY,
    institution_name VARCHAR(255),
    institution_type VARCHAR(100),
    student_count VARCHAR(50),
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    city, state, country,
    challenges TEXT[],
    status VARCHAR(50), -- pending, contacted, demo_scheduled, registered
    created_at TIMESTAMPTZ
)

-- Registration Tokens
registration_tokens (
    id UUID PRIMARY KEY,
    token VARCHAR(64) UNIQUE,
    demo_request_id UUID REFERENCES demo_requests,
    expires_at TIMESTAMPTZ,
    is_used BOOLEAN,
    created_at TIMESTAMPTZ
)
```

### Modified Tables

```sql
-- colleges (new columns)
ALTER TABLE colleges ADD COLUMN principal_name VARCHAR(255);
ALTER TABLE colleges ADD COLUMN principal_email VARCHAR(255);
ALTER TABLE colleges ADD COLUMN principal_phone VARCHAR(50);
ALTER TABLE colleges ADD COLUMN established_year INTEGER;
ALTER TABLE colleges ADD COLUMN affiliated_university VARCHAR(255);
ALTER TABLE colleges ADD COLUMN accreditation VARCHAR(255);
ALTER TABLE colleges ADD COLUMN pincode VARCHAR(10);
```

---

## 📧 Email Templates

### 1. Demo Request Confirmation
- **To:** Requester
- **Subject:** Demo Request Received - Academic Compass ERP
- **Content:** Confirmation of receipt, next steps, response timeline

### 2. Admin Notification
- **To:** Admin Team
- **Subject:** 🎓 New Demo Request: {Institution Name}
- **Content:** Full details of the demo request

### 3. Registration Link
- **To:** Institution Contact
- **Subject:** Your Academic Compass Registration Link
- **Content:** Unique registration URL, expiry date, instructions

### 4. Welcome Email
- **To:** College Admin
- **Subject:** Welcome to Academic Compass - {College Name}
- **Content:** Login credentials, getting started guide

---

## 🛠️ API Endpoints

### Demo Request
```
POST /api/demo-request
- Submit a new demo request

GET /api/demo-request
- List demo requests (Super Admin only)
```

### College Registration
```
GET /api/college/validate-token?token=xxx
- Validate a registration token

POST /api/college/validate-token
- Generate a new registration token (Super Admin)

POST /api/college/register
- Complete college registration
```

---

## 🚀 Implementation Files

| File | Purpose |
|------|---------|
| `src/app/demo/page.tsx` | Demo request form (3-step wizard) |
| `src/app/register/page.tsx` | Registration info page (redirects to demo) |
| `src/app/college/register/page.tsx` | Private college registration form |
| `src/app/api/demo-request/route.ts` | Demo request API |
| `src/app/api/college/validate-token/route.ts` | Token validation/generation API |
| `src/app/api/college/register/route.ts` | College registration API |
| `database/enterprise_registration_schema.sql` | Database migration (also merged into new_schema.sql) |
| **Super Admin Interface** | |
| `src/app/super-admin/demo-requests/page.tsx` | View and manage demo requests |
| `src/app/super-admin/registration-tokens/page.tsx` | Generate and manage registration tokens |
| `src/app/api/super-admin/demo-requests/route.ts` | Demo requests management API |
| `src/app/api/super-admin/registration-tokens/route.ts` | Tokens management API |

---

## 🖥️ Super Admin Interface

### Demo Requests Page (`/super-admin/demo-requests`)

Features:
- View all demo requests with status badges
- Filter by status (pending, contacted, demo_scheduled, etc.)
- Search by institution name, email, or location
- View detailed request information
- Update status and add follow-up notes
- Generate registration tokens directly from approved requests
- Quick actions: Email, Call, View Details

### Registration Tokens Page (`/super-admin/registration-tokens`)

Features:
- View all generated tokens
- Filter by status (active, used, expired)
- Generate new tokens (with or without linking to demo request)
- Copy registration URL to clipboard
- Send registration link via email
- Delete unused tokens

### Dashboard Quick Links

The Super Admin dashboard (`/super-admin/dashboard`) now includes quick navigation cards:
- **Demo Requests** - Orange card linking to demo management
- **Registration Tokens** - Indigo card linking to token management
- **Colleges** - Purple card showing college count
- **Admins** - Green card showing admin count

---

## ✅ Checklist for Super Admin

When approving a new institution:

- [ ] Go to `/super-admin/demo-requests`
- [ ] Review demo request details
- [ ] Update status to "Contacted" and add notes
- [ ] Schedule demo and update status to "Demo Scheduled"
- [ ] After demo, update status to "Demo Completed"
- [ ] If approved, click "Generate Registration Token" button
- [ ] Registration URL is automatically copied to clipboard
- [ ] Send registration link via email (built-in mailto link)
- [ ] Monitor registration completion
- [ ] Provide initial support to new college admin

---

## 🔒 Security Considerations

1. **Registration Tokens**
   - 64-character secure random tokens
   - 7-day expiry (configurable)
   - Single-use only
   - Linked to demo request for audit trail

2. **Password Requirements**
   - Minimum 8 characters
   - Must contain uppercase, lowercase, and number
   - Hashed with SHA-256 + secret salt

3. **Email Verification**
   - Registration through token = pre-verified
   - Additional email verification for user-created accounts

4. **Rate Limiting**
   - Demo request: 5 per IP per hour
   - Token validation: 10 attempts per token
   - Registration: 3 attempts per token
