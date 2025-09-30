

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
    dob?: string;
    created_at?: string;
}

// Add an admin using the standard Supabase Auth flow
export const addAdmin = async (adminData: Omit<AdminUser, 'uid'> & { dob: string; phone_number: string; address?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { data, error: signUpError } = await supabase.auth.signUp({
        email: adminData.email,
        password: crypto.randomUUID(), 
        options: {
            data: {
                role: adminData.role,
                full_name: adminData.name,
            }
        }
    });

    if (signUpError) {
        console.error("Error creating admin auth user:", signUpError);
        throw new Error(signUpError.message);
    }
    
    if (!signUpError && data.user) {
        const { error: dbError } = await supabase
            .from(ADMIN_ROLES_TABLE)
            .insert({ ...adminData, uid: data.user.id });

        if (dbError) {
            console.error("Error inserting into admin_roles:", dbError);
            await supabase.functions.invoke('delete-user', { body: { uid: data.user.id } });
            throw new Error(`Failed to create admin profile: ${dbError.message}`);
        }
    }
    
    return { message: "Admin account created. They will receive an email to set their password." };
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
