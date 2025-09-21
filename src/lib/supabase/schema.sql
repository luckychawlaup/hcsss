
-- =================================================================================
-- Schema for School Management System (Final Version)
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. Teardown (Drop existing objects to ensure a clean slate)
-- ---------------------------------------------------------------------------------

-- Drop policies
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

-- Drop storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own files" ON storage.objects;

-- Drop tables
DROP TABLE IF EXISTS public.salary_slips;
DROP TABLE IF EXISTS public.gallery;
DROP TABLE IF EXISTS public.feedback;
DROP TABLE IF EXISTS public.marks;
DROP TABLE IF EXISTS public.leaves;
DROP TABLE IF EXISTS public.homework;
DROP TABLE IF EXISTS public.announcements;
DROP TABLE IF EXISTS public.students;
DROP TABLE IF EXISTS public.teachers;
DROP TABLE IF EXISTS public.exams;
DROP TABLE IF EXISTS public.settings;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_student_count();


-- ---------------------------------------------------------------------------------
-- 2. Functions
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


-- ---------------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------------

CREATE TABLE public.settings (
    id TEXT PRIMARY KEY,
    school_name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT,
    accent_color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    dob TEXT NOT NULL,
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

CREATE TABLE public.students (
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
    admission_date TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    aadhar_number TEXT,
    aadhar_url TEXT,
    opted_subjects TEXT[],
    father_phone TEXT,
    mother_phone TEXT,
    student_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.announcements (
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

CREATE TABLE public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID NOT NULL,
    teacher_name TEXT,
    class_section TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    due_date TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);

CREATE TABLE public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT,
    user_role TEXT,
    class TEXT,
    teacher_id UUID,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Rejected')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    rejection_reason TEXT,
    approver_comment TEXT
);

CREATE TABLE public.marks (
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

CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT,
    user_role TEXT,
    category TEXT,
    subject TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    caption TEXT,
    uploaded_by TEXT,
    uploader_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.salary_slips (
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

-- ---------------------------------------------------------------------------------
-- 4. Foreign Key Constraints
-- ---------------------------------------------------------------------------------

ALTER TABLE public.students ADD CONSTRAINT fk_students_auth_users FOREIGN KEY (auth_uid) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.teachers ADD CONSTRAINT fk_teachers_auth_users FOREIGN KEY (auth_uid) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.marks ADD CONSTRAINT fk_marks_student_auth FOREIGN KEY (student_auth_uid) REFERENCES public.students(auth_uid) ON DELETE CASCADE;
ALTER TABLE public.marks ADD CONSTRAINT fk_marks_exam FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


-- ---------------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- ---------------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------------
-- 6. Storage Buckets and Policies
-- ---------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('teachers', 'teachers', true),
    ('students', 'students', true),
    ('gallery', 'gallery', true),
    ('documents', 'documents', true),
    ('homework', 'homework', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('teachers', 'students', 'gallery', 'documents', 'homework'));

CREATE POLICY "Allow public read access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id IN ('teachers', 'students', 'gallery', 'documents', 'homework'));

CREATE POLICY "Allow authenticated users to update their own files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = owner)
WITH CHECK (auth.uid() = owner);

CREATE POLICY "Allow authenticated users to delete their own files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (auth.uid() = owner);


-- ---------------------------------------------------------------------------------
-- 7. Default Data
-- ---------------------------------------------------------------------------------

INSERT INTO public.settings (id, school_name, logo_url, primary_color, accent_color) 
VALUES ('school_settings', 'Hilton Convent School', 'https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png', 'hsl(217, 91%, 60%)', 'hsl(258, 90%, 66%)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.exams (name, date, max_marks) 
SELECT 'Mid-Term Exam 2024', '2024-09-15T10:00:00Z', 100
WHERE NOT EXISTS (SELECT 1 FROM public.exams WHERE name = 'Mid-Term Exam 2024');

INSERT INTO public.exams (name, date, max_marks) 
SELECT 'Final Exam 2024', '2025-03-10T10:00:00Z', 100
WHERE NOT EXISTS (SELECT 1 FROM public.exams WHERE name = 'Final Exam 2024');
