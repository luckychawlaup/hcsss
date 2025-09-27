-- 1. Create the storage bucket named "leave_documents" and make it public.
-- The "public" option here means that files can be accessed without a signed URL.
-- RLS policies below will still control who can upload and list files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave_documents', 'leave_documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to ensure a clean slate.
DROP POLICY IF EXISTS "Allow authenticated users to upload to public folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read their own folder" ON storage.objects;

-- 3. Create policy to allow any authenticated user to upload to the 'public' folder within the bucket.
-- This is a common pattern for public-but-restricted uploads.
CREATE POLICY "Allow authenticated users to upload to public folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'leave_documents' AND
    (storage.foldername(name))[1] = 'public'
);

-- 4. Create policy to allow users to view/read any file in the 'public' folder.
-- This is necessary so that principals/teachers can view the uploaded documents.
CREATE POLICY "Allow anyone to read files in the public folder"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'leave_documents' AND
    (storage.foldername(name))[1] = 'public'
);
