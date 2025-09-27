-- 1. Create the 'leave_documents' bucket if it doesn't exist
-- This part must be done from the Supabase Dashboard if you cannot run it here.
-- Go to Storage -> Create a new bucket -> name it "leave_documents" and make it public.
-- The SQL below assumes the bucket has been created.

-- 2. Drop existing policies on the bucket to ensure a clean slate
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view their own files" ON storage.objects;

-- 3. Create policy for authenticated users to UPLOAD to the 'public' folder
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'leave_documents' AND
    (storage.foldername(name))[1] = 'public'
);

-- 4. Create policy for authenticated users to SELECT/VIEW files from the 'public' folder
CREATE POLICY "Allow authenticated users to view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'leave_documents' AND
    (storage.foldername(name))[1] = 'public'
);
