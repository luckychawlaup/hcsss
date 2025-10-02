
'use server'

import { createClient } from "@/lib/supabase/server";

const STUDENTS_COLLECTION = 'students';

export const addStudent = async (formData: FormData) => {
    const supabase = createClient();
    const studentData = Object.fromEntries(formData.entries());

    const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
            email: studentData.email as string,
            password: crypto.randomUUID(), // Temporary password
            user_metadata: {
                full_name: studentData.name,
                role: 'student'
            }
        }
    });

    if (functionError) {
        console.error("Error creating auth user for student:", functionError);
        throw new Error(functionError.message);
    }
    
    const user = functionData.user;
    if (!user) {
        throw new Error("Could not create auth user for student.");
    }

    try {
        const { data: countData, error: countError } = await supabase.rpc('get_student_count');
        if (countError) throw countError;
        const srn = `HCS${(countData + 1).toString().padStart(4, '0')}`;
        
        const finalStudentData = { 
            name: studentData.name,
            email: studentData.email,
            father_name: studentData.father_name,
            mother_name: studentData.mother_name,
            address: studentData.address,
            class: studentData.class,
            section: studentData.section,
            admission_date: new Date(studentData.admission_date as string).toISOString(),
            date_of_birth: studentData.date_of_birth,
            opted_subjects: studentData.opted_subjects ? JSON.parse(studentData.opted_subjects as string) : [],
            father_phone: studentData.father_phone,
            mother_phone: studentData.mother_phone,
            student_phone: studentData.student_phone,
            aadhar_number: studentData.aadhar_number,
            auth_uid: user.id,
            srn,
            photo_url: studentData.photo_url,
            aadhar_url: studentData.aadhar_url,
        };
        
        const { error: dbError } = await supabase.from(STUDENTS_COLLECTION).insert([finalStudentData]);

        if (dbError) {
            await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
            throw new Error(`Failed to add student. Original error: ${dbError.message}`);
        }
       
    } catch (e: any) {
        await supabase.functions.invoke('delete-user', { body: { uid: user.id } });
        throw e;
    }
};
