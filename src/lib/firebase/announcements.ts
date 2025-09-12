
import { db } from "@/lib/firebase";
import {
  ref,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  get,
  DataSnapshot,
  serverTimestamp,
} from "firebase/database";
import type { DocumentData } from "firebase/firestore";

const ANNOUNCEMENTS_COLLECTION = "announcements";

export interface Announcement extends DocumentData {
  id: string;
  title: string;
  content: string;
  category: string;
  target: "students" | "teachers" | "both";
  createdAt: number; // Use timestamp for ordering
}

// Add a new announcement
export const addAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'createdAt'>) => {
  try {
    const announcementsRef = ref(db, ANNOUNCEMENTS_COLLECTION);
    await push(announcementsRef, { 
        ...announcementData,
        createdAt: Date.now()
    });
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
  const announcementsRef = ref(db, ANNOUNCEMENTS_COLLECTION);
  
  // RTDB queries are less flexible than Firestore. We fetch all and filter client-side for "both" case.
  const announcementsQuery = query(announcementsRef, orderByChild('createdAt'));

  const unsubscribe = onValue(announcementsQuery, (snapshot: DataSnapshot) => {
    const allAnnouncements: Announcement[] = [];
    if(snapshot.exists()) {
        const data = snapshot.val();
         for (const id in data) {
            allAnnouncements.push({ id, ...data[id] });
        }
    }
    
    // Filter announcements for the target audience
    const filtered = allAnnouncements.filter(
        (ann) => ann.target === target || ann.target === "both"
    );

    // Sort by most recent
    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

    callback(sorted);
  });
  return unsubscribe; // Return the unsubscribe function to clean up the listener
};
