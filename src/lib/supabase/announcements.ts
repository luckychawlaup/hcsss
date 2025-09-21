

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  target: "students" | "teachers" | "both";
  target_audience?: {
    type: "class" | "student";
    value: string; // class-section string or studentId
  };
  created_at: string;
  edited_at?: string;
  created_by?: string;
  creator_name?: string;
  creator_role?: "Principal" | "Owner" | "Teacher" | "Class Teacher" | "Subject Teacher";
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


// Add a new announcement
export const addAnnouncement = async (
    announcementData: Omit<Announcement, 'id' | 'created_at'>,
    attachment?: File
) => {
  try {
    let finalAnnouncementData: any = { ...announcementData };
    
    if (attachment) {
        const attachmentUrl = await uploadFileToSupabase(attachment, 'documents', 'announcements');
        finalAnnouncementData.attachment_url = attachmentUrl;
    }

    const { error } = await supabase.from('announcements').insert([finalAnnouncementData]);
    if (error) throw error;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// Get announcements with real-time updates for a student
export const getAnnouncementsForStudent = (
    studentInfo: { classSection: string; studentId: string },
    callback: (announcements: Announcement[]) => void
) => {
  const channel = supabase
    .channel('announcements-for-student')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, async () => {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .or(`target.eq.students,target.eq.both,target_audience->>value.eq.${studentInfo.classSection},target_audience->>value.eq.${studentInfo.studentId}`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(error);
            return;
        }
        
        const filtered = (data || []).filter(ann => {
            if (ann.target === "students" && !ann.target_audience) return true;
            if (ann.target === "both" && !ann.target_audience) return true;
            if (ann.target_audience?.type === 'class' && ann.target_audience.value === studentInfo.classSection) return true;
            if (ann.target_audience?.type === 'student' && ann.target_audience.value === studentInfo.studentId) return true;
            return false;
        });

        callback(filtered);
    })
    .subscribe();

    // Fetch initial data
    (async () => {
         const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .or(`target.eq.students,target.eq.both,target_audience->>value.eq.${studentInfo.classSection},target_audience->>value.eq.${studentInfo.studentId}`)
            .order('created_at', { ascending: true });
        if (data) {
             const filtered = (data || []).filter(ann => {
                if (ann.target === "students" && !ann.target_audience) return true;
                if (ann.target === "both" && !ann.target_audience) return true;
                if (ann.target_audience?.type === 'class' && ann.target_audience.value === studentInfo.classSection) return true;
                if (ann.target_audience?.type === 'student' && ann.target_audience.value === studentInfo.studentId) return true;
                return false;
            });
            callback(filtered);
        }
    })();

  return () => supabase.removeChannel(channel);
};

// Get announcements for a specific class (for teachers)
export const getAnnouncementsForClass = (
    classSection: string,
    callback: (announcements: Announcement[]) => void
) => {
    const channel = supabase
        .channel(`announcements-for-class-${classSection}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `target_audience->>value=eq.${classSection}` }, async (payload) => {
             const { data, error } = await supabase.from('announcements').select('*').eq('target_audience->>value', classSection).order('created_at', { ascending: true });
             if (data) callback(data);
        })
        .subscribe();
    
    // Initial fetch
    (async () => {
        const { data, error } = await supabase.from('announcements').select('*').eq('target_audience->>value', classSection).order('created_at', { ascending: true });
        if (data) callback(data);
    })();

    return () => supabase.removeChannel(channel);
}

// Get announcements for all teachers
export const getAnnouncementsForTeachers = (
    callback: (announcements: Announcement[]) => void
) => {
     const channel = supabase
        .channel('announcements-for-teachers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `target=in.("teachers","both")`}, async (payload) => {
            const { data, error } = await supabase.from('announcements').select('*').in('target', ['teachers', 'both']).is('target_audience', null).order('created_at', { ascending: true });
            if (data) callback(data);
        })
        .subscribe();
        
    // Initial fetch
     (async () => {
        const { data, error } = await supabase.from('announcements').select('*').in('target', ['teachers', 'both']).is('target_audience', null).order('created_at', { ascending: true });
        if (data) callback(data);
    })();

    return () => supabase.removeChannel(channel);
}


// Get all announcements, intended for principal/admin views
export const getAllAnnouncements = (callback: (announcements: Announcement[]) => void) => {
    const channel = supabase
        .channel('all-announcements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, async () => {
             const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: true });
             if(data) callback(data);
        })
        .subscribe();
    
    (async () => {
        const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: true });
        if(data) callback(data);
    })();

    return () => supabase.removeChannel(channel);
};

// Update an existing announcement
export const updateAnnouncement = async (announcementId: string, content: string) => {
  const { error } = await supabase
    .from('announcements')
    .update({ content: content, edited_at: new Date().toISOString() })
    .eq('id', announcementId);
  if (error) throw error;
};

// Delete an announcement
export const deleteAnnouncement = async (announcementId: string) => {
  const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
  if (error) throw error;
};

    