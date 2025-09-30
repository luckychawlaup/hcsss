// @ts-nocheck
import ImageKit from 'imagekit';

if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
  throw new Error("ImageKit environment variables are not set. Please check your .env file.");
}

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

export const uploadImage = async (file: Buffer, fileName: string, folder: string): Promise<string> => {
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
