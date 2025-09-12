
import ImageKit from "imagekit";

if (!process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY) {
    throw new Error("ImageKit environment variables are not set.");
}

const imagekit = new ImageKit({
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

export const getAuthenticationEndpoint = () => {
    return imagekit.getAuthenticationParameters();
}

type UploadFolder = "Photos (students)" | "Photos (teachers)" | "gallery" | "Aadhar Cards";

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
