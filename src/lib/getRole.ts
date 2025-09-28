
import { User } from "@supabase/supabase-js";
import { getTeacherByAuthId } from "./supabase/teachers";

const principalUID = "6cc51c80-e098-4d6d-8450-5ff5931b7391";
const ownerUID = "946ba406-1ba6-49cf-ab78-f611d1350f33";

export const getRole = async (user: User | null): Promise<'teacher' | 'student' | 'owner' | 'principal' | null> => {
    if (!user) return null;
    if (user.id === principalUID) return 'principal';
    if (user.id === ownerUID) return 'owner';
    
    try {
        const teacher = await getTeacherByAuthId(user.id);
        if (teacher) return 'teacher';
    } catch (error) {
        // This is an expected error for non-teacher roles due to RLS.
        // We can safely ignore it and proceed to check for the student role.
    }
    
    // If not an admin and not a teacher, assume student.
    // A more robust system might check a students table, but this is the current logic.
    return 'student';
}
