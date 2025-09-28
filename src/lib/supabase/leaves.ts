

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
-- 1. Create the 'leaves' table with correctly quoted column names
CREATE TABLE IF NOT EXISTS public.leaves (
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

-- 2. Enable RLS on the 'leaves' table
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert their own leave" ON public.leaves;
DROP POLICY IF EXISTS "Allow users to view their own leave requests" ON public.leaves;
DROP POLICY IF EXISTS "Allow teachers/admins to manage all leave requests" ON public.leaves;

-- 4. Create new, correct RLS policies
-- Users can create their own leave requests
CREATE POLICY "Allow authenticated users to insert their own leave"
ON public.leaves FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can see their own leave requests
CREATE POLICY "Allow users to view their own leave requests"
ON public.leaves FOR SELECT
USING (auth.uid() = user_id);

-- Admins/Teachers can see and update all leave requests
CREATE POLICY "Allow teachers/admins to manage all leave requests"
ON public.leaves FOR ALL
USING (
  (SELECT role FROM public.teachers WHERE auth_uid = auth.uid()) IN ('classTeacher', 'subjectTeacher')
  OR
  auth.uid() IN ('6cc51c80-e098-4d6d-8450-5ff5931b7391', 'cf210695-e635-4363-aea5-740f2707a6d7')
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
        .subscribe(async (status, err) => {
            if (status === 'SUBSCRIBED') {
                await fetchLeaves();
            }
             if (err) {
                console.error(`Real-time channel error in ${channelName}:`, err);
            }
        });

    return channel;
};

// This function is for the Principal to get leave requests from Teachers
export const getLeaveRequestsForTeachers = (callback: (leaves: LeaveRequest[]) => void) => {
    const fetchTeacherLeaves = async () => {
        try {
            const { data, error } = await supabase
                .from('leaves')
                .select('*')
                .eq('userRole', 'Teacher')
                .order('appliedAt', { ascending: false });
            if (error) throw error;
            callback(data || []);
        } catch (error) {
            console.error("Error fetching teacher leaves:", error);
            callback([]);
        }
    };

    const channel = supabase.channel('teacher-leaves')
        .on<LeaveRequest>('postgres_changes', { event: '*', schema: 'public', table: LEAVES_COLLECTION, filter: 'userRole=eq.Teacher' }, 
        (payload) => {
            fetchTeacherLeaves();
        })
        .subscribe(async (status, err) => {
            if (status === 'SUBSCRIBED') {
                await fetchTeacherLeaves();
            }
            if (err) {
                console.error('Real-time channel error in teacher-leaves:', err);
            }
        });
    return channel;
};


export const updateLeaveRequest = async (leaveId: string, updates: Partial<Pick<LeaveRequest, 'status' | 'rejectionReason' | 'approverComment'>>) => {
    try {
        const { data, error } = await supabase
            .from(LEAVES_COLLECTION)
            .update(updates)
            .eq('id', leaveId)
            .select()
            .single();
        
        if (error) {
            console.error("Error updating leave request:", error);
            throw error;
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

    const channel = supabase.channel(`leaves-class-${classSection}`)
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
        .subscribe(async (status, err) => {
            if (status === 'SUBSCRIBED') {
                await fetchClassLeaves();
            }
             if (err) {
                console.error(`Real-time channel error in leaves-class-${classSection}:`, err);
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
        .subscribe(async (status, err) => {
            if (status === 'SUBSCRIBED') {
                await fetchAllLeaves();
            }
             if (err) {
                console.error(`Real-time channel error in all-leaves:`, err);
            }
        });

    return channel;
};
