
-- 1. Create the homework table
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);

-- 2. Enable RLS on the homework table
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow teachers to manage their own homework" ON public.homework;
DROP POLICY IF EXISTS "Allow students to view homework for their class" ON public.homework;

-- 4. Create policies for the homework table
-- Teachers can insert/update/delete homework they assigned
CREATE POLICY "Allow teachers to manage their own homework"
ON public.homework FOR ALL
USING (auth.uid() = (SELECT auth_uid FROM public.teachers WHERE id = assigned_by))
WITH CHECK (auth.uid() = (SELECT auth_uid FROM public.teachers WHERE id = assigned_by));

-- Students can view homework assigned to their class
CREATE POLICY "Allow students to view homework for their class"
ON public.homework FOR SELECT
USING (
    class_section = (SELECT class || '-' || section FROM public.students WHERE auth_uid = auth.uid())
);


-- 5. Create the 'homework' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('homework', 'homework', FALSE, 5242880, '{"application/pdf"}')
ON CONFLICT (id) DO NOTHING;

-- 6. Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Allow teachers to upload homework attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view attachments" ON storage.objects;

-- 7. Create policies for the homework storage bucket
-- Teachers can upload files to the 'files' folder in the 'homework' bucket
CREATE POLICY "Allow teachers to upload homework attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'homework'
    AND (storage.foldername(name))[1] = 'files'
    AND auth.role = 'authenticated'
    AND auth.uid() IN (SELECT auth_uid FROM public.teachers)
);

-- Any authenticated user can view attachments (students need this)
CREATE POLICY "Allow authenticated users to view attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'homework'
    AND auth.role = 'authenticated'
);
