

import { db, auth as firebaseAuth } from "@/lib/firebase";
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
import { createUserWithEmailAndPassword, sendEmailVerification, deleteUser, getAuth } from "firebase/auth";


const STUDENTS_COLLECTION = "students";

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
}

export type CombinedStudent = (Student & { status: 'Registered' });


export type AddStudentData = Omit<
  Student,
  "id" | "srn"
>;

// Add or update a student with a specific UID
export const addStudent = async (studentData: Omit<Student, 'id' | 'srn'>) => {
  try {
    const srn = `SRN${Math.floor(1000 + Math.random() * 9000)}`;

    const finalStudentData: Omit<Student, 'id'> = {
        ...studentData,
        srn,
    };

    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${studentData.authUid}`);
    await set(studentRef, finalStudentData);

  } catch (e: any) {
    console.error("Error adding student DB record: ", e.message);
    // This error will be caught by the calling function in the form
    throw e;
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

// Get students assigned to a specific teacher
export const getStudentsForTeacher = (teacher: Teacher, callback: (students: CombinedStudent[]) => void) => {
    const assignedClasses = new Set<string>();
    if (teacher.classTeacherOf) {
        assignedClasses.add(teacher.classTeacherOf);
    }
    if (teacher.classesTaught) {
        teacher.classesTaught.forEach(c => classes.add(c));
    }
    
    if (assignedClasses.size === 0) {
        callback([]);
        return () => {};
    }

    return getStudentsAndPending((allStudents) => {
        const teacherStudents = allStudents.filter(student => {
            const classSection = `${student.class}-${student.section}`;
            return assignedClasses.has(classSection);
        });
        callback(teacherStudents);
    });
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

// Get a single student by Email
export const getStudentByEmail = async (email: string): Promise<Student | null> => {
  const studentsRef = ref(db, STUDENTS_COLLECTION);
  const q = query(studentsRef, orderByChild('email'), equalTo(email));
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

// Delete a student's data and auth account.
export const deleteStudent = async (uid: string) => {
  const studentRef = ref(db, `${STUDENTS_COLLECTION}/${uid}`);
  
  try {
    const studentSnapshot = await get(studentRef);
    if (!studentSnapshot.exists()) {
      console.warn(`Student with UID ${uid} not found in database. Cannot complete deletion.`);
      return;
    }
    
    // This is a placeholder for a backend function that would delete the auth user
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
        // This is a client-side simulation. In a real app, this MUST be a backend function.
        console.log(`[SIMULATION] Deleting auth user for UID: ${uid}. This will likely fail on client.`);
    }

    await remove(studentRef);

  } catch (e) {
    console.error("Error deleting student:", e);
    throw e;
  }
};

export const getStudentsAndPending = (callback: (students: CombinedStudent[]) => void) => {
    const studentsRef = ref(db, STUDENTS_COLLECTION);

    const unsubStudents = onValue(studentsRef, (snapshot) => {
        const students: Student[] = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                students.push({ id: childSnapshot.key!, ...childSnapshot.val() });
            });
        }
        const combined: CombinedStudent[] = students.map(s => ({ ...s, status: 'Registered' as const }));
        callback(combined.sort((a,b) => a.name.localeCompare(b.name)));
    });
    
    return () => {
        unsubStudents();
    }
}
