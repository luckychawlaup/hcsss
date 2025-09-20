import ImageKit from "imagekit-javascript";

// Enhanced environment variable validation
const validateEnvironment = () => {
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    
    if (!urlEndpoint || !publicKey) {
        const missingVars = [];
        if (!urlEndpoint) missingVars.push('NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT');
        if (!publicKey) missingVars.push('NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY');
        
        console.error(`Missing ImageKit environment variables: ${missingVars.join(', ')}`);
        
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`ImageKit environment variables are not set: ${missingVars.join(', ')}`);
        }
        return false;
    }
    
    // Validate URL format
    if (!urlEndpoint.startsWith('https://')) {
        console.error('ImageKit URL endpoint must start with https://');
        return false;
    }
    
    return true;
};

// Only initialize ImageKit if environment is valid
let imagekit: ImageKit | null = null;

if (validateEnvironment()) {
    try {
        imagekit = new ImageKit({
            urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
            publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
            authenticationEndpoint: `/api/imagekit-auth`,
        });
    } catch (error) {
        console.error('Failed to initialize ImageKit:', error);
        imagekit = null;
    }
}

export default imagekit;

export type UploadFolder = "Photos (students)" | "Photos (teachers)" | "gallery" | "Aadhar Cards";

interface UploadResult {
    url: string;
    fileId: string;
    name: string;
    size: number;
    filePath: string;
}

export const uploadImage = async (file: File, folder: UploadFolder): Promise<string> => {
    // Validate inputs
    if (!file) {
        throw new Error("No file provided for upload");
    }
    
    if (!imagekit) {
        throw new Error("ImageKit is not properly configured. Check your environment variables.");
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Validate file size (10MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the 2MB limit`);
    }
    
    return new Promise((resolve, reject) => {
        const uploadParams = {
            file: file,
            fileName: file.name,
            folder: folder,
            useUniqueFileName: true,
            tags: ['upload', folder.toLowerCase().replace(/\s+/g, '-')],
        };
        
        console.log('Starting ImageKit upload with params:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            folder: folder
        });
        
        imagekit!.upload(uploadParams, (error, result) => {
            if (error) {
                console.error("ImageKit upload error details:", {
                    message: error.message || 'Unknown error',
                    help: error.help || 'No help available',
                    statusCode: (error as any).statusCode || 'No status code',
                    details: error
                });
                
                let errorMessage = "Failed to upload image";
                
                if (error.message) {
                    if (error.message.includes('authentication')) {
                        errorMessage = "Authentication failed. Please check your ImageKit configuration and ensure the API route is working.";
                    } else if (error.message.includes('folder')) {
                        errorMessage = `Invalid folder "${folder}". Make sure this folder exists and allows uploads.`;
                    } else if (error.message.includes('file')) {
                        errorMessage = "Invalid file. Please check file format and size.";
                    } else {
                        errorMessage = `Upload failed: ${error.message}`;
                    }
                }
                
                return reject(new Error(errorMessage));
            }
            
            if (!result) {
                console.error("ImageKit upload succeeded but returned no result");
                return reject(new Error("Upload completed but no result was returned"));
            }
            
            if (!result.url) {
                console.error("ImageKit upload result missing URL:", result);
                return reject(new Error("Upload completed but no URL was returned"));
            }
            
            console.log('ImageKit upload successful:', {
                url: result.url,
                fileId: result.fileId,
                name: result.name,
                size: result.size
            });
            
            resolve(result.url);
        });
    });
};