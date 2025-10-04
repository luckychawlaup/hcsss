
'use client'

import { createClient } from "@/lib/supabase/client";
import { addAdmin as addAdminServerAction } from './admins.server';

const supabase = createClient();
const ADMIN_ROLES_TABLE = 'admin_roles';

export const ADMIN_ROLES_TABLE_SETUP_SQL = `
CREATE TABLE IF NOT EXISTS public.admin_roles (
    uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('principal', 'accountant')),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    address TEXT,
    photo_url TEXT,
    dob TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owner to manage admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Allow authenticated admins to read their own role" ON public.admin_roles;

-- Policy for the Owner (full access)
CREATE POLICY "Allow owner to manage admin roles"
ON public.admin_roles FOR ALL
USING (auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527')
WITH CHECK (auth.uid() = '431e9a2b-64f9-46ac-9a00-479a91435527');

-- Policy for other admins (can only see their own entry)
CREATE POLICY "Allow authenticated admins to read their own role"
ON public.admin_roles FOR SELECT
USING (auth.uid() = uid);
`;


export interface AdminUser {
    uid: string;
    role: 'principal' | 'accountant';
    name: string;
    email: string;
    phone_number?: string;
    address?: string;
    photo_url?: string;
    dob?: string;
    created_at?: string;
}

export const addAdmin = async (adminData: Omit<AdminUser, 'uid' | 'created_at'>) => {
    const formData = new FormData();
    Object.entries(adminData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
        }
    });
    
    return addAdminServerAction(formData);
};

// --- List all admins ---
export const getAdmins = async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase.from(ADMIN_ROLES_TABLE).select('*');
    if (error) {
        console.error("Error fetching admin roles:", error);
        throw error;
    }
    return data as AdminUser[];
};

// --- Remove admin both from DB and Auth ---
export const removeAdmin = async (uid: string) => {
    
    // First, delete from the admin_roles table
    const { error: dbError } = await supabase.from(ADMIN_ROLES_TABLE).delete().eq('uid', uid);
    if (dbError) {
        console.error("Error removing admin role from DB:", dbError);
        throw dbError;
    }

    // Then, delete from Supabase Auth via Edge Function
    const { error: funcError } = await supabase.functions.invoke('delete-user', {
        body: { uid }
    });
    if (funcError) {
        console.error("DB record deleted, but failed to delete auth user:", funcError);
        // Note: At this point, the role is revoked, but the auth user might still exist.
        // This is a partial success state. We can still throw an error to notify the client.
        throw new Error("Admin role removed, but failed to delete their login account.");
    }
};
