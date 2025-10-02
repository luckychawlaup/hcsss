
'use server'

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const TEACHERS_COLLECTION = 'teachers';

export const addTeacher = async (formData: FormData) => {
    const teacherData = Object.fromEntries(formData.entries());

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: teacherData.email as string,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
            data: {
                full_name: teacherData.name,
                role: 'teacher'
            },
            email_confirm: true,
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
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw dbError;
        }

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(teacherData.email as string);
        if(resetError) {
            console.warn("Teacher created, but failed to send password reset email.", resetError);
        }

    } catch (e: any) {
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
};
