import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";

const TEACHERS_COLLECTION = "teachers";

// Add a new teacher with a specific ID
export const addTeacher = async (teacherId: string, teacherData: Omit<DocumentData, 'id'>) => {
  try {
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    await setDoc(teacherRef, teacherData);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// Get all teachers with real-time updates
export const getTeachers = (callback: (teachers: DocumentData[]) => void) => {
  const q = query(collection(db, TEACHERS_COLLECTION));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const teachers: DocumentData[] = [];
    querySnapshot.forEach((doc) => {
      teachers.push({ id: doc.id, ...doc.data() });
    });
    callback(teachers);
  });
  return unsubscribe; // Return the unsubscribe function to clean up the listener
};

// Get a single teacher by ID
export const getTeacherById = async (teacherId: string) => {
    try {
        const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
        const docSnap = await getDoc(teacherRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
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
export const updateTeacher = async (teacherId: string, updatedData: Partial<DocumentData>) => {
  try {
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    await updateDoc(teacherRef, updatedData);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

// Delete a teacher
export const deleteTeacher = async (teacherId: string) => {
  try {
    const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
    await deleteDoc(teacherRef);
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
