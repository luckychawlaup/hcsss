
import { db } from "@/lib/firebase";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
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
const storage = getStorage();

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
    const filePath = `homework/${newHomeworkId}/${attachment.name}`;
    const fileRef = storageRef(storage, filePath);
    await uploadBytes(fileRef, attachment);
    const downloadURL = await getDownloadURL(fileRef);
    finalHomeworkData.attachmentUrl = downloadURL;
    finalHomeworkData.attachmentPath = filePath;
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
        // If there's an old attachment, delete it
        const existingHomeworkSnap = await get(homeworkNodeRef);
        const existingHomework = existingHomeworkSnap.val();
        if (existingHomework.attachmentPath) {
            const oldFileRef = storageRef(storage, existingHomework.attachmentPath);
            await deleteObject(oldFileRef).catch(e => console.warn("Old attachment not found, could not delete.", e));
        }

        // Upload new attachment
        const filePath = `homework/${homeworkId}/${newAttachment.name}`;
        const fileRef = storageRef(storage, filePath);
        await uploadBytes(fileRef, newAttachment);
        const downloadURL = await getDownloadURL(fileRef);
        updates.attachmentUrl = downloadURL;
        updates.attachmentPath = filePath;
    }

    await update(homeworkNodeRef, updates);
};

// Delete homework
export const deleteHomework = async (homeworkId: string) => {
    const homeworkNodeRef = dbRef(db, `${HOMEWORK_COLLECTION}/${homeworkId}`);
    const snapshot = await get(homeworkNodeRef);

    if (snapshot.exists()) {
        const homeworkData = snapshot.val();
        // If there's an attachment, delete it from storage
        if (homeworkData.attachmentPath) {
            const fileRef = storageRef(storage, homeworkData.attachmentPath);
            await deleteObject(fileRef).catch(e => console.error("Error deleting attachment:", e));
        }
        // Delete the database record
        await remove(homeworkNodeRef);
    }
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

// Get the 5 most recent homework assignments by a specific teacher
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
                .slice(0, 5)
        );
    });
    return unsubscribe;
}
