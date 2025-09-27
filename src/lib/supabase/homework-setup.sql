-- 1. Create the 'homework' table
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID NOT NULL,
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attachment_url TEXT
);

-- 2. Create the 'homework' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('homework', 'homework', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Row-Level Security (RLS) for the 'homework' table
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent errors
DROP POLICY IF EXISTS "Allow teachers to manage their own homework" ON public.homework;
DROP POLICY IF EXISTS "Allow students to view homework for their class" ON public.homework;

-- Teachers can insert, update, and delete homework they assigned
CREATE POLICY "Allow teachers to manage their own homework"
ON public.homework FOR ALL
USING (auth.uid() = (SELECT auth_uid FROM public.teachers WHERE id = assigned_by))
WITH CHECK (auth.uid() = (SELECT auth_uid FROM public.teachers WHERE id = assigned_by));

-- Students can view homework assigned to their class section
CREATE POLICY "Allow students to view homework for their class"
ON public.homework FOR SELECT
USING (class_section = (SELECT class || '-' || section FROM public.students WHERE auth_uid = auth.uid()));


-- 4. Set up Storage policies for the 'homework' bucket
-- Drop existing policies to prevent errors
DROP POLICY IF EXISTS "Allow teachers to upload homework attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view homework attachments" ON storage.objects;

-- Teachers can upload files to the 'files' folder within the 'homework' bucket
CREATE POLICY "Allow teachers to upload homework attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'homework'
    AND (storage.foldername(name))[1] = 'files'
    AND auth.uid() IN (SELECT auth_uid FROM public.teachers)
);

-- Any authenticated user can view/download attachments
CREATE POLICY "Allow authenticated users to view homework attachments"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'homework' );
