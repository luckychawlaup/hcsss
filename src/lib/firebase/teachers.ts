
import { db } from "@/lib/firebase";
import {
  getAuth as getFirebaseAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  ref,
  set,
  onValue,
  get,
  update,
  remove,
  query,
  equalTo,
  orderByChild,
} from "firebase/database";
import type { DataSnapshot } from "firebase/database";
import { format } from "date-fns";

const TEACHERS_COLLECTION = "teachers";
const REGISTRATIONS_COLLECTION = "registrations";

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
  tempPassword?: string;
  mustChangePassword?: boolean;
}

export type TeacherRegistrationData = Omit<
  Teacher,
  "id" | "authUid" | "joiningDate"
>;

// Principal action: Register teacher details, create auth user, and generate temp password
export const addTeacherWithAuth = async (
  teacherData: TeacherRegistrationData
) => {
  const auth = getFirebaseAuth();
  const tempPassword = Math.random().toString(36).slice(-8);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      teacherData.email,
      tempPassword
    );
    const user = userCredential.user;

    await sendEmailVerification(user);

    const finalTeacherData: Omit<Teacher, "id"> = {
      ...teacherData,
      dob: format(teacherData.dob as unknown as Date, "yyyy-MM-dd"),
      joiningDate: Date.now(),
      authUid: user.uid,
      tempPassword: tempPassword,
      mustChangePassword: true,
    };

    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${user.uid}`);
    await set(teacherRef, finalTeacherData);

    return {
      ...finalTeacherData,
      id: user.uid,
    };
  } catch (error: any) {
    // Handle specific auth errors if needed
    console.error("Error creating teacher auth user:", error);
    if (error.code === 'auth/email-already-in-use') {
        throw new Error("This email is already registered. Please use a different email.");
    }
    throw new Error("Failed to create teacher account.");
  }
};

// Get all teachers with real-time updates
export const getTeachers = (callback: (teachers: Teacher[]) => void) => {
  const teachersRef = ref(db, TEACHERS_COLLECTION);
  const unsubscribe = onValue(
    teachersRef,
    (snapshot: DataSnapshot) => {
      const teachers: Teacher[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const id in data) {
          teachers.push({ id, ...data[id] });
        }
      }
      callback(teachers);
    },
    (error) => {
      console.error("Error fetching teachers: ", error);
      callback([]);
    }
  );
  return unsubscribe;
};

// Get a single teacher by ID (which is their Auth UID)
export const getTeacherByAuthId = async (
  authUid: string
): Promise<Teacher | null> => {
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
};

// Update a teacher's details
export const updateTeacher = async (
  teacherId: string,
  updatedData: Partial<Teacher>
) => {
  try {
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    // Ensure tempPassword is removed if it's an empty string
    if (updatedData.tempPassword === "") {
        delete updatedData.tempPassword;
    }
    await update(teacherRef, updatedData);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

// Delete a teacher from DB. Auth user deletion would need a backend function.
export const deleteTeacher = async (teacherId: string) => {
  try {
    // Note: This only deletes the DB record, not the Firebase Auth user.
    // A cloud function would be needed to delete the auth user.
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await remove(teacherRef);
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
