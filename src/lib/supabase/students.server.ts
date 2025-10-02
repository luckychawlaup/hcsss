
'use server'

import { createClient } from "@/lib/supabase/server";

const STUDENTS_COLLECTION = 'students';

export const addStudent = async (formData: FormData) => {
    const supabase = createClient();
    const studentData = Object.fromEntries(formData.entries());

    // 1. Create the user in Supabase Auth using the admin method
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: studentData.email as string,
        password: Math.random().toString(36).slice(-8), // Temporary password
        email_confirm: true,
        user_metadata: {
            full_name: studentData.name,
            role: 'student'
        }
    });

    if (authError) {
        console.error("Error creating auth user for student:", authError);
        throw authError;
    }
    
    const user = authData.user;
    if (!user) {
        throw new Error("Could not create auth user for student.");
    }

    try {
        // 2. Generate SRN
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
        
        // 3. Insert student record into the database
        const { error: dbError } = await supabase.from(STUDENTS_COLLECTION).insert([finalStudentData]);

        if (dbError) {
            console.error("Error adding student to DB:", dbError.message);
            // If DB insert fails, delete the created auth user
            await supabase.auth.admin.deleteUser(user.id);
            throw new Error(`Failed to add student. Original error: ${dbError.message}`);
        }
       
    } catch (e: any) {
        // Cleanup auth user if any step fails after its creation
        await supabase.auth.admin.deleteUser(user.id);
        throw e;
    }
};

