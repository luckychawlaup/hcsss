
import { db } from "@/lib/firebase";
import {
  ref,
  onValue,
  set,
  push,
  get
} from "firebase/database";
import type { DataSnapshot } from "firebase/database";

const EXAMS_COLLECTION = "exams";

export interface Exam {
  id: string;
  name: string;
  date: number; // Timestamp
  maxMarks: number;
}

// Pre-populate some exams if they don't exist
const prepopulateExams = async () => {
    const examsRef = ref(db, EXAMS_COLLECTION);
    const snapshot = await get(examsRef);
    if (!snapshot.exists()) {
        const initialExams = {
            "mid-term-2024": { name: "Mid-Term Exam 2024", date: new Date("2024-09-15").getTime(), maxMarks: 100 },
            "final-exam-2024": { name: "Final Exam 2024", date: new Date("2025-03-10").getTime(), maxMarks: 100 }
        };
        await set(examsRef, initialExams);
    }
}
prepopulateExams();


// Get all exams with real-time updates
export const getExams = (
    callback: (exams: Exam[]) => void
) => {
    const examsRef = ref(db, EXAMS_COLLECTION);
    const unsubscribe = onValue(examsRef, (snapshot: DataSnapshot) => {
        const exams: Exam[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const id in data) {
                exams.push({ id, ...data[id] });
            }
        }
        callback(exams.sort((a,b) => b.date - a.date));
    });
    return unsubscribe;
};

// Add a new exam (for principal)
export const addExam = async (examData: Omit<Exam, 'id'>) => {
    const examsRef = ref(db, EXAMS_COLLECTION);
    const newExamRef = push(examsRef);
    await set(newExamRef, examData);
};
