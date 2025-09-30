
'use server'

import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/imagekit";

const supabase = createClient();
const ADMIN_ROLES_TABLE = 'admin_roles';

// --- SQL table setup ---
export const ADMINS_TABLE_SETUP_SQL = `
DROP TABLE IF EXISTS public.admin_roles;
CREATE TABLE public.admin_roles (
    uid UUID PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('principal', 'accountant')),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    address TEXT,
    photo_url TEXT,
    dob DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owner to manage admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Allow admins to view their own role" ON public.admin_roles;
DROP POLICY IF EXISTS "Allow owner to read admin roles" ON public.admin_roles;

CREATE POLICY "Allow owner to manage admin roles"
ON public.admin_roles FOR ALL
USING (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050')
WITH CHECK (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050');

CREATE POLICY "Allow admins to view their own role"
ON public.admin_roles FOR SELECT
USING (auth.uid() = uid);

CREATE POLICY "Allow owner to read admin roles"
ON public.admin_roles FOR SELECT
USING (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050');
`;

// --- TypeScript interface ---
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

// Add an admin using the standard Supabase Auth flow
export const addAdmin = async (adminData: Omit<AdminUser, 'uid' | 'photo_url'> & { dob: string; phone_number: string; address?: string, photo: File }) => {
    
    // 1. Sign up the user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
        email: adminData.email,
        password: crypto.randomUUID(), 
        options: {
            data: {
                role: adminData.role,
                full_name: adminData.name,
            },
            emailRedirectTo: 'https://9000-firebase-studio-1757343757356.cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev/auth/callback',
        }
    });

    if (signUpError) {
        console.error("Error creating admin auth user:", signUpError);
        throw new Error(signUpError.message);
    }
    
    const user = data.user;
    if (!user) {
        throw new Error("User not created in Supabase Auth.");
    }

    try {
        // 2. Upload photo to ImageKit
        const fileBuffer = Buffer.from(await adminData.photo.arrayBuffer());
        const photoUrl = await uploadImage(fileBuffer, adminData.photo.name, 'admin_profiles');

        // 3. Insert profile into admin_roles table
        const { error: dbError } = await supabase
            .from(ADMIN_ROLES_TABLE)
            .insert({ 
                ...adminData, 
                uid: user.id,
                photo_url: photoUrl
            });

        if (dbError) {
            // If DB insert fails, delete the auth user to prevent orphans
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw new Error(`Failed to create admin profile: ${dbError.message}`);
        }
        
        // 4. Send password reset email for them to set their password
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminData.email, {
            redirectTo: 'https://9000-firebase-studio-1757343757356.cluster-52r6vzs3ujeoctkkxpjif3x34a.cloudworkstations.dev/auth/callback',
        });

        if (resetError) {
            console.warn("Admin account created, but failed to send password set email:", resetError.message);
        }

    } catch (e: any) {
        // Cleanup auth user if any step fails after its creation
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
    
    return { message: "Admin account created. They will receive an email to set their password." };
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
