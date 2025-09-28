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
}

export const MARKS_TABLE_SETUP_SQL = `
-- Create the marks table to store student grades for each exam subject
-- Updated to match the actual database structure
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

-- Policy: Allow authenticated teachers to perform all operations on marks
CREATE POLICY "Allow teachers to manage marks"
ON public.marks FOR ALL
USING (
  (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IN ('classTeacher', 'subjectTeacher')
);

-- Policy: Allow students to view their own marks (updated to use student_auth_uid)
CREATE POLICY "Allow students to view their own marks"
ON public.marks FOR SELECT
USING (
  student_auth_uid = auth.uid()
);

-- Policy: Allow admin users to manage all marks
CREATE POLICY "Allow admins to manage all marks"
ON public.marks FOR ALL
USING (
    auth.uid() IN ('6cc51c80-e098-4d6d-8450-5ff5931b7391', 'cf210695-e635-4363-aea5-740f2707a6d7')
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

export const setMarksForStudent = async (studentId: string, examId: string, marksData: { subject: string; marks: number; max_marks: number }[]) => {
    try {
        // Get the student's auth_uid since the marks table uses student_auth_uid
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('auth_uid')
            .eq('id', studentId)
            .single();

        if (studentError || !studentData) {
            console.error("Could not get student auth_uid for setting marks:", studentError);
            throw new Error("Student not found");
        }

        const marksWithGrades = marksData.map(m => ({
            student_auth_uid: studentData.auth_uid, // Use the correct column name
            exam_id: examId,
            subject: m.subject,
            marks: m.marks,
            max_marks: m.max_marks,
            grade: getGrade(m.marks, m.max_marks)
        }));

        // Upsert operation: update if composite key exists, else insert
        const { error } = await supabase.from('marks').upsert(marksWithGrades, {
            onConflict: 'student_auth_uid,exam_id,subject', // Use the correct column name
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
        // Get the student's auth_uid since the marks table uses student_auth_uid
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('auth_uid')
            .eq('id', studentId)
            .single();

        if (studentError || !studentData) {
            console.error("Could not get student auth_uid for exam marks:", studentError);
            return [];
        }

        const { data, error } = await supabase
            .from('marks')
            .select('*, max_marks')
            .eq('student_auth_uid', studentData.auth_uid) // Use correct column name
            .eq('exam_id', examId);
        
        if (error) {
            console.error("Error fetching marks:", error);
            throw error;
        }

        // Map snake_case to camelCase
        return (data || []).map(item => ({
            ...item,
            maxMarks: item.max_marks,
            student_id: studentId // Add for compatibility
        }));
    } catch (error) {
        console.error("Error in getStudentMarksForExam:", error);
        return [];
    }
};

export const getMarksForStudent = async (studentId: string): Promise<Record<string, Mark[]>> => {
    try {
        if (!studentId) {
            console.warn("No student ID provided to getMarksForStudent");
            return {};
        }

        console.log("Fetching marks for student:", studentId);

        // Get the student's auth_uid first since the marks table uses student_auth_uid
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('auth_uid')
            .eq('id', studentId)
            .single();

        if (studentError || !studentData) {
            console.error("Could not get student auth_uid:", studentError);
            return {};
        }

        console.log("Student auth_uid:", studentData.auth_uid);

        // Now query marks using student_auth_uid (the actual column name)
        const { data, error } = await supabase
            .from('marks')
            .select('*')
            .eq('student_auth_uid', studentData.auth_uid);

        if (error) {
            console.error("Supabase error getting marks for student:", error.message || error);
            console.error("Full error object:", error);
            return {};
        }
        
        // If no data found, return empty object (this is not an error)
        if (!data || data.length === 0) {
            console.log(`No marks found for student auth_uid: ${studentData.auth_uid}`);
            return {};
        }

        console.log(`Found ${data.length} mark records for student:`, studentId);
        console.log("Sample mark record:", data[0]);

        const marksByExam = data.reduce((acc, mark) => {
            const examId = mark.exam_id;
            if (!acc[examId]) acc[examId] = [];
            acc[examId].push({ 
                ...mark, 
                maxMarks: mark.max_marks,
                student_id: studentId // Add this for compatibility with existing code
            });
            return acc;
        }, {} as Record<string, Mark[]>);
        
        console.log("Organized marks by exam:", Object.keys(marksByExam));
        return marksByExam;
    } catch (error) {
        console.error("Unexpected error in getMarksForStudent:", error);
        return {};
    }
};