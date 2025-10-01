
// @ts-nocheck
import ImageKit from 'imagekit';

let imagekit;

if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });
} else {
  console.warn("ImageKit environment variables are not set. Image uploads will be disabled. Please check your .env file.");
}

export const isImageKitInitialized = () => !!imagekit;

export const uploadImage = async (file: Buffer, fileName: string, folder: string): Promise<string> => {
  if (!imagekit) {
    throw new Error("ImageKit is not configured. Please provide API keys in your .env file.");
  }
  try {
    const response = await imagekit.upload({
      file: file,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: true,
    });
    return response.url;
  } catch (error) {
    console.error("ImageKit upload error:", error);
    throw new Error("Failed to upload image.");
  }
};
