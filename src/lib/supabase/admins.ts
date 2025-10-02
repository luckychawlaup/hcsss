
'use client'

import { createClient } from "@/lib/supabase/client";
import { addAdmin as addAdminWithUpload } from './admins.server';

const supabase = createClient();
const ADMIN_ROLES_TABLE = 'admin_roles';

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

export const addAdmin = async (adminData: Omit<AdminUser, 'uid'> & { dob: string; phone_number: string; address?: string }) => {
    const formData = new FormData();
    Object.entries(adminData).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
        }
    });
    
    return addAdminWithUpload(formData);
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
