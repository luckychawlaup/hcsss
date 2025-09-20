
import { db, auth as firebaseAuth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";

const TEACHERS_COLLECTION = "teachers";

export interface Teacher {
  id: string; // Firestore doc ID, should be same as authUid
  authUid: string;
  email: string;
  name: string;
  photoUrl?: string;
  dob: string; // YYYY-MM-DD
  fatherName: string;
  motherName: string;
  phoneNumber: string;
  address: string;
  role: "classTeacher" | "subjectTeacher";
  subject: string;
  joiningDate: Timestamp;
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
> & { dob: Date };

export const addTeacher = async (teacherData: AddTeacherData) => {
  const userCredential = await createUserWithEmailAndPassword(
    firebaseAuth,
    teacherData.email,
    Math.random().toString(36).slice(-8) // Temporary password
  );
  const user = userCredential.user;
  await sendEmailVerification(user);

  const finalTeacherData: Omit<Teacher, "id"> = {
    ...teacherData,
    authUid: user.uid,
    dob: teacherData.dob.toISOString().split('T')[0],
    joiningDate: Timestamp.now(),
  };
  
  await setDoc(doc(db, TEACHERS_COLLECTION, user.uid), finalTeacherData);
  
  return { uid: user.uid };
}

export const getTeachersAndPending = (callback: (teachers: Teacher[]) => void) => {
  const teachersColl = collection(db, TEACHERS_COLLECTION);
  
  const unsubTeachers = onSnapshot(
    teachersColl,
    (snapshot) => {
      const teachersData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(), 
          authUid: doc.id, 
      } as Teacher));
      callback(teachersData.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      console.error("Error fetching teachers: ", error);
    }
  );

  return unsubTeachers;
};

export const getTeacherByAuthId = async (
  authUid: string
): Promise<Teacher | null> => {
  const teacherRef = doc(db, TEACHERS_COLLECTION, authUid);
  const docSnap = await getDoc(teacherRef);
  if (docSnap.exists()) {
      return { id: docSnap.id, authUid: docSnap.id, ...docSnap.data() } as Teacher;
  }
  return null;
};

export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
  const q = query(collection(db, TEACHERS_COLLECTION), where("email", "==", email));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, authUid: doc.id, ...doc.data() } as Teacher;
  }
  return null;
};

export const getTeacherForClass = async (classSection: string): Promise<Teacher | null> => {
    const q = query(collection(db, TEACHERS_COLLECTION), where("classTeacherOf", "==", classSection));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, authUid: doc.id, ...doc.data() } as Teacher;
    }
    return null;
};

export const updateTeacher = async (
  teacherId: string,
  updatedData: Partial<Omit<Teacher, 'id'>>
) => {
  const teacherRef = doc(db, TEACHERS_COLLECTION, teacherId);
  await updateDoc(teacherRef, updatedData);
};

export const deleteTeacher = async (teacherId: string) => {
  await deleteDoc(doc(db, TEACHERS_COLLECTION, teacherId));
  // Auth user must be deleted from the Firebase console
  console.log(`Teacher ${teacherId} deleted from database. Please delete from Firebase Authentication.`);
};
