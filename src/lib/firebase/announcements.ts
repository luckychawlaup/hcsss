
import { db } from "@/lib/firebase";
import { uploadImage as uploadImageToImageKit } from "@/lib/imagekit";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  or,
} from "firebase/firestore";
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
  createdAt: Timestamp;
  editedAt?: Timestamp;
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
    const announcementsColl = collection(db, ANNOUNCEMENTS_COLLECTION);
    
    let finalAnnouncementData: Omit<Announcement, 'id'> = {
        ...announcementData,
        createdAt: Timestamp.now()
    };
    
    if (attachment) {
        const attachmentUrl = await uploadImageToImageKit(attachment, "gallery");
        finalAnnouncementData.attachmentUrl = attachmentUrl;
    }

    await addDoc(announcementsColl, finalAnnouncementData);
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
  const announcementsColl = collection(db, ANNOUNCEMENTS_COLLECTION);
  
  const announcementsQuery = query(announcementsColl,
    or(
        where("target", "in", ["students", "both"]),
        where("targetAudience.value", "==", studentInfo.classSection),
        where("targetAudience.value", "==", studentInfo.studentId)
    ),
    orderBy("createdAt", "asc")
   );

  const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
    const allAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
    
    // Additional client-side filtering for more complex logic
    const filtered = allAnnouncements.filter(ann => {
        // General announcements for all students or everyone
        if (ann.target === "students" && !ann.targetAudience) return true;
        if (ann.target === "both" && !ann.targetAudience) return true;
        
        // Announcements targeted to the student's class
        if (ann.targetAudience?.type === 'class' && ann.targetAudience.value === studentInfo.classSection) return true;

        // Announcements targeted specifically to the student
        if (ann.targetAudience?.type === 'student' && ann.targetAudience.value === studentInfo.studentId) return true;
        
        return false;
    });

    callback(filtered);
  });
  return unsubscribe;
};

// Get announcements for a specific class (for teachers)
export const getAnnouncementsForClass = (
    classSection: string,
    callback: (announcements: Announcement[]) => void
) => {
    const announcementsColl = collection(db, ANNOUNCEMENTS_COLLECTION);
    const announcementsQuery = query(
        announcementsColl, 
        where('targetAudience.value', '==', classSection), 
        orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
        const classAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        callback(classAnnouncements);
    });
    return unsubscribe;
}

// Get announcements for all teachers
export const getAnnouncementsForTeachers = (
    callback: (announcements: Announcement[]) => void
) => {
    const announcementsColl = collection(db, ANNOUNCEMENTS_COLLECTION);
    const announcementsQuery = query(
        announcementsColl,
        where('target', 'in', ['teachers', 'both']),
        where('targetAudience', '==', null), // Ensure it's a general broadcast
        orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
        const teacherAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        callback(teacherAnnouncements);
    });

    return unsubscribe;
}


// Get all announcements, intended for principal/admin views
export const getAllAnnouncements = (callback: (announcements: Announcement[]) => void) => {
    const announcementsColl = collection(db, ANNOUNCEMENTS_COLLECTION);
    const announcementsQuery = query(announcementsColl, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
        const allAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        callback(allAnnouncements);
    });

    return unsubscribe;
};

// Update an existing announcement
export const updateAnnouncement = async (announcementId: string, content: string) => {
  const announcementRef = doc(db, ANNOUNCEMENTS_COLLECTION, announcementId);
  await updateDoc(announcementRef, {
    content: content,
    editedAt: Timestamp.now()
  });
};

// Delete an announcement
export const deleteAnnouncement = async (announcementId: string) => {
  const announcementRef = doc(db, ANNOUNCEMENTS_COLLECTION, announcementId);
  await deleteDoc(announcementRef);
};
