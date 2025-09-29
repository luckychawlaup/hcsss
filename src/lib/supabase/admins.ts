

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const ADMIN_ROLES_TABLE = 'admin_roles';

export interface AdminUser {
    uid: string;
    role: 'principal' | 'accountant';
    name: string;
    email: string;
}

export const ADMINS_TABLE_SETUP_SQL = `
-- Recreate the admin_roles table with all necessary columns
DROP TABLE IF EXISTS public.admin_roles;
CREATE TABLE public.admin_roles (
    uid UUID PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('principal', 'accountant')),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    address TEXT,
    dob DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow owner to manage admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.admin_roles;

-- Policy: Allow the Owner to perform all operations on this table.
CREATE POLICY "Allow owner to manage admin roles"
ON public.admin_roles FOR ALL
USING (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050') -- Owner UID
WITH CHECK (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050');

-- Policy: Allow any authenticated user to read from this table.
CREATE POLICY "Allow authenticated users to read roles"
ON public.admin_roles FOR SELECT
USING (auth.role() = 'authenticated');
`;


export const addAdmin = async (adminData: Omit<AdminUser, 'uid'> & { dob: string, phone_number: string, address: string }) => {
    // This function must be called from a client where the owner is logged in.
    // It can't use `auth.admin.createUser` directly without a service role key.
    // The current approach of using signUp and then a password reset is a viable workaround
    // for client-side operations. The issue is the user experience on confirmation.

    // Let's refine the signUp + reset flow.
    // The problem is that signUp sends a verification email by default.
    // We want to control the flow and only send a password reset.

    // Step 1: Create the user, but tell them not to use the first email.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        // Using a long, random password that won't be used.
        password: `temp-password-${Date.now()}-${Math.random()}`,
        options: {
            data: {
                full_name: adminData.name,
                role: adminData.role,
            }
        }
    });

    if (authError) {
        console.error(`Error creating auth user for ${adminData.role}:`, authError);
        throw authError;
    }
    if (!authData.user) throw new Error(`Could not create user for ${adminData.role}.`);

    // Step 2: Immediately insert into our admin_roles table.
    const finalAdminData = {
        uid: authData.user.id,
        role: adminData.role,
        name: adminData.name,
        email: adminData.email,
        dob: adminData.dob.split('/').reverse().join('-'), // Convert DD/MM/YYYY to YYYY-MM-DD for DATE type
        phone_number: adminData.phone_number,
        address: adminData.address,
    };

    const { error: dbError } = await supabase.from(ADMIN_ROLES_TABLE).insert([finalAdminData]);

    if (dbError) {
        console.error("DB insert failed, attempting to clean up auth user:", authData.user.id);
        // This requires admin privileges not available on the client.
        // The owner might need a way to clean up failed registrations.
        throw dbError;
    }

    // Step 3: Immediately trigger a password reset email. This is the link they SHOULD use.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminData.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (resetError) {
        // This is a critical failure. The user is created but can't set a password.
        console.error("Admin user created, but failed to send password reset email.", resetError);
        throw new Error("User was created in the system, but the password reset email could not be sent. Please contact support.");
    }
    
    return finalAdminData;
}

export const getAdmins = async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase.from(ADMIN_ROLES_TABLE).select('uid, role, name, email');
    if (error) {
        console.error("Error fetching admin roles:", error);
        throw error;
    }
    return data as AdminUser[];
};

export const removeAdmin = async (uid: string) => {
    const { error: dbError } = await supabase.from(ADMIN_ROLES_TABLE).delete().eq('uid', uid);
    if (dbError) {
        console.error("Error removing admin role from DB:", dbError);
        throw dbError;
    }
    
    // The edge function handles deleting the auth user.
    const { error: funcError } = await supabase.functions.invoke('delete-user', {
        body: { uid: uid },
    });
    if (funcError) {
        console.error("DB record deleted, but failed to delete auth user:", funcError);
        // Even if auth user deletion fails, the main goal of removing their role is complete.
        // We can throw a more informative error.
        throw new Error("Admin role removed, but failed to delete their login account. Manual cleanup may be required.");
    }
};

export const resendAdminConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) {
        console.error("Error resending confirmation/password reset:", error);
        throw error;
    }
};
