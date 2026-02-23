-- ============================================================
--  Academic Timetable System – Full Schema
-- ============================================================

-- 1. Enum for user roles
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('admin', 'faculty', 'student');

-- 2. Enum for faculty roles
DROP TYPE IF EXISTS public.faculty_role CASCADE;
CREATE TYPE public.faculty_role AS ENUM ('normal', 'creator', 'publisher');

-- 3. Departments
DROP TABLE IF EXISTS public.departments CASCADE;
CREATE TABLE public.departments (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(100) UNIQUE NOT NULL,
    code         VARCHAR(10)  UNIQUE NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- 4. Faculty
DROP TABLE IF EXISTS public.faculty CASCADE;
CREATE TABLE public.faculty (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) UNIQUE NOT NULL,
    department_id  UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    faculty_role   public.faculty_role NOT NULL DEFAULT 'normal',
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- 5. Students
DROP TABLE IF EXISTS public.students CASCADE;
CREATE TABLE public.students (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) UNIQUE NOT NULL,
    department_id  UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    batch_year     INT NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- 6. Subjects
DROP TABLE IF EXISTS public.subjects CASCADE;
CREATE TABLE public.subjects (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(100) NOT NULL,
    code           VARCHAR(20)  NOT NULL,
    department_id  UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    credits        INT  NOT NULL,
    UNIQUE (department_id, code)
);

-- 7. Classrooms
DROP TABLE IF EXISTS public.classrooms CASCADE;
CREATE TABLE public.classrooms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    capacity    INT NOT NULL,
    location    VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 8. Timetable Slots
DROP TABLE IF EXISTS public.timetable_slots CASCADE;
CREATE TABLE public.timetable_slots (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time  TIME     NOT NULL,
    end_time    TIME     NOT NULL,
    UNIQUE (day_of_week, start_time, end_time)
);

-- 9. Enum for timetable status
DROP TYPE IF EXISTS public.timetable_status CASCADE;
CREATE TYPE public.timetable_status AS ENUM ('draft', 'pending_approval', 'published', 'rejected');

-- 10. Timetables
DROP TABLE IF EXISTS public.timetables CASCADE;
CREATE TABLE public.timetables (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id      UUID REFERENCES public.subjects(id)   ON DELETE CASCADE,
    faculty_id      UUID REFERENCES public.faculty(id)    ON DELETE CASCADE,
    classroom_id    UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    slot_id         UUID REFERENCES public.timetable_slots(id) ON DELETE CASCADE,
    department_id   UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    batch_year      INT NOT NULL,
    status          public.timetable_status NOT NULL DEFAULT 'draft',
    created_by      UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    published_by    UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (subject_id, faculty_id, classroom_id, slot_id, department_id, batch_year, status)
);

-- 11. Timetable Approval Requests
DROP TABLE IF EXISTS public.timetable_approvals CASCADE;
CREATE TABLE public.timetable_approvals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timetable_id    UUID REFERENCES public.timetables(id) ON DELETE CASCADE,
    requested_by    UUID REFERENCES public.faculty(id) ON DELETE CASCADE,
    reviewed_by     UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    status          public.timetable_status NOT NULL DEFAULT 'pending_approval',
    comments        TEXT,
    requested_at    TIMESTAMPTZ DEFAULT now(),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 12. Users table (with enum)
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email      VARCHAR(150) UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       public.user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional indexes for performance
CREATE INDEX IF NOT EXISTS idx_faculty_department     ON public.faculty(department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_role          ON public.faculty(faculty_role);
CREATE INDEX IF NOT EXISTS idx_students_department   ON public.students(department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department   ON public.subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_timetables_slot       ON public.timetables(slot_id);
CREATE INDEX IF NOT EXISTS idx_timetables_status     ON public.timetables(status);
CREATE INDEX IF NOT EXISTS idx_timetables_department ON public.timetables(department_id);
CREATE INDEX IF NOT EXISTS idx_timetables_created_by ON public.timetables(created_by);
CREATE INDEX IF NOT EXISTS idx_approvals_timetable   ON public.timetable_approvals(timetable_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status      ON public.timetable_approvals(status);
