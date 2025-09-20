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
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  deleteUser, 
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

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

export type AddStudentData = Omit<Student, "id" | "srn">;

// Add or update a student with a specific UID
export const addStudent = async (studentData: Omit<Student, 'id' | 'srn'>) => {
  const currentUser = firebaseAuth.currentUser;
  let createdUser = null;

  try {
    // First check if a student with this email already exists in the database
    const existingStudent = await getStudentByEmail(studentData.email);
    if (existingStudent) {
      throw new Error(`Student with email ${studentData.email} already exists in the system`);
    }

    // Check if authUid is provided and if student already exists with that authUid
    if (studentData.authUid) {
      const existingByAuthUid = await getStudentByAuthId(studentData.authUid);
      if (existingByAuthUid) {
        throw new Error(`Student with auth UID ${studentData.authUid} already exists`);
      }
    }

    let authUid = studentData.authUid;

    // If no authUid provided, we need to create a Firebase Auth user
    if (!authUid) {
      try {
        // Generate a temporary password for the student
        const tempPassword = generateTempPassword();
        
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
          firebaseAuth, 
          studentData.email, 
          tempPassword
        );
        
        createdUser = userCredential.user;
        authUid = userCredential.user.uid;

        // Send email verification
        await sendEmailVerification(userCredential.user);

        // Sign out the newly created user to restore previous session
        await signOut(firebaseAuth);
        
        // Restore the previous user session if there was one
        if (currentUser) {
          // Note: You might need to handle re-authentication here
          // depending on your application's authentication flow
        }

      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          // Email is already registered in Firebase Auth but not in our database
          // This could happen if someone partially registered or if there's data inconsistency
          throw new Error(
            `The email ${studentData.email} is already registered. ` +
            `If this is a mistake, please contact the administrator to resolve the conflict.`
          );
        } else {
          throw new Error(`Failed to create user account: ${authError.message}`);
        }
      }
    }

    // Generate SRN
    const srn = await generateUniqueSRN();

    const finalStudentData: Omit<Student, 'id'> = {
      ...studentData,
      authUid,
      srn,
    };

    // Save student data to database
    const studentRef = ref(db, `${STUDENTS_COLLECTION}/${authUid}`);
    await set(studentRef, finalStudentData);

    return { success: true, authUid, srn };

  } catch (error: any) {
    // If we created a user but failed to save to database, clean up the auth user
    if (createdUser) {
      try {
        await deleteUser(createdUser);
        console.log('Cleaned up created auth user due to database error');
      } catch (cleanupError) {
        console.error('Failed to cleanup created auth user:', cleanupError);
      }
    }

    console.error("Error adding student: ", error.message);
    throw error;
  }
};

// Generate a unique SRN
const generateUniqueSRN = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const srn = `SRN${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Check if SRN already exists
    const studentsRef = ref(db, STUDENTS_COLLECTION);
    const q = query(studentsRef, orderByChild('srn'), equalTo(srn));
    const snapshot = await get(q);
    
    if (!snapshot.exists()) {
      return srn;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique SRN after multiple attempts');
};

// Generate temporary password for new students
const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
      return { id: snapshot.key!, ...snapshot.val() };
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
    
    // Remove from database first
    await remove(studentRef);

    // Note: Deleting the auth user should be done via a backend/cloud function
    // as it requires admin privileges. Client-side deletion only works for the current user.
    console.log(`Student data deleted from database. Auth user deletion should be handled server-side for UID: ${uid}`);

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
    callback(combined.sort((a, b) => a.name.localeCompare(b.name)));
  });
  
  return () => {
    unsubStudents();
  }
}