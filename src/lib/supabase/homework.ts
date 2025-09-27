

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

export const addHomework = async (homeworkData: Omit<Homework, 'id'>, attachment?: File) => {
    let attachment_url;
    if (attachment) {
        attachment_url = await uploadFileToSupabase(attachment, 'homework', 'files');
    }

    const finalHomeworkData = { ...homeworkData, attachment_url: attachment_url };

    const { error } = await supabase.from(HOMEWORK_COLLECTION).insert([finalHomeworkData]);
    if (error) throw error;
};

export const getHomeworks = (classSection: string, callback: (homeworks: Homework[]) => void) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const fetchAndCallback = async () => {
         const { data, error } = await supabase
            .from(HOMEWORK_COLLECTION)
            .select('*')
            .eq('class_section', classSection)
            .gte('assigned_at', sevenDaysAgo)
            .order('assigned_at', { ascending: false });
        if (data) callback(data);
    }


    const channel = supabase.channel(`homework-${classSection}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: HOMEWORK_COLLECTION, filter: `class_section=eq.${classSection}` }, 
        (payload) => {
            fetchAndCallback();
        })
        .subscribe();
        
    fetchAndCallback();

    return channel;
};

export const getHomeworksByTeacher = (teacherId: string, callback: (homeworks: Homework[]) => void) => {
    const channel = supabase.channel(`homework-teacher-${teacherId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: HOMEWORK_COLLECTION, filter: `assigned_by=eq.${teacherId}` }, 
        (payload) => {
            (async () => {
                const { data, error } = await supabase
                    .from(HOMEWORK_COLLECTION)
                    .select('*')
                    .eq('assigned_by', teacherId)
                    .order('assigned_at', { ascending: false });
                if (data) callback(data);
            })();
        })
        .subscribe();
        
    (async () => {
        const { data, error } = await supabase
            .from(HOMEWORK_COLLECTION)
            .select('*')
            .eq('assigned_by', teacherId)
            .order('assigned_at', { ascending: false });
        if (data) callback(data);
    })();

    return channel;
};

export const updateHomework = async (homeworkId: string, updatedData: Partial<Homework>, newAttachment?: File) => {
    let updatePayload: Partial<Homework> & { attachment_url?: string | null } = { ...updatedData };
    
    if (newAttachment) {
        // First, fetch the old homework to get its attachment URL
        const { data: oldHomework, error: fetchError } = await supabase.from(HOMEWORK_COLLECTION).select('attachment_url').eq('id', homeworkId).single();
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


    const { error } = await supabase
        .from(HOMEWORK_COLLECTION)
        .update(updatePayload)
        .eq('id', homeworkId);

    if (error) throw error;
};

export const deleteHomework = async (homeworkId: string) => {
    // Fetch homework to get attachment URL
    const { data: hw, error: fetchError } = await supabase.from(HOMEWORK_COLLECTION).select('attachment_url').eq('id', homeworkId).single();
    if(fetchError) {
        console.error("Could not fetch homework to delete attachment", fetchError);
    }
    
    // Delete DB record
    const { error } = await supabase.from(HOMEWORK_COLLECTION).delete().eq('id', homeworkId);
    if (error) throw error;

    // If DB deletion is successful, delete from storage
    if (hw?.attachment_url) {
        const fileName = hw.attachment_url.split('/').pop();
        if (fileName) {
            await supabase.storage.from('homework').remove([`files/${fileName}`]);
        }
    }
};
