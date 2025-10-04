
import { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

export const getRole = async (user: User | null): Promise<'teacher' | 'student' | 'accountant' | 'principal' | 'owner' | null> => {
    if (!user) return null;
    
    // 1. Check for hardcoded owner UID first
    if (user.id === process.env.NEXT_PUBLIC_OWNER_UID) return 'owner';
    
    const supabase = createClient();
    
    // 2. Check the admin_roles table for principal or accountant
    try {
        const { data: adminRole, error: adminError } = await supabase
            .from('admin_roles')
            .select('role')
            .eq('uid', user.id)
            .maybeSingle();

        if (adminError) {
            // RLS can throw an error if the user isn't an admin, which is expected.
            // We only log if it's a real unexpected error.
            if (adminError.code !== '42501') { // 42501 is "permission denied for table admin_roles"
                 console.error("Error checking admin_roles:", adminError);
            }
        }
        
        if (adminRole) {
            return adminRole.role as 'principal' | 'accountant';
        }
    } catch(e) {
        // This might fail if the table doesn't exist yet or for other reasons.
        // It's safe to ignore and continue to the next check.
        console.warn("Could not query admin_roles, this may be expected for non-admin users.", e);
    }

    // 3. Check the user's app_metadata for a role (primarily for teachers)
    if (user.app_metadata.role) {
        return user.app_metadata.role;
    }

    // 4. Fallback for any remaining teachers not caught by metadata
    try {
        const { data: teacher, error } = await supabase
            .from('teachers')
            .select('id')
            .eq('auth_uid', user.id)
            .maybeSingle();

        if (error) {
           // This can also fail due to RLS for non-teacher roles, which is fine.
           if (error.code !== '42501') {
                console.error("Error checking for teacher role:", error);
           }
        }

        if (teacher) return 'teacher';
    } catch (e) {
       // It's safe to ignore and continue.
       console.warn("Could not query teachers table, this may be expected for non-teacher users.", e);
    }
    
    // 5. If no other role is found, assume student.
    return 'student';
}
