

import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const TEACHERS_COLLECTION = 'teachers';

export interface Teacher {
    id: string;
    auth_uid: string;
    name: string;
    email: string;
    photo_url: string;
    dob: string; // YYYY-MM-DD
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

export type CombinedTeacher = (Teacher & { status: 'Registered' });

export const addTeacher = async (teacherData: Omit<Teacher, 'id' | 'auth_uid' | 'photo_url'> & { photo: File }) => {
    const tempPassword = Math.random().toString(36).slice(-8);

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: teacherData.email,
        password: tempPassword,
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

    if (!authData.user) {
        throw new Error("Could not create user for teacher.");
    }
    
    const photoUrl = await uploadFileToSupabase(teacherData.photo, 'teachers', 'photos');

    const { photo, ...restOfTeacherData } = teacherData;

    const finalTeacherData = {
        ...restOfTeacherData,
        auth_uid: authData.user.id,
        photo_url: photoUrl,
    };

    const { error: dbError } = await supabase.from(TEACHERS_COLLECTION).insert([finalTeacherData]);

    if (dbError) {
        console.error("Error saving teacher to DB:", dbError, "Auth user created but DB insert failed. Manual cleanup of auth user may be required:", authData.user.id);
        // In a real production scenario, you might want to automatically delete the auth user here.
        // await supabase.auth.admin.deleteUser(authData.user.id);
        throw dbError;
    }

    // Send password reset email so they can set their own password
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(teacherData.email, {
        redirectTo: `${window.location.origin}/`,
    });
    if(resetError) {
        console.warn("Teacher created, but failed to send password reset email.", resetError);
    }
};

export const getTeachersAndPending = (callback: (teachers: CombinedTeacher[]) => void) => {
    const channel = supabase.channel('teachers-and-pending')
        .on('postgres_changes', { event: '*', schema: 'public', table: TEACHERS_COLLECTION }, async () => {
            const { data: teachers } = await supabase.from(TEACHERS_COLLECTION).select('*');
            callback([...(teachers || []).map(t => ({ ...t, status: 'Registered' as const }))]);
        })
        .subscribe();
    
    (async () => {
        const { data: teachers } = await supabase.from(TEACHERS_COLLECTION).select('*');
        callback([...(teachers || []).map(t => ({ ...t, status: 'Registered' as const }))]);
    })();

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

export const getRegistrationKeyForTeacher = async (email: string): Promise<string | null> => {
    // This function is a placeholder as the current flow creates teachers directly.
    // In a flow where teachers register themselves, you would query a registration_keys table.
    // For now, we will return a mock key for the joining letter to work.
    // A robust implementation would involve generating and storing a real, single-use key.
    console.warn("getRegistrationKeyForTeacher is returning a mock key. For production, implement a secure key generation and storage system.");
    return `REG-KEY-FOR-${email.split('@')[0]}`.toUpperCase();
}


export const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
    const { error } = await supabase.from(TEACHERS_COLLECTION).update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteTeacher = async (id: string) => {
    // Get teacher to find auth_uid
    const { data: teacher, error: fetchError } = await supabase.from(TEACHERS_COLLECTION).select('auth_uid').eq('id', id).single();
    if (fetchError) {
        console.error("Error fetching teacher for deletion:", fetchError);
        throw fetchError;
    }
    
    // Delete from DB
    const { error } = await supabase.from(TEACHERS_COLLECTION).delete().eq('id', id);
    if (error) throw error;

    // Call edge function to delete auth user
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

    
