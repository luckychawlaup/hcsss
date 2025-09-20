

import { db, auth as firebaseAuth } from "@/lib/firebase";
import {
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

const TEACHERS_COLLECTION = "teachers";


export interface Teacher {
  id: string; // This will be the auth UID
  authUid: string;
  email: string;
  name: string;
  photoUrl?: string;
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
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
}

export type AddTeacherData = Omit<
  Teacher,
  "id" | "authUid" | "joiningDate"
>;

// Principal action: Add a new teacher, create their auth account, and save details.
export const addTeacher = async (teacherData: AddTeacherData) => {
  // This is a placeholder password, it won't be used.
  const tempPassword = Math.random().toString(36).slice(-8);

  const userCredential = await createUserWithEmailAndPassword(
    firebaseAuth,
    teacherData.email,
    tempPassword
  );
  const user = userCredential.user;

  await sendEmailVerification(user);

  const finalTeacherData: Omit<Teacher, 'id'> = {
    ...teacherData,
    authUid: user.uid,
    joiningDate: Date.now(),
  };
  
  const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${user.uid}`);
  await set(teacherRef, finalTeacherData);
  
  return { uid: user.uid };
}


// Get all teachers with real-time updates
export const getTeachersAndPending = (callback: (teachers: Teacher[]) => void) => {
  const teachersRef = ref(db, TEACHERS_COLLECTION);
  
  const unsubTeachers = onValue(
    teachersRef,
    (snapshot: DataSnapshot) => {
      const teachersData: Teacher[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const id in data) {
          teachersData.push({ id, ...data[id], authUid: id, status: 'Registered' });
        }
      }
      callback(teachersData.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error("Error fetching teachers: ", error);
    }
  );

  return unsubTeachers;
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

// Get a single teacher by email
export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
  const teachersRef = ref(db, TEACHERS_COLLECTION);
  const q = query(teachersRef, orderByChild('email'), equalTo(email));
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const id = Object.keys(data)[0];
    return { id, authUid: id, ...data[id] };
  }
  return null;
};


// Find the class teacher for a specific class-section
export const getTeacherForClass = async (classSection: string): Promise<Teacher | null> => {
    const teachersRef = query(ref(db, TEACHERS_COLLECTION), orderByChild('classTeacherOf'), equalTo(classSection));
    const snapshot = await get(teachersRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const teacherId = Object.keys(data)[0];
        return { id: teacherId, authUid: teacherId, ...data[teacherId] };
    }
    return null;
};


// Update a teacher's details
export const updateTeacher = async (
  teacherId: string,
  updatedData: Partial<Teacher>
) => {
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
    
    // In a real app, this MUST be a backend function.
    // admin.auth().deleteUser(teacherId) would be called here.
    console.log(`Simulating deletion of auth user for ${teacherId}`);
    
    await remove(teacherRef); // Delete from /teachers

  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
