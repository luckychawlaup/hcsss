
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export interface Mark {
    id?: string;
    student_id: string;
    exam_id: string;
    subject: string;
    marks: number;
    max_marks: number;
    grade: string;
    exam_date?: string;
}

export const MARKS_TABLE_SETUP_SQL = `
-- This SQL script adds the 'exam_date' column to your 'marks' table.
-- You only need to run this once in your Supabase SQL Editor.

ALTER TABLE public.marks
ADD COLUMN IF NOT EXISTS exam_date TIMESTAMPTZ;

-- Re-create policies to ensure they are up-to-date.
DROP POLICY IF EXISTS "Allow teachers to manage marks" ON public.marks;
DROP POLICY IF EXISTS "Allow students to view their own marks" ON public.marks;
DROP POLICY IF EXISTS "Allow admins to manage all marks" ON public.marks;

CREATE POLICY "Allow teachers to manage marks"
ON public.marks FOR ALL
USING (
  (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IN ('classTeacher', 'subjectTeacher')
);

-- Policy to allow students to view their own marks, corrected to use the 'student_id' column.
CREATE POLICY "Allow students to view their own marks"
ON public.marks FOR SELECT
USING (
  student_id = (SELECT id FROM public.students WHERE auth_uid = auth.uid())
);

CREATE POLICY "Allow admins to manage all marks"
ON public.marks FOR ALL
USING (
  auth.uid() IN (
    '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
    '946ba406-1ba6-49cf-ab78-f611d1350f33'  -- Owner UID
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

export const setMarksForStudent = async (studentId: string, examId: string, marksData: { subject: string; marks: number; max_marks: number, exam_date?: Date }[]) => {
    try {
        const marksWithGrades = marksData.map(m => ({
            student_id: studentId,
            exam_id: examId,
            subject: m.subject,
            marks: m.marks,
            max_marks: m.max_marks,
            grade: getGrade(m.marks, m.max_marks),
            exam_date: m.exam_date ? m.exam_date.toISOString() : null,
        }));

        const { error } = await supabase.from('marks').upsert(marksWithGrades, {
            onConflict: 'student_id,exam_id,subject',
        });

        if (error) {
            console.error("Error setting marks:", error);
            throw error;
        }
    } catch (error) {
        console.error("Error in setMarksForStudent:", error);
        throw error;
    }
};

export const getStudentMarksForExam = async (studentId: string, examId: string): Promise<Mark[]> => {
    try {
        const { data, error } = await supabase
            .from('marks')
            .select('*')
            .eq('student_id', studentId)
            .eq('exam_id', examId);
        
        if (error) {
            console.error("Error fetching marks:", error);
            throw error;
        }

        return (data || []).map(item => ({
            ...item,
            max_marks: item.max_marks,
            exam_date: item.exam_date,
            student_id: studentId
        }));
    } catch (error) {
        console.error("Error in getStudentMarksForExam:", error);
        return [];
    }
};

export const getMarksForStudent = async (studentId: string): Promise<Record<string, Mark[]>> => {
    try {
        if (!studentId) {
            return {};
        }

        const { data, error } = await supabase
            .from('marks')
            .select('*')
            .eq('student_id', studentId);

        if (error) {
            console.error("Supabase error getting marks for student:", error.message || error);
            return {};
        }
        
        if (!data || data.length === 0) {
            return {};
        }

        const marksByExam = data.reduce((acc, mark) => {
            const examId = mark.exam_id;
            if (!acc[examId]) acc[examId] = [];
            acc[examId].push({ 
                ...mark, 
                max_marks: mark.max_marks,
                exam_date: mark.exam_date,
                student_id: studentId
            });
            return acc;
        }, {} as Record<string, Mark[]>);
        
        return marksByExam;
    } catch (error) {
        console.error("Unexpected error in getMarksForStudent:", error);
        return {};
    }
};
