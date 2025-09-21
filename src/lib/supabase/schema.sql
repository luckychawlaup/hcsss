
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Function to get student count for SRN generation
create or replace function get_student_count()
returns integer as $$
declare
  student_count integer;
begin
  select count(*) into student_count from public.students;
  return student_count;
end;
$$ language plpgsql;


-- Exams Table
create table if not exists public.exams (
  id text primary key,
  name text not null,
  date timestamp with time zone not null,
  max_marks integer not null default 100
);
-- RLS for Exams
alter table public.exams enable row level security;
create policy "Allow public read access to exams" on public.exams for select using (true);
create policy "Allow admin access to exams" on public.exams for all using (auth.jwt() ->> 'role' = 'service_role');

-- Students Table
create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  auth_uid uuid references auth.users(id) on delete cascade,
  srn text unique not null,
  name text not null,
  email text unique not null,
  photo_url text,
  father_name text not null,
  mother_name text not null,
  address text not null,
  class text not null,
  section text not null,
  admission_date bigint not null,
  date_of_birth date not null,
  aadhar_number text,
  aadhar_url text,
  opted_subjects text[],
  father_phone text,
  mother_phone text,
  student_phone text,
  created_at timestamp with time zone default now()
);
-- RLS for Students
alter table public.students enable row level security;
create policy "Allow authenticated users to read their own student record" on public.students for select using (auth.uid() = auth_uid);
create policy "Allow teachers and principal to read all student records" on public.students for select using ( (select role from public.teachers where auth_uid = auth.uid()) in ('classTeacher', 'subjectTeacher') or (auth.uid() = '6cc51c80-e098-4d6d-8450-5ff5931b7391') or (auth.uid() = '946ba406-1ba6-49cf-ab78-f611d1350f33'));
create policy "Allow admin access to students" on public.students for all using (auth.jwt() ->> 'role' = 'service_role');


-- Teachers Table
create table if not exists public.teachers (
    id uuid primary key default uuid_generate_v4(),
    auth_uid uuid references auth.users(id) on delete cascade,
    name text not null,
    email text unique not null,
    photo_url text,
    dob date,
    father_name text,
    mother_name text,
    phone_number text,
    address text,
    role text, -- 'classTeacher' or 'subjectTeacher'
    subject text,
    qualifications text[],
    class_teacher_of text, -- e.g., "10-A"
    classes_taught text[],
    joining_date bigint,
    bank_account jsonb,
    created_at timestamp with time zone default now()
);
-- RLS for Teachers
alter table public.teachers enable row level security;
create policy "Allow authenticated users to read teacher records" on public.teachers for select using (auth.role() = 'authenticated');
create policy "Allow admin access to teachers" on public.teachers for all using (auth.jwt() ->> 'role' = 'service_role');


-- Marks Table
create table if not exists public.marks (
    id uuid primary key default uuid_generate_v4(),
    student_auth_uid uuid not null references auth.users(id) on delete cascade,
    exam_id text not null references public.exams(id) on delete cascade,
    subject text not null,
    marks integer not null,
    max_marks integer not null,
    grade text not null,
    constraint unique_marks unique (student_auth_uid, exam_id, subject)
);
-- RLS for Marks
alter table public.marks enable row level security;
create policy "Students can view their own marks" on public.marks for select using (auth.uid() = student_auth_uid);
create policy "Teachers can manage marks" on public.marks for all using ((select role from public.teachers where auth_uid = auth.uid()) in ('classTeacher', 'subjectTeacher'));
create policy "Admins can manage marks" on public.marks for all using (auth.jwt() ->> 'role' = 'service_role');


-- Announcements Table
create table if not exists public.announcements (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    content text not null,
    category text,
    target text, -- 'students', 'teachers', or 'both'
    target_audience jsonb,
    created_at timestamp with time zone default now(),
    edited_at timestamp with time zone,
    created_by uuid references auth.users(id) on delete set null,
    creator_name text,
    creator_role text,
    attachment_url text
);
-- RLS for Announcements
alter table public.announcements enable row level security;
create policy "Allow authenticated users to read announcements" on public.announcements for select using (auth.role() = 'authenticated');
create policy "Allow principal/owner to manage announcements" on public.announcements for all using (auth.uid() in ('6cc51c80-e098-4d6d-8450-5ff5931b7391', '946ba406-1ba6-49cf-ab78-f611d1350f33'));
create policy "Allow teachers to manage their own announcements" on public.announcements for all using (auth.uid() = created_by);
create policy "Allow admin access to announcements" on public.announcements for all using (auth.jwt() ->> 'role' = 'service_role');


-- Homework Table
create table if not exists public.homework (
    id uuid primary key default uuid_generate_v4(),
    assigned_by uuid not null references public.teachers(id) on delete cascade,
    teacher_name text not null,
    class_section text not null,
    subject text not null,
    description text not null,
    due_date date not null,
    assigned_at timestamp with time zone default now(),
    attachment_url text
);
-- RLS for Homework
alter table public.homework enable row level security;
create policy "Allow students to view homework for their class" on public.homework for select using (
    exists (
        select 1 from public.students
        where auth_uid = auth.uid() and concat(class, '-', section) = class_section
    )
);
create policy "Allow teachers to manage their own homework" on public.homework for all using (
    exists (
        select 1 from public.teachers
        where auth_uid = auth.uid() and id = assigned_by
    )
);
create policy "Allow admin access to homework" on public.homework for all using (auth.jwt() ->> 'role' = 'service_role');


-- Leaves Table
create table if not exists public.leaves (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null,
    user_name text not null,
    user_role text not null,
    class text,
    teacher_id uuid,
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null,
    reason text not null,
    status text not null default 'Pending',
    applied_at timestamp with time zone default now(),
    rejection_reason text,
    approver_comment text
);
-- RLS for Leaves
alter table public.leaves enable row level security;
create policy "Users can manage their own leave requests" on public.leaves for all using (
    user_id = (select id from public.students where auth_uid = auth.uid()) OR
    user_id = (select id from public.teachers where auth_uid = auth.uid())
);
create policy "Allow teachers and principal to manage leave requests" on public.leaves for all using (
    (select role from public.teachers where auth_uid = auth.uid()) in ('classTeacher', 'subjectTeacher') OR
    auth.uid() in ('6cc51c80-e098-4d6d-8450-5ff5931b7391', '946ba406-1ba6-49cf-ab78-f611d1350f33')
);
create policy "Allow admin access to leaves" on public.leaves for all using (auth.jwt() ->> 'role' = 'service_role');


-- Feedback Table
create table if not exists public.feedback (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null,
    user_name text not null,
    user_role text not null,
    category text not null,
    subject text not null,
    description text not null,
    created_at timestamp with time zone default now()
);
-- RLS for Feedback
alter table public.feedback enable row level security;
create policy "Allow users to submit feedback" on public.feedback for insert with check (auth.uid() = user_id);
create policy "Allow admin/principal to view feedback" on public.feedback for select using (auth.uid() in ('6cc51c80-e098-4d6d-8450-5ff5931b7391', '946ba406-1ba6-49cf-ab78-f611d1350f33'));
create policy "Allow admin access to feedback" on public.feedback for all using (auth.jwt() ->> 'role' = 'service_role');

-- Gallery Table
create table if not exists public.gallery (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  caption text,
  uploaded_by text,
  uploader_id uuid,
  created_at timestamp with time zone default now()
);
-- RLS for Gallery
alter table public.gallery enable row level security;
create policy "Allow authenticated read access to gallery" on public.gallery for select using (auth.role() = 'authenticated');
create policy "Allow teachers and admins to manage gallery" on public.gallery for all using (
    exists (select 1 from public.teachers where auth_uid = auth.uid()) OR
    auth.uid() in ('6cc51c80-e098-4d6d-8450-5ff5931b7391', '946ba406-1ba6-49cf-ab78-f611d1350f33')
);

-- Salary Slips Table
create table if not exists public.salary_slips (
    id uuid primary key default uuid_generate_v4(),
    teacher_id uuid not null references public.teachers(id) on delete cascade,
    month text not null,
    basic_salary numeric not null,
    earnings jsonb,
    deductions jsonb,
    net_salary numeric not null,
    status text not null default 'Paid',
    created_at timestamp with time zone default now()
);
-- RLS for Salary Slips
alter table public.salary_slips enable row level security;
create policy "Teachers can read their own salary slips" on public.salary_slips for select using (
    teacher_id = (select id from public.teachers where auth_uid = auth.uid())
);
create policy "Allow principal/owner to manage salary slips" on public.salary_slips for all using (
    auth.uid() in ('6cc51c80-e098-4d6d-8450-5ff5931b7391', '946ba406-1ba6-49cf-ab78-f611d1350f33')
);

-- Settings Table
create table if not exists public.settings (
    id text primary key,
    school_name text,
    logo_url text,
    primary_color text,
    accent_color text
);
-- RLS for Settings
alter table public.settings enable row level security;
create policy "Allow public read access to settings" on public.settings for select using (true);
create policy "Allow owner to update settings" on public.settings for update using (auth.uid() = '946ba406-1ba6-49cf-ab78-f611d1350f33');

-- Pre-populate settings
insert into public.settings(id, school_name, logo_url, primary_color, accent_color)
values ('school_settings', 'Hilton Convent School', 'https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png', 'hsl(217, 91%, 60%)', 'hsl(258, 90%, 66%)')
on conflict (id) do nothing;
