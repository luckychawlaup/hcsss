
'use client'

import { createClient } from "@/lib/supabase/client";
import { addTeacher as addTeacherWithUpload } from './teachers.server';

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
    const formData = new FormData();
    Object.entries(teacherData).forEach(([key, value]) => {
        if (key === 'photo') {
            // handled below
        } else if (value instanceof Date) {
            formData.append(key, value.toISOString());
        } else if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
        }
    });
    formData.append('photo', teacherData.photo);
    
    return addTeacherWithUpload(formData);
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
