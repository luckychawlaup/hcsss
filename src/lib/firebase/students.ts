
import { db, auth as firebaseAuth } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch
} from "firebase/firestore";
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
  id: string; // Firestore document ID
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
  admissionDate: Timestamp;
  dateOfBirth: string; // YYYY-MM-DD
  aadharNumber?: string;
  aadharUrl?: string;
  optedSubjects?: string[];
  fatherPhone?: string;
  motherPhone?: string;
  studentPhone?: string;
}

export type CombinedStudent = (Student & { status: 'Registered' });

export type AddStudentData = Omit<Student, "id" | "srn" | "admissionDate"> & { admissionDate: Date };

// Add or update a student with a specific UID
export const addStudent = async (studentData: AddStudentData) => {
  const currentUser = firebaseAuth.currentUser;
  let createdUser = null;

  try {
    // First check if a student with this email already exists in the database
    const q = query(collection(db, STUDENTS_COLLECTION), where("email", "==", studentData.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`Student with email ${studentData.email} already exists.`);
    }

    // Create Firebase Auth user
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, studentData.email, Math.random().toString(36).slice(-8));
      createdUser = userCredential.user;
      await sendEmailVerification(userCredential.user);
      
      // Sign out the newly created user to restore previous session if any
      await signOut(firebaseAuth);

    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') {
        throw new Error(`The email ${studentData.email} is already registered in the authentication system.`);
      } else {
        throw authError;
      }
    }

    // Generate SRN
    const srn = await generateUniqueSRN();

    const finalStudentData = {
      ...studentData,
      authUid: createdUser.uid,
      srn,
      admissionDate: Timestamp.fromDate(studentData.admissionDate),
    };

    // Save student data to Firestore
    await setDoc(doc(db, STUDENTS_COLLECTION, createdUser.uid), finalStudentData);

    return { success: true, uid: createdUser.uid, srn };

  } catch (error: any) {
    if (createdUser) {
      try {
        await deleteUser(createdUser);
      } catch (cleanupError) {
        console.error('CRITICAL: Failed to cleanup created auth user:', cleanupError);
      }
    }
    console.error("Error adding student: ", error.message);
    throw error;
  }
};

const generateUniqueSRN = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 10) {
    const srn = `SRN${Math.floor(1000 + Math.random() * 9000)}`;
    const q = query(collection(db, STUDENTS_COLLECTION), where("srn", "==", srn));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return srn;
    }
    attempts++;
  }
  throw new Error('Unable to generate unique SRN');
};

// Get all students with real-time updates
export const getStudents = (callback: (students: Student[]) => void) => {
  const studentsColl = collection(db, STUDENTS_COLLECTION);
  const unsubscribe = onSnapshot(studentsColl, (snapshot) => {
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    callback(students);
  }, (error) => {
    console.error("Error fetching students: ", error);
    callback([]);
  });
  return unsubscribe;
};

export const getStudentsForTeacher = (teacher: Teacher, callback: (students: CombinedStudent[]) => void) => {
  const assignedClasses = new Set<string>();
  if (teacher.classTeacherOf) assignedClasses.add(teacher.classTeacherOf);
  if (teacher.classesTaught) teacher.classesTaught.forEach(c => assignedClasses.add(c));
  
  if (assignedClasses.size === 0) {
    callback([]);
    return () => {};
  }
  
  const classArray = Array.from(assignedClasses);
  const q = query(collection(db, STUDENTS_COLLECTION), where("classSection", "in", classArray));

  return onSnapshot(q, (snapshot) => {
    const teacherStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), status: 'Registered' } as CombinedStudent));
    callback(teacherStudents);
  });
};

export const getStudentById = async (id: string): Promise<Student | null> => {
    const studentRef = doc(db, STUDENTS_COLLECTION, id);
    const docSnap = await getDoc(studentRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Student;
    }
    return null;
}

export const getStudentByAuthId = async (authUid: string): Promise<Student | null> => {
  const studentRef = doc(db, STUDENTS_COLLECTION, authUid);
  const docSnap = await getDoc(studentRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Student;
  }
  return null;
}

export const getStudentByEmail = async (email: string): Promise<Student | null> => {
  const q = query(collection(db, STUDENTS_COLLECTION), where("email", "==", email));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Student;
  }
  return null;
}

export const updateStudent = async (id: string, updatedData: Partial<Omit<Student, 'id'>>) => {
  const studentRef = doc(db, STUDENTS_COLLECTION, id);
  await updateDoc(studentRef, updatedData);
};

export const deleteStudent = async (id: string) => {
  const studentRef = doc(db, STUDENTS_COLLECTION, id);
  await deleteDoc(studentRef);
  // Deleting the auth user should be handled by a backend function for security.
  console.log(`Student data for ${id} deleted. Auth user must be deleted from the Firebase Console.`);
};

export const getStudentsAndPending = (callback: (students: CombinedStudent[]) => void) => {
  const studentsColl = collection(db, STUDENTS_COLLECTION);
  const unsubStudents = onSnapshot(studentsColl, (snapshot) => {
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), status: 'Registered' } as CombinedStudent));
    callback(students.sort((a, b) => a.name.localeCompare(b.name)));
  });
  
  return unsubStudents;
}
