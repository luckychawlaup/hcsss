
import { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

export const getRole = async (user: User | null): Promise<'teacher' | 'student' | 'accountant' | 'principal' | 'owner' | null> => {
    if (!user) return null;
    
    // Check for hardcoded owner UID first
    if (user.id === process.env.NEXT_PUBLIC_OWNER_UID) return 'owner';
    
    const supabase = createClient();
    
    // Check the admin_roles table for principal or accountant
    try {
        const { data: adminRole, error: adminError } = await supabase
            .from('admin_roles')
            .select('role')
            .eq('uid', user.id)
            .maybeSingle();

        if (adminRole) {
            return adminRole.role as 'principal' | 'accountant';
        }
        if (adminError) {
            console.error("Error checking admin_roles:", adminError);
        }
    } catch(e) {
        // This might fail if the table doesn't exist yet, which is okay during initial setup.
    }


    // Check the user's app_metadata for the role
    if (user.app_metadata.role) {
        return user.app_metadata.role;
    }

    // Fallback: If role is not in metadata, query the teachers table.
    try {
        const { data: teacher, error } = await supabase
            .from('teachers')
            .select('id')
            .eq('auth_uid', user.id)
            .maybeSingle();

        if (error) {
            console.error("Error checking for teacher role:", error);
        }

        if (teacher) return 'teacher';
    } catch (e) {
       // This can happen due to RLS for non-teacher roles. It's safe to ignore.
    }
    
    // If not an admin or a teacher, assume student.
    return 'student';
}
