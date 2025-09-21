-- Create users table if it doesn't exist (or use auth.users)
-- This schema assumes you are using Supabase's built-in auth.

-- Drop tables if they exist to ensure a clean slate
DROP TABLE IF EXISTS public.marks CASCADE;
DROP TABLE IF EXISTS public.homework CASCADE;
DROP TABLE IF EXISTS public.leaves CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.gallery CASCADE;


-- Create a function to get the count of students
CREATE OR REPLACE FUNCTION get_student_count()
RETURNS integer AS $$
DECLARE
  student_count integer;
BEGIN
  SELECT count(*) INTO student_count FROM public.students;
  RETURN student_count;
END;
$$ LANGUAGE plpgsql;

-- Create settings table
CREATE TABLE public.settings (
    id TEXT PRIMARY KEY,
    "schoolName" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create teachers table
CREATE TABLE public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
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
    bank_account JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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


-- Create exams table
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create marks table
CREATE TABLE public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    marks INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    grade TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_auth_uid, exam_id, subject)
);

-- Create homework table
CREATE TABLE public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    teacher_name TEXT,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leaves table
CREATE TABLE public.leaves (
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
    applied_at TIMESTAMPTZ NOT NULL,
    rejection_reason TEXT,
    approver_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    target TEXT NOT NULL,
    target_audience JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_name TEXT,
    creator_role TEXT,
    attachment_url TEXT,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gallery table
CREATE TABLE public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    caption TEXT,
    uploaded_by TEXT NOT NULL,
    uploader_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- RLS POLICIES FOR DATA TABLES
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Grant all permissions to service_role (for admin functions)
CREATE POLICY "Allow service_role full access on settings" ON public.settings FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on teachers" ON public.teachers FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on students" ON public.students FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on exams" ON public.exams FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on marks" ON public.marks FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on homework" ON public.homework FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on leaves" ON public.leaves FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on announcements" ON public.announcements FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on feedback" ON public.feedback FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access on gallery" ON public.gallery FOR ALL TO service_role USING (true);

-- Grant read-only access to authenticated users for most tables
CREATE POLICY "Allow authenticated read on settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on gallery" ON public.gallery FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on announcements" ON public.announcements FOR SELECT TO authenticated USING (true);

-- Specific policies for interaction
CREATE POLICY "Allow users to see their own marks" ON public.marks FOR SELECT TO authenticated USING (auth.uid() = student_auth_uid);
CREATE POLICY "Allow teachers to manage marks" ON public.marks FOR ALL TO authenticated USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IS NOT NULL
) WITH CHECK (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IS NOT NULL
);

CREATE POLICY "Allow users to manage their own leaves" ON public.leaves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow teachers/principal to manage leaves" ON public.leaves FOR ALL TO authenticated USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IS NOT NULL OR
    (SELECT id FROM auth.users WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'principal' OR raw_user_meta_data->>'role' = 'owner')) IS NOT NULL
);

CREATE POLICY "Allow users to submit feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow teachers/principal to manage homework" ON public.homework FOR ALL TO authenticated USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IS NOT NULL
);
CREATE POLICY "Allow teachers/principal to manage announcements" ON public.announcements FOR ALL TO authenticated USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IS NOT NULL OR
    (SELECT id FROM auth.users WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'principal' OR raw_user_meta_data->>'role' = 'owner')) IS NOT NULL
);
CREATE POLICY "Allow authenticated users to upload to gallery" ON public.gallery FOR INSERT TO authenticated WITH CHECK (true);


-- SUPABASE STORAGE BUCKETS AND POLICIES

-- Create Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('teachers', 'teachers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('students', 'students', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('homework', 'homework', true) ON CONFLICT (id) DO NOTHING;


-- Policies for 'teachers' bucket
CREATE POLICY "Allow authenticated users to view teacher photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'teachers');
CREATE POLICY "Allow principal/owner to upload teacher photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'teachers' AND
    (SELECT id FROM auth.users WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'principal' OR raw_user_meta_data->>'role' = 'owner')) IS NOT NULL
);

-- Policies for 'students' bucket
CREATE POLICY "Allow authenticated users to view student photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'students');
CREATE POLICY "Allow principal/owner to upload student photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'students' AND
    (SELECT id FROM auth.users WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'principal' OR raw_user_meta_data->>'role' = 'owner')) IS NOT NULL
);

-- Policies for 'gallery' bucket
CREATE POLICY "Allow public read access to gallery" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Allow authenticated users to upload to gallery" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery');
CREATE POLICY "Allow users to delete their own gallery photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND owner = auth.uid());

-- Policies for 'documents' bucket
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow users to view their own documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND owner = auth.uid());

-- Policies for 'homework' bucket
CREATE POLICY "Allow public read access to homework files" ON storage.objects FOR SELECT USING (bucket_id = 'homework');
CREATE POLICY "Allow teachers to upload homework" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'homework' AND
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IS NOT NULL
);
CREATE POLICY "Allow teachers to delete their own homework files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'homework' AND owner = auth.uid());


-- Default settings data
INSERT INTO public.settings (id, "schoolName", "logoUrl", "primaryColor", "accentColor")
VALUES ('school_settings', 'Hilton Convent School', 'https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png', 'hsl(217, 91%, 60%)', 'hsl(258, 90%, 66%)')
ON CONFLICT (id) DO NOTHING;

-- Initial exam data
INSERT INTO public.exams (name, date, max_marks)
VALUES 
('Mid-Term Exam 2024', '2024-09-15T10:00:00Z', 100),
('Final Exam 2024', '2025-03-10T10:00:00Z', 100)
ON CONFLICT (name) DO NOTHING;
