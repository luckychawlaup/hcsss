
import { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

const principalUID = "6cc51c80-e098-4d6d-8450-5ff5931b7391";
const accountantUID = "cf210695-e635-4363-aea5-740f2707a6d7";
const ownerUID = "946ba406-1ba6-49cf-ab78-f611d1350f33";


export const getRole = async (user: User | null): Promise<'teacher' | 'student' | 'accountant' | 'principal' | 'owner' | null> => {
    if (!user) return null;
    
    // Check for hardcoded admin UIDs first
    if (user.id === ownerUID) return 'owner';
    if (user.id === principalUID) return 'principal';
    if (user.id === accountantUID) return 'accountant';
    
    // Check the user's app_metadata for the role
    // This is more efficient than querying tables.
    if (user.app_metadata.role) {
        return user.app_metadata.role;
    }

    // Fallback: If role is not in metadata, query the teachers table.
    // This is less efficient and should ideally be phased out by ensuring
    // user metadata is always set on registration.
    try {
        const supabase = createClient();
        const { data: teacher, error } = await supabase
            .from('teachers')
            .select('id')
            .eq('auth_uid', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            // An actual error occurred, not just 'no rows found'
            console.error("Error checking for teacher role:", error);
        }

        if (teacher) return 'teacher';
    } catch (e) {
       // This can happen due to RLS for non-teacher roles. It's safe to ignore.
    }
    
    // If not an admin or a teacher, assume student.
    return 'student';
}
