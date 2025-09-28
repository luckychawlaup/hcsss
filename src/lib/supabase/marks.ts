

import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export interface Mark {
    id?: string;
    student_auth_uid: string;
    exam_id: string;
    subject: string;
    marks: number;
    max_marks: number;
    grade: string;
}

export const MARKS_TABLE_SETUP_SQL = `
-- Create the marks table to store student grades for each exam subject
CREATE TABLE IF NOT EXISTS public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_auth_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    marks INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    grade TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT marks_unique_student_exam_subject UNIQUE (student_auth_uid, exam_id, subject)
);

-- Enable Row Level Security (RLS) for the marks table
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow teachers to manage marks" ON public.marks;
DROP POLICY IF EXISTS "Allow students to view their own marks" ON public.marks;
DROP POLICY IF EXISTS "Allow admins to manage all marks" ON public.marks;

-- Policy: Allow authenticated teachers and admins to perform all operations on marks
CREATE POLICY "Allow teachers to manage marks"
ON public.marks FOR ALL
USING (
  (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IN ('classTeacher', 'subjectTeacher')
)
WITH CHECK (
  (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IN ('classTeacher', 'subjectTeacher')
);

-- Policy: Allow students to view their own marks
CREATE POLICY "Allow students to view their own marks"
ON public.marks FOR SELECT
USING (auth.uid() = student_auth_uid);

-- Policy: Allow admin users to manage all marks
CREATE POLICY "Allow admins to manage all marks"
ON public.marks FOR ALL
USING (
    auth.uid() IN (
        '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
        'cf210695-e635-4363-aea5-740f2707a6d7'  -- Accountant UID
    )
);
`;

const getGrade = (marks: number, maxMarks: number): string => {
    if (maxMarks === 0) return 'N/A';
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'E';
};

export const setMarksForStudent = async (studentAuthUid: string, examId: string, marksData: { subject: string; marks: number; max_marks: number }[]) => {
    const marksWithGrades = marksData.map(m => ({
        student_auth_uid: studentAuthUid,
        exam_id: examId,
        subject: m.subject,
        marks: m.marks,
        max_marks: m.max_marks,
        grade: getGrade(m.marks, m.max_marks)
    }));

    // Upsert operation: update if composite key exists, else insert
    const { error } = await supabase.from('marks').upsert(marksWithGrades, {
        onConflict: 'student_auth_uid,exam_id,subject',
    });

    if (error) {
        console.error("Error setting marks:", error);
        throw error;
    }
};

export const getStudentMarksForExam = async (studentAuthUid: string, examId: string): Promise<Mark[]> => {
    const { data, error } = await supabase
        .from('marks')
        .select('*, max_marks')
        .eq('student_auth_uid', studentAuthUid)
        .eq('exam_id', examId);
    
    if (error) {
        console.error("Error fetching marks:", error);
        return [];
    }

    // Map snake_case to camelCase
    return (data || []).map(item => ({
        ...item,
        maxMarks: item.max_marks
    }));
};

export const getMarksForStudent = async (studentAuthUid: string): Promise<Record<string, Mark[]>> => {
    const { data, error } = await supabase
        .from('marks')
        .select('*, max_marks')
        .eq('student_auth_uid', studentAuthUid);

    if (error) {
        console.error("Error getting marks for student:", error);
        return {};
    }
    
    if (data) {
        const marksByExam = data.reduce((acc, mark) => {
            const examId = mark.exam_id;
            if (!acc[examId]) acc[examId] = [];
            acc[examId].push({ ...mark, maxMarks: mark.max_marks });
            return acc;
        }, {} as Record<string, Mark[]>);
        return marksByExam;
    }

    return {};
};

    
