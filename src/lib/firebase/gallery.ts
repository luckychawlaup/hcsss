
import { db } from "@/lib/firebase";
import { uploadImageClientSide } from "@/lib/imagekit";
import {
  ref as dbRef,
  push,
  onValue,
  serverTimestamp,
  query,
  orderByChild,
  set,
  remove,
} from "firebase/database";

const GALLERY_COLLECTION = "gallery";

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string; // User's display name
  uploaderId: string; // User's auth UID
  uploadedAt: number;
}

// Upload a new image to the gallery using the client-side SDK
export const uploadImage = async (
  file: File,
  caption: string,
  uploadedBy: string,
  uploaderId: string
) => {
  const imageUrl = await uploadImageClientSide(file, "gallery");
  if (!imageUrl) {
    throw new Error("Image upload failed.");
  }
  
  const newImageKey = push(dbRef(db, GALLERY_COLLECTION)).key;
  if (!newImageKey) throw new Error("Could not generate a new key for the image.");

  const imageData: Omit<GalleryImage, 'id'> = {
    url: imageUrl,
    caption,
    uploadedBy,
    uploaderId,
    uploadedAt: Date.now()
  };

  const imageDbRef = dbRef(db, `${GALLERY_COLLECTION}/${newImageKey}`);
  await set(imageDbRef, imageData);
};

// Delete an image reference from the database
export const deleteImage = async (imageId: string) => {
    const imageRef = dbRef(db, `${GALLERY_COLLECTION}/${imageId}`);
    await remove(imageRef);
    // Note: This does not delete the file from ImageKit storage.
    // That requires a backend API call with the private key for security.
}

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
        images.push({ id: childSnapshot.key!, ...childSnapshot.val() });
      });
    }
    callback(images.reverse()); // Reverse to show newest first
  });

  return unsubscribe;
};
