
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface Announcement {
  id: string;
  content: string;
  target: "students" | "teachers" | "both" | "admins";
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
    announcementData: Omit<Announcement, 'id' | 'created_at' | 'edited_at' >,
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

    const fetchAnnouncements = async () => {
        // Corrected query to fetch:
        // 1. Announcements for 'both' (no specific audience)
        // 2. Announcements for 'students' (no specific audience)
        // 3. Announcements for the student's specific class
        // 4. Announcements for the specific student ID
        const orQuery = [
            `and(target.eq.both,target_audience.is.null)`,
            `and(target.eq.students,target_audience.is.null)`,
            `target_audience->>value.eq.${studentInfo.classSection}`,
            `target_audience->>value.eq.${studentInfo.studentId}`
        ].join(',');

        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .or(orQuery)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching announcements for student:", error);
            callback([]);
            return;
        }

        callback(data || []);
    };
    
    const channel = supabase
    .channel(`announcements-student-${studentInfo.studentId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
        fetchAnnouncements();
    })
    .subscribe((status, err) => {
        if(status === 'SUBSCRIBED') {
            fetchAnnouncements();
        }
        if (err) {
            console.error('Realtime subscription error:', err);
        }
    });

    return channel;
};

// Get announcements for a specific class (for teachers)
export const getAnnouncementsForClass = (
    classSection: string,
    callback: (announcements: Announcement[]) => void
) => {

    const fetchAndCallback = async () => {
        const { data, error } = await supabase.from('announcements').select('*').eq('target_audience->>value', classSection).order('created_at', { ascending: true });
        if (data) callback(data);
        if (error) console.error(error);
    }
    const channel = supabase
        .channel(`announcements-class-${classSection}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `target_audience->>value=eq.${classSection}` }, (payload) => {
             fetchAndCallback();
        })
        .subscribe((status) => {
            if(status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
        });
    
    return channel;
}

// Get announcements for all teachers
export const getAnnouncementsForTeachers = (
    callback: (announcements: Announcement[]) => void
) => {
    const fetchAndCallback = async () => {
        const orQuery = 'target.eq.teachers,target.eq.both';
        const { data, error } = await supabase.from('announcements').select('*').or(orQuery).is('target_audience', null).order('created_at', { ascending: true });
        if (data) callback(data);
        if (error) console.error(error);
    }

     const channel = supabase
        .channel('announcements-teachers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `target=in.("teachers","both")`}, (payload) => {
            fetchAndCallback();
        })
        .subscribe((status) => {
            if(status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
        });
        
    return channel;
}

export const getAnnouncementsForAllStudents = (
    callback: (announcements: Announcement[]) => void
) => {
    const fetchAndCallback = async () => {
        const orQuery = 'target.eq.students,target.eq.both';
        const { data, error } = await supabase.from('announcements').select('*').or(orQuery).is('target_audience', null).order('created_at', { ascending: true });
        if (data) callback(data);
        if (error) console.error(error);
    }

     const channel = supabase
        .channel('announcements-all-students')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `target=in.("students","both")`}, (payload) => {
            fetchAndCallback();
        })
        .subscribe((status) => {
            if(status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
        });
        
    return channel;
}

// For Owner: get announcements based on selected group
export const getAnnouncementsForOwner = (
    group: string,
    callback: (announcements: Announcement[]) => void
) => {
    const fetchAndCallback = async () => {
        let query = supabase.from('announcements').select('*').order('created_at', { ascending: true });

        if (group === 'All Students') {
            query = query.or('target.eq.students,target.eq.both').is('target_audience', null);
        } else if (group === 'All Teachers') {
            // "All Teachers" for owner now includes all staff
            query = query.or('target.eq.teachers,target.eq.both,target.eq.admins').is('target_audience', null);
        } else {
            // This is for a specific class section
            query = query.eq('target_audience->>value', group);
        }

        const { data, error } = await query;
        if (data) callback(data);
        if (error) console.error(error);
    };

    // A unique channel name is crucial for real-time updates to work correctly.
    const channelName = `announcements-owner-${group.replace(/\s+/g, '-')}`;
    const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
            fetchAndCallback();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
        });

    return channel;
};


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

export const ANNOUNCEMENTS_TABLE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    target TEXT NOT NULL, -- 'students', 'teachers', 'both', 'admins'
    target_audience JSONB, -- { "type": "class", "value": "10-A" } or { "type": "student", "value": "student_id" }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    created_by UUID,
    creator_name TEXT,
    creator_role TEXT,
    attachment_url TEXT
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admins to manage all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow teachers to manage announcements for their classes" ON public.announcements;
DROP POLICY IF EXISTS "Allow authenticated users to read relevant announcements" ON public.announcements;

CREATE POLICY "Allow admins to manage all announcements"
ON public.announcements FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050' -- Owner UID
);

CREATE POLICY "Allow teachers to manage announcements for their classes"
ON public.announcements FOR ALL
USING (
    created_by = (SELECT id FROM public.teachers WHERE auth_uid = auth.uid())
    AND
    (
        target = 'teachers' 
        OR 
        (target_audience->>'type' = 'class' AND target_audience->>'value' IN (SELECT unnest(classes_taught) FROM public.teachers WHERE auth_uid = auth.uid()))
        OR
        (target_audience->>'type' = 'class' AND target_audience->>'value' = (SELECT class_teacher_of FROM public.teachers WHERE auth_uid = auth.uid()))
    )
);

CREATE POLICY "Allow authenticated users to read relevant announcements"
ON public.announcements FOR SELECT
USING (
    -- Public announcements
    (target = 'both' AND target_audience IS NULL)
    OR
    -- Announcements for all students
    (target = 'students' AND target_audience IS NULL AND (SELECT auth.uid() from public.students where auth_uid = auth.uid()) IS NOT NULL)
    OR
    -- Announcements for all teachers
    (target = 'teachers' AND target_audience IS NULL AND (SELECT auth.uid() from public.teachers where auth_uid = auth.uid()) IS NOT NULL)
    OR
    -- Announcements for a student's specific class
    (
      (SELECT class || '-' || section FROM public.students WHERE auth_uid = auth.uid()) = (target_audience->>'value')
    )
    OR
    -- Announcements for a specific student
    (
      (SELECT id::text FROM public.students WHERE auth_uid = auth.uid()) = (target_audience->>'value')
    )
);
`;
