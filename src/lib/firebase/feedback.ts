
import { db } from "@/lib/firebase";
import { ref, push, set } from "firebase/database";

const FEEDBACK_COLLECTION = "feedback";

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userRole: "Student" | "Teacher";
  category: "Complaint" | "Suggestion" | "Feedback";
  subject: string;
  description: string;
  submittedAt: number;
  status: "New" | "In Progress" | "Resolved";
}

// Add a new feedback/complaint
export const addFeedback = async (
  feedbackData: Omit<Feedback, "id" | "submittedAt" | "status">
) => {
  const feedbackRef = ref(db, FEEDBACK_COLLECTION);
  const newFeedbackRef = push(feedbackRef);

  const newFeedback = {
    ...feedbackData,
    submittedAt: Date.now(),
    status: "New" as const,
  };

  await set(newFeedbackRef, newFeedback);
};
