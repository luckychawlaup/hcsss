'use client'

import { createClient } from "@/lib/supabase/client";
import { addTeacher as addTeacherServerAction } from './teachers.server';

const supabase = createClient();
const TEACHERS_COLLECTION = 'teachers';

export const TEACHERS_TABLE_SETUP_SQL = `
-- Create teachers table to store staff information
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    dob TEXT NOT NULL,
    gender TEXT,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    role TEXT NOT NULL,
    subject TEXT NOT NULL,
    qualifications TEXT[],
    class_teacher_of TEXT,
    classes_taught TEXT[],
    joining_date TEXT NOT NULL,
    work_experience TEXT,
    aadhar_number TEXT,
    pan_number TEXT,
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
    (SELECT role FROM public.admin_roles WHERE uid = auth.uid()) IN ('principal', 'owner')
    OR
    (auth.uid() = '${process.env.NEXT_PUBLIC_OWNER_UID}')
);

-- Policy: Allow teachers to view and update their own profiles
CREATE POLICY "Allow teachers to view and update their own profiles"
ON public.teachers FOR ALL
USING (auth_uid = auth.uid())
WITH CHECK (
  auth_uid = auth.uid()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_teachers_auth_uid ON public.teachers(auth_uid);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON public.teachers(email);
`;

export interface Teacher {
    id: string;
    auth_uid?: string | null;
    employee_id?: string | null;
    name: string;
    email: string;
    photo_url?: string | null;
    dob: string; // DD/MM/YYYY - REQUIRED in original
    gender?: 'Male' | 'Female' | 'Other' | null;
    father_name: string; // REQUIRED in original
    mother_name: string; // REQUIRED in original
    phone_number: string; // REQUIRED in original
    address: string; // REQUIRED in original
    role: 'teacher' | 'classTeacher';
    subject: string; // REQUIRED in original
    qualifications?: string[] | null;
    class_teacher_of?: string | null;
    classes_taught?: string[] | null;
    joining_date: string; // ISO string - REQUIRED
    work_experience?: string | null;
    aadhar_number?: string | null;
    pan_number?: string | null;
    bank_account?: {
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
        bankName?: string;
    } | null;
    created_at?: string;
    updated_at?: string;
}

export type CombinedTeacher = (Teacher & { status: 'Registered' });

// Helper function to clean and validate data before sending
const prepareTeacherData = (teacherData: Omit<Teacher, 'id' | 'auth_uid' | 'employee_id' | 'created_at' | 'updated_at'>) => {
    const cleaned: Record<string, any> = {};
    
    Object.entries(teacherData).forEach(([key, value]) => {
        // Skip undefined values
        if (value === undefined) {
            return;
        }
        
        // Handle null values
        if (value === null) {
            cleaned[key] = null;
            return;
        }
        
        // Handle Date objects
        if (value instanceof Date) {
            cleaned[key] = value.toISOString();
            return;
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
            cleaned[key] = value.length > 0 ? value : null;
            return;
        }
        
        // Handle objects
        if (typeof value === 'object') {
            const hasValues = Object.values(value).some(v => v !== undefined && v !== null && v !== '');
            cleaned[key] = hasValues ? value : null;
            return;
        }
        
        // Handle strings
        if (typeof value === 'string') {
            const trimmed = value.trim();
            cleaned[key] = trimmed !== '' ? trimmed : null;
            return;
        }
        
        // Handle other primitives
        cleaned[key] = value;
    });
    
    return cleaned;
};

export const addTeacher = async (teacherData: Omit<Teacher, 'id' | 'auth_uid' | 'employee_id' | 'created_at' | 'updated_at'>) => {
    try {
        // Validate required fields (matching original schema)
        if (!teacherData.name || !teacherData.email || !teacherData.dob || 
            !teacherData.father_name || !teacherData.mother_name || 
            !teacherData.phone_number || !teacherData.address || 
            !teacherData.role || !teacherData.subject || !teacherData.joining_date) {
            throw new Error('Missing required fields');
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(teacherData.email)) {
            throw new Error('Invalid email format');
        }
        
        // Prepare clean data
        const cleanedData = prepareTeacherData(teacherData);
        
        // Create FormData
        const formData = new FormData();
        Object.entries(cleanedData).forEach(([key, value]) => {
            if (value === null) {
                // Skip null values or append as empty string based on your preference
                return;
            }
            
            if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        });
        
        return await addTeacherServerAction(formData);
    } catch (error) {
        console.error('Error in addTeacher:', error);
        throw error;
    }
};

export const getTeachersAndPending = (callback: (teachers: CombinedTeacher[]) => void) => {
    const fetchAndCallback = async () => {
        try {
            const { data: teachers, error } = await supabase
                .from(TEACHERS_COLLECTION)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error fetching teachers:', error);
                callback([]);
                return;
            }
            
            callback([...(teachers || []).map(t => ({ ...t, status: 'Registered' as const }))]);
        } catch (error) {
            console.error('Exception in fetchAndCallback:', error);
            callback([]);
        }
    };

    const channel = supabase
        .channel('all-teachers')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: TEACHERS_COLLECTION 
        }, fetchAndCallback)
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                fetchAndCallback();
            }
            if (err) {
                console.error(`Real-time channel error in all-teachers:`, err);
            }
        });
    
    return () => supabase.removeChannel(channel);
};

export const getTeacherByAuthId = async (authId: string): Promise<Teacher | null> => {
    try {
        const { data, error } = await supabase
            .from(TEACHERS_COLLECTION)
            .select('*')
            .eq('auth_uid', authId)
            .maybeSingle();
        
        if (error) {
            console.error("Error fetching teacher by auth ID:", error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error("Exception in getTeacherByAuthId:", error);
        return null;
    }
};

export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
    try {
        const { data, error } = await supabase
            .from(TEACHERS_COLLECTION)
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        if (error) {
            console.error('Error fetching teacher by email:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Exception in getTeacherByEmail:', error);
        return null;
    }
};

export const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
    try {
        // Remove fields that shouldn't be updated
        const { id: _, auth_uid, employee_id, created_at, ...safeUpdates } = updates as any;
        
        // Clean the updates
        const cleanedUpdates = prepareTeacherData(safeUpdates as any);
        
        // Add updated_at timestamp
        const finalUpdates = {
            ...cleanedUpdates,
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from(TEACHERS_COLLECTION)
            .update(finalUpdates)
            .eq('id', id);
        
        if (error) {
            console.error('Error updating teacher:', error);
            throw error;
        }
    } catch (error) {
        console.error('Exception in updateTeacher:', error);
        throw error;
    }
};

export const deleteTeacher = async (id: string) => {
    try {
        // Fetch teacher to get auth_uid
        const { data: teacher, error: fetchError } = await supabase
            .from(TEACHERS_COLLECTION)
            .select('auth_uid')
            .eq('id', id)
            .single();
        
        if (fetchError) {
            console.error("Error fetching teacher for deletion:", fetchError);
            throw fetchError;
        }
        
        // Delete from database first
        const { error: deleteError } = await supabase
            .from(TEACHERS_COLLECTION)
            .delete()
            .eq('id', id);
        
        if (deleteError) {
            console.error("Error deleting teacher:", deleteError);
            throw deleteError;
        }

        // Delete auth user if exists
        if (teacher?.auth_uid) {
            try {
                const { error: funcError } = await supabase.functions.invoke('delete-user', {
                    body: { uid: teacher.auth_uid },
                });
                
                if (funcError) {
                    console.error("DB record deleted, but failed to delete auth user:", funcError);
                    // Don't throw here - DB deletion succeeded
                }
            } catch (error) {
                console.error("Exception deleting auth user:", error);
                // Don't throw - DB deletion succeeded
            }
        }
    } catch (error) {
        console.error('Exception in deleteTeacher:', error);
        throw error;
    }
};

export const getRegistrationKeyForTeacher = async (email: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from(TEACHERS_COLLECTION)
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();
        
        if (error) {
            console.error('Error getting registration key:', error);
            return null;
        }
        
        return data?.id || null;
    } catch (error) {
        console.error('Exception in getRegistrationKeyForTeacher:', error);
        return null;
    }
};