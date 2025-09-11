
import { db } from "@/lib/firebase";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  ref as dbRef,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToLast,
} from "firebase/database";

const HOMEWORK_COLLECTION = "homework";
const storage = getStorage();

export interface Homework {
  id: string;
  teacherId: string;
  teacherName: string;
  classSection: string; // e.g., "10-A"
  subject: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  assignedAt: number;
  attachmentUrl?: string;
}

// Add new homework, optionally with a file attachment
export const addHomework = async (
  homeworkData: Omit<Homework, "id" | "attachmentUrl">,
  attachment?: File
) => {
  const homeworkRef = dbRef(db, HOMEWORK_COLLECTION);
  const newHomeworkRef = push(homeworkRef);

  let finalHomeworkData: Omit<Homework, "id"> = { ...homeworkData };

  if (attachment) {
    const fileRef = storageRef(
      storage,
      `homework/${newHomeworkRef.key}/${attachment.name}`
    );
    await uploadBytes(fileRef, attachment);
    const downloadURL = await getDownloadURL(fileRef);
    finalHomeworkData.attachmentUrl = downloadURL;
  }

  await push(homeworkRef, finalHomeworkData);
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
        orderByChild('teacherId'),
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
