

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
  tempPassword?: string;
  mustChangePassword?: boolean;
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
}

export interface PendingTeacher extends Omit<Teacher, 'id' | 'authUid' | 'joiningDate'> {
    id: string; // registration key
    registrationKey: string;
}

export type CombinedTeacher = (Teacher & { status: 'Registered' }) | (PendingTeacher & { status: 'Pending' });


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
    
    // We update the registration record to mark it as claimed, but don't delete it
    await update(regRef, { claimedBy: data.authUid });

    return { success: true, message: "Account claimed successfully."};
}

// Regenerate a temporary password for a teacher
export const regenerateTemporaryPassword = async (teacherId: string): Promise<string> => {
    const tempPassword = Math.random().toString(36).slice(-8);
    const teacherRef = ref(db, `${TEACHERS_COLLECTION}/${teacherId}`);
    
    // This is a placeholder for updating the auth user's password via a backend function.
    // In a real app, you would call a Firebase Function here to use the Admin SDK
    // to update the password for the user with authUid = teacherId.
    // For now, we'll store it in the DB and show it to the admin.
    await update(teacherRef, {
        tempPassword: tempPassword,
        mustChangePassword: true,
    });

    return tempPassword;
}


// Get all teachers with real-time updates
export const getTeachersAndPending = (callback: (teachers: CombinedTeacher[]) => void) => {
  const teachersRef = ref(db, TEACHERS_COLLECTION);
  const registrationsRef = ref(db, REGISTRATIONS_COLLECTION);

  let registeredTeachers: Teacher[] = [];
  let pendingTeachers: PendingTeacher[] = [];

  const processAndCallback = () => {
      const combined: CombinedTeacher[] = [
          ...registeredTeachers.map(t => ({...t, status: 'Registered' as const})),
          ...pendingTeachers.map(p => ({...p, status: 'Pending' as const}))
      ];
      callback(combined.sort((a, b) => a.name.localeCompare(b.name)));
  }

  const unsubTeachers = onValue(
    teachersRef,
    (snapshot: DataSnapshot) => {
      const teachersData: Teacher[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const id in data) {
          teachersData.push({ id, ...data[id], authUid: id });
        }
      }
      registeredTeachers = teachersData;
      processAndCallback();
    },
    (error) => {
      console.error("Error fetching teachers: ", error);
    }
  );

   const unsubRegistrations = onValue(
    registrationsRef,
    (snapshot: DataSnapshot) => {
      const pendingData: PendingTeacher[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const id in data) {
          // A registration is pending if it has not been claimed
          if (!data[id].claimedBy) {
             pendingData.push({ id, ...data[id] });
          }
        }
      }
      pendingTeachers = pendingData;
      processAndCallback();
    },
    (error) => {
      console.error("Error fetching registrations: ", error);
    }
  );

  return () => {
    unsubTeachers();
    unsubRegistrations();
  };
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

// Get the registration key for a teacher's email
export const getRegistrationKeyForTeacher = async (email: string): Promise<string | null> => {
    try {
        const registrationsRef = query(ref(db, REGISTRATIONS_COLLECTION), orderByChild('email'), equalTo(email));
        const snapshot = await get(registrationsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            const key = Object.keys(data)[0];
            return data[key].registrationKey;
        }
        return null;
    } catch (e) {
        console.error("Error getting registration key:", e);
        return null;
    }
}

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
    const snapshot = await get(teacherRef);
    
    // If the teacher record exists (i.e., they are registered)
    if (snapshot.exists()) {
        const teacherData = snapshot.val();
        if (teacherData?.email) {
            const registrationsRef = query(ref(db, REGISTRATIONS_COLLECTION), orderByChild('email'), equalTo(teacherData.email));
            const regSnapshot = await get(registrationsRef);
            if (regSnapshot.exists()) {
                const keyToDelete = Object.keys(regSnapshot.val())[0];
                const regRef = ref(db, `${REGISTRATIONS_COLLECTION}/${keyToDelete}`);
                await remove(regRef);
            }
        }
        // This is a placeholder for deleting the auth user.
        // In a real app, this MUST be a backend function.
        console.log(`Simulating deletion of auth user for ${teacherId}`);
        
        await remove(teacherRef); // Delete from /teachers
    } else {
        // If the teacher record does not exist in /teachers, it must be a pending registration
        const regRef = ref(db, `${REGISTRATIONS_COLLECTION}/${teacherId}`);
        await remove(regRef); // Delete from /registrations
    }

  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};
