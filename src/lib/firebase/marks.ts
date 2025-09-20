
import { db } from "@/lib/firebase";
import {
  ref,
  set,
  get,
  onValue,
  DataSnapshot
} from "firebase/database";

const MARKS_COLLECTION = "marks";

export interface Mark {
    subject: string;
    marks: number;
    maxMarks: number;
    grade: string;
}

// Function to calculate grade
const getGrade = (marks: number, maxMarks: number): string => {
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return "A1";
    if (percentage >= 80) return "A2";
    if (percentage >= 70) return "B1";
    if (percentage >= 60) return "B2";
    if (percentage >= 50) return "C1";
    if (percentage >= 40) return "C2";
    if (percentage >= 33) return "D";
    return "E";
};

// Teacher action: set marks for a student in an exam
export const setMarksForStudent = async (
    studentId: string,
    examId: string,
    marksData: { subject: string; marks: number; maxMarks: number }[]
) => {
    const marksRef = ref(db, `${MARKS_COLLECTION}/${studentId}/${examId}`);
    const finalMarks: Record<string, Omit<Mark, 'subject'>> = {};

    marksData.forEach(m => {
        finalMarks[m.subject] = {
            marks: m.marks,
            maxMarks: m.maxMarks,
            grade: getGrade(m.marks, m.maxMarks)
        };
    });

    await set(marksRef, finalMarks);
};

// Get marks for a specific student and exam
export const getStudentMarksForExam = async (studentId: string, examId: string): Promise<Mark[]> => {
    const marksRef = ref(db, `${MARKS_COLLECTION}/${studentId}/${examId}`);
    const snapshot = await get(marksRef);
    const marks: Mark[] = [];
    if (snapshot.exists()) {
        const data = snapshot.val();
        for (const subject in data) {
            marks.push({ subject, ...data[subject] });
        }
    }
    return marks;
};

// Get all marks for a student (for report card list)
export const getMarksForStudent = (studentId: string, callback: (marksByExam: Record<string, Mark[]>) => void) => {
    const studentMarksRef = ref(db, `${MARKS_COLLECTION}/${studentId}`);
    
    const unsubscribe = onValue(studentMarksRef, (snapshot: DataSnapshot) => {
        const marksByExam: Record<string, Mark[]> = {};
        if (snapshot.exists()) {
            const allExamsData = snapshot.val();
            for(const examId in allExamsData) {
                const examMarksData = allExamsData[examId];
                const marks: Mark[] = [];
                 for (const subject in examMarksData) {
                    marks.push({ subject, ...examMarksData[subject] });
                }
                marksByExam[examId] = marks;
            }
        }
        callback(marksByExam);
    });

    return unsubscribe;
}
