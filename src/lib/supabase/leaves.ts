
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const LEAVES_COLLECTION = 'leaves';

export interface LeaveRequest {
  id: string;
  user_id: string;
  userName: string;
  userRole: 'Student' | 'Teacher';
  class?: string; // e.g., 10-A for students
  teacherId?: string; // For teacher leaves
  startDate: string; // ISO string
  endDate: string; // ISO string
  reason: string;
  status: 'Pending' | 'Confirmed' | 'Rejected';
  appliedAt: string; // ISO string
  rejectionReason?: string;
  approverComment?: string;
}

/**
 * SQL SETUP SCRIPT FOR LEAVES TABLE
 *
 * Run this in your Supabase SQL Editor to create the 'leaves' table
 * and apply the necessary Row Level Security (RLS) policies.
 */
export const LEAVES_TABLE_SETUP_SQL = `
-- 1. Create the 'leaves' table
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
    "approverComment" TEXT
);

-- 2. Enable RLS on the 'leaves' table
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to insert their own leave" ON public.leaves;
DROP POLICY IF EXISTS "Allow users to view their own leave requests" ON public.leaves;
DROP POLICY IF EXISTS "Allow teachers/admins to view all leave requests" ON public.leaves;
DROP POLICY IF EXISTS "Allow users to update their own pending requests" ON public.leaves;
DROP POLICY IF EXISTS "Allow teachers/admins to update any leave request" ON public.leaves;

-- 4. Create new RLS policies
-- Users can create their own leave requests
CREATE POLICY "Allow authenticated users to insert their own leave"
ON public.leaves FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can see their own leave requests
CREATE POLICY "Allow users to view their own leave requests"
ON public.leaves FOR SELECT
USING (auth.uid() = user_id);

-- Admins/Teachers can see all leave requests (for approval)
-- Note: This is a broad policy. For production, you might restrict this further,
-- e.g., class teachers can only see leaves for their own class.
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

-- Users can update their own PENDING leave requests (e.g., to cancel, though not implemented in UI)
CREATE POLICY "Allow users to update their own pending requests"
ON public.leaves FOR UPDATE
USING (auth.uid() = user_id AND status = 'Pending')
WITH CHECK (auth.uid() = user_id);

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

export const addLeaveRequest = async (leaveRequest: Omit<LeaveRequest, 'id'>) => {
    try {
        console.log("Adding leave request to database:", leaveRequest);
        
        const { data, error } = await supabase
            .from(LEAVES_COLLECTION)
            .insert([leaveRequest])
            .select()
            .single();
        
        if (error) {
            console.error("Database error:", error);
            throw new Error(`Failed to submit leave request: ${error.message}`);
        }
        
        console.log("Leave request added successfully:", data);
        return data;
    } catch (error) {
        console.error("Error in addLeaveRequest:", error);
        throw error;
    }
};

export const getLeaveRequestsForUser = (userId: string, callback: (leaves: LeaveRequest[]) => void) => {
    console.log("Setting up leave requests subscription for user:", userId);
    
    // Initial fetch
    const fetchLeaves = async () => {
        try {
            const { data, error } = await supabase
                .from(LEAVES_COLLECTION)
                .select('*')
                .eq('user_id', userId)
                .order('appliedAt', { ascending: false });
            
            if (error) {
                console.error("Error fetching leaves:", error);
                callback([]);
            } else {
                console.log("Fetched leaves for user:", data);
                callback(data || []);
            }
        } catch (error) {
            console.error("Error in fetchLeaves:", error);
            callback([]);
        }
    };

    // Fetch initial data
    fetchLeaves();

    // Set up real-time subscription
    const channel = supabase
        .channel(`leaves-user-${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: LEAVES_COLLECTION,
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                console.log("Real-time update received:", payload);
                fetchLeaves(); // Re-fetch all data on any change
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log("Successfully subscribed to leaves channel for user:", userId);
            }
            if (status === 'CHANNEL_ERROR') {
                console.error('Leave subscription error:', err);
            }
        });

    // Return unsubscribe function
    return () => {
        console.log("Unsubscribing from leaves channel");
        supabase.removeChannel(channel);
    };
};

export const getLeaveRequestsForStudents = (studentIds: string[], callback: (leaves: LeaveRequest[]) => void) => {
    console.log("Setting up student leaves subscription for IDs:", studentIds);
    
    if (!studentIds || studentIds.length === 0) {
        callback([]);
        return () => {};
    }

    const fetchStudentLeaves = async () => {
        try {
            const { data, error } = await supabase
                .from(LEAVES_COLLECTION)
                .select('*')
                .in('user_id', studentIds)
                .eq('userRole', 'Student')
                .order('appliedAt', { ascending: false });
            
            if (error) {
                console.error("Error fetching student leaves:", error);
                callback([]);
            } else {
                console.log("Fetched student leaves:", data);
                callback(data || []);
            }
        } catch (error) {
            console.error("Error in fetchStudentLeaves:", error);
            callback([]);
        }
    };

    fetchStudentLeaves();

    const channel = supabase
        .channel('student-leaves')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: LEAVES_COLLECTION
            },
            (payload) => {
                console.log("Student leaves real-time update:", payload);
                fetchStudentLeaves();
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const getLeaveRequestsForTeachers = (teacherIds: string[], callback: (leaves: LeaveRequest[]) => void) => {
    console.log("Setting up teacher leaves subscription for IDs:", teacherIds);
    
    if (!teacherIds || teacherIds.length === 0) {
        callback([]);
        return () => {};
    }

    const fetchTeacherLeaves = async () => {
        try {
            const { data, error } = await supabase
                .from(LEAVES_COLLECTION)
                .select('*')
                .in('teacherId', teacherIds.filter(id => id)) // Filter out null/undefined IDs
                .eq('userRole', 'Teacher')
                .order('appliedAt', { ascending: false });
            
            if (error) {
                console.error("Error fetching teacher leaves:", error);
                callback([]);
            } else {
                console.log("Fetched teacher leaves:", data);
                callback(data || []);
            }
        } catch (error) {
            console.error("Error in fetchTeacherLeaves:", error);
            callback([]);
        }
    };

    fetchTeacherLeaves();

    const channel = supabase
        .channel('teacher-leaves')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: LEAVES_COLLECTION
            },
            (payload) => {
                console.log("Teacher leaves real-time update:", payload);
                fetchTeacherLeaves();
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const updateLeaveRequest = async (leaveId: string, updates: Partial<LeaveRequest>) => {
    try {
        console.log("Updating leave request:", leaveId, updates);
        
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
        
        console.log("Leave request updated successfully:", data);
        return data;
    } catch (error) {
        console.error("Error in updateLeaveRequest:", error);
        throw error;
    }
};

export const getLeaveRequestsForClassTeacher = (classTeacherId: string, callback: (leaves: LeaveRequest[]) => void) => {
    console.log("Setting up class teacher leaves subscription for:", classTeacherId);
    
    // This function needs to be implemented based on your class structure
    // For now, it's a placeholder that returns empty results
    const fetchClassLeaves = async () => {
        try {
            // You'll need to implement the logic to get students for this class teacher
            // and then fetch their leave requests
            callback([]);
        } catch (error) {
            console.error("Error fetching class leaves:", error);
            callback([]);
        }
    };

    fetchClassLeaves();

    // Return empty unsubscribe function for now
    return () => {
        console.log("Unsubscribing from class teacher leaves");
    };
};

// Utility function to get all leave requests (for admin use)
export const getAllLeaveRequests = (callback: (leaves: LeaveRequest[]) => void) => {
    console.log("Setting up all leaves subscription");
    
    const fetchAllLeaves = async () => {
        try {
            const { data, error } = await supabase
                .from(LEAVES_COLLECTION)
                .select('*')
                .order('appliedAt', { ascending: false });
            
            if (error) {
                console.error("Error fetching all leaves:", error);
                callback([]);
            } else {
                console.log("Fetched all leaves:", data);
                callback(data || []);
            }
        } catch (error) {
            console.error("Error in fetchAllLeaves:", error);
            callback([]);
        }
    };

    fetchAllLeaves();

    const channel = supabase
        .channel('all-leaves')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: LEAVES_COLLECTION
            },
            (payload) => {
                console.log("All leaves real-time update:", payload);
                fetchAllLeaves();
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

    