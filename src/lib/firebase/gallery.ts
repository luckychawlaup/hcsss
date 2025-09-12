
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
  serverTimestamp,
  query,
  orderByChild,
  set,
} from "firebase/database";

const GALLERY_COLLECTION = "gallery";
const storage = getStorage();

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string; // User's display name
  uploaderId: string; // User's auth UID
  uploadedAt: number;
}

// Upload a new image to the gallery
export const uploadImage = async (
  file: File,
  caption: string,
  uploadedBy: string,
  uploaderId: string
) => {
  const newImageKey = push(dbRef(db, GALLERY_COLLECTION)).key;
  if (!newImageKey) throw new Error("Could not generate a new key for the image.");
  
  const filePath = `gallery/${newImageKey}/${file.name}`;
  const fileRef = storageRef(storage, filePath);

  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  const imageDa_ta: Omit<GalleryImage, 'id'> = {
    url: downloadURL,
    caption,
    uploadedBy,
    uploaderId,
    uploadedAt: Date.now()
  };

  const imageDbRef = dbRef(db, `${GALLERY_COLLECTION}/${newImageKey}`);
  await set(imageDbRef, imageDa_ta);
};

// Get all gallery images with real-time updates
export const getGalleryImages = (
  callback: (images: GalleryImage[]) => void
) => {
  const imagesRef = dbRef(db, GALLERY_COLLECTION);
  const imagesQuery = query(imagesRef, orderByChild("uploadedAt"));

  const unsubscribe = onValue(imagesQuery, (snapshot) => {
    const images: GalleryImage[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        images.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    callback(images.reverse()); // Reverse to show newest first
  });

  return unsubscribe;
};
