
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  QueryConstraint,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";

const ANNOUNCEMENTS_COLLECTION = "announcements";

export interface Announcement extends DocumentData {
  id: string;
  title: string;
  content: string;
  category: string;
  target: "students" | "teachers" | "both";
  createdAt: Date;
}

// Add a new announcement
export const addAnnouncement = async (announcementData: Omit<Announcement, 'id'>) => {
  try {
    await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), announcementData);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// Get announcements with real-time updates based on target
export const getAnnouncements = (
    target: "students" | "teachers",
    callback: (announcements: Announcement[]) => void
) => {
  const constraints: QueryConstraint[] = [
      where("target", "in", [target, "both"]),
      orderBy("createdAt", "desc")
  ];
  const q = query(collection(db, ANNOUNCEMENTS_COLLECTION), ...constraints);
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const announcements: Announcement[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      announcements.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt.toDate() // Convert Firestore Timestamp to JS Date
      } as Announcement);
    });
    callback(announcements);
  });
  return unsubscribe; // Return the unsubscribe function to clean up the listener
};
