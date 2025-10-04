-- =================================================================
-- HILTON CONVENT SCHOOL - COMPLETE DATABASE RESET & SETUP SCRIPT
-- =================================================================
-- This script will DROP all existing tables and recreate them fresh
-- New Admin/Owner UID: 431e9a2b-64f9-46ac-9a00-479a91435527
-- =================================================================

-- -----------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING TABLES (in reverse dependency order)
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS public.salary_slips CASCADE;
DROP TABLE IF EXISTS public.school_info CASCADE;
DROP TABLE IF EXISTS public.leaves CASCADE;
DROP TABLE IF EXISTS public.homework CASCADE;
DROP TABLE IF EXISTS public.school_holidays CASCADE;
DROP TABLE IF EXISTS public.fees CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.marks CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.admin_roles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_student_count() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- -----------------------------------------------------------------
-- STEP 2: CREATE FUNCTIONS
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_student_count()
RETURNS integer AS $$
DECLARE
  student_count integer;
BEGIN
  SELECT COUNT(*) INTO student_count FROM public.students;
  RETURN student_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------
-- STEP 3: CREATE ALL TABLES WITH NEW OWNER ID
-- -----------------------------------------------------------------

-- Table: admin_roles
CREATE TABLE public.admin_roles (
    uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'principal', 'accountant')),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    address TEXT,
    dob TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    photo_url TEXT
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow owner to manage admin roles"
ON public.admin_roles FOR ALL
USING (auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid);

-- Table: teachers
CREATE TABLE public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    dob TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    phone_number TEXT,
    address TEXT,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'classTeacher')),
    subject TEXT,
    qualifications TEXT[],
    class_teacher_of TEXT,
    classes_taught TEXT[],
    joining_date TEXT NOT NULL,
    bank_account JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow principal/owner to manage teachers"
ON public.teachers FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE POLICY "Allow teachers to view and update their own profiles"
ON public.teachers FOR ALL
USING (auth_uid = auth.uid())
WITH CHECK (auth_uid = auth.uid());

CREATE TRIGGER update_teachers_updated_at 
    BEFORE UPDATE ON public.teachers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Table: students
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    srn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    address TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    admission_date TIMESTAMPTZ NOT NULL,
    date_of_birth TEXT NOT NULL,
    aadhar_number TEXT,
    aadhar_url TEXT,
    opted_subjects TEXT[],
    father_phone TEXT,
    mother_phone TEXT,
    student_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin and teachers to manage students"
ON public.students FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
    OR
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_uid = auth.uid())
);

CREATE POLICY "Allow students to view their own profile"
ON public.students FOR SELECT
USING (auth.uid() = auth_uid);

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON public.students 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Table: exams
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    class_section TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read exams"
ON public.exams FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins and class teachers to manage exams"
ON public.exams FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
    OR
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher'
);

-- Table: marks
CREATE TABLE public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    marks INTEGER NOT NULL DEFAULT 0,
    max_marks INTEGER NOT NULL DEFAULT 100,
    grade TEXT,
    exam_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT marks_unique_student_exam_subject UNIQUE (student_id, exam_id, subject)
);

ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow class teachers & principal to manage marks"
ON public.marks FOR ALL
USING (
    (
        SELECT class_teacher_of 
        FROM public.teachers 
        WHERE auth_uid = auth.uid()
    ) = (
        SELECT class || '-' || section 
        FROM public.students 
        WHERE id = public.marks.student_id
    )
    OR
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE POLICY "Allow students to view their own marks"
ON public.marks FOR SELECT
USING (
    student_id = (SELECT id FROM public.students WHERE auth_uid = auth.uid())
);

CREATE TRIGGER update_marks_updated_at 
    BEFORE UPDATE ON public.marks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Table: attendance
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_section TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half-day', 'holiday')),
    marked_by UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendance_unique_student_date UNIQUE (student_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow teachers to manage attendance"
ON public.attendance FOR ALL
USING (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher' 
    AND
    (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = class_section
)
WITH CHECK (
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher' 
    AND
    (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = class_section 
    AND
    marked_by = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid())
);

CREATE POLICY "Allow students to view their own attendance"
ON public.attendance FOR SELECT
USING (auth.uid() = (SELECT auth_uid FROM public.students WHERE id = student_id));

CREATE POLICY "Allow principal/owner/accountant to view all attendance"
ON public.attendance FOR SELECT
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'accountant', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON public.attendance 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX idx_attendance_class_date ON public.attendance(class_section, date);

-- Table: announcements
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    target TEXT NOT NULL CHECK (target IN ('students', 'teachers', 'both')),
    target_audience JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    created_by UUID,
    creator_name TEXT,
    creator_role TEXT,
    attachment_url TEXT
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to manage all announcements"
ON public.announcements FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE POLICY "Allow teachers to manage announcements for their classes"
ON public.announcements FOR ALL
USING (
    created_by = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid())
    AND
    (
        target = 'teachers' 
        OR 
        (target_audience->>'type' = 'class' AND target_audience->>'value' IN (
            SELECT unnest(classes_taught) FROM public.teachers WHERE auth_uid = auth.uid()
        ))
        OR
        (target_audience->>'type' = 'class' AND target_audience->>'value' = (
            SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()
        ))
    )
);

CREATE POLICY "Allow authenticated users to read relevant announcements"
ON public.announcements FOR SELECT
USING (
    (target = 'both' AND target_audience IS NULL)
    OR
    (target = 'students' AND target_audience IS NULL AND EXISTS (
        SELECT 1 FROM public.students WHERE auth_uid = auth.uid()
    ))
    OR
    (target = 'teachers' AND target_audience IS NULL AND EXISTS (
        SELECT 1 FROM public.teachers WHERE auth_uid = auth.uid()
    ))
    OR
    (
        SELECT class || '-' || section FROM public.students WHERE auth_uid = auth.uid()
    ) = (target_audience->>'value')
    OR
    (
        SELECT id::text FROM public.students WHERE auth_uid = auth.uid()
    ) = (target_audience->>'value')
);

CREATE INDEX idx_announcements_target ON public.announcements(target);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);

-- Table: feedback
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    class TEXT, 
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolving', 'Solved', 'Incomplete Details')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to submit feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Allow users to read their own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow admins and teachers to manage feedback"
ON public.feedback FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_uid = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.admin_roles WHERE uid = auth.uid())
);

CREATE TRIGGER update_feedback_updated_at 
    BEFORE UPDATE ON public.feedback 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Table: fees
CREATE TABLE public.fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    amount INTEGER NOT NULL DEFAULT 5000,
    paid_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fees_unique_student_month UNIQUE (student_id, month)
);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow accountants to manage fees"
ON public.fees FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) = 'accountant'
);

CREATE POLICY "Allow principal/owner to manage fees"
ON public.fees FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE POLICY "Allow students to view their own fees"
ON public.fees FOR SELECT
USING (auth.uid() = (SELECT auth_uid FROM public.students WHERE id = student_id));

CREATE TRIGGER update_fees_updated_at 
    BEFORE UPDATE ON public.fees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_fees_student_month ON public.fees(student_id, month);

-- Table: school_holidays
CREATE TABLE public.school_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    class_section TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT holiday_unique_per_scope UNIQUE(date, class_section)
);

ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to manage holidays"
ON public.school_holidays FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE POLICY "Allow class teachers to manage their class holidays"
ON public.school_holidays FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.teachers t
        WHERE t.auth_uid = auth.uid()
          AND t.role = 'classTeacher'
          AND t.class_teacher_of = public.school_holidays.class_section
    )
);

CREATE POLICY "Allow authenticated users to read holidays"
ON public.school_holidays FOR SELECT
USING (auth.role() = 'authenticated');

CREATE INDEX idx_holidays_date ON public.school_holidays(date);

-- Table: homework
CREATE TABLE public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attachment_url TEXT
);

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow teachers to manage homework for their classes"
ON public.homework FOR ALL
USING (
    class_section IN (
        SELECT unnest(classes_taught) FROM public.teachers WHERE auth_uid = auth.uid()
    )
    OR
    class_section = (
        SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()
    )
)
WITH CHECK (
    assigned_by = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid())
);

CREATE POLICY "Allow students to view homework for their class"
ON public.homework FOR SELECT
USING (
    class_section = (
        SELECT class || '-' || section FROM public.students WHERE auth_uid = auth.uid()
    )
);

CREATE POLICY "Allow admins to access all homework"
ON public.homework FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE INDEX idx_homework_class_section ON public.homework(class_section);
CREATE INDEX idx_homework_assigned_by ON public.homework(assigned_by);
CREATE INDEX idx_homework_due_date ON public.homework(due_date);

-- Table: leaves
CREATE TABLE public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    class TEXT,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rejection_reason TEXT,
    approver_comment TEXT,
    document_url TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ
);

ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert their own leave"
ON public.leaves FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to view their own leave requests"
ON public.leaves FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow teachers/admins to manage all leave requests"
ON public.leaves FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_uid = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.admin_roles WHERE uid = auth.uid())
);

CREATE INDEX idx_leaves_user_id ON public.leaves(user_id);
CREATE INDEX idx_leaves_status ON public.leaves(status);

-- Table: school_info
CREATE TABLE public.school_info (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    affiliation_no TEXT NOT NULL,
    school_code TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow principal to manage school info"
ON public.school_info FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE POLICY "Allow authenticated users to read school info"
ON public.school_info FOR SELECT
USING (auth.role() = 'authenticated');

CREATE TRIGGER update_school_info_updated_at 
    BEFORE UPDATE ON public.school_info 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Table: salary_slips
CREATE TABLE public.salary_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL,
    earnings JSONB,
    deductions JSONB,
    net_salary NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'issued', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    issued_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    CONSTRAINT salary_slip_unique_teacher_month UNIQUE (teacher_id, month)
);

ALTER TABLE public.salary_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow principal/owner to manage salary slips"
ON public.salary_slips FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527'::uuid
);

CREATE POLICY "Allow teachers to view their own salary slips"
ON public.salary_slips FOR SELECT
USING (teacher_id = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid()));

CREATE INDEX idx_salary_slips_teacher_month ON public.salary_slips(teacher_id, month);

-- -----------------------------------------------------------------
-- STEP 4: INSERT DEFAULT DATA
-- -----------------------------------------------------------------
INSERT INTO public.school_info (id, name, email, phone, address, affiliation_no, school_code)
VALUES (
    'main',
    'Hilton Convent School',
    'hiltonconventschool@gmail.com',
    '+91-9548322595',
    'Joya Road, Amroha, 244221, Uttar Pradesh (west)',
    '2131151',
    '81259'
);