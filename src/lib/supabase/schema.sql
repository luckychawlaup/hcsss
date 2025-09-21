--
-- This file contains the complete SQL schema for the application.
-- It is intended to be run in the Supabase SQL Editor to set up your database.
--

-- ----------------------------------------------------------------
-- 1. Create Tables
-- ----------------------------------------------------------------

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID NOT NULL UNIQUE,
    srn TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    photo_url TEXT,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    address TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    admission_date BIGINT NOT NULL,
    date_of_birth DATE NOT NULL,
    aadhar_number TEXT,
    aadhar_url TEXT,
    opted_subjects TEXT[],
    father_phone TEXT,
    mother_phone TEXT,
    student_phone TEXT
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    photo_url TEXT,
    dob DATE NOT NULL,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    role TEXT NOT NULL,
    subject TEXT NOT NULL,
    qualifications TEXT[],
    class_teacher_of TEXT,
    classes_taught TEXT[],
    joining_date BIGINT NOT NULL,
    bank_account JSONB
);

-- Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marks Table
CREATE TABLE IF NOT EXISTS public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_auth_uid UUID NOT NULL REFERENCES public.students(auth_uid) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    marks INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    grade TEXT NOT NULL,
    UNIQUE(student_auth_uid, exam_id, subject) -- This is the crucial missing constraint
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    target TEXT NOT NULL,
    target_audience JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    created_by UUID,
    creator_name TEXT,
    creator_role TEXT,
    attachment_url TEXT
);

-- Homework Table
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);

-- Leaves Table
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    class TEXT,
    teacher_id UUID,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    rejection_reason TEXT,
    approver_comment TEXT
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT,
    user_role TEXT,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
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
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL,
    earnings JSONB,
    deductions JSONB,
    net_salary NUMERIC NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    school_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT,
    accent_color TEXT,
    updated_at TIMESTAMPTZ
);


-- ----------------------------------------------------------------
-- 2. Create RPC Functions
-- ----------------------------------------------------------------

-- Function to get student count for SRN generation
CREATE OR REPLACE FUNCTION get_student_count()
RETURNS integer AS $$
DECLARE
    count integer;
BEGIN
    SELECT COUNT(*) INTO count FROM public.students;
    RETURN count;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for public access (read-only)
DROP POLICY IF EXISTS "Allow public read access" ON public.settings;
CREATE POLICY "Allow public read access" ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on gallery" ON public.gallery;
CREATE POLICY "Allow public read access on gallery" ON public.gallery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on exams" ON public.exams;
CREATE POLICY "Allow public read access on exams" ON public.exams FOR SELECT USING (true);

-- Policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.students;
CREATE POLICY "Allow authenticated users to read their own profile" ON public.students FOR SELECT USING (auth.uid() = auth_uid);

DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.teachers;
CREATE POLICY "Allow authenticated users to read their own profile" ON public.teachers FOR SELECT USING (auth.uid() = auth_uid);

DROP POLICY IF EXISTS "Allow users to manage their own leave requests" ON public.leaves;
CREATE POLICY "Allow users to manage their own leave requests" ON public.leaves FOR ALL USING (auth.uid() = (SELECT auth_uid FROM students WHERE id = user_id) OR auth.uid() = (SELECT auth_uid FROM teachers WHERE id = user_id));

DROP POLICY IF EXISTS "Allow authenticated users to submit feedback" ON public.feedback;
CREATE POLICY "Allow authenticated users to submit feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for teachers
DROP POLICY IF EXISTS "Allow teachers to view students in their classes" ON public.students;
CREATE POLICY "Allow teachers to view students in their classes" ON public.students FOR SELECT USING (
    (SELECT role FROM teachers WHERE auth_uid = auth.uid()) = 'classTeacher' OR 
    (SELECT role FROM teachers WHERE auth_uid = auth.uid()) = 'subjectTeacher'
);

DROP POLICY IF EXISTS "Allow teachers to manage homework" ON public.homework;
CREATE POLICY "Allow teachers to manage homework" ON public.homework FOR ALL USING (auth.uid() = (SELECT auth_uid FROM teachers WHERE id = assigned_by));

-- Policies for principals/admins (service_role bypasses RLS, but this is for completeness)
DROP POLICY IF EXISTS "Allow full access for admins" ON public.students;
CREATE POLICY "Allow full access for admins" ON public.students FOR ALL USING (true); -- Simplified for this context

DROP POLICY IF EXISTS "Allow full access for admins" ON public.teachers;
CREATE POLICY "Allow full access for admins" ON public.teachers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.exams;
CREATE POLICY "Allow full access on all other tables for admins" ON public.exams FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.marks;
CREATE POLICY "Allow full access on all other tables for admins" ON public.marks FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.announcements;
CREATE POLICY "Allow full access on all other tables for admins" ON public.announcements FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.leaves;
CREATE POLICY "Allow full access on all other tables for admins" ON public.leaves FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.feedback;
CREATE POLICY "Allow full access on all other tables for admins" ON public.feedback FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.gallery;
CREATE POLICY "Allow full access on all other tables for admins" ON public.gallery FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.salary_slips;
CREATE POLICY "Allow full access on all other tables for admins" ON public.salary_slips FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow full access on all other tables for admins" ON public.settings;
CREATE POLICY "Allow full access on all other tables for admins" ON public.settings FOR ALL USING (true);


-- ----------------------------------------------------------------
-- 4. Storage Buckets & Policies
-- ----------------------------------------------------------------

-- Create Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('students', 'students', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('teachers', 'teachers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('homework', 'homework', true) ON CONFLICT (id) DO NOTHING;


-- Storage RLS Policies
-- Give public read access to all buckets
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (true);

-- Allow authenticated users to upload to any bucket
DROP POLICY IF EXISTS "Allow authenticated insert" ON storage.objects;
CREATE POLICY "Allow authenticated insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);

-- Allow users to update their own files
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
CREATE POLICY "Allow users to update their own files" ON storage.objects FOR UPDATE USING (auth.uid() = owner);

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;
CREATE POLICY "Allow users to delete their own files" ON storage.objects FOR DELETE USING (auth.uid() = owner);


-- ----------------------------------------------------------------
-- 5. Default Data
-- ----------------------------------------------------------------

-- Insert default school settings if they don't exist
INSERT INTO public.settings (id, school_name, logo_url, primary_color, accent_color) VALUES 
('school_settings', 'Hilton Convent School', 'https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png', 'hsl(217, 91%, 60%)', 'hsl(258, 90%, 66%)')
ON CONFLICT(id) DO NOTHING;
