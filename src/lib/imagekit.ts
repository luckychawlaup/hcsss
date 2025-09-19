
import ImageKit from "imagekit-javascript";

// This file is now for the CLIENT-SIDE ImageKit SDK.
// It does not and should not use the private key.

if (!process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY) {
    // This check is for client-side variables.
    // If you see this error, make sure your .env file is correctly set up.
    console.error("ImageKit public environment variables are missing.");
    if (process.env.NODE_ENV === 'production') {
        throw new Error("ImageKit public environment variables are not set for production build.");
    }
}

const imagekit = new ImageKit({
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    authenticationEndpoint: "https://ik.imagekit.io/credixdb/auth" // A dummy but valid-looking endpoint is often needed.
});

export default imagekit;

type UploadFolder = "Photos (students)" | "Photos (teachers)" | "gallery" | "Aadhar Cards";

// This function performs an "unsigned" upload from the client-side.
// It's secure because your backend has pre-configured which folders allow unsigned uploads in your ImageKit dashboard.
export const uploadImageClientSide = async (file: File, folder: UploadFolder): Promise<string> => {
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: file.name,
            folder: folder,
            useUniqueFileName: true,
        }, (err, result) => {
            if (err) {
                console.error("ImageKit upload failed:", err);
                return reject(new Error("Failed to upload image."));
            }
            if (result) {
                return resolve(result.url);
            }
            return reject(new Error("ImageKit upload did not return a result."));
        });
    });
};
