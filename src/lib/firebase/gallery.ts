
import { db } from "@/lib/firebase";
import { uploadImage as uploadImageToImageKit } from "@/lib/imagekit";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  doc
} from "firebase/firestore";

const GALLERY_COLLECTION = "gallery";

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string; // User's display name
  uploaderId: string; // User's auth UID
  uploadedAt: Timestamp;
}

// Upload a new image to the gallery using the client-side SDK
export const uploadImage = async (
  file: File,
  caption: string,
  uploadedBy: string,
  uploaderId: string
) => {
  const imageUrl = await uploadImageToImageKit(file, "gallery");
  if (!imageUrl) {
    throw new Error("Image upload failed.");
  }

  const imageData = {
    url: imageUrl,
    caption,
    uploadedBy,
    uploaderId,
    uploadedAt: Timestamp.now()
  };

  await addDoc(collection(db, GALLERY_COLLECTION), imageData);
};

// Delete an image reference from the database
export const deleteImage = async (imageId: string) => {
    await deleteDoc(doc(db, GALLERY_COLLECTION, imageId));
    // Note: This does not delete the file from ImageKit storage.
    // That requires a backend API call with the private key for security.
}

// Get all gallery images with real-time updates
export const getGalleryImages = (
  callback: (images: GalleryImage[]) => void
) => {
  const imagesColl = collection(db, GALLERY_COLLECTION);
  const q = query(imagesColl, orderBy("uploadedAt", "desc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryImage));
    callback(images);
  });

  return unsubscribe;
};
