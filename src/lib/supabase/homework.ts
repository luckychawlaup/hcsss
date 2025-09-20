
import { createClient } from "@/lib/supabase/client";
import { uploadImage as uploadImageToImageKit } from "@/lib/imagekit";

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

export const addHomework = async (homeworkData: Omit<Homework, 'id'>, attachment?: File) => {
    let attachment_url;
    if (attachment) {
        attachment_url = await uploadImageToImageKit(attachment, 'gallery');
    }

    const { error } = await supabase.from(HOMEWORK_COLLECTION).insert([{ ...homeworkData, attachment_url }]);
    if (error) throw error;
};

export const getHomeworks = (classSection: string, callback: (homeworks: Homework[]) => void) => {
    const channel = supabase.channel(`homework-${classSection}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: HOMEWORK_COLLECTION, filter: `class_section=eq.${classSection}` }, 
        (payload) => {
            (async () => {
                const { data, error } = await supabase
                    .from(HOMEWORK_COLLECTION)
                    .select('*')
                    .eq('class_section', classSection)
                    .order('due_date', { ascending: true });
                if (data) callback(data);
            })();
        })
        .subscribe();
        
    (async () => {
        const { data, error } = await supabase
            .from(HOMEWORK_COLLECTION)
            .select('*')
            .eq('class_section', classSection)
            .order('due_date', { ascending: true });
        if (data) callback(data);
    })();

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
    let updatePayload = { ...updatedData };
    if (newAttachment) {
        const attachment_url = await uploadImageToImageKit(newAttachment, 'gallery');
        updatePayload.attachment_url = attachment_url;
    }

    const { error } = await supabase
        .from(HOMEWORK_COLLECTION)
        .update(updatePayload)
        .eq('id', homeworkId);

    if (error) throw error;
};

export const deleteHomework = async (homeworkId: string) => {
    const { error } = await supabase
        .from(HOMEWORK_COLLECTION)
        .delete()
        .eq('id', homeworkId);

    if (error) throw error;
};
