
import { db } from "@/lib/firebase";
import { uploadImage as uploadImageToImageKit } from "@/lib/imagekit";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const HOMEWORK_COLLECTION = "homework";

export interface Homework {
  id: string;
  assignedBy: string; // auth uid of the teacher
  teacherName: string;
  classSection: string; // e.g., "10-A"
  subject: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  assignedAt: Timestamp;
  attachmentUrl?: string;
  attachmentPath?: string;
}

// Add new homework, optionally with a file attachment
export const addHomework = async (
  homeworkData: Omit<Homework, "id" | "assignedAt" | "attachmentUrl" | "attachmentPath">,
  attachment?: File
) => {
  let finalHomeworkData: Omit<Homework, "id"> = { ...homeworkData, assignedAt: Timestamp.now() };

  if (attachment) {
    const downloadURL = await uploadImageToImageKit(attachment, 'gallery');
    finalHomeworkData.attachmentUrl = downloadURL;
  }
  
  await addDoc(collection(db, HOMEWORK_COLLECTION), finalHomeworkData);
};

// Update homework
export const updateHomework = async (
  homeworkId: string,
  updates: Partial<Omit<Homework, "id" | "assignedAt">>,
  newAttachment?: File
) => {
    if (newAttachment) {
        const downloadURL = await uploadImageToImageKit(newAttachment, 'gallery');
        updates.attachmentUrl = downloadURL;
        updates.attachmentPath = undefined; // We don't store path anymore
    }

    await updateDoc(doc(db, HOMEWORK_COLLECTION, homeworkId), updates);
};

// Delete homework
export const deleteHomework = async (homeworkId: string) => {
    await deleteDoc(doc(db, HOMEWORK_COLLECTION, homeworkId));
};

// Get all homework for a specific classSection with real-time updates
export const getHomeworks = (
  classSection: string,
  callback: (homework: Homework[]) => void
) => {
  const q = query(
    collection(db, HOMEWORK_COLLECTION),
    where("classSection", "==", classSection),
    orderBy("assignedAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const allHomework = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Homework));
    callback(allHomework);
  });
  return unsubscribe;
};

// Get all homework assignments by a specific teacher
export const getHomeworksByTeacher = (
    teacherId: string,
    callback: (homework: Homework[]) => void
) => {
    const q = query(
        collection(db, HOMEWORK_COLLECTION),
        where('assignedBy', '==', teacherId),
        orderBy('assignedAt', 'desc')
    );

     const unsubscribe = onSnapshot(q, (snapshot) => {
        const allHomework = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Homework));
        callback(allHomework);
    });
    return unsubscribe;
}
