
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const TEACHERS_COLLECTION = 'teachers';
const PENDING_TEACHERS_COLLECTION = 'pending_teachers';

export interface Teacher {
    id: string;
    authUid: string;
    name: string;
    email: string;
    photoUrl: string;
    dob: string; // YYYY-MM-DD
    fatherName: string;
    motherName: string;
    phoneNumber: string;
    address: string;
    role: 'classTeacher' | 'subjectTeacher';
    subject: string;
    qualifications?: string[];
    classTeacherOf?: string; // e.g., "10-A"
    classesTaught?: string[];
    joiningDate: number; // timestamp
    bankAccount?: {
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
        bankName?: string;
    };
}

export interface PendingTeacher {
    id: string;
    name: string;
    email: string;
    registrationKey: string;
    // other fields as necessary
}

export type CombinedTeacher = (Teacher & { status: 'Registered' }) | (PendingTeacher & { status: 'Pending' });


export const addTeacher = async (teacherData: Omit<Teacher, 'id' | 'authUid' | 'joiningDate'>) => {
    const registrationKey = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { error } = await supabase.from(PENDING_TEACHERS_COLLECTION).insert([{
        ...teacherData,
        registrationKey,
        joiningDate: new Date().getTime(),
    }]);

    if (error) throw error;

    return registrationKey;
};

export const getTeachersAndPending = (callback: (teachers: CombinedTeacher[]) => void) => {
    const channel = supabase.channel('teachers-and-pending')
        .on('postgres_changes', { event: '*', schema: 'public', table: TEACHERS_COLLECTION }, async () => {
            const { data: teachers } = await supabase.from(TEACHERS_COLLECTION).select('*');
            const { data: pending } = await supabase.from(PENDING_TEACHERS_COLLECTION).select('*');
            callback([...(teachers || []).map(t => ({ ...t, status: 'Registered' })), ...(pending || []).map(p => ({ ...p, status: 'Pending' }))]);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: PENDING_TEACHERS_COLLECTION }, async () => {
            const { data: teachers } = await supabase.from(TEACHERS_COLLECTION).select('*');
            const { data: pending } = await supabase.from(PENDING_TEACHERS_COLLECTION).select('*');
            callback([...(teachers || []).map(t => ({ ...t, status: 'Registered' })), ...(pending || []).map(p => ({ ...p, status: 'Pending' }))]);
        })
        .subscribe();
    
    (async () => {
        const { data: teachers } = await supabase.from(TEACHERS_COLLECTION).select('*');
        const { data: pending } = await supabase.from(PENDING_TEACHERS_COLLECTION).select('*');
        callback([...(teachers || []).map(t => ({ ...t, status: 'Registered' as const })), ...(pending || []).map(p => ({ ...p, status: 'Pending' as const }))]);
    })();

    return () => supabase.removeChannel(channel);
}

export const getTeacherByAuthId = async (authId: string): Promise<Teacher | null> => {
    const { data, error } = await supabase.from(TEACHERS_COLLECTION).select('*').eq('authUid', authId).single();
    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching teacher by auth ID:", error);
    }
    return data;
}

export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching teacher by email:', error);
  }
  
  return data;
};

export const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
    const { error } = await supabase.from(TEACHERS_COLLECTION).update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteTeacher = async (id: string) => {
    // This needs to be a transaction or a server-side function
    // 1. Delete from teachers table
    // 2. Delete auth user
    const { error } = await supabase.from(TEACHERS_COLLECTION).delete().eq('id', id);
    if (error) throw error;
};

export const getRegistrationKeyForTeacher = async (email: string): Promise<string | null> => {
    const { data, error } = await supabase.from(PENDING_TEACHERS_COLLECTION).select('registrationKey').eq('email', email).single();
    if(error) return null;
    return data.registrationKey;
}

export const regenerateTemporaryPassword = async (authUid: string): Promise<string> => {
    // This must be done on the server side via a Supabase Edge Function
    // For now, we will simulate the password reset flow.
    const { data, error } = await supabase.auth.resetPasswordForEmail(authUid);
    if(error) throw error;
    return "Password reset email sent.";
}
