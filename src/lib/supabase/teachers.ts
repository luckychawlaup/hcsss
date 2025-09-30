
'use server'

import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/imagekit";

const supabase = createClient();
const TEACHERS_COLLECTION = 'teachers';

export interface Teacher {
    id: string;
    auth_uid: string;
    name: string;
    email: string;
    photo_url: string;
    dob: string; // DD/MM/YYYY
    father_name: string;
    mother_name: string;
    phone_number: string;
    address: string;
    role: 'classTeacher' | 'subjectTeacher';
    subject: string;
    qualifications?: string[];
    class_teacher_of?: string; // e.g., "10-A"
    classes_taught?: string[];
    joining_date: number; // timestamp
    bank_account?: {
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
        bankName?: string;
    };
}

export type CombinedTeacher = (Teacher & { status: 'Registered' });

export const addTeacher = async (teacherData: Omit<Teacher, 'id' | 'auth_uid' | 'photo_url'> & { photo: File }) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: teacherData.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
            data: {
                full_name: teacherData.name,
                role: 'teacher'
            }
        }
    });

    if (authError) {
        console.error("Error creating auth user for teacher:", authError);
        throw authError;
    }

    const user = authData.user;
    if (!user) {
        throw new Error("Could not create user for teacher.");
    }

    try {
        const fileBuffer = Buffer.from(await teacherData.photo.arrayBuffer());
        const photoUrl = await uploadImage(fileBuffer, teacherData.photo.name, 'teacher_profiles');

        const { photo, ...restOfTeacherData } = teacherData;

        const finalTeacherData = {
            ...restOfTeacherData,
            auth_uid: user.id,
            photo_url: photoUrl,
        };

        const { error: dbError } = await supabase.from(TEACHERS_COLLECTION).insert([finalTeacherData]);

        if (dbError) {
            console.error("Error saving teacher to DB:", dbError);
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw dbError;
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(teacherData.email);
        if(resetError) {
            console.warn("Teacher created, but failed to send password reset email.", resetError);
        }

    } catch (e: any) {
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
};

export const getTeachersAndPending = (callback: (teachers: CombinedTeacher[]) => void) => {
    const fetchAndCallback = async () => {
         const { data: teachers } = await supabase.from(TEACHERS_COLLECTION).select('*');
         callback([...(teachers || []).map(t => ({ ...t, status: 'Registered' as const }))]);
    };

    const channel = supabase.channel('all-teachers')
        .on('postgres_changes', { event: '*', schema: 'public', table: TEACHERS_COLLECTION }, fetchAndCallback)
        .subscribe((status, err) => {
            if(status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
             if (err) {
                console.error(`Real-time channel error in all-teachers:`, err);
            }
        });
    
    return () => supabase.removeChannel(channel);
}

export const getTeacherByAuthId = async (authId: string): Promise<Teacher | null> => {
    const { data, error } = await supabase.from(TEACHERS_COLLECTION).select('*').eq('auth_uid', authId).single();
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
    const { data: teacher, error: fetchError } = await supabase.from(TEACHERS_COLLECTION).select('auth_uid').eq('id', id).single();
    if (fetchError) {
        console.error("Error fetching teacher for deletion:", fetchError);
        throw fetchError;
    }
    
    const { error } = await supabase.from(TEACHERS_COLLECTION).delete().eq('id', id);
    if (error) throw error;

     if (teacher.auth_uid) {
        const { error: funcError } = await supabase.functions.invoke('delete-user', {
            body: { uid: teacher.auth_uid },
        });
        if (funcError) {
            console.error("DB record deleted, but failed to delete auth user:", funcError);
            throw new Error("DB record deleted, but failed to delete auth user.");
        }
    }
};

export const getRegistrationKeyForTeacher = async (email: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', email)
        .single();
    return data ? data.id : null;
};
