
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
} from "firebase/database";
import type { DataSnapshot } from "firebase/database";

const STUDENTS_COLLECTION = "students";

export interface Student {
  id: string;
  srn: string;
  authUid?: string; // To link to Firebase Auth user
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
}

// Add or update a student with a specific ID (SRN)
export const addStudent = async (srn: string, studentData: Omit<Student, 'id' | 'srn'>) => {
  try {
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${srn}`);
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
        students.push({ id, srn: id, ...data[id] });
      }
    }
    callback(students);
  }, (error) => {
    console.error("Error fetching students: ", error);
    callback([]); // Return empty array on error
  });
  return unsubscribe;
};

// Get a single student by SRN
export const getStudentById = async (srn: string): Promise<Student | null> => {
    try {
        const studentRef = ref(db, `${STUDENTS_COLLECTION}/${srn}`);
        const snapshot = await get(studentRef);
        if (snapshot.exists()) {
            return { id: snapshot.key, srn: snapshot.key, ...snapshot.val() };
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
    try {
        const studentsRef = ref(db, STUDENTS_COLLECTION);
        const q = query(studentsRef, orderByChild('authUid'), equalTo(authUid));
        const snapshot = await get(q);
        if (snapshot.exists()) {
            const data = snapshot.val();
            const studentId = Object.keys(data)[0];
            return { id: studentId, srn: studentId, ...data[studentId] };
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error getting student document by auth UID:", e);
        throw e;
    }
}


// Update a student's details
export const updateStudent = async (srn: string, updatedData: Partial<Student>) => {
  try {
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${srn}`);
    await update(studentRef, updatedData);
  } catch (e) {
    console.error("Error updating student document: ", e);
    throw e;
  }
};

// Delete a student
export const deleteStudent = async (srn: string) => {
  try {
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${srn}`);
    await remove(studentRef);
  } catch (e) {
    console.error("Error deleting student document: ", e);
    throw e;
  }
};

    