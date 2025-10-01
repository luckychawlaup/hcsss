

import { createClient } from "@/lib/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

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

export const HOMEWORK_TABLE_SETUP_SQL = `
-- Create the homework table to store assignments for each class
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    class_section TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attachment_url TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow teachers to manage homework for their classes" ON public.homework;
DROP POLICY IF EXISTS "Allow students to view homework for their class" ON public.homework;
DROP POLICY IF EXISTS "Allow admins to access all homework" ON public.homework;

-- Policy: Allow teachers to manage (view, insert, update, delete) homework for their assigned classes.
CREATE POLICY "Allow teachers to manage homework for their classes"
ON public.homework FOR ALL
USING (
    class_section IN (
        SELECT unnest(classes_taught) FROM public.teachers WHERE auth_uid = auth.uid()
    )
    OR
    class_section = (
        SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()
    )
)
WITH CHECK (
    assigned_by = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid())
);

-- Policy: Allow students to view homework assigned to their class section.
CREATE POLICY "Allow students to view homework for their class"
ON public.homework FOR SELECT
USING (
    class_section = (SELECT class || '-' || section FROM public.students WHERE auth_uid = auth.uid())
);

-- Policy: Allow admin users (Principal/Accountant) to access all homework records.
CREATE POLICY "Allow admins to access all homework"
ON public.homework FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) = 'principal'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_homework_class_section ON public.homework(class_section);
CREATE INDEX IF NOT EXISTS idx_homework_assigned_by ON public.homework(assigned_by);
`;


const uploadFileToSupabase = async (file: File, bucket: string, folder: string): Promise<string> => {
    const filePath = `${folder}/${Date.now()}_${file.name}`;
    
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!urlData?.publicUrl) {
        throw new Error('Could not get public URL for uploaded file.');
    }
    
    return urlData.publicUrl;
};

export const addHomework = async (homeworkData: Omit<Homework, 'id'>, attachment?: File): Promise<void> => {
    try {
        let attachment_url;
        if (attachment) {
            attachment_url = await uploadFileToSupabase(attachment, 'homework', 'files');
        }

        const finalHomeworkData = { 
            ...homeworkData, 
            attachment_url: attachment_url || null 
        };

        const { data, error } = await supabase
            .from(HOMEWORK_COLLECTION)
            .insert([finalHomeworkData])
            .select();
            
        if (error) {
            console.error('Database insertion error:', error);
            throw new Error(`Failed to save homework: ${error.message}`);
        }
        
    } catch (error) {
        console.error('addHomework error:', error);
        throw error;
    }
};

// Updated getHomeworks function with better error handling and date filtering
export const getHomeworks = (
    classSection: string, 
    callback: (homeworks: Homework[]) => void,
    options?: { dateFilter?: 'today' | number }
) => {
    const fetchAndCallback = async () => {
        try {
            
            let query = supabase
                .from(HOMEWORK_COLLECTION)
                .select('*')
                .eq('class_section', classSection)
                .order('assigned_at', { ascending: false });

            // Apply date filtering
            if (options?.dateFilter) {
                if (options.dateFilter === 'today') {
                    const todayStart = startOfDay(new Date()).toISOString();
                    const todayEnd = endOfDay(new Date()).toISOString();
                    query = query.gte('assigned_at', todayStart).lte('assigned_at', todayEnd);
                } else if (typeof options.dateFilter === 'number') {
                    const fromDate = startOfDay(subDays(new Date(), options.dateFilter)).toISOString();
                    query = query.gte('assigned_at', fromDate);
                }
            }
                
            const { data, error } = await query;

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

    const channelName = `homework-${classSection}`;
    
    const channel = supabase.channel(channelName)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: HOMEWORK_COLLECTION,
        }, (payload) => {
            fetchAndCallback();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
            if (err) {
                console.error(`Real-time channel error in ${channelName}:`, err);
            }
        });
        
    return channel;
};

export const getHomeworksByTeacher = (teacherId: string, callback: (homeworks: Homework[]) => void) => {
    const fetchAndCallback = async () => {
        try {
            const { data, error } = await supabase
                .from(HOMEWORK_COLLECTION)
                .select('*')
                .eq('assigned_by', teacherId)
                .order('assigned_at', { ascending: false });
                
            if (error) {
                console.error('Error fetching teacher homeworks:', error);
                callback([]);
                return;
            }
            
            callback(data || []);
        } catch (error) {
            console.error('fetchAndCallback for teacher error:', error);
            callback([]);
        }
    };

    const channel = supabase.channel(`homework-teacher-${teacherId}`)
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: HOMEWORK_COLLECTION, 
            filter: `assigned_by=eq.${teacherId}` 
        }, (payload) => {
            fetchAndCallback();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
            if(err) {
                 console.error(`Real-time channel error in homework-teacher-${teacherId}:`, err);
            }
        });
        
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
        
    } catch (error) {
        console.error('deleteHomework error:', error);
        throw error;
    }
};
