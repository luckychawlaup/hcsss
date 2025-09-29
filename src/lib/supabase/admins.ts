
import { createClient } from "@/lib/supabase/client";
import { getRedirectUrl } from "./auth";
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
    dob DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owner to manage admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read roles" ON public.admin_roles;

CREATE POLICY "Allow owner to manage admin roles"
ON public.admin_roles FOR ALL
USING (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050')
WITH CHECK (auth.uid() = '6bed2c29-8ac9-4e2b-b9ef-26877d42f050');

CREATE POLICY "Allow authenticated users to read roles"
ON public.admin_roles FOR SELECT
USING (auth.role() = 'authenticated');
`;

// --- TypeScript interface ---
export interface AdminUser {
    uid: string;
    role: 'principal' | 'accountant';
    name: string;
    email: string;
    phone_number?: string;
    address?: string;
    dob?: string;
    created_at?: string;
}

// --- Add an admin and trigger password reset request ---
export const addAdmin = async (adminData: Omit<AdminUser, 'uid'> & { dob: string; phone_number: string; address?: string }) => {
    
    // Use the admin client to create the user. This must be done in an Edge Function for security.
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email: adminData.email,
        password: crypto.randomUUID(), // A secure, random password
        email_confirm: true, // The user will be marked as confirmed
        user_metadata: { full_name: adminData.name, role: adminData.role }
    });

    if (createError) {
        console.error("Error creating admin user:", createError);
        throw new Error(createError.message);
    }
     if (!user) throw new Error("User not created");

    // Add user to the admin_roles table
    const { error: roleError } = await supabase.from('admin_roles').insert([{ uid: user.id, ...adminData }]);
    if (roleError) {
        console.error("Error setting admin role:", roleError);
        // If this fails, we should probably delete the user we just created to keep things clean.
        await supabase.auth.admin.deleteUser(user.id);
        throw new Error(roleError.message);
    }

    // Trigger Supabase's built-in password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminData.email, {
        redirectTo: `${getRedirectUrl().replace('/callback', '/update-password')}`
    });
    if (resetError) {
        console.error("User created, but password reset email failed:", resetError);
        throw new Error(resetError.message);
    }
};


// --- List all admins ---
export const getAdmins = async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase.from(ADMIN_ROLES_TABLE).select('uid, role, name, email, phone_number, address, dob, created_at');
    if (error) {
        console.error("Error fetching admin roles:", error);
        throw error;
    }
    return data as AdminUser[];
};

// --- Remove admin both from DB and Auth ---
export const removeAdmin = async (uid: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { error: dbError } = await supabase.from(ADMIN_ROLES_TABLE).delete().eq('uid', uid);
    if (dbError) {
        console.error("Error removing admin role from DB:", dbError);
        throw dbError;
    }
    const { data, error: funcError } = await supabase.functions.invoke('delete-user', {
        body: { uid },
        headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (funcError) {
        console.error("DB record deleted, but failed to delete auth user:", funcError);
        throw new Error("Admin role removed, but failed to delete their login account.");
    }
};

// --- Request a password reset using Supabase's built-in functionality ---
export const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl()
    });
    if (error) {
        console.error("Error requesting password reset:", error);
        throw error;
    }
};


// --- Resend password reset/confirmation for admin user ---
export const resendAdminConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: `${getRedirectUrl().replace('/callback', '/update-password')}`
    });

    if (error) {
        console.error("Error resending confirmation/password reset:", error);
        throw error;
    }
};
