
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import TeacherNav from "@/components/teacher/TeacherNav";
import { User } from "@supabase/supabase-js";
import { getGalleryImages, GalleryImage, uploadImage, deleteImage as deleteGalleryImage } from "@/lib/supabase/gallery";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTeacherByAuthId } from "@/lib/supabase/teachers";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const principalUID = "6cc51c80-e098-4d6d-8450-5ff5931b7391";
const ownerUID = "946ba406-1ba6-49cf-ab78-f611d1350f33";

function UploadForm({ onUploadComplete }: { onUploadComplete: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file || !user) {
            toast({ variant: "destructive", title: "Error", description: "File and authentication required." });
            return;
        }

        setIsUploading(true);
        try {
            await uploadImage(file, caption, user.user_metadata.name || "Unknown User", user.id);
            toast({ title: "Upload Successful", description: "Your photo has been added to the gallery." });
            setFile(null);
            setCaption("");
            onUploadComplete();
        } catch (error) {
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload the image." });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700">Photo</label>
                <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} />
            </div>
            <div>
                 <label htmlFor="caption" className="block text-sm font-medium text-gray-700">Caption</label>
                <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption for the photo..." />
            </div>
            <Button onClick={handleSubmit} disabled={isUploading || !file} className="w-full">
                {isUploading ? <><Loader2 className="mr-2" /> Uploading...</> : "Upload Photo"}
            </Button>
        </div>
    )
}


export default function GalleryPage() {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<'student' | 'teacher' | 'principal' | 'owner' | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = getGalleryImages((galleryImages) => {
            setImages(galleryImages);
            setIsLoading(false);
        });
        return () => {
            // In Supabase, you might need to explicitly remove the subscription if the library supports it
            // For this example, we assume getGalleryImages handles its own cleanup or is a one-time fetch.
            // If it returns a subscription, you'd do: subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                 if(currentUser.id === principalUID) {
                    setUserRole('principal');
                } else if (currentUser.id === ownerUID) {
                    setUserRole('owner');
                } else {
                    const teacher = await getTeacherByAuthId(currentUser.id);
                    if(teacher) {
                        setUserRole('teacher');
                    } else {
                        setUserRole('student');
                    }
                }
            } else {
                setUser(null);
                setUserRole(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);


    const canManage = userRole === 'teacher' || userRole === 'principal' || userRole === 'owner';

    const handleDeleteClick = (image: GalleryImage) => {
        setImageToDelete(image);
    }

    const confirmDelete = async () => {
        if (!imageToDelete) return;
        try {
            await deleteGalleryImage(imageToDelete.id);
            toast({ title: "Image Deleted", description: "The photo has been removed from the gallery."});
        } catch (error) {
            toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete the image." });
        } finally {
            setImageToDelete(null);
        }
    }


    const renderNav = () => {
        if (userRole === 'teacher') return <TeacherNav activeView="gallery" setActiveView={() => {}} />;
        return <BottomNav />;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header title="School Gallery" />
            <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
                <div className="mx-auto w-full max-w-6xl">
                    {canManage && (
                        <div className="flex justify-end mb-4">
                            <Button onClick={() => setIsUploadDialogOpen(true)}>
                                <UploadCloud className="mr-2" /> Upload Photo
                            </Button>
                        </div>
                    )}
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square w-full rounded-md" />)}
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                            <p className="text-muted-foreground">No photos in the gallery yet. Be the first to upload!</p>
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map(image => (
                                <div key={image.id} className="group relative overflow-hidden rounded-lg">
                                    <Image src={image.url} alt={image.caption} width={400} height={400} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-0 left-0 p-4 w-full">
                                        <p className="text-sm font-semibold text-white">{image.caption}</p>
                                        <p className="text-xs text-white/80">by {image.uploaded_by}</p>
                                    </div>
                                    {canManage && (
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(image)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {renderNav()}

            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload a New Photo</DialogTitle>
                        <DialogDescription>
                            Share a moment with the school community. The photo will be visible to everyone.
                        </DialogDescription>
                    </DialogHeader>
                    <UploadForm onUploadComplete={() => setIsUploadDialogOpen(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the photo from the gallery. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
