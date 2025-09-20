
import { db } from "@/lib/firebase";
import { uploadImage as uploadImageToImageKit } from "@/lib/imagekit";
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
  set,
  remove,
  update,
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
  createdAt: number;
  editedAt?: number;
  createdBy?: string;
  creatorName?: string;
  creatorRole?: "Principal" | "Owner" | "Teacher" | "Class Teacher" | "Subject Teacher";
  attachmentUrl?: string;
  attachmentPath?: string;
}

// Add a new announcement
export const addAnnouncement = async (
    announcementData: Omit<Announcement, 'id' | 'createdAt'>,
    attachment?: File
) => {
  try {
    const announcementsRef = ref(db, ANNOUNCEMENTS_COLLECTION);
    const newAnnouncementRef = push(announcementsRef);
    const newAnnouncementId = newAnnouncementRef.key;

    if (!newAnnouncementId) {
      throw new Error("Could not generate a new key for the announcement.");
    }

    let finalAnnouncementData: Omit<Announcement, 'id'> = {
        ...announcementData,
        createdAt: Date.now()
    };
    
    if (attachment) {
        const attachmentUrl = await uploadImageToImageKit(attachment, "gallery");
        finalAnnouncementData.attachmentUrl = attachmentUrl;
    }

    await set(newAnnouncementRef, finalAnnouncementData);
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};


// Get announcements with real-time updates for a student
export const getAnnouncementsForStudent = (
    studentInfo: { classSection: string; studentId: string },
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
        // General announcements for all students or everyone from admin
        if (ann.target === "students" && (ann.creatorRole === 'Principal' || ann.creatorRole === 'Owner')) {
            return true;
        }

        if (ann.target === "both" && !ann.targetAudience) {
            return true;
        }
        
        // Announcements targeted to the student's class
        if (ann.targetAudience?.type === 'class' && ann.targetAudience.value === studentInfo.classSection) {
            return true;
        }

        // Announcements targeted specifically to the student
        if (ann.targetAudience?.type === 'student' && ann.targetAudience.value === studentInfo.studentId) {
            return true;
        }
        
        return false;
    });

    const sorted = filtered.sort((a, b) => a.createdAt - b.createdAt);
    callback(sorted);
  });
  return unsubscribe;
};

// Get announcements for a specific class (for teachers)
export const getAnnouncementsForClass = (
    classSection: string,
    callback: (announcements: Announcement[]) => void
) => {
    const announcementsRef = ref(db, ANNOUNCEMENTS_COLLECTION);
    const announcementsQuery = query(announcementsRef, orderByChild('targetAudience/value'), equalTo(classSection));

    const unsubscribe = onValue(announcementsQuery, (snapshot: DataSnapshot) => {
        const classAnnouncements: Announcement[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const id in data) {
                // Additional check because the query is on a nested property
                if(data[id].targetAudience?.value === classSection) {
                    classAnnouncements.push({ id, ...data[id] });
                }
            }
        }
        callback(classAnnouncements.sort((a, b) => a.createdAt - b.createdAt));
    });
    return unsubscribe;
}

// Get announcements for all teachers
export const getAnnouncementsForTeachers = (
    callback: (announcements: Announcement[]) => void
) => {
    const announcementsRef = ref(db, ANNOUNCEMENTS_COLLECTION);
    const announcementsQuery = query(announcementsRef, orderByChild('target'), equalTo('teachers'));

    const unsubscribe = onValue(announcementsQuery, (snapshot: DataSnapshot) => {
        const teacherAnnouncements: Announcement[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const id in data) {
                 if(!data[id].targetAudience) {
                    teacherAnnouncements.push({ id, ...data[id] });
                }
            }
        }
        callback(teacherAnnouncements.sort((a, b) => a.createdAt - b.createdAt));
    });

    return unsubscribe;
}


// Get all announcements, intended for principal/admin views
export const getAllAnnouncements = (callback: (announcements: Announcement[]) => void) => {
    const announcementsRef = ref(db, ANNOUNCEMENTS_COLLECTION);
    const announcementsQuery = query(announcementsRef, orderByChild('createdAt'));

    const unsubscribe = onValue(announcementsQuery, (snapshot: DataSnapshot) => {
        const allAnnouncements: Announcement[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const id in data) {
                allAnnouncements.push({ id, ...data[id] });
            }
        }
        callback(allAnnouncements.sort((a, b) => a.createdAt - b.createdAt));
    });

    return unsubscribe;
};

// Update an existing announcement
export const updateAnnouncement = async (announcementId: string, content: string) => {
  const announcementRef = ref(db, `${ANNOUNCEMENTS_COLLECTION}/${announcementId}`);
  await update(announcementRef, {
    content: content,
    editedAt: Date.now()
  });
};

// Delete an announcement
export const deleteAnnouncement = async (announcementId: string) => {
  const announcementRef = ref(db, `${ANNOUNCEMENTS_COLLECTION}/${announcementId}`);
  await remove(announcementRef);
};
