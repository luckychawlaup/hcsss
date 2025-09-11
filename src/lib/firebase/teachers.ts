

import { db } from "@/lib/firebase";
import {
  ref,
  set,
  onValue,
  get,
  update,
  remove,
} from "firebase/database";
import type { DataSnapshot } from "firebase/database";
import { format } from "date-fns";

// NOTE: These functions are intended for a simulated admin environment.
// In a production app, creating/deleting auth users should be handled
// by a secure backend (e.g., Cloud Functions) and not directly on the client.
import { getAuth, createUserWithEmailAndPassword, deleteUser, sendEmailVerification } from "firebase/auth";

const TEACHERS_COLLECTION = "teachers";

export interface Teacher {
  id: string; // This will be the auth UID
  authUid: string; 
  email: string;
  name: string;
  dob: string;
  fatherName: string;
  motherName: string;
  phoneNumber: string;
  address: string;
  role: "classTeacher" | "subjectTeacher";
  subject: string;
  joiningDate: number;
  classTeacherOf?: string;
  classesTaught?: string[];
  qualifications?: string[];
  mustChangePassword?: boolean;
  tempPassword?: string;
}

const generateTempPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};


// Function to add a teacher and create their auth account
export const addTeacherWithAuth = async (teacherData: Omit<Teacher, 'id' | 'authUid' | 'joiningDate'>) => {
  // IMPORTANT: This function simulates an admin-level action on the client.
  // In a real production environment, this should be a secure backend Cloud Function.
  const adminAuth = getAuth();
  const tempPassword = generateTempPassword();

  try {
    // Step 1: Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(adminAuth, teacherData.email, tempPassword);
    const user = userCredential.user;
    const authUid = user.uid;

    // Step 2: Send verification email to the newly created user
    await sendEmailVerification(user);

    // Step 3: Prepare the teacher data for the Realtime Database
    const dbData = {
      ...teacherData,
      authUid: authUid,
      dob: format(teacherData.dob as unknown as Date, "yyyy-MM-dd"),
      joiningDate: Date.now(),
      mustChangePassword: true, // Flag for first-time login
      tempPassword: tempPassword, // Temporarily store for joining letter
    };

    // Step 4: Save the teacher's profile in the Realtime Database, keyed by their new authUid
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${authUid}`);
    await set(teacherRef, dbData);

    // Return the new ID and temporary password to be displayed to the principal
    return { teacherId: authUid, tempPassword };

  } catch (error: any) {
    console.error("Error creating teacher with auth: ", error);
    // This is a critical failure. A robust implementation would include cleanup logic,
    // like deleting the created user if the database write fails.
    throw new Error(`Failed to add teacher: ${error.message}`);
  }
};


// Get all teachers with real-time updates
export const getTeachers = (callback: (teachers: Teacher[]) => void) => {
  const teachersRef = ref(db, TEACHERS_COLLECTION);
  const unsubscribe = onValue(teachersRef, (snapshot: DataSnapshot) => {
    const teachers: Teacher[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const id in data) {
        teachers.push({ id, ...data[id] });
      }
    }
    callback(teachers);
  }, (error) => {
    console.error("Error fetching teachers: ", error);
    callback([]);
  });
  return unsubscribe;
};

// Get a single teacher by ID (which is their Auth UID)
export const getTeacherByAuthId = async (authUid: string): Promise<Teacher | null> => {
    try {
        const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${authUid}`);
        const snapshot = await get(teacherRef);
        if (snapshot.exists()) {
            return { id: snapshot.key, ...snapshot.val() };
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error getting teacher document by auth UID:", e);
        throw e;
    }
}


// Update a teacher's details
export const updateTeacher = async (teacherId: string, updatedData: Partial<Teacher>) => {
  try {
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await update(teacherRef, updatedData);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

// Delete a teacher from DB. Auth user deletion would need a backend function.
export const deleteTeacher = async (teacherId: string) => {
  try {
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await remove(teacherRef);
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
