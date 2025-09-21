-- Create users table (if you want to add custom user data not in auth.users)
-- This app uses user metadata, so this table is not strictly required.

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE REFERENCES auth.users(id),
    srn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    address TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    admission_date BIGINT NOT NULL, -- Using bigint for timestamp
    date_of_birth DATE NOT NULL,
    aadhar_number TEXT,
    aadhar_url TEXT,
    opted_subjects TEXT[],
    father_phone TEXT,
    mother_phone TEXT,
    student_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS for students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;
CREATE POLICY "Allow all access to students" ON public.students FOR ALL USING (true) WITH CHECK (true);

-- Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE REFERENCES auth.users(id),
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
    joining_date BIGINT NOT NULL, -- Using bigint for timestamp
    bank_account JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS for teachers
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to teachers" ON public.teachers;
CREATE POLICY "Allow all access to teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);


-- Create exams table
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    max_marks INTEGER NOT NULL DEFAULT 100
);
-- RLS for exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to exams" ON public.exams;
CREATE POLICY "Allow all access to exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);


-- Create marks table
CREATE TABLE IF NOT EXISTS public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_auth_uid UUID NOT NULL REFERENCES auth.users(id),
    exam_id UUID NOT NULL REFERENCES public.exams(id),
    subject TEXT NOT NULL,
    marks INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    grade TEXT NOT NULL,
    UNIQUE (student_auth_uid, exam_id, subject)
);
-- RLS for marks
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to marks" ON public.marks;
CREATE POLICY "Allow all access to marks" ON public.marks FOR ALL USING (true) WITH CHECK (true);

-- Create leaves table
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- This can be student ID or teacher ID
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    class TEXT, -- For students
    teacher_id UUID, -- For teachers
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    rejection_reason TEXT,
    approver_comment TEXT
);
-- RLS for leaves
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to leaves" ON public.leaves;
CREATE POLICY "Allow all access to leaves" ON public.leaves FOR ALL USING (true) WITH CHECK (true);

-- Create homework table
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID NOT NULL REFERENCES public.teachers(id),
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);
-- RLS for homework
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to homework" ON public.homework;
CREATE POLICY "Allow all access to homework" ON public.homework FOR ALL USING (true) WITH CHECK (true);


-- Create announcements table
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
-- RLS for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to announcements" ON public.announcements;
CREATE POLICY "Allow all access to announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

-- Create salary_slips table
CREATE TABLE IF NOT EXISTS public.salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id),
    month TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL,
    earnings JSONB,
    deductions JSONB,
    net_salary NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS for salary_slips
ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to salary slips" ON public.salary_slips;
CREATE POLICY "Allow all access to salary slips" ON public.salary_slips FOR ALL USING (true) WITH CHECK (true);


-- Create gallery table
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    caption TEXT,
    uploaded_by TEXT,
    uploader_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS for gallery
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to gallery" ON public.gallery;
CREATE POLICY "Allow all access to gallery" ON public.gallery FOR ALL USING (true) WITH CHECK (true);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS for feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to feedback" ON public.feedback;
CREATE POLICY "Allow all access to feedback" ON public.feedback FOR ALL USING (true) WITH CHECK (true);


-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    "schoolName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT
);
-- RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to settings" ON public.settings;
CREATE POLICY "Allow all access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

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

-- Insert default settings if not present
INSERT INTO public.settings (id, "schoolName", "logoUrl", "primaryColor", "accentColor")
VALUES ('school_settings', 'Hilton Convent School', 'https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png', 'hsl(217, 91%, 60%)', 'hsl(258, 90%, 66%)')
ON CONFLICT (id) DO NOTHING;

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for buckets
DROP POLICY IF EXISTS "Allow public read access to photos" ON storage.objects;
CREATE POLICY "Allow public read access to photos" ON storage.objects FOR SELECT USING ( bucket_id = 'photos' );

DROP POLICY IF EXISTS "Allow all access to photos for authenticated users" ON storage.objects;
CREATE POLICY "Allow all access to photos for authenticated users" ON storage.objects FOR ALL USING ( bucket_id = 'photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Allow public read access to documents" ON storage.objects;
CREATE POLICY "Allow public read access to documents" ON storage.objects FOR SELECT USING ( bucket_id = 'documents' );

DROP POLICY IF EXISTS "Allow all access to documents for authenticated users" ON storage.objects;
CREATE POLICY "Allow all access to documents for authenticated users" ON storage.objects FOR ALL USING ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
