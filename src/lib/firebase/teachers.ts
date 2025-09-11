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
} from "firebase/database";
import type { DataSnapshot } from "firebase/database";

const TEACHERS_COLLECTION = "teachers";

// Add or update a teacher with a specific ID
export const addTeacher = async (teacherId: string, teacherData: Omit<any, 'id'>) => {
  try {
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await set(teacherRef, teacherData);
  } catch (e: any) {
    console.error("Error adding document: ", e.message);
    throw new Error(`Failed to add teacher. Please ensure your Firebase configuration is correct and the service is available. Original error: ${e.message}`);
  }
};

// Get all teachers with real-time updates
export const getTeachers = (callback: (teachers: any[]) => void) => {
  const teachersRef = ref(db, TEACHERS_COLLECTION);
  const unsubscribe = onValue(teachersRef, (snapshot: DataSnapshot) => {
    const teachers: any[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const id in data) {
        teachers.push({ id, ...data[id] });
      }
    }
    callback(teachers);
  }, (error) => {
    console.error("Error fetching teachers: ", error);
    callback([]); // Return empty array on error
  });
  return unsubscribe; // Return the unsubscribe function to clean up the listener
};

// Get a single teacher by ID
export const getTeacherById = async (teacherId: string) => {
    try {
        const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
        const snapshot = await get(teacherRef);
        if (snapshot.exists()) {
            return { id: snapshot.key, ...snapshot.val() };
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (e) {
        console.error("Error getting document:", e);
        throw e;
    }
}


// Update a teacher's details
export const updateTeacher = async (teacherId: string, updatedData: Partial<any>) => {
  try {
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await update(teacherRef, updatedData);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

// Delete a teacher
export const deleteTeacher = async (teacherId: string) => {
  try {
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await remove(teacherRef);
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
