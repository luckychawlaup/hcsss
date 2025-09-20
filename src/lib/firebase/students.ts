

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
import { createUserWithEmailAndPassword, sendEmailVerification, deleteUser } from "firebase/auth";


const STUDENTS_COLLECTION = "students";
const PENDING_STUDENTS_COLLECTION = "student_registrations";

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

export interface PendingStudent {
  id: string; // Registration Key
  registrationKey: string;
  email: string;
  name: string;
  photoUrl?: string;
  fatherName: string;
  motherName: string;
  address: string;
  class: string;
  section: string;
  admissionDate: number;
  dateOfBirth: string; // YYYY-MM-DD
  aadharNumber?: string;
  aadharUrl?: string;
  optedSubjects?: string[];
  fatherPhone?: string;
  motherPhone?: string;
  studentPhone?: string;
}

export type CombinedStudent = (Student & { status: 'Registered' }) | (PendingStudent & { status: 'Pending' });


export type AddStudentData = Omit<
  Student,
  "id" | "authUid" | "srn"
>;

// Add or update a student with a specific UID
export const addStudent = async (studentData: Omit<Student, 'id'| 'srn' | 'authUid'>) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, studentData.email, Math.random().toString(36).slice(-8));
    await sendEmailVerification(userCredential.user);
    
    const srn = `SRN${Math.floor(1000 + Math.random() * 9000)}`;

    const finalStudentData: Omit<Student, 'id'> = {
        ...studentData,
        authUid: userCredential.user.uid,
        srn,
    };

    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${userCredential.user.uid}`);
    await set(studentRef, finalStudentData);

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

// Get students assigned to a specific teacher
export const getStudentsForTeacher = (teacher: Teacher, callback: (students: CombinedStudent[]) => void) => {
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
    // First, get the student's data to retrieve their email
    const studentSnapshot = await get(studentRef);
    if (!studentSnapshot.exists()) {
      console.warn(`Student with UID ${uid} not found in database. Cannot complete deletion.`);
      // If student doesn't exist, maybe they are in pending. Let's try to find them by authUid
      const pendingQuery = query(ref(db, PENDING_STUDENTS_COLLECTION), orderByChild('authUid'), equalTo(uid));
      const pendingSnapshot = await get(pendingQuery);
       if (pendingSnapshot.exists()) {
        const pendingKey = Object.keys(pendingSnapshot.val())[0];
        await remove(ref(db, `${PENDING_STUDENTS_COLLECTION}/${pendingKey}`));
      }
      return;
    }
    
    const studentData = studentSnapshot.val() as Student;
    const studentEmail = studentData.email;

    // Now, delete the student record from the database
    await remove(studentRef);

    // Then, find and delete the pending registration if it exists
    if (studentEmail) {
        const pendingStudentQuery = query(ref(db, PENDING_STUDENTS_COLLECTION), orderByChild('email'), equalTo(studentEmail));
        const pendingSnapshot = await get(pendingStudentQuery);
        if (pendingSnapshot.exists()) {
            const pendingKey = Object.keys(pendingSnapshot.val())[0];
            await remove(ref(db, `${PENDING_STUDENTS_COLLECTION}/${pendingKey}`));
        }
    }
    
    // In a real app with a backend, you would now delete the Firebase Auth user.
    // This is a client-side simulation placeholder. The following line WILL FAIL on the client
    // due to insufficient permissions and is for demonstration purposes.
    // For a real implementation, this needs to be a call to a Firebase Function.
    console.log(`[SIMULATION] Would now call backend to delete auth user for UID: ${uid}`);


  } catch (e) {
    console.error("Error deleting student:", e);
    throw e;
  }
};



export const regenerateStudentKey = async (oldKey: string): Promise<string> => {
    const oldRef = ref(db, `${PENDING_STUDENTS_COLLECTION}/${oldKey}`);
    const snapshot = await get(oldRef);
    if (!snapshot.exists()) {
        throw new Error("Student registration not found.");
    }
    const data = snapshot.val();
    await remove(oldRef);

    const newKey = push(ref(db, PENDING_STUDENTS_COLLECTION)).key;
    if (!newKey) throw new Error("Could not generate new key");
    
    const newRef = ref(db, `${PENDING_STUDENTS_COLLECTION}/${newKey}`);
    await set(newRef, { ...data, registrationKey: newKey });
    
    return newKey;
}

export const getStudentsAndPending = (callback: (students: CombinedStudent[]) => void) => {
    const studentsRef = ref(db, STUDENTS_COLLECTION);
    const pendingStudentsRef = ref(db, PENDING_STUDENTS_COLLECTION);

    let registeredStudents: Student[] = [];
    let pendingStudents: PendingStudent[] = [];

    const combineAndCallback = () => {
        const combined: CombinedStudent[] = [
            ...registeredStudents.map(s => ({ ...s, status: 'Registered' as const })),
            ...pendingStudents.map(p => ({ ...p, status: 'Pending' as const }))
        ];
        callback(combined.sort((a,b) => a.name.localeCompare(b.name)));
    };

    const unsubStudents = onValue(studentsRef, (snapshot) => {
        const students: Student[] = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                students.push({ id: childSnapshot.key!, ...childSnapshot.val() });
            });
        }
        registeredStudents = students;
        combineAndCallback();
    });

    const unsubPending = onValue(pendingStudentsRef, (snapshot) => {
        const students: PendingStudent[] = [];
        if(snapshot.exists()){
            snapshot.forEach((childSnapshot) => {
                students.push({ id: childSnapshot.key!, ...childSnapshot.val() });
            });
        }
        pendingStudents = students;
        combineAndCallback();
    });
    
    return () => {
        unsubStudents();
        unsubPending();
    }
}
