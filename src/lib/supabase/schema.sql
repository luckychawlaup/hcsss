-- #############################################################################
-- #
-- # This file contains the complete SQL schema for the application.
-- # You should run this script in your Supabase SQL Editor to set up all
-- # the necessary tables, policies, and storage buckets.
-- #
-- #############################################################################

-- ----------------------------------------
-- 1. Tables
-- ----------------------------------------

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
    student_phone TEXT,
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
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('classTeacher', 'subjectTeacher')),
    subject TEXT NOT NULL,
    qualifications TEXT[],
    class_teacher_of TEXT,
    classes_taught TEXT[],
    joining_date BIGINT NOT NULL,
    bank_account JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_auth_uid, exam_id, subject)
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    target TEXT NOT NULL CHECK (target IN ('students', 'teachers', 'both')),
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
    assigned_by UUID NOT NULL,
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- This can refer to a student's or teacher's ID
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('Student', 'Teacher')),
    class TEXT,
    teacher_id UUID, -- Specific reference for teacher leaves
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Rejected')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    rejection_reason TEXT,
    approver_comment TEXT
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Complaint', 'Suggestion', 'Feedback')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery Table
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    caption TEXT,
    uploaded_by TEXT NOT NULL,
    uploader_id UUID NOT NULL,
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
    status TEXT NOT NULL DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    school_name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- 2. Helper Functions for RLS
-- ----------------------------------------

-- Get student count for generating SRN
CREATE OR REPLACE FUNCTION get_student_count()
RETURNS integer AS $$
DECLARE
    count integer;
BEGIN
    SELECT COUNT(*) INTO count FROM public.students;
    RETURN count;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------
-- 3. Row Level Security (RLS)
-- ----------------------------------------

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

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow all access to settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all access to exams" ON public.exams;
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;
DROP POLICY IF EXISTS "Allow all access to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow all access to announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow all access to marks" ON public.marks;
DROP POLICY IF EXISTS "Allow all access to homework" ON public.homework;
DROP POLICY IF EXISTS "Allow all access to leaves" ON public.leaves;
DROP POLICY IF EXISTS "Allow all access to feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow all access to gallery" ON public.gallery;
DROP POLICY IF EXISTS "Allow all access to salary_slips" ON public.salary_slips;

-- Create permissive policies for all tables
-- In a production environment, you would restrict these policies.
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to marks" ON public.marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to homework" ON public.homework FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to leaves" ON public.leaves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to feedback" ON public.feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gallery" ON public.gallery FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to salary_slips" ON public.salary_slips FOR ALL USING (true) WITH CHECK (true);


-- ----------------------------------------
-- 4. Storage Buckets & Policies
-- ----------------------------------------

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('students', 'students', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('teachers', 'teachers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('homework', 'homework', true) ON CONFLICT (id) DO NOTHING;


-- Drop existing storage policies before creating new ones
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to gallery" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to students" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to teachers" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to homework" ON storage.objects;


-- Storage READ policy: Allow public read access to all files in all buckets
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (true);

-- Storage WRITE policies: Allow authenticated users to upload to specific buckets
CREATE POLICY "Allow authenticated uploads to gallery" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated uploads to students" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'students' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated uploads to teachers" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'teachers' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated uploads to documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated uploads to homework" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'homework' AND auth.role() = 'authenticated');


-- ----------------------------------------
-- 5. Default Data
-- ----------------------------------------

-- Insert default settings if they don't exist
INSERT INTO public.settings (id, school_name, logo_url, primary_color, accent_color)
VALUES (
    'school_settings',
    'Hilton Convent School',
    'https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png',
    'hsl(217, 91%, 60%)',
    'hsl(258, 90%, 66%)'
) ON CONFLICT (id) DO NOTHING;

-- Pre-populate exams if the table is empty
-- This is illustrative; the application code also attempts this.
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM public.exams) THEN
      INSERT INTO public.exams (name, date, max_marks) VALUES
      ('Mid-Term Exam 2024', '2024-09-15T10:00:00Z', 100),
      ('Final Exam 2024', '2025-03-10T10:00:00Z', 100);
   END IF;
END $$;
