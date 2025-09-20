
import { db } from "@/lib/firebase";
import { uploadImage as uploadImageToImageKit } from "@/lib/imagekit";
import {
  ref as dbRef,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  set,
  update,
  remove,
  get,
} from "firebase/database";

const HOMEWORK_COLLECTION = "homework";

export interface Homework {
  id: string;
  assignedBy: string; // auth uid of the teacher
  teacherName: string;
  classSection: string; // e.g., "10-A"
  subject: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  assignedAt: number;
  attachmentUrl?: string;
  attachmentPath?: string;
}

// Add new homework, optionally with a file attachment
export const addHomework = async (
  homeworkData: Omit<Homework, "id" | "attachmentUrl" | "attachmentPath">,
  attachment?: File
) => {
  const homeworkRef = dbRef(db, HOMEWORK_COLLECTION);
  const newHomeworkRef = push(homeworkRef);
  const newHomeworkId = newHomeworkRef.key;

  if (!newHomeworkId) throw new Error("Failed to generate homework ID.");

  let finalHomeworkData: Omit<Homework, "id"> = { ...homeworkData };

  if (attachment) {
    const downloadURL = await uploadImageToImageKit(attachment, 'gallery');
    finalHomeworkData.attachmentUrl = downloadURL;
  }
  
  await set(dbRef(db, `${HOMEWORK_COLLECTION}/${newHomeworkId}`), finalHomeworkData);
};

// Update homework
export const updateHomework = async (
  homeworkId: string,
  updates: Partial<Omit<Homework, "id">>,
  newAttachment?: File
) => {
    const homeworkNodeRef = dbRef(db, `${HOMEWORK_COLLECTION}/${homeworkId}`);
    
    if (newAttachment) {
        const downloadURL = await uploadImageToImageKit(newAttachment, 'gallery');
        updates.attachmentUrl = downloadURL;
        updates.attachmentPath = undefined; // We don't store path anymore
    }

    await update(homeworkNodeRef, updates);
};

// Delete homework
export const deleteHomework = async (homeworkId: string) => {
    const homeworkNodeRef = dbRef(db, `${HOMEWORK_COLLECTION}/${homeworkId}`);
    // No need to delete from storage as we don't control it via backend
    await remove(homeworkNodeRef);
};


// Get all homework for a specific classSection with real-time updates
export const getHomeworks = (
  classSection: string,
  callback: (homework: Homework[]) => void
) => {
  const homeworkRef = dbRef(db, HOMEWORK_COLLECTION);
  const homeworkQuery = query(
    homeworkRef,
    orderByChild("classSection"),
    equalTo(classSection)
  );

  const unsubscribe = onValue(homeworkQuery, (snapshot) => {
    const allHomework: Homework[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const id in data) {
        allHomework.push({ id, ...data[id] });
      }
    }
    callback(allHomework.sort((a, b) => b.assignedAt - a.assignedAt));
  });
  return unsubscribe;
};

// Get all homework assignments by a specific teacher
export const getHomeworksByTeacher = (
    teacherId: string,
    callback: (homework: Homework[]) => void
) => {
    const homeworkRef = dbRef(db, HOMEWORK_COLLECTION);
    const homeworkQuery = query(
        homeworkRef,
        orderByChild('assignedBy'),
        equalTo(teacherId)
    );

     const unsubscribe = onValue(homeworkQuery, (snapshot) => {
        const allHomework: Homework[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const id in data) {
                allHomework.push({ id, ...data[id] });
            }
        }
        callback(
            allHomework
                .sort((a, b) => b.assignedAt - a.assignedAt)
        );
    });
    return unsubscribe;
}
