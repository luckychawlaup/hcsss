
'use server'

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

const TEACHERS_COLLECTION = 'teachers';

const generateEmployeeId = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export const addTeacher = async (formData: FormData) => {
    const supabase = createClient();
    const teacherData = Object.fromEntries(formData.entries());

    // Call Edge function to create user without a password
    const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
            email: teacherData.email as string,
            user_metadata: {
                full_name: teacherData.name,
                role: 'teacher',
                avatar_url: teacherData.photo_url || null
            }
        }
    });

    if (functionError) {
        console.error("Error creating auth user for teacher:", functionError);
        throw new Error(functionError.message);
    }

    const user = functionData.user;
    if (!user) {
        throw new Error("Could not create user for teacher.");
    }

    try {
        const employee_id = generateEmployeeId(10);
        
        // Correctly parse array and json fields from FormData
        const qualifications = teacherData.qualifications ? JSON.parse(teacherData.qualifications as string) : [];
        const classes_taught = teacherData.classes_taught ? JSON.parse(teacherData.classes_taught as string) : [];
        const bank_account = teacherData.bank_account ? JSON.parse(teacherData.bank_account as string) : null;
        
        // **FIX**: Format the joining_date to match the TEXT column type 'dd/MM/yyyy'
        const joiningDate = new Date(teacherData.joining_date as string);
        const formattedJoiningDate = format(joiningDate, 'dd/MM/yyyy');

        const finalTeacherData = {
            employee_id: employee_id,
            name: teacherData.name,
            email: teacherData.email,
            dob: teacherData.dob,
            gender: teacherData.gender,
            father_name: teacherData.father_name,
            mother_name: teacherData.mother_name,
            phone_number: teacherData.phone_number,
            address: teacherData.address,
            role: teacherData.role,
            subject: teacherData.subject,
            qualifications: qualifications,
            class_teacher_of: teacherData.class_teacher_of || null,
            classes_taught: classes_taught,
            joining_date: formattedJoiningDate, // Use the correctly formatted date string
            auth_uid: user.id,
            photo_url: teacherData.photo_url || null,
            work_experience: teacherData.work_experience || null,
            aadhar_number: teacherData.aadhar_number || null,
            pan_number: teacherData.pan_number || null,
            bank_account: bank_account,
        };

        const { error: dbError } = await supabase.from(TEACHERS_COLLECTION).insert([finalTeacherData]);

        if (dbError) {
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw dbError;
        }

    } catch (e: any) {
        // If there's an error in this block, delete the auth user that was just created.
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
};
