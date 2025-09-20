
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";

const MARKS_COLLECTION = "marks";

export interface Mark {
    subject: string;
    marks: number;
    maxMarks: number;
    grade: string;
}

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
    // Marks for a specific exam are stored as a subcollection under the student
    const examMarksCollRef = collection(db, STUDENTS_COLLECTION, studentId, "marks", examId, "subjects");
    
    const batch = writeBatch(db);

    marksData.forEach(m => {
        const subjectDocRef = doc(examMarksCollRef, m.subject);
        const markPayload = {
            marks: m.marks,
            maxMarks: m.maxMarks,
            grade: getGrade(m.marks, m.maxMarks)
        };
        batch.set(subjectDocRef, markPayload);
    });

    await batch.commit();
};

// Get marks for a specific student and exam
export const getStudentMarksForExam = async (studentId: string, examId: string): Promise<Mark[]> => {
    const examMarksCollRef = collection(db, STUDENTS_COLLECTION, studentId, "marks", examId, "subjects");
    const snapshot = await getDocs(examMarksCollRef);
    const marks: Mark[] = [];
    if (!snapshot.empty) {
        snapshot.forEach(doc => {
            marks.push({ subject: doc.id, ...doc.data() } as Mark);
        });
    }
    return marks;
};

// Get all marks for a student (for report card list)
export const getMarksForStudent = (studentId: string, callback: (marksByExam: Record<string, Mark[]>) => void) => {
    const marksExamsCollRef = collection(db, STUDENTS_COLLECTION, studentId, "marks");
    
    const unsubscribe = onSnapshot(marksExamsCollRef, (examSnapshot) => {
        const marksByExam: Record<string, Mark[]> = {};
        
        const promises = examSnapshot.docs.map(async (examDoc) => {
            const examId = examDoc.id;
            const subjectsCollRef = collection(db, STUDENTS_COLLECTION, studentId, "marks", examId, "subjects");
            const subjectsSnapshot = await getDocs(subjectsCollRef);
            
            const marks: Mark[] = [];
            if (!subjectsSnapshot.empty) {
                subjectsSnapshot.forEach(subjectDoc => {
                    marks.push({ subject: subjectDoc.id, ...subjectDoc.data() } as Mark);
                });
            }
            marksByExam[examId] = marks;
        });

        Promise.all(promises).then(() => {
            callback(marksByExam);
        });
    });

    return unsubscribe;
}
