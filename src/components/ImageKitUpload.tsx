
"use client"

import React, { useState, useEffect } from 'react';
import ImageKit from 'imagekit-javascript';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface IKResponse {
    fileId: string;
    filePath: string;
    fileType: string;
    height: number;
    name: string;
    size: number;
    thumbnailUrl: string;
    url: string;
    width: number;
}

interface ImageKitUploadProps {
    folder?: string;
    onSuccess: (res: IKResponse) => void;
    onError: (err: any) => void;
    buttonText?: string;
}

const ImageKitUpload: React.FC<ImageKitUploadProps> = ({ 
    folder = "school_management", 
    onSuccess, 
    onError,
    buttonText = "Upload"
}) => {
    const [imageKit, setImageKit] = useState<ImageKit | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

        if (!urlEndpoint) {
            console.error("ImageKit URL endpoint is not configured.");
            toast({ variant: "destructive", title: "Configuration Error", description: "Image upload service is not configured." });
            return;
        }

        const ik = new ImageKit({
            urlEndpoint,
            authenticationEndpoint: '/api/imagekit-auth', 
        });
        setImageKit(ik);
    }, [toast]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !imageKit) {
            toast({ title: "No file selected." });
            return;
        }
        
        setIsUploading(true);
        try {
            const result = await imageKit.upload({
                file: file,
                fileName: file.name,
                folder: folder,
                useUniqueFileName: true,
            });
            onSuccess(result as IKResponse);
            toast({ title: "Upload Successful" });
        } catch (error) {
            onError(error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Input type="file" onChange={handleFileChange} disabled={isUploading} />
            <Button onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading ? <Loader2 className="mr-2" /> : <UploadCloud className="mr-2" />}
                {buttonText}
            </Button>
        </div>
    );
};

export default ImageKitUpload;
