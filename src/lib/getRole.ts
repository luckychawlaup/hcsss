
import { User } from "@supabase/supabase-js";
import { getTeacherByAuthId } from "./supabase/teachers";

const principalUID = "6cc51c80-e098-4d6d-8450-5ff5931b7391";
const ownerUID = "946ba406-1ba6-49cf-ab78-f611d1350f33";

export const getRole = async (user: User | null): Promise<'teacher' | 'student' | 'owner' | 'principal' | null> => {
    if (!user) return null;
    if (user.id === principalUID) return 'principal';
    if (user.id === ownerUID) return 'owner';
    
    const teacher = await getTeacherByAuthId(user.id);
    if (teacher) return 'teacher';
    
    return 'student';
}
