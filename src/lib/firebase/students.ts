

import { db } from "@/lib/firebase";
import {
  ref,
  set,
  onValue,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  DataSnapshot,
} from "firebase/database";

const STUDENTS_COLLECTION = "students";

export interface Student {
  id: string; // Firebase Auth UID
  srn?: string; // Kept for display/legacy purposes if needed, but not primary key
  authUid: string;
  email: string;
  name: string;
  fatherName: string;
  motherName: string;
  address: string;
  class: string;
  section: string;
  admissionDate: number;
  fatherPhone?: string;
  motherPhone?: string;
  studentPhone?: string;
  mustChangePassword?: boolean;
}

// Add or update a student with a specific UID
export const addStudent = async (uid: string, studentData: Omit<Student, 'id'>) => {
  try {
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${uid}`);
    await set(studentRef, studentData);
  } catch (e: any) {
    console.error("Error adding student: ", e.message);
    throw new Error(`Failed to add student. Please ensure your Firebase configuration is correct and the service is available. Original error: ${e.message}`);
  }
};

// Get all students with real-time updates
export const getStudents = (callback: (students: Student[]) => void) => {
  const studentsRef = ref(db, STUDENTS_COLLECTION);
  const unsubscribe = onValue(studentsRef, (snapshot: DataSnapshot) => {
    const students: Student[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const id in data) {
        students.push({ id, ...data[id] });
      }
    }
    callback(students);
  }, (error) => {
    console.error("Error fetching students: ", error);
    callback([]); // Return empty array on error
  });
  return unsubscribe;
};

// Get a single student by UID (which is their Auth UID)
export const getStudentById = async (uid: string): Promise<Student | null> => {
    try {
        const studentRef = ref(db, `${STUDENTS_COLLECTION}/${uid}`);
        const snapshot = await get(studentRef);
        if (snapshot.exists()) {
            return { id: snapshot.key, ...snapshot.val() };
        } else {
            console.log("No such student document!");
            return null;
        }
    } catch (e) {
        console.error("Error getting student document:", e);
        throw e;
    }
}

// Get a single student by Auth UID
export const getStudentByAuthId = async (authUid: string): Promise<Student | null> => {
    return getStudentById(authUid);
}


// Update a student's details
export const updateStudent = async (uid: string, updatedData: Partial<Student>) => {
  try {
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${uid}`);
    await update(studentRef, updatedData);
  } catch (e) {
    console.error("Error updating student document: ", e);
    throw e;
  }
};

// Delete a student
export const deleteStudent = async (uid: string) => {
  try {
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${uid}`);
    await remove(studentRef);
    // Note: Deleting the Firebase Auth user requires admin privileges
    // and should be handled in a secure backend environment (e.g., Firebase Function).
  } catch (e) {
    console.error("Error deleting student document: ", e);
    throw e;
  }
};
