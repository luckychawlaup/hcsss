import ImageKit from "imagekit";

if (!process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY) {
    // This check is important for server-side operations.
    // If you see this error, make sure your .env file is correctly set up.
    // Note: NEXT_PUBLIC_ variables are available on the client, but IMAGEKIT_PRIVATE_KEY is server-only.
    // In a development environment (npm run dev), both should be available.
    console.error("ImageKit environment variables are missing. Ensure .env file is configured and the server is restarted.");
    
    // To prevent a hard crash during development if only client-side features are used first,
    // we can conditionally avoid throwing the error. But uploads will fail.
    // For production, a hard crash is better to signal misconfiguration.
    if (process.env.NODE_ENV === 'production') {
        throw new Error("ImageKit environment variables are not set for production build.");
    }
}

const imagekit = new ImageKit({
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

export const getAuthenticationEndpoint = () => {
    return imagekit.getAuthenticationParameters();
}

type UploadFolder = "Photos (students)" | "Photos (teachers)" | "gallery" | "Aadhar Cards";

// This function is intended for server-side use.
export const uploadImage = async (file: File, folder: UploadFolder) => {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    try {
        const response = await imagekit.upload({
            file: base64,
            fileName: file.name,
            folder: folder,
            useUniqueFileName: true,
        });
        return response.url;
    } catch(error) {
        console.error("ImageKit upload failed:", error);
        throw new Error("Failed to upload image.");
    }
}
