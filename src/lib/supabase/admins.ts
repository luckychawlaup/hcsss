
import { createClient } from "@/lib/supabase/client";
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
    // Invoke the Edge Function to create user and get a reset token
    const { data, error } = await supabase.functions.invoke('custom-reset-password', {
        body: {
            mode: 'create_and_request_reset',
            adminData: adminData
        }
    });

    if (error) {
        console.error("Error invoking custom-reset-password function:", error);
        // Attempt to parse a more specific error message if available
        const errorBody = error.context?.json?.();
        const errorMessage = errorBody?.error || error.message;
        throw new Error(errorMessage);
    }
    
    return data;
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
