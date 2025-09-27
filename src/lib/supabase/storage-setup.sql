
-- 1. Create a new bucket named 'leave_documents' if it doesn't exist.
-- Make it public so that URLs can be easily generated. Access will be controlled by policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave_documents', 'leave_documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies on the 'leave_documents' bucket to ensure a clean slate.
-- Replace 'Allow authenticated user uploads' with your actual policy name if it's different.
DROP POLICY IF EXISTS "Allow authenticated user uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to their own folder" ON storage.objects;


-- 3. Create a new policy to allow authenticated users to UPLOAD files into a 'public' folder.
-- We are scoping uploads to a '/public' folder within the bucket for this policy.
CREATE POLICY "Allow authenticated user uploads"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'leave_documents' AND
    auth.role() = 'authenticated' AND
    storage.foldername(name)[1] = 'public'
);

-- 4. Create a policy to allow authenticated users to SELECT/READ their own files.
-- This policy checks if the user's ID is part of the file path.
CREATE POLICY "Give users access to their own folder"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'leave_documents' AND
    auth.uid()::text = (storage.foldername(name))[2]
);
