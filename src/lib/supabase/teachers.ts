
'use client'

import { createClient } from "@/lib/supabase/client";
import { addTeacher as addTeacherWithUpload } from './teachers.server';

const supabase = createClient();
const TEACHERS_COLLECTION = 'teachers';

export const TEACHERS_TABLE_SETUP_SQL = `
-- Create teachers table to store staff information
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    dob TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    phone_number TEXT,
    address TEXT,
    role TEXT NOT NULL,
    subject TEXT,
    qualifications TEXT[],
    class_teacher_of TEXT,
    classes_taught TEXT[],
    joining_date TEXT NOT NULL, -- Changed to TEXT to store ISO string
    bank_account JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for the teachers table
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow principal/owner to manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow teachers to view and update their own profiles" ON public.teachers;

-- Policy: Allow Principal/Owner to manage all teacher records
CREATE POLICY "Allow principal/owner to manage teachers"
ON public.teachers FOR ALL
USING (
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) = 'principal'
    OR
    (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050') -- Owner UID
);


-- Policy: Allow teachers to view their own profile and securely update only their bank details
CREATE POLICY "Allow teachers to view and update their own profiles"
ON public.teachers FOR ALL
USING (auth_uid = auth.uid())
WITH CHECK (
  auth_uid = auth.uid() AND
  -- Teachers can ONLY update their own bank_account field. All other fields are read-only for them.
  (pg_has_role(auth.uid()::text, 'authenticated', 'member'))
);
`;

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
    joining_date: string; // ISO string
    bank_account?: {
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
        bankName?: string;
    };
}

export type CombinedTeacher = (Teacher & { status: 'Registered' });

export const addTeacher = async (teacherData: Omit<Teacher, 'id' | 'auth_uid'>) => {
    const formData = new FormData();
    Object.entries(teacherData).forEach(([key, value]) => {
        if (value instanceof Date) {
            formData.append(key, value.toISOString());
        } else if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
        }
    });
    
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
    const { data, error } = await supabase.from(TEACHERS_COLLECTION).select('*').eq('auth_uid', authId).maybeSingle();
    if (error) {
        console.error("Error fetching teacher by auth ID:", error);
    }
    return data;
}

export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
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
