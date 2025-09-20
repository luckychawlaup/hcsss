

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
import type { Teacher } from "./teachers";


const STUDENTS_COLLECTION = "students";
const REGISTRATIONS_COLLECTION = "student_registrations";

export interface Student {
  id: string; // Firebase Auth UID
  srn?: string;
  authUid: string;
  email: string;
  name: string;
  photoUrl?: string;
  fatherName: string;
  motherName: string;
  address: string;
  class: string;
  section: string;
  admissionDate: number;
  dateOfBirth: string;
  aadharNumber?: string;
  aadharUrl?: string;
  optedSubjects?: string[];
  fatherPhone?: string;
  motherPhone?: string;
  studentPhone?: string;
  mustChangePassword?: boolean;
}

export interface PendingStudent extends Omit<Student, 'id' | 'authUid' | 'srn'> {
    id: string; // registration key
    registrationKey: string;
}

export type CombinedStudent = (Student & { status: 'Registered' }) | (PendingStudent & { status: 'Pending' });


export type StudentRegistrationData = Omit<
  Student,
  "id" | "authUid" | "srn"
> & {
    dateOfBirth: Date;
    admissionDate: Date;
};

// Principal action: Creates a registration entry with a key.
export const registerStudentDetails = async (
  studentData: StudentRegistrationData
) => {
  const registrationKey = Math.random().toString(36).substring(2, 10).toUpperCase();
  const registrationRef = ref(db, `${REGISTRATIONS_COLLECTION}/${registrationKey}`);
  
  const dataToSave = {
      ...studentData,
      dateOfBirth: format(studentData.dateOfBirth, "yyyy-MM-dd"),
      admissionDate: studentData.admissionDate.getTime(),
      registrationKey,
      photoUrl: studentData.photoUrl || "",
      aadharUrl: studentData.aadharUrl || "",
      aadharNumber: studentData.aadharNumber || "",
      studentPhone: studentData.studentPhone || "",
      fatherPhone: studentData.fatherPhone || "",
      motherPhone: studentData.motherPhone || "",
  }

  await set(registrationRef, dataToSave);

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
        authUid: data.authUid,
        srn,
    };
    delete (finalStudentData as any).registrationKey; 

    await set(studentRef, finalStudentData);
    await update(regRef, { claimedBy: data.authUid });

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
export const getStudentsAndPending = (callback: (students: CombinedStudent[]) => void) => {
  const studentsRef = ref(db, STUDENTS_COLLECTION);
  const registrationsRef = ref(db, REGISTRATIONS_COLLECTION);

  let registeredStudents: Student[] = [];
  let pendingStudents: PendingStudent[] = [];

  const processAndCallback = () => {
      const combined: CombinedStudent[] = [
          ...registeredStudents.map(s => ({...s, status: 'Registered' as const})),
          ...pendingStudents.map(p => ({...p, status: 'Pending' as const}))
      ];
      callback(combined.sort((a, b) => a.name.localeCompare(b.name)));
  }

  const unsubStudents = onValue(
    studentsRef,
    (snapshot: DataSnapshot) => {
      const studentsData: Student[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const id in data) {
          studentsData.push({ id, ...data[id] });
        }
      }
      registeredStudents = studentsData;
      processAndCallback();
    },
    (error) => {
      console.error("Error fetching students: ", error);
    }
  );

   const unsubRegistrations = onValue(
    registrationsRef,
    (snapshot: DataSnapshot) => {
      const pendingData: PendingStudent[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const id in data) {
          if (!data[id].claimedBy) {
             pendingData.push({ id, ...data[id] });
          }
        }
      }
      pendingStudents = pendingData;
      processAndCallback();
    },
    (error) => {
      console.error("Error fetching student registrations: ", error);
    }
  );

  return () => {
    unsubStudents();
    unsubRegistrations();
  };
};

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

// Get students assigned to a specific teacher
export const getStudentsForTeacher = (teacher: Teacher, callback: (students: Student[]) => void) => {
    const assignedClasses = new Set<string>();
    if (teacher.classTeacherOf) {
        assignedClasses.add(teacher.classTeacherOf);
    }
    if (teacher.classesTaught) {
        teacher.classesTaught.forEach(c => assignedClasses.add(c));
    }
    
    if (assignedClasses.size === 0) {
        callback([]);
        return () => {};
    }

    const studentsRef = ref(db, STUDENTS_COLLECTION);
    const unsubscribe = onValue(studentsRef, (snapshot) => {
        const students: Student[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const student = childSnapshot.val();
                const classSection = `${student.class}-${student.section}`;
                if (assignedClasses.has(classSection)) {
                    students.push({ id: childSnapshot.key!, ...student });
                }
            });
        }
        callback(students);
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
  const studentsRef = ref(db, STUDENTS_COLLECTION);
  const q = query(studentsRef, orderByChild('authUid'), equalTo(authUid));
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const id = Object.keys(data)[0];
    return { id, ...data[id] };
  }
  return null;
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
    // This is the registration key for a pending student, or authUID for a registered one.
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${uid}`);
    const snapshot = await get(studentRef);
    if(snapshot.exists()) {
        await remove(studentRef);
        // Auth user deletion would happen here on a backend
    } else {
        const regRef = ref(db, `${REGISTRATIONS_COLLECTION}/${uid}`);
        await remove(regRef);
    }
  } catch (e) {
    console.error("Error deleting student document: ", e);
    throw e;
  }
};
