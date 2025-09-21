
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

export interface Mark {
    id?: string;
    student_auth_uid: string;
    exam_id: string;
    subject: string;
    marks: number;
    maxMarks: number;
    grade: string;
}

const getGrade = (marks: number, maxMarks: number): string => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'E';
};

export const setMarksForStudent = async (studentAuthUid: string, examId: string, marksData: { subject: string; marks: number; maxMarks: number }[]) => {
    const marksWithGrades = marksData.map(m => ({
        ...m,
        student_auth_uid: studentAuthUid,
        exam_id: examId,
        grade: getGrade(m.marks, m.maxMarks)
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
        .select('*, exams(max_marks)')
        .eq('student_auth_uid', studentAuthUid)
        .eq('exam_id', examId);
    
    if (error) {
        console.error("Error fetching marks:", error);
        return [];
    }

    // Transform the data to include maxMarks in the top-level object
    return (data || []).map((mark: any) => ({
        ...mark,
        maxMarks: mark.exams.max_marks
    }));
};

export const getMarksForStudent = (studentAuthUid: string, callback: (marksByExam: Record<string, Mark[]>) => void) => {
    const channel = supabase.channel(`marks-student-${studentAuthUid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'marks', filter: `student_auth_uid=eq.${studentAuthUid}`}, 
        async () => {
            const { data, error } = await supabase.from('marks').select('*').eq('student_auth_uid', studentAuthUid);
            if (data) {
                const marksByExam = data.reduce((acc, mark) => {
                    const examId = mark.exam_id;
                    if (!acc[examId]) acc[examId] = [];
                    acc[examId].push(mark);
                    return acc;
                }, {} as Record<string, Mark[]>);
                callback(marksByExam);
            }
        }).subscribe();

    (async () => {
        const { data, error } = await supabase.from('marks').select('*').eq('student_auth_uid', studentAuthUid);
        if (data) {
            const marksByExam = data.reduce((acc, mark) => {
                const examId = mark.exam_id;
                if (!acc[examId]) acc[examId] = [];
                acc[examId].push(mark);
                return acc;
            }, {} as Record<string, Mark[]>);
            callback(marksByExam);
        }
    })();

    return channel;
};
