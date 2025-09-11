

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
  push,
  query,
  orderByChild,
  equalTo,
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
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
}

export type TeacherRegistrationData = Omit<
  Teacher,
  "id" | "authUid" | "joiningDate" | "dob"
> & {
    dob: Date;
};

// Principal action: Creates a registration entry with a key.
export const registerTeacherDetails = async (
  teacherData: TeacherRegistrationData
) => {
  const registrationKey = Math.random().toString(36).substring(2, 10).toUpperCase();
  const registrationRef = ref(db, `${REGISTRATIONS_COLLECTION}/${registrationKey}`);
  
  await set(registrationRef, {
    ...teacherData,
    dob: format(teacherData.dob, "yyyy-MM-dd"),
    registrationKey: registrationKey,
  });

  return { registrationKey, email: teacherData.email };
};

// Teacher action: Verify details and claim account
export const verifyAndClaimTeacherAccount = async (data: {
    authUid: string;
    email: string;
    name: string;
    registrationKey: string;
}) => {
    const regRef = ref(db, `${REGISTRATIONS_COLLECTION}/${data.registrationKey}`);
    const snapshot = await get(regRef);

    if (!snapshot.exists()) {
        return { success: false, message: "Invalid Registration Key." };
    }

    const regData = snapshot.val();
    if (regData.email.toLowerCase() !== data.email.toLowerCase()) {
        return { success: false, message: "Email does not match the registered details." };
    }
    if (regData.name.toLowerCase() !== data.name.toLowerCase()) {
        return { success: false, message: "Name does not match the registered details." };
    }

    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${data.authUid}`);
    const finalTeacherData: Omit<Teacher, 'id' | 'registrationKey'> = {
        ...regData,
        joiningDate: Date.now(),
        authUid: data.authUid,
    };
    delete finalTeacherData.registrationKey; // remove key from final object

    await set(teacherRef, finalTeacherData); // Create teacher record
    await remove(regRef); // Delete registration entry

    return { success: true, message: "Account claimed successfully."};
}


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
      return { id: snapshot.key, authUid: snapshot.key, ...snapshot.val() };
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
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    await remove(teacherRef);
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
