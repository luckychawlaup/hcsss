-- Create Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
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

-- Create Teachers Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT NOT NULL,
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

-- Create Homework Table
CREATE TABLE homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID REFERENCES teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    attachment_url TEXT
);

-- Create Announcements Table
CREATE TABLE announcements (
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

-- Create Leaves Table
CREATE TABLE leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    class TEXT,
    teacher_id UUID,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    rejection_reason TEXT,
    approver_comment TEXT
);

-- Create Exams Table
CREATE TABLE exams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    max_marks INT NOT NULL
);

-- Create Marks Table
CREATE TABLE marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    marks INT NOT NULL,
    max_marks INT NOT NULL,
    grade TEXT NOT NULL,
    UNIQUE (student_auth_uid, exam_id, subject)
);

-- Create Feedback Table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Gallery Table
CREATE TABLE gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    caption TEXT,
    uploaded_by TEXT,
    uploader_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Salary Slips Table
CREATE TABLE salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL,
    earnings JSONB,
    deductions JSONB,
    net_salary NUMERIC NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Settings Table
CREATE TABLE settings (
    id TEXT PRIMARY KEY,
    school_name TEXT,
    logo_url TEXT,
    primary_color TEXT,
    accent_color TEXT
);

-- RPC for student count (for SRN generation)
CREATE OR REPLACE FUNCTION get_student_count()
RETURNS integer AS $$
DECLARE
    count integer;
BEGIN
    SELECT COUNT(*) INTO count FROM students;
    RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for public access (anon role)
CREATE POLICY "Allow public read on settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow public read on exams" ON exams FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on exams" ON exams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read on gallery" ON gallery FOR SELECT USING (true);
CREATE POLICY "Allow public read on announcements" ON announcements FOR SELECT USING (true);

-- Policies for authenticated users
CREATE POLICY "Allow users to read their own student profile" ON students FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "Allow users to read their own teacher profile" ON teachers FOR SELECT USING (auth.uid() = auth_uid);
CREATE POLICY "Allow authenticated users to read all teacher profiles" ON teachers FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to submit feedback" ON feedback FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to apply for leave" ON leaves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to view their own leave requests" ON leaves FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow students to view their homework" ON homework FOR SELECT USING (
    auth.role() = 'authenticated' AND
    class_section IN (
        SELECT class || '-' || section FROM students WHERE auth_uid = auth.uid()
    )
);

CREATE POLICY "Allow students to view their marks" ON marks FOR SELECT USING (auth.uid() = student_auth_uid);

CREATE POLICY "Allow authenticated users to upload to gallery" ON gallery FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Policies for service_role (and by extension, admin users)
-- Principals and owners will generally use the service_role key from a secure server environment (or serverless function) to bypass RLS.
-- For client-side admin actions, we define specific policies.

CREATE POLICY "Allow admin full access" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON homework FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON leaves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON salary_slips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access" ON gallery FOR ALL USING (true) WITH CHECK (true);

-- Create Storage Buckets and Policies
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read on photo bucket" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Allow authenticated insert on photo bucket" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow authenticated update on own photos" ON storage.objects FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow authenticated delete on own photos" ON storage.objects FOR DELETE USING (auth.uid() = owner);

CREATE POLICY "Allow authenticated access to documents" ON storage.objects FOR ALL USING (bucket_id = 'documents' AND auth.role() = 'authenticated') WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
