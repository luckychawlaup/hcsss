
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const FEEDBACK_COLLECTION = "feedback";

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userRole: "Student" | "Teacher";
  category: "Complaint" | "Suggestion" | "Feedback";
  subject: string;
  description: string;
  submittedAt: Timestamp;
  status: "New" | "In Progress" | "Resolved";
}

// Add a new feedback/complaint
export const addFeedback = async (
  feedbackData: Omit<Feedback, "id" | "submittedAt" | "status">
) => {
  const newFeedback = {
    ...feedbackData,
    submittedAt: Timestamp.now(),
    status: "New" as const,
  };

  await addDoc(collection(db, FEEDBACK_COLLECTION), newFeedback);
};
