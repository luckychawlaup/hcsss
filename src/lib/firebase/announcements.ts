

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
  targetAudience?: {
    type: "class" | "student";
    value: string; // class-section string or studentId
  };
  createdAt: number; // Use timestamp for ordering
  createdBy?: string; // UID of creator (principal or teacher)
  creatorName?: string;
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
    targetRole: "students" | "teachers",
    studentInfo: { classSection: string; studentId: string } | null,
    callback: (announcements: Announcement[]) => void
) => {
  const announcementsRef = ref(db, ANNOUNCEMENTS_COLLECTION);
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
    const filtered = allAnnouncements.filter(ann => {
        // Principal-level announcements
        if (ann.target === targetRole || ann.target === "both") {
            // If it's a general announcement without specific audience, show it
            if (!ann.targetAudience) {
                return true;
            }
        }
        
        // Teacher-level announcements for a specific student or class
        if (targetRole === 'students' && ann.targetAudience && studentInfo) {
            const { type, value } = ann.targetAudience;
            if (type === 'class' && value === studentInfo.classSection) {
                return true;
            }
            if (type === 'student' && value === studentInfo.studentId) {
                return true;
            }
        }
        
        return false;
    });

    // Sort by most recent
    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

    callback(sorted);
  });
  return unsubscribe; // Return the unsubscribe function to clean up the listener
};
