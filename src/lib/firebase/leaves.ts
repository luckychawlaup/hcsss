
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  or,
} from "firebase/firestore";
import { getTeacherForClass } from "./teachers";


const LEAVES_COLLECTION = "leaves";

export interface LeaveRequest {
  id: string;
  userId: string; // Student ID or Teacher ID
  userName: string;
  userRole: "Student" | "Teacher";
  class?: string; // For students
  startDate: Timestamp;
  endDate: Timestamp;
  reason: string;
  status: "Confirmed" | "Pending" | "Rejected";
  appliedAt: Timestamp;
  teacherId?: string; // UID of the class teacher for student leaves
  rejectionReason?: string; 
  approverComment?: string;
}

// Add a new leave request
export const addLeaveRequest = async (leaveData: Omit<LeaveRequest, "id">) => {
  let finalLeaveData = { ...leaveData };

  if (leaveData.userRole === "Student" && leaveData.class) {
    const classTeacher = await getTeacherForClass(leaveData.class);
    if (classTeacher) {
      finalLeaveData.teacherId = classTeacher.id;
    }
  }

  await addDoc(collection(db, LEAVES_COLLECTION), finalLeaveData);
};

// Listen for all leave requests for a set of student IDs (more efficient)
export const getLeaveRequestsForStudents = (
  studentIds: string[],
  callback: (leaves: LeaveRequest[]) => void
) => {
  if (studentIds.length === 0) {
    callback([]);
    return () => {}; // Return an empty unsubscribe function
  }

  const leavesColl = collection(db, LEAVES_COLLECTION);
  const q = query(leavesColl, where("userRole", "==", "Student"), where("userId", "in", studentIds));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const allLeaves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
     callback(allLeaves.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return b.appliedAt.toMillis() - a.appliedAt.toMillis();
    }));
  });
  return unsubscribe;
};


// Listen for all leave requests assigned to a specific class teacher
export const getLeaveRequestsForClassTeacher = (
    teacherId: string,
    callback: (leaves: LeaveRequest[]) => void
) => {
    const leavesColl = collection(db, LEAVES_COLLECTION);
    const q = query(leavesColl, where("teacherId", "==", teacherId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const teacherLeaves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
        callback(teacherLeaves.sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return b.appliedAt.toMillis() - a.appliedAt.toMillis();
        }));
    });
    return unsubscribe;
};


// Listen for all leave requests for a set of teacher IDs
export const getLeaveRequestsForTeachers = (
  teacherIds: string[],
  callback: (leaves: LeaveRequest[]) => void
) => {
   if (teacherIds.length === 0) {
    callback([]);
    return () => {};
  }
  const leavesColl = collection(db, LEAVES_COLLECTION);
  const q = query(leavesColl, where("userRole", "==", "Teacher"), where("userId", "in", teacherIds));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const allLeaves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
    callback(allLeaves.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return b.appliedAt.toMillis() - a.appliedAt.toMillis();
    }));
  });
  return unsubscribe;
};

// Listen for leave requests for a single user (student or teacher)
export const getLeaveRequestsForUser = (
  userId: string,
  callback: (leaves: LeaveRequest[]) => void
) => {
  const q = query(collection(db, LEAVES_COLLECTION), where("userId", "==", userId), orderBy("appliedAt", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const userLeaves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
    callback(userLeaves);
  });
  return unsubscribe;
}


// Update leave status, comments, or dates
export const updateLeaveRequest = async (
  leaveId: string,
  updates: Partial<LeaveRequest>
) => {
  const leaveRef = doc(db, LEAVES_COLLECTION, leaveId);
  await updateDoc(leaveRef, updates);
};
