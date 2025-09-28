

import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const LEAVES_COLLECTION = 'leaves';

export interface LeaveRequest {
  id: string;
  user_id: string; 
  userName: string;
  userRole: 'Student' | 'Teacher';
  class?: string; 
  teacherId?: string; 
  startDate: string; 
  endDate: string; 
  reason: string;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  appliedAt: string; 
  rejectionReason?: string;
  approverComment?: string;
  document_url?: string;
}

const uploadFileToSupabase = async (file: File): Promise<string> => {
    const filePath = `public/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('leave_documents').upload(filePath, file);
    if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw error;
    }

    const { data } = supabase.storage.from('leave_documents').getPublicUrl(filePath);
    if (!data.publicUrl) {
        throw new Error('Could not get public URL for uploaded file.');
    }
    return data.publicUrl;
};


export const LEAVES_TABLE_SETUP_SQL = `
-- 1. Drop the old table if it exists to ensure a clean start
DROP TABLE IF EXISTS public.leaves;

-- 2. Create the 'leaves' table with correctly quoted column names
CREATE TABLE public.leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    class TEXT,
    "teacherId" UUID,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "rejectionReason" TEXT,
    "approverComment" TEXT,
    document_url TEXT
);

-- 3. Enable RLS on the 'leaves' table
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts from previous attempts
DROP POLICY IF EXISTS "Allow authenticated users to insert their own leave" ON public.leaves;
DROP POLICY IF EXISTS "Allow users to view their own leave requests" ON public.leaves;
DROP POLICY IF EXISTS "Allow teachers/admins to view all leave requests" ON public.leaves;
DROP POLICY IF EXISTS "Allow users to update their own pending requests" ON public.leaves;
DROP POLICY IF EXISTS "Allow teachers/admins to update any leave request" ON public.leaves;

-- 5. Create new, correct RLS policies
-- Users can create their own leave requests
CREATE POLICY "Allow authenticated users to insert their own leave"
ON public.leaves FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can see their own leave requests
CREATE POLICY "Allow users to view their own leave requests"
ON public.leaves FOR SELECT
USING (auth.uid() = user_id);

-- Admins/Teachers can see all leave requests
CREATE POLICY "Allow teachers/admins to view all leave requests"
ON public.leaves FOR SELECT
USING (
  (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IN ('classTeacher', 'subjectTeacher')
  OR
  auth.uid() IN (
    '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
    '946ba406-1ba6-49cf-ab78-f611d1350f33'  -- Owner UID
  )
);

-- Admins/Teachers can update any leave request (to approve/reject)
CREATE POLICY "Allow teachers/admins to update any leave request"
ON public.leaves FOR UPDATE
USING (
  (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IN ('classTeacher', 'subjectTeacher')
  OR
  auth.uid() IN (
    '6cc51c80-e098-4d6d-8450-5ff5931b7391', -- Principal UID
    '946ba406-1ba6-49cf-ab78-f611d1350f33'  -- Owner UID
  )
);
`;

export const addLeaveRequest = async (authUid: string, leaveRequest: Omit<LeaveRequest, 'id' | 'document_url'>, document?: File) => {
    try {
        let document_url: string | undefined;
        if (document) {
            document_url = await uploadFileToSupabase(document);
        }

        const finalRequestData: any = {
            ...leaveRequest,
            user_id: authUid,
            document_url,
        };
        
        const { data, error } = await supabase
            .from(LEAVES_COLLECTION)
            .insert([finalRequestData])
            .select()
            .single();
        
        if (error) {
            console.error("Database error:", error);
            throw new Error(`Failed to submit leave request: ${error.message}`);
        }
        
        return data;
    } catch (error) {
        console.error("Error in addLeaveRequest:", error);
        throw error;
    }
};

export const getLeaveRequestsForUser = (userId: string, callback: (leaves: LeaveRequest[]) => void) => {
    const channelName = `leaves-user-${userId}`;
    const channel = supabase.channel(channelName);

    const fetchLeaves = async () => {
        try {
            const { data, error } = await supabase.from('leaves').select('*').eq('user_id', userId).order('appliedAt', { ascending: false });
            if (error) throw error;
            callback(data || []);
        } catch (error) {
            console.error("Error fetching initial leaves:", error);
            callback([]);
        }
    };
    
    channel
        .on<LeaveRequest>('postgres_changes', { event: '*', schema: 'public', table: 'leaves', filter: `user_id=eq.${userId}` }, 
        (payload) => {
            fetchLeaves(); // Re-fetch on change
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await fetchLeaves();
            }
        });

    return channel;
};

export const getLeaveRequestsForStudents = (studentIds: string[], callback: (leaves: LeaveRequest[]) => void) => {
    if (!studentIds || studentIds.length === 0) {
        callback([]);
        return;
    }

    const channel = supabase.channel('student-leaves');

    const fetchStudentLeaves = async () => {
        try {
            const { data, error } = await supabase.from('leaves').select('*').in('user_id', studentIds).eq('userRole', 'Student').order('appliedAt', { ascending: false });
            if (error) throw error;
            callback(data || []);
        } catch (error) {
            console.error("Error fetching student leaves:", error);
        }
    };

    channel
        .on<LeaveRequest>('postgres_changes', { event: '*', schema: 'public', table: 'leaves', filter: 'userRole=eq.Student' }, 
        (payload) => {
             fetchStudentLeaves();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await fetchStudentLeaves();
            }
        });
    return channel;
};

export const getLeaveRequestsForTeachers = (teacherIds: string[], callback: (leaves: LeaveRequest[]) => void) => {
    if (!teacherIds || teacherIds.length === 0) {
        callback([]);
        return;
    }

     const channel = supabase.channel('teacher-leaves');

    const fetchTeacherLeaves = async () => {
        try {
            const { data, error } = await supabase.from('leaves').select('*').in('teacherId', teacherIds).eq('userRole', 'Teacher').order('appliedAt', { ascending: false });
            if (error) throw error;
            callback(data || []);
        } catch (error) {
            console.error("Error fetching teacher leaves:", error);
        }
    };

    channel
        .on<LeaveRequest>('postgres_changes', { event: '*', schema: 'public', table: 'leaves', filter: 'userRole=eq.Teacher' }, 
        (payload) => {
            fetchTeacherLeaves();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await fetchTeacherLeaves();
            }
        });
    return channel;
};


export const updateLeaveRequest = async (leaveId: string, updates: Partial<LeaveRequest>) => {
    try {
        const { data, error } = await supabase
            .from(LEAVES_COLLECTION)
            .update(updates)
            .eq('id', leaveId)
            .select()
            .single();
        
        if (error) {
            console.error("Error updating leave request:", error);
            throw new Error(`Failed to update leave request: ${error.message}`);
        }
        
        return data;
    } catch (error) {
        console.error("Error in updateLeaveRequest:", error);
        throw error;
    }
};

export const getLeaveRequestsForClassTeacher = (classSection: string, callback: (leaves: LeaveRequest[]) => void) => {
    const fetchClassLeaves = async () => {
        try {
            const { data, error } = await supabase
                .from('leaves')
                .select('*')
                .eq('userRole', 'Student')
                .eq('class', classSection)
                .order('appliedAt', { ascending: false });
            if (error) throw error;
            callback(data || []);
        } catch (error) {
            console.error("Error fetching class leaves:", error);
            callback([]);
        }
    };

    const channel = supabase.channel(`leaves-for-class-${classSection.replace('-', '_')}`)
        .on<LeaveRequest>(
            'postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: LEAVES_COLLECTION, 
                filter: `class=eq.${classSection}` 
            },
            (payload) => {
                fetchClassLeaves();
            }
        )
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await fetchClassLeaves();
            }
        });

    return channel;
};

// Utility function to get all leave requests (for admin use)
export const getAllLeaveRequests = (callback: (leaves: LeaveRequest[]) => void) => {
    
    const channel = supabase.channel('all-leaves');

    const fetchAllLeaves = async () => {
        try {
            const { data, error } = await supabase.from('leaves').select('*').order('appliedAt', { ascending: false });
             if (error) throw error;
            callback(data || []);
        } catch (error) {
            console.error("Error fetching all leaves:", error);
            callback([]);
        }
    };

    channel
        .on('postgres_changes',
            { event: '*', schema: 'public', table: LEAVES_COLLECTION },
            (payload) => {
                fetchAllLeaves();
            }
        )
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await fetchAllLeaves();
            }
        });

    return channel;
};
