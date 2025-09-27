-- Create a new bucket for leave documents with public access.
-- Replace 'leave_documents' with your desired bucket name if needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave_documents', 'leave_documents', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS) for the new bucket.
-- These policies allow authenticated users to upload and manage their own files.

-- 1. Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies for the 'leave_documents' bucket to ensure a clean slate.
DROP POLICY IF EXISTS "Allow authenticated uploads to leave_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own files" ON storage.objects;

-- 3. Create a policy to allow authenticated users to upload files to the 'leave_documents' bucket.
CREATE POLICY "Allow authenticated uploads to leave_documents"
FOR INSERT ON storage.objects
FOR ALL
WITH CHECK (
  bucket_id = 'leave_documents' AND auth.role() = 'authenticated'
);

-- 4. Create a policy that allows users to view their own uploaded files in the bucket.
CREATE POLICY "Allow authenticated users to view their own files"
FOR SELECT ON storage.objects
USING (
  bucket_id = 'leave_documents' AND auth.uid() = owner
);

-- 5. Create a policy that allows users to delete their own files.
CREATE POLICY "Allow authenticated users to delete their own files"
FOR DELETE ON storage.objects
USING (
  bucket_id = 'leave_documents' AND auth.uid() = owner
);
