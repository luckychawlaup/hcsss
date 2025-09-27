
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const HOMEWORK_COLLECTION = 'homework';

export interface Homework {
  id: string;
  assigned_by: string; // Teacher's ID from 'teachers' table
  teacher_name: string;
  class_section: string; // e.g., "10-A"
  subject: string;
  description: string;
  due_date: string; // ISO string
  assigned_at: string; // ISO string
  attachment_url?: string;
}

const uploadFileToSupabase = async (file: File, bucket: string, folder: string): Promise<string> => {
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    
    console.log('Uploading file:', filePath);
    
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!urlData?.publicUrl) {
        throw new Error('Could not get public URL for uploaded file.');
    }
    
    console.log('File uploaded successfully, URL:', urlData.publicUrl);
    return urlData.publicUrl;
};

export const addHomework = async (homeworkData: Omit<Homework, 'id'>, attachment?: File): Promise<void> => {
    try {
        let attachment_url;
        if (attachment) {
            console.log('Processing attachment:', attachment.name);
            attachment_url = await uploadFileToSupabase(attachment, 'homework', 'files');
        }

        const finalHomeworkData = { 
            ...homeworkData, 
            attachment_url: attachment_url || null 
        };

        console.log('Inserting homework data:', finalHomeworkData);

        const { data, error } = await supabase
            .from(HOMEWORK_COLLECTION)
            .insert([finalHomeworkData])
            .select();
            
        if (error) {
            console.error('Database insertion error:', error);
            throw new Error(`Failed to save homework: ${error.message}`);
        }
        
        console.log('Homework inserted successfully:', data);
    } catch (error) {
        console.error('addHomework error:', error);
        throw error;
    }
};

export const getHomeworks = (classSection: string, callback: (homeworks: Homework[]) => void) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const fetchAndCallback = async () => {
        try {
            const { data, error } = await supabase
                .from(HOMEWORK_COLLECTION)
                .select('*')
                .eq('class_section', classSection)
                .gte('assigned_at', sevenDaysAgo)
                .order('assigned_at', { ascending: false });
                
            if (error) {
                console.error('Error fetching homeworks:', error);
                callback([]);
                return;
            }
            
            callback(data || []);
        } catch (error) {
            console.error('fetchAndCallback error:', error);
            callback([]);
        }
    }

    const channel = supabase.channel(`homework-${classSection}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: HOMEWORK_COLLECTION, 
            filter: `class_section=eq.${classSection}` 
        }, (payload) => {
            console.log('Real-time update received for homework:', payload);
            fetchAndCallback();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
        });
        
    return channel;
};

export const getHomeworksByTeacher = (teacherId: string, callback: (homeworks: Homework[]) => void) => {
    const fetchHomeworks = async () => {
        try {
            const { data, error } = await supabase
                .from(HOMEWORK_COLLECTION)
                .select('*')
                .eq('assigned_by', teacherId)
                .order('assigned_at', { ascending: false });
                
            if (error) {
                console.error('Error fetching teacher homeworks:', error);
                return;
            }
            
            if (data) {
                callback(data);
            }
        } catch (error) {
            console.error('fetchHomeworks error:', error);
        }
    };

    const channel = supabase.channel(`homework-teacher-${teacherId}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: HOMEWORK_COLLECTION, 
            filter: `assigned_by=eq.${teacherId}` 
        }, (payload) => {
            console.log('Teacher homework real-time update:', payload);
            fetchHomeworks();
        })
        .subscribe();
        
    fetchHomeworks();

    return channel;
};

export const updateHomework = async (homeworkId: string, updatedData: Partial<Homework>, newAttachment?: File): Promise<void> => {
    try {
        let updatePayload: Partial<Homework> & { attachment_url?: string | null } = { ...updatedData };
        
        if (newAttachment) {
            // First, fetch the old homework to get its attachment URL
            const { data: oldHomework, error: fetchError } = await supabase
                .from(HOMEWORK_COLLECTION)
                .select('attachment_url')
                .eq('id', homeworkId)
                .single();
                
            if (fetchError) {
                console.error("Could not fetch old homework to delete attachment:", fetchError);
            }

            const attachment_url = await uploadFileToSupabase(newAttachment, 'homework', 'files');
            updatePayload.attachment_url = attachment_url;
            
            // If there was an old attachment, delete it from storage
            if (oldHomework?.attachment_url) {
                const oldFileName = oldHomework.attachment_url.split('/').pop();
                if (oldFileName) {
                    await supabase.storage.from('homework').remove([`files/${oldFileName}`]);
                }
            }
        }

        const { data, error } = await supabase
            .from(HOMEWORK_COLLECTION)
            .update(updatePayload)
            .eq('id', homeworkId)
            .select();

        if (error) {
            console.error('Update homework error:', error);
            throw new Error(`Failed to update homework: ${error.message}`);
        }
        
        console.log('Homework updated successfully:', data);
    } catch (error) {
        console.error('updateHomework error:', error);
        throw error;
    }
};

export const deleteHomework = async (homeworkId: string): Promise<void> => {
    try {
        // Fetch homework to get attachment URL
        const { data: hw, error: fetchError } = await supabase
            .from(HOMEWORK_COLLECTION)
            .select('attachment_url')
            .eq('id', homeworkId)
            .single();
            
        if (fetchError) {
            console.error("Could not fetch homework to delete attachment", fetchError);
        }
        
        // Delete DB record
        const { error } = await supabase
            .from(HOMEWORK_COLLECTION)
            .delete()
            .eq('id', homeworkId);
            
        if (error) {
            console.error('Delete homework error:', error);
            throw new Error(`Failed to delete homework: ${error.message}`);
        }

        // If DB deletion is successful, delete from storage
        if (hw?.attachment_url) {
            const fileName = hw.attachment_url.split('/').pop();
            if (fileName) {
                const { error: storageError } = await supabase.storage
                    .from('homework')
                    .remove([`files/${fileName}`]);
                    
                if (storageError) {
                    console.error('Error deleting file from storage:', storageError);
                }
            }
        }
        
        console.log('Homework deleted successfully');
    } catch (error) {
        console.error('deleteHomework error:', error);
        throw error;
    }
};
