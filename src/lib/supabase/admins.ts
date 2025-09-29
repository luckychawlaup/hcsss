
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


export const addAdmin = async (adminData: Omit<AdminUser, 'uid'> & { dob: string, phone_number: string, address?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke('custom-reset-password', {
        body: { 
            mode: 'create_and_request_reset',
            adminData: adminData
        },
        headers: {
            Authorization: `Bearer ${session.access_token}`,
        }
    });

    if (error) {
        throw new Error(error.message || 'An unexpected error occurred in the edge function.');
    }
    
    if (data.error) {
         throw new Error(data.error);
    }
    
    return data;
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
    
    const { error: funcError } = await supabase.functions.invoke('delete-user', {
        body: { uid: uid },
    });
    if (funcError) {
        console.error("DB record deleted, but failed to delete auth user:", funcError);
        throw new Error("Admin role removed, but failed to delete their login account. Manual cleanup may be required.");
    }
};

export const resendAdminConfirmation = async (email: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke('custom-reset-password', {
        body: {
            mode: 'request',
            email: email
        },
        headers: {
            Authorization: `Bearer ${session.access_token}`,
        }
    });

    if (error || data.error) {
        console.error("Error resending confirmation/password reset:", error || data.error);
        throw new Error(error?.message || data.error);
    }

    return data;
};
