
import { db } from "@/lib/firebase";
import {
  ref,
  push,
  onValue,
  update,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

const LEAVES_COLLECTION = "leaves";

export interface LeaveRequest {
  id: string;
  userId: string; // Student ID or Teacher ID
  userName: string;
  userRole: "Student" | "Teacher";
  class?: string; // For students
  date: string;
  reason: string;
  status: "Confirmed" | "Pending" | "Rejected";
  appliedAt: number;
  teacherId?: string;
}

// Add a new leave request
export const addLeaveRequest = async (leaveData: Omit<LeaveRequest, "id">) => {
  const leavesRef = ref(db, LEAVES_COLLECTION);
  await push(leavesRef, leaveData);
};

// Listen for all leave requests for a set of student IDs
export const getLeaveRequestsForStudents = (
  studentIds: string[],
  callback: (leaves: LeaveRequest[]) => void
) => {
  const leavesRef = ref(db, LEAVES_COLLECTION);
  const leavesQuery = query(leavesRef, orderByChild("appliedAt"));

  const unsubscribe = onValue(leavesQuery, (snapshot) => {
    const allLeaves: LeaveRequest[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const id in data) {
        const leave = data[id];
        if (leave.userRole === "Student" && studentIds.includes(leave.userId)) {
          allLeaves.push({ id, ...leave });
        }
      }
    }
    callback(allLeaves.sort((a, b) => b.appliedAt - a.appliedAt));
  });
  return unsubscribe;
};

// Listen for all leave requests for a set of teacher IDs
export const getLeaveRequestsForTeachers = (
  teacherIds: string[],
  callback: (leaves: LeaveRequest[]) => void
) => {
  const leavesRef = ref(db, LEAVES_COLLECTION);
  const leavesQuery = query(leavesRef, orderByChild("appliedAt"));

  const unsubscribe = onValue(leavesQuery, (snapshot) => {
    const allLeaves: LeaveRequest[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const id in data) {
        const leave = data[id];
        if (leave.userRole === "Teacher" && teacherIds.includes(leave.userId)) {
          allLeaves.push({ id, ...leave });
        }
      }
    }
    callback(allLeaves.sort((a, b) => b.appliedAt - a.appliedAt));
  });
  return unsubscribe;
};

// Listen for leave requests for a single user (student or teacher)
export const getLeaveRequestsForUser = (
  userId: string,
  callback: (leaves: LeaveRequest[]) => void
) => {
  const leavesRef = ref(db, LEAVES_COLLECTION);
  const leavesQuery = query(leavesRef, orderByChild("userId"), equalTo(userId));
  
  const unsubscribe = onValue(leavesQuery, (snapshot) => {
    const userLeaves: LeaveRequest[] = [];
    if(snapshot.exists()) {
        const data = snapshot.val();
        for (const id in data) {
            userLeaves.push({id, ...data[id]});
        }
    }
    callback(userLeaves.sort((a,b) => b.appliedAt - a.appliedAt));
  });
  return unsubscribe;
}


// Update leave status
export const updateLeaveStatus = async (
  leaveId: string,
  status: "Confirmed" | "Rejected"
) => {
  const leaveRef = ref(db, `${LEAVES_COLLECTION}/${leaveId}`);
  await update(leaveRef, { status });
};

    