

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
import { format } from "date-fns";


const STUDENTS_COLLECTION = "students";
const REGISTRATIONS_COLLECTION = "student_registrations";

export interface Student {
  id: string; // Firebase Auth UID
  srn?: string;
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

export type StudentRegistrationData = Omit<
  Student,
  "id" | "authUid" | "admissionDate" | "srn"
>;

// Principal action: Creates a registration entry with a key.
export const registerStudentDetails = async (
  studentData: StudentRegistrationData
) => {
  const registrationKey = Math.random().toString(36).substring(2, 10).toUpperCase();
  const registrationRef = ref(db, `${REGISTRATIONS_COLLECTION}/${registrationKey}`);
  
  await set(registrationRef, {
    ...studentData,
    registrationKey: registrationKey,
  });

  return { registrationKey, email: studentData.email };
};


// Student action: Verify details and claim account
export const verifyAndClaimStudentAccount = async (data: {
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

    // Generate SRN
    const srn = `SRN${Math.floor(1000 + Math.random() * 9000)}`;

    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${data.authUid}`);
    const finalStudentData: Omit<Student, 'id' | 'registrationKey'> = {
        ...regData,
        admissionDate: Date.now(),
        authUid: data.authUid,
        srn,
    };
    delete finalStudentData.registrationKey; 

    await set(studentRef, finalStudentData);
    await remove(regRef); 

    return { success: true, message: "Account claimed successfully."};
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
