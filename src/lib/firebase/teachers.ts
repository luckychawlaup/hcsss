

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
  const adminAuth = getAuth(); // This simulation assumes the principal is an admin
  const tempPassword = generateTempPassword();

  try {
    // Step 1: Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(adminAuth, teacherData.email, tempPassword);
    const user = userCredential.user;
    const authUid = user.uid;

    // Step 2: Send verification email
    await sendEmailVerification(user);

    // Step 3: Prepare the teacher data for the database
    const dbData = {
      ...teacherData,
      authUid: authUid,
      dob: format(teacherData.dob as unknown as Date, "yyyy-MM-dd"),
      joiningDate: Date.now(),
      mustChangePassword: true, // Flag for first-time login
      tempPassword: tempPassword,
    };

    // Step 4: Save the teacher's profile in the Realtime Database using their UID as the key
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${authUid}`);
    await set(teacherRef, dbData);

    return { teacherId: authUid, tempPassword };

  } catch (error: any) {
    console.error("Error creating teacher with auth: ", error);
    // If there's an error, we should ideally clean up (e.g., delete the created auth user)
    // This part is complex to handle robustly on the client-side.
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
