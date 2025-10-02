
'use server'

import { createClient } from "@/lib/supabase/server";

const TEACHERS_COLLECTION = 'teachers';

export const addTeacher = async (formData: FormData) => {
    const supabase = createClient();
    const teacherData = Object.fromEntries(formData.entries());

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: teacherData.email as string,
        password: crypto.randomUUID(), // Temporary password
        email_confirm: true,
        user_metadata: {
            full_name: teacherData.name,
            role: 'teacher'
        }
    });

    if (authError) {
        console.error("Error creating auth user for teacher:", authError);
        throw authError;
    }

    const user = authData.user;
    if (!user) {
        throw new Error("Could not create user for teacher.");
    }

    try {
        const finalTeacherData = {
            name: teacherData.name,
            email: teacherData.email,
            dob: teacherData.dob,
            father_name: teacherData.father_name,
            mother_name: teacherData.mother_name,
            phone_number: teacherData.phone_number,
            address: teacherData.address,
            role: teacherData.role,
            subject: teacherData.subject,
            qualifications: teacherData.qualifications ? JSON.parse(teacherData.qualifications as string) : [],
            class_teacher_of: teacherData.class_teacher_of,
            classes_taught: teacherData.classes_taught ? JSON.parse(teacherData.classes_taught as string) : [],
            joining_date: new Date(teacherData.joining_date as string).toISOString(),
            auth_uid: user.id,
            photo_url: teacherData.photo_url,
        };

        const { error: dbError } = await supabase.from(TEACHERS_COLLECTION).insert([finalTeacherData]);

        if (dbError) {
            console.error("Error saving teacher to DB:", dbError);
            await supabase.auth.admin.deleteUser(user.id);
            throw dbError;
        }

    } catch (e: any) {
        await supabase.auth.admin.deleteUser(user.id);
        throw e;
    }
};
