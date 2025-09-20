
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  getDocs,
  Timestamp,
  writeBatch
} from "firebase/firestore";

const EXAMS_COLLECTION = "exams";

export interface Exam {
  id: string;
  name: string;
  date: Timestamp;
  maxMarks: number;
}

// Pre-populate some exams if they don't exist
export const prepopulateExams = async () => {
    const examsColl = collection(db, EXAMS_COLLECTION);
    const snapshot = await getDocs(examsColl);
    if (snapshot.empty) {
        const batch = writeBatch(db);
        const initialExams = [
            { id: "mid-term-2024", name: "Mid-Term Exam 2024", date: Timestamp.fromDate(new Date("2024-09-15")), maxMarks: 100 },
            { id: "final-exam-2024", name: "Final Exam 2024", date: Timestamp.fromDate(new Date("2025-03-10")), maxMarks: 100 }
        ];

        initialExams.forEach(exam => {
            const docRef = doc(examsColl, exam.id);
            batch.set(docRef, exam);
        });

        await batch.commit();
    }
}


// Get all exams with real-time updates
export const getExams = (
    callback: (exams: Exam[]) => void
) => {
    const examsColl = collection(db, EXAMS_COLLECTION);
    const unsubscribe = onSnapshot(examsColl, (snapshot) => {
        const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
        callback(exams.sort((a,b) => b.date.toMillis() - a.date.toMillis()));
    });
    return unsubscribe;
};

// Add a new exam (for principal)
export const addExam = async (examData: Omit<Exam, 'id'>) => {
    await addDoc(collection(db, EXAMS_COLLECTION), examData);
};
