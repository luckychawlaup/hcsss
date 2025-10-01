
import { createClient } from "@/lib/supabase/client";
import { getRole } from "../getRole";
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
-- This script will drop and recreate your marks table to ensure it is correct.
-- WARNING: This will delete any existing data in the 'marks' table.

-- Drop tables in the correct order to avoid dependency issues
DROP TABLE IF EXISTS public.marks;
DROP TABLE IF EXISTS public.exams;

-- Create the 'exams' table first
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Policies for 'exams' table
DROP POLICY IF EXISTS "Allow admins and class teachers to manage exams" ON public.exams;
DROP POLICY IF EXISTS "Allow authenticated users to read exams" ON public.exams;

CREATE POLICY "Allow authenticated users to read exams"
ON public.exams FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins and class teachers to manage exams"
ON public.exams FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050') -- Owner UID
    OR
    (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) = 'classTeacher'
);


-- Now create the 'marks' table with the foreign key to exams
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

-- Enable RLS for marks
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Policies for 'marks' table
DROP POLICY IF EXISTS "Allow class teachers & principal to manage marks" ON public.marks;
DROP POLICY IF EXISTS "Allow students to view their own marks" ON public.marks;


CREATE POLICY "Allow class teachers & principal to manage marks"
ON public.marks FOR ALL
USING (
    (
        (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()) = 
        (SELECT class || '-' || section FROM public.students WHERE id = public.marks.student_id)
    )
    OR
    (
        (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    )
     OR
    (
        auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050'
    )
);


CREATE POLICY "Allow students to view their own marks"
ON public.marks FOR SELECT
USING (
  student_id = (SELECT id FROM public.students WHERE auth_uid = auth.uid())
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

export const setMarksForStudent = async (studentIdOrClassSection: string, examId: string, marksData: { subject: string; marks: number; max_marks: number, exam_date?: Date }[], isPrincipalView: boolean = false) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const userRole = await getRole(user);
        const isPrincipal = userRole === 'principal' || userRole === 'owner';


        const marksWithGrades = marksData.map(m => ({
            exam_id: examId,
            subject: m.subject,
            marks: m.marks,
            max_marks: m.max_marks,
            grade: getGrade(m.marks, m.max_marks),
            exam_date: m.exam_date ? m.exam_date.toISOString() : null,
        }));
        
        let studentIds: string[] = [];

        if (isPrincipal) {
            const [classVal, sectionVal] = studentIdOrClassSection.split('-');
            const { data, error } = await supabase.from('students').select('id').eq('class', classVal).eq('section', sectionVal);
            if (error) throw error;
            studentIds = data.map(s => s.id);
            if(studentIds.length === 0) { // If no students, save a template record. This might need a different table.
                 console.log("No students in class, but saving schedule for class", studentIdOrClassSection);
            }
        } else {
            studentIds = [studentIdOrClassSection];
        }

        const upsertPayload = studentIds.flatMap(sId => 
            marksWithGrades.map(m => ({ ...m, student_id: sId }))
        );

        if (upsertPayload.length > 0) {
            const { error } = await supabase.from('marks').upsert(upsertPayload, {
                onConflict: 'student_id,exam_id,subject',
            });
            if (error) throw error;
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

export const getScheduleForClass = async (examId: string, classSection: string): Promise<any[] | null> => {
    try {
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('class', classSection.split('-')[0])
            .eq('section', classSection.split('-')[1])
            .limit(1);

        if (studentError || !students || students.length === 0) {
            console.warn("No students in class, cannot fetch schedule from marks.");
            return null;
        }
        
        return getStudentMarksForExam(students[0].id, examId);

    } catch (error) {
        console.error("Error fetching schedule for class:", error);
        return null;
    }
}

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
