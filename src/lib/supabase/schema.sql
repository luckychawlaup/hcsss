-- =================================================================================
-- Schema for School Management System
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. Functions
-- ---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_student_count()
RETURNS integer AS $$
DECLARE
    count integer;
BEGIN
    SELECT count(*) INTO count FROM public.students;
    RETURN count;
END;
$$ LANGUAGE plpgsql;


-- =================================================================================
-- 2. Tables
-- =================================================================================

-- School Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    school_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT,
    accent_color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    dob DATE NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    phone_number TEXT,
    address TEXT,
    role TEXT CHECK (role IN ('classTeacher', 'subjectTeacher')),
    subject TEXT,
    qualifications TEXT[],
    class_teacher_of TEXT,
    classes_taught TEXT[],
    joining_date BIGINT NOT NULL,
    bank_account JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE NOT NULL,
    srn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    address TEXT,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    admission_date BIGINT NOT NULL,
    date_of_birth DATE NOT NULL,
    aadhar_number TEXT,
    aadhar_url TEXT,
    opted_subjects TEXT[],
    father_phone TEXT,
    mother_phone TEXT,
    student_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    content TEXT NOT NULL,
    category TEXT,
    target TEXT NOT NULL CHECK (target IN ('students', 'teachers', 'both')),
    target_audience JSONB,
    created_by UUID,
    creator_name TEXT,
    creator_role TEXT,
    attachment_url TEXT,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework Table
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID NOT NULL,
    teacher_name TEXT,
    class_section TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    due_date DATE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    userName TEXT,
    userRole TEXT,
    class TEXT,
    teacherId UUID,
    startDate TIMESTAMPTZ NOT NULL,
    endDate TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Rejected')),
    appliedAt TIMESTAMPTZ DEFAULT NOW(),
    rejectionReason TEXT,
    approverComment TEXT
);

-- Marks Table
CREATE TABLE IF NOT EXISTS public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_auth_uid UUID NOT NULL,
    exam_id UUID NOT NULL,
    subject TEXT NOT NULL,
    marks INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    grade TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_auth_uid, exam_id, subject)
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT,
    user_role TEXT,
    category TEXT,
    subject TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery Table
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    caption TEXT,
    uploaded_by TEXT,
    uploader_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Slips Table
CREATE TABLE IF NOT EXISTS public.salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    month TEXT,
    basic_salary NUMERIC,
    earnings JSONB,
    deductions JSONB,
    net_salary NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =================================================================================
-- 3. Foreign Key Constraints
-- =================================================================================
-- Note: Run these separately if tables are already created.
-- Dropping constraints if they exist
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS fk_marks_student_auth;
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS fk_marks_exam;

-- Adding constraints
ALTER TABLE public.marks
ADD CONSTRAINT fk_marks_student_auth FOREIGN KEY (student_auth_uid) REFERENCES public.students(auth_uid) ON DELETE CASCADE;

ALTER TABLE public.marks
ADD CONSTRAINT fk_marks_exam FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


-- =================================================================================
-- 4. Row Level Security (RLS) Policies
-- =================================================================================

-- Enable RLS for all tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all access" ON public.settings;
DROP POLICY IF EXISTS "Allow all access" ON public.exams;
DROP POLICY IF EXISTS "Allow all access" ON public.teachers;
DROP POLICY IF EXISTS "Allow all access" ON public.students;
DROP POLICY IF EXISTS "Allow all access" ON public.announcements;
DROP POLICY IF EXISTS "Allow all access" ON public.homework;
DROP POLICY IF EXISTS "Allow all access" ON public.leaves;
DROP POLICY IF EXISTS "Allow all access" ON public.marks;
DROP POLICY IF EXISTS "Allow all access" ON public.feedback;
DROP POLICY IF EXISTS "Allow all access" ON public.gallery;
DROP POLICY IF EXISTS "Allow all access" ON public.salary_slips;

-- Create permissive policies (ALLOW ALL)
CREATE POLICY "Allow all access" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.homework FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.leaves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.gallery FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.salary_slips FOR ALL USING (true) WITH CHECK (true);


-- =================================================================================
-- 5. Storage Buckets and Policies
-- =================================================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('teachers', 'teachers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('students', 'students', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('homework', 'homework', true) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies (use simpler syntax)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Create policies for public read access on all buckets
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (true);

-- Create policy for authenticated users to upload to any bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);


-- =================================================================================
-- 6. Default Data
-- =================================================================================

-- Insert default school settings if they don't exist
INSERT INTO public.settings (id, school_name, logo_url, primary_color, accent_color) 
VALUES ('school_settings', 'Hilton Convent School', 'https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png', 'hsl(217, 91%, 60%)', 'hsl(258, 90%, 66%)')
ON CONFLICT (id) DO NOTHING;

-- Insert initial exams (only if no exams exist)
INSERT INTO public.exams (name, date, max_marks) 
SELECT 'Mid-Term Exam 2024', '2024-09-15T10:00:00Z', 100
WHERE NOT EXISTS (SELECT 1 FROM public.exams LIMIT 1);

INSERT INTO public.exams (name, date, max_marks) 
SELECT 'Final Exam 2024', '2025-03-10T10:00:00Z', 100
WHERE NOT EXISTS (SELECT 1 FROM public.exams WHERE name = 'Final Exam 2024');
