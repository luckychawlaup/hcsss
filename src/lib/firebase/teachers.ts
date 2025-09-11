
import { db } from "@/lib/firebase";
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
}

export type TeacherRegistrationData = Omit<Teacher, 'id' | 'authUid' | 'joiningDate'>;

// Step 1 (Principal): Register teacher details and generate a key
export const registerTeacher = async (teacherData: TeacherRegistrationData) => {
  const registrationKey = Math.random().toString(36).substring(2, 8).toUpperCase();
  const registrationRef = ref(db, `${REGISTRATIONS_COLLECTION}/${registrationKey}`);
  
  const dataToSave = {
    ...teacherData,
    dob: format(teacherData.dob as unknown as Date, "yyyy-MM-dd"),
    joiningDate: Date.now(),
  };

  await set(registrationRef, dataToSave);
  return registrationKey;
};


// Step 2 (Teacher): Verify details and claim account
interface ClaimAccountPayload {
  registrationKey: string;
  name: string;
  email: string;
  authUid: string;
}
export const verifyAndClaimTeacherAccount = async (payload: ClaimAccountPayload) => {
  const { registrationKey, name, email, authUid } = payload;
  const registrationRef = ref(db, `${REGISTRATIONS_COLLECTION}/${registrationKey}`);
  const snapshot = await get(registrationRef);

  if (!snapshot.exists()) {
    return { success: false, message: "Invalid Registration Key. Please check the key provided by the school." };
  }

  const registrationData = snapshot.val();

  if (registrationData.name.toLowerCase() !== name.toLowerCase()) {
    return { success: false, message: "The name entered does not match the registered name. Please check your details." };
  }

  if (registrationData.email.toLowerCase() !== email.toLowerCase()) {
    return { success: false, message: "The email entered does not match the registered email. Please check your details." };
  }

  // Verification successful, create official teacher record
  const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${authUid}`);
  const finalTeacherData: Omit<Teacher, 'id'> = {
    ...registrationData,
    authUid: authUid,
  };
  await set(teacherRef, finalTeacherData);

  // Clean up registration entry
  await remove(registrationRef);

  return { success: true, message: "Account claimed successfully." };
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
    // Note: This only deletes the DB record, not the Firebase Auth user.
    // A cloud function would be needed to delete the auth user.
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await remove(teacherRef);
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
