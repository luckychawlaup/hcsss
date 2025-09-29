
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
-- Create a new table to store admin role UIDs and their details
CREATE TABLE IF NOT EXISTS public.admin_roles (
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

-- Policy: Allow any authenticated user to read from this table (necessary for getRole check).
CREATE POLICY "Allow authenticated users to read roles"
ON public.admin_roles FOR SELECT
USING (auth.role() = 'authenticated');
`;


export const addAdmin = async (adminData: Omit<AdminUser, 'uid'> & { dob: string, phone_number: string, address: string }) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
            data: {
                full_name: adminData.name,
                role: adminData.role
            }
        }
    });

    if (authError) {
        console.error(`Error creating auth user for ${adminData.role}:`, authError);
        throw authError;
    }
    if (!authData.user) throw new Error(`Could not create user for ${adminData.role}.`);

    const finalAdminData = {
        uid: authData.user.id,
        role: adminData.role,
        name: adminData.name,
        email: adminData.email,
        dob: adminData.dob,
        phone_number: adminData.phone_number,
        address: adminData.address,
    };

    const { error: dbError } = await supabase.from(ADMIN_ROLES_TABLE).insert([finalAdminData]);

    if (dbError) {
        console.error("DB insert failed, attempting to clean up auth user:", authData.user.id);
        // await supabase.auth.admin.deleteUser(authData.user.id); // This requires service_role key
        throw dbError;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminData.email);
    if (resetError) {
        console.warn("Admin user created, but failed to send password reset email.", resetError);
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
    
    const { error: funcError } = await supabase.functions.invoke('delete-user', {
        body: { uid: uid },
    });
    if (funcError) {
        console.error("DB record deleted, but failed to delete auth user:", funcError);
        throw new Error("DB record deleted, but auth user cleanup failed.");
    }
};
