

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface GalleryImage {
    id: string;
    url: string;
    caption: string;
    uploaded_by: string;
    uploader_id: string;
    created_at: string;
}

// Function to upload a file to Supabase Storage and return the public URL
const uploadFileToSupabase = async (file: File, bucket: string, folder: string): Promise<string> => {
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!data.publicUrl) {
        throw new Error('Could not get public URL for uploaded file.');
    }
    return data.publicUrl;
};

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
    const imageUrl = await uploadFileToSupabase(file, 'media', 'gallery');

    const { error } = await supabase.from('gallery').insert([{
        url: imageUrl,
        caption,
        uploaded_by: uploadedBy,
        uploader_id: uploaderId,
    }]);

    if (error) {
        console.error("Error saving image metadata to Supabase gallery:", error);
        // Optional: attempt to delete the uploaded file from storage if the DB insert fails
        const filePath = imageUrl.split('/gallery/')[1];
        if(filePath) await supabase.storage.from('gallery').remove([filePath]);
        throw error;
    }
};

export const deleteImage = async (id: string): Promise<void> => {
    // First, get the image URL to delete from storage
    const { data: image, error: fetchError } = await supabase.from('gallery').select('url').eq('id', id).single();

    if(fetchError || !image) {
        console.error("Error fetching image to delete:", fetchError);
        throw new Error("Could not find image to delete.");
    }

    // Delete the record from the database
    const { error: deleteError } = await supabase.from('gallery').delete().eq('id', id);
    if (deleteError) {
        console.error("Error deleting image from Supabase gallery:", deleteError);
        throw deleteError;
    }

    // If DB deletion is successful, delete from storage
    try {
        const filePath = image.url.split('/gallery/')[1];
        if (filePath) {
            const { error: storageError } = await supabase.storage.from('gallery').remove([filePath]);
            if(storageError) {
                 console.error("Error deleting file from Supabase Storage, but DB record was deleted:", storageError);
            }
        }
    } catch (e) {
         console.error("Error parsing file path for storage deletion:", e);
    }
};
