
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const LEAVES_COLLECTION = 'leaves';

export interface LeaveRequest {
  id: string;
  userId: string;
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

export const addLeaveRequest = async (leaveRequest: Omit<LeaveRequest, 'id'>) => {
    const { error } = await supabase.from(LEAVES_COLLECTION).insert([leaveRequest]);
    if (error) throw error;
};

export const getLeaveRequestsForUser = (userId: string, callback: (leaves: LeaveRequest[]) => void) => {
    const channel = supabase.channel(`leaves-user-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: LEAVES_COLLECTION, filter: `userId=eq.${userId}` },
        async () => {
            const { data, error } = await supabase.from(LEAVES_COLLECTION).select('*').eq('userId', userId).order('appliedAt', { ascending: false });
            if (data) callback(data);
        }).subscribe();
    
    (async () => {
        const { data, error } = await supabase.from(LEAVES_COLLECTION).select('*').eq('userId', userId).order('appliedAt', { ascending: false });
        if (data) callback(data);
    })();

    return channel;
};


export const getLeaveRequestsForStudents = (studentIds: string[], callback: (leaves: LeaveRequest[]) => void) => {
    const channel = supabase.channel('student-leaves')
        .on('postgres_changes', { event: '*', schema: 'public', table: LEAVES_COLLECTION },
        async () => {
            const { data, error } = await supabase.from(LEAVES_COLLECTION).select('*').in('userId', studentIds).order('appliedAt', { ascending: false });
            if (data) callback(data);
        }).subscribe();

    (async () => {
        const { data, error } = await supabase.from(LEAVES_COLLECTION).select('*').in('userId', studentIds).order('appliedAt', { ascending: false });
        if (data) callback(data);
    })();

    return () => supabase.removeChannel(channel);
};

export const getLeaveRequestsForTeachers = (teacherIds: string[], callback: (leaves: LeaveRequest[]) => void) => {
     const channel = supabase.channel('teacher-leaves')
        .on('postgres_changes', { event: '*', schema: 'public', table: LEAVES_COLLECTION },
        async () => {
            const { data, error } = await supabase.from(LEAVES_COLLECTION).select('*').in('teacherId', teacherIds).order('appliedAt', { ascending: false });
            if (data) callback(data);
        }).subscribe();

    (async () => {
        const { data, error } = await supabase.from(LEAVES_COLLECTION).select('*').in('teacherId', teacherIds).order('appliedAt', { ascending: false });
        if (data) callback(data);
    })();

    return () => supabase.removeChannel(channel);
};


export const updateLeaveRequest = async (leaveId: string, updates: Partial<LeaveRequest>) => {
    const { error } = await supabase.from(LEAVES_COLLECTION).update(updates).eq('id', leaveId);
    if (error) throw error;
};

export const getLeaveRequestsForClassTeacher = (classTeacherId: string, callback: (leaves: LeaveRequest[]) => void) => {
    // This is a placeholder. In a real app, you'd need to fetch students for the class teacher first.
    // Assuming for now the teacher ID is in a `class_teacher_id` field.
    const channel = supabase.channel(`leaves-class-teacher-${classTeacherId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: LEAVES_COLLECTION, filter: `class->>teacher_id=eq.${classTeacherId}` }, // This filter is conceptual
        async () => {
            // Re-fetch logic here
        }).subscribe();

    return () => supabase.removeChannel(channel);
};
