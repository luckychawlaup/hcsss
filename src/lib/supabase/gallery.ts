
import { createClient } from "@/lib/supabase/client";
import { uploadImage as uploadImageToImageKit } from "@/lib/imagekit";

const supabase = createClient();

export interface GalleryImage {
    id: string;
    url: string;
    caption: string;
    uploaded_by: string;
    uploader_id: string;
    created_at: string;
}

export const getGalleryImages = (callback: (images: GalleryImage[]) => void) => {
    const channel = supabase
        .channel('gallery-images')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' },
            async (payload) => {
                const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
                if (data) {
                    callback(data);
                }
            }
        )
        .subscribe();
    
    (async () => {
        const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
        if (data) {
            callback(data);
        }
    })();

    return channel;
};

export const uploadImage = async (file: File, caption: string, uploadedBy: string, uploaderId: string): Promise<void> => {
    const imageUrl = await uploadImageToImageKit(file, "gallery");
    const { error } = await supabase.from('gallery').insert([{
        url: imageUrl,
        caption,
        uploaded_by: uploadedBy,
        uploader_id: uploaderId,
    }]);

    if (error) {
        console.error("Error uploading image to Supabase gallery:", error);
        throw error;
    }
};

export const deleteImage = async (id: string): Promise<void> => {
    const { error } = await supabase.from('gallery').delete().eq('id', id);
    if (error) {
        console.error("Error deleting image from Supabase gallery:", error);
        throw error;
    }
};
